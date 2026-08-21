import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SESSIONS, ALL_MODULES } from '../data/mockWebinarData';
import { normalizeDoubts } from '../utils/doubtHelpers';
import { useWebinarAuth } from '../../../contexts/WebinarAuthContext';
import { syncWebinarProgress, getWebinarProgress, syncWebinarProgressBeacon } from '../../../utils/api';
import { isModuleUnlocked } from '../utils/unlockLogic';
import { normalizeWebinarPhone10 } from '../utils/phone';
import { deriveLocalLastActivityEvent, normalizeLastActivityEvent } from '../utils/lastActivityHelpers';

/** Per-account localStorage keys (phone = last 10 digits or anon). */
export function getWebinarStorageKeys(phone10) {
  const suffix = phone10 ? `_${phone10}` : '_anon';
  return {
    progress: `webinar_progress${suffix}`,
    doubts: `webinar_doubts${suffix}`,
    resume: `webinar_resume${suffix}`,
    bookmarks: `webinar_bookmarks${suffix}`,
    settings: `webinar_settings${suffix}`,
    profile: `webinar_profile${suffix}`,
    activeSession: `webinar_active_session${suffix}`,
    maxWatched: `webinar_max_watched${suffix}`,
    progressVersion: `webinar_progress_version${suffix}`,
  };
}

// Increment when unlock/progress system changes; each user bucket resets independently.
const PROGRESS_VERSION = 4;

const DEFAULT_SETTINGS = {
  defaultPlaybackSpeed: 1,
  autoplayNext: false,
  notifyDoubtAnswered: false,
  sidebarExpandedByDefault: true,
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('webinar persist', e);
  }
}

/**
 * apiRequest returns { success, data: body } where body is backend JSON e.g. { success, data: doc|null }.
 */
function extractWebinarDocFromApiResponse(res) {
  if (!res?.success || res.data == null) return null;
  const body = res.data;
  if (typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'data')) {
    const doc = body.data;
    return doc === undefined ? null : doc;
  }
  return null;
}

function getStoredSidebarExpanded(keys) {
  try {
    const fromSettings = loadJson(keys.settings, null);
    if (fromSettings && typeof fromSettings.sidebarExpandedByDefault === 'boolean')
      return fromSettings.sidebarExpandedByDefault;
    return localStorage.getItem('webinar_sidebar_expanded') !== 'false';
  } catch {
    return true;
  }
}

const WebinarContext = createContext(null);

function buildSyncPayload(completedSessions, maxWatched, playbackPosition, activeSessionId, sessionProgress) {
  const modules = {};
  for (const m of ALL_MODULES) {
    const isCompleted = completedSessions.includes(m.id);
    const unlocked = isModuleUnlocked(m.id, completedSessions);
    const progress = sessionProgress?.[m.id] ?? 0;
    let status = 'locked';
    if (isCompleted) status = 'completed';
    else if (progress > 0 || (playbackPosition?.[m.id] > 0)) status = 'in_progress';
    else if (unlocked) status = 'unlocked';

    const entry = { status, progressPercent: isCompleted ? 100 : Math.round(progress) };
    if (m.type !== 'Assessment') {
      entry.watchedSeconds = Math.round(playbackPosition?.[m.id] || 0);
      entry.maxWatchedSeconds = Math.round(maxWatched?.[m.id] || 0);
    }
    if (isCompleted) entry.completedAt = new Date().toISOString();
    if (unlocked || isCompleted) entry.unlockedAt = new Date().toISOString();
    modules[m.id] = entry;
  }

  const completedCount = ALL_MODULES.filter((m) => completedSessions.includes(m.id)).length;
  const overallPercent = ALL_MODULES.length > 0 ? Math.round((completedCount / ALL_MODULES.length) * 100) : 0;

  return {
    completedModules: completedSessions,
    modules,
    lastActiveModule: activeSessionId || null,
    overallPercent,
  };
}

function readInitialProgress(keys) {
  const storedVersion = Number(localStorage.getItem(keys.progressVersion)) || 0;
  if (storedVersion < PROGRESS_VERSION) {
    localStorage.setItem(keys.progressVersion, String(PROGRESS_VERSION));
    saveJson(keys.progress, []);
    saveJson(keys.maxWatched, {});
    saveJson(keys.resume, {});
    return [];
  }
  return loadJson(keys.progress, []);
}

export function WebinarProvider({ children, initialDisplayName, phoneKey: phoneKeyProp }) {
  const { token: webinarToken, logout: webinarLogout } = useWebinarAuth();
  const phoneKey = normalizeWebinarPhone10(phoneKeyProp ?? null);

  /** Clears stale webinar JWT when API returns 401 (expired / invalid). */
  const handleWebinarAuthFailure = useCallback((res) => {
    if (res?.status === 401) {
      webinarLogout();
      return true;
    }
    return false;
  }, [webinarLogout]);

  const storageKeys = useMemo(() => getWebinarStorageKeys(phoneKey), [phoneKey]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => getStoredSidebarExpanded(storageKeys));
  const [doubts, setDoubts] = useState(() => normalizeDoubts(loadJson(storageKeys.doubts, [])));
  const [sessionProgress, setSessionProgress] = useState({});
  const [lastActivityAt, setLastActivityAt] = useState(null);
  const [lastActivityEvent, setLastActivityEvent] = useState(null);

  const [completedSessions, setCompletedSessions] = useState(() => readInitialProgress(storageKeys));
  const [playbackPosition, setPlaybackPosition] = useState(() => {
    const storedVersion = Number(localStorage.getItem(storageKeys.progressVersion)) || 0;
    return storedVersion >= PROGRESS_VERSION ? loadJson(storageKeys.resume, {}) : {};
  });
  const [bookmarkedSessions, setBookmarkedSessions] = useState(() =>
    loadJson(storageKeys.bookmarks, [])
  );
  const [maxWatched, setMaxWatched] = useState(() => {
    const storedVersion = Number(localStorage.getItem(storageKeys.progressVersion)) || 0;
    return storedVersion >= PROGRESS_VERSION ? loadJson(storageKeys.maxWatched, {}) : {};
  });
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJson(storageKeys.settings, {}),
  }));
  const [profileDisplayName, setProfileDisplayName] = useState(() => {
    const p = loadJson(storageKeys.profile, {});
    return (p && typeof p.displayName === 'string') ? p.displayName : '';
  });

  useEffect(() => {
    const name = typeof initialDisplayName === 'string' ? initialDisplayName.trim() : '';
    if (name) {
      setProfileDisplayName((prev) => (prev ? prev : name));
    }
  }, [initialDisplayName]);

  const [activeSessionId, setActiveSessionIdState] = useState(() => {
    const stored = loadJson(storageKeys.activeSession, null);
    if (stored && typeof stored.sessionId === 'string' && ALL_MODULES.some((m) => m.id === stored.sessionId))
      return stored.sessionId;
    return SESSIONS[0]?.id ?? null;
  });
  const [activeDay, setActiveDayState] = useState(() => {
    const stored = loadJson(storageKeys.activeSession, null);
    if (stored && typeof stored.sessionId === 'string') {
      const module = ALL_MODULES.find((m) => m.id === stored.sessionId);
      if (module) return module.dayId;
    }
    if (stored && typeof stored.dayId === 'number' && stored.dayId >= 1 && stored.dayId <= 3)
      return stored.dayId;
    return 1;
  });

  const setActiveSessionId = useCallback((id) => {
    setActiveSessionIdState(id);
    const module = ALL_MODULES.find((m) => m.id === id);
    if (module) setActiveDayState(module.dayId);
  }, []);
  const setActiveDay = useCallback((dayId) => {
    setActiveDayState(dayId);
  }, []);

  useEffect(() => {
    saveJson(storageKeys.activeSession, { sessionId: activeSessionId, dayId: activeDay });
  }, [activeSessionId, activeDay, storageKeys.activeSession]);

  useEffect(() => saveJson(storageKeys.progress, completedSessions), [completedSessions, storageKeys.progress]);
  useEffect(() => saveJson(storageKeys.doubts, doubts), [doubts, storageKeys.doubts]);
  useEffect(() => saveJson(storageKeys.resume, playbackPosition), [playbackPosition, storageKeys.resume]);
  useEffect(() => saveJson(storageKeys.bookmarks, bookmarkedSessions), [bookmarkedSessions, storageKeys.bookmarks]);
  useEffect(() => saveJson(storageKeys.maxWatched, maxWatched), [maxWatched, storageKeys.maxWatched]);
  useEffect(() => saveJson(storageKeys.settings, settings), [settings, storageKeys.settings]);
  useEffect(() => {
    saveJson(storageKeys.profile, { displayName: profileDisplayName });
  }, [profileDisplayName, storageKeys.profile]);

  const totalSessions = SESSIONS.length;
  const completedVideoCount = completedSessions.filter((id) =>
    SESSIONS.some((s) => s.id === id)
  ).length;
  const completionPercent = totalSessions
    ? Math.min(100, Math.round((completedVideoCount / totalSessions) * 100))
    : 0;

  useEffect(() => {
    try {
      localStorage.setItem('webinar_sidebar_expanded', String(sidebarExpanded));
    } catch (_) {}
  }, [sidebarExpanded]);

  const hasFetchedRef = useRef(false);
  const restoredRef = useRef(false);
  const sessionProgressRef = useRef(sessionProgress);
  sessionProgressRef.current = sessionProgress;

  const completedSessionsRef = useRef(completedSessions);
  const playbackPositionRef = useRef(playbackPosition);
  const maxWatchedRef = useRef(maxWatched);
  const activeSessionIdRef = useRef(activeSessionId);

  useEffect(() => {
    completedSessionsRef.current = completedSessions;
  }, [completedSessions]);
  useEffect(() => {
    playbackPositionRef.current = playbackPosition;
  }, [playbackPosition]);
  useEffect(() => {
    maxWatchedRef.current = maxWatched;
  }, [maxWatched]);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const skipNextImmediateSyncRef = useRef(false);

  const applyServerDocToState = useCallback((doc) => {
    if (doc === null || doc === undefined) {
      skipNextImmediateSyncRef.current = true;
      setCompletedSessions([]);
      setSessionProgress({});
      setMaxWatched({});
      setPlaybackPosition({});
      setLastActivityAt(null);
      setLastActivityEvent(null);
      const first = SESSIONS[0]?.id ?? null;
      if (first) setActiveSessionId(first);
      return;
    }
    if (typeof doc !== 'object') return;

    skipNextImmediateSyncRef.current = true;
    setCompletedSessions(Array.isArray(doc.completedModules) ? doc.completedModules : []);

    setMaxWatched((prev) => {
      const activeId = activeSessionIdRef.current;
      const next = { ...prev };
      if (doc.modules && typeof doc.modules === 'object') {
        for (const [moduleId, mod] of Object.entries(doc.modules)) {
          if (mod && typeof mod === 'object' && typeof mod.maxWatchedSeconds === 'number') {
            const serverM = mod.maxWatchedSeconds;
            const localM = prev[moduleId] ?? 0;
            if (moduleId === activeId && localM > serverM) {
              next[moduleId] = localM;
            } else {
              next[moduleId] = Math.max(localM, serverM);
            }
          }
        }
      }
      return next;
    });

    setPlaybackPosition((prev) => {
      const activeId = activeSessionIdRef.current;
      const next = { ...prev };
      if (doc.modules && typeof doc.modules === 'object') {
        for (const [moduleId, mod] of Object.entries(doc.modules)) {
          if (mod && typeof mod === 'object' && typeof mod.watchedSeconds === 'number') {
            const serverW = mod.watchedSeconds;
            const localW = prev[moduleId] ?? 0;
            if (moduleId === activeId && localW > serverW) {
              next[moduleId] = localW;
            } else {
              next[moduleId] = Math.max(localW, serverW);
            }
          }
        }
      }
      return next;
    });

    if (typeof doc.lastActiveModule === 'string' && ALL_MODULES.some((m) => m.id === doc.lastActiveModule)) {
      setActiveSessionId(doc.lastActiveModule);
    }
    if (doc.lastActivityAt) {
      setLastActivityAt(doc.lastActivityAt);
    }
    if (doc.lastActivityEvent && typeof doc.lastActivityEvent === 'object') {
      setLastActivityEvent(normalizeLastActivityEvent(doc.lastActivityEvent));
    }
  }, [setActiveSessionId]);

  /** Stable: reads latest progress from refs so playback ticks do not recreate this callback. */
  const doSync = useCallback(() => {
    if (!webinarToken || !restoredRef.current) return;
    const payload = buildSyncPayload(
      completedSessionsRef.current,
      maxWatchedRef.current,
      playbackPositionRef.current,
      activeSessionIdRef.current,
      sessionProgressRef.current
    );
    syncWebinarProgress(webinarToken, payload).then((res) => {
      if (!res?.success) {
        if (handleWebinarAuthFailure(res)) return;
        if (import.meta.env.DEV) console.warn('[webinar sync] failed', res?.message);
        return;
      }
      const serverDoc = extractWebinarDocFromApiResponse(res);
      if (!serverDoc || typeof serverDoc !== 'object') return;

      if (Array.isArray(serverDoc.completedModules)) {
        skipNextImmediateSyncRef.current = true;
        setCompletedSessions(serverDoc.completedModules);
      }
      if (serverDoc.modules && typeof serverDoc.modules === 'object') {
        const activeId = activeSessionIdRef.current;
        setMaxWatched((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const [id, mod] of Object.entries(serverDoc.modules)) {
            if (mod && typeof mod === 'object' && typeof mod.maxWatchedSeconds === 'number') {
              const serverM = mod.maxWatchedSeconds;
              const localM = prev[id] ?? 0;
              if (id === activeId && localM > serverM) continue;
              if (serverM > localM) {
                next[id] = serverM;
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
        setPlaybackPosition((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const [id, mod] of Object.entries(serverDoc.modules)) {
            if (mod && typeof mod === 'object' && typeof mod.watchedSeconds === 'number') {
              const serverW = mod.watchedSeconds;
              const localW = prev[id] ?? 0;
              if (id === activeId && localW > serverW) continue;
              if (serverW > localW) {
                next[id] = serverW;
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      }
      if (serverDoc.lastActivityAt) {
        setLastActivityAt(serverDoc.lastActivityAt);
      }
      if (serverDoc.lastActivityEvent && typeof serverDoc.lastActivityEvent === 'object') {
        setLastActivityEvent(normalizeLastActivityEvent(serverDoc.lastActivityEvent));
      }
    }).catch((err) => {
      if (import.meta.env.DEV) console.warn('[webinar sync] error', err?.message || err);
    });
  }, [webinarToken, handleWebinarAuthFailure]);

  const doSyncRef = useRef(doSync);
  doSyncRef.current = doSync;

  const postHydrateSyncScheduledRef = useRef(false);

  const prevCompletedRef = useRef(completedSessions);
  useEffect(() => {
    if (!webinarToken) return;
    if (skipNextImmediateSyncRef.current) {
      skipNextImmediateSyncRef.current = false;
      prevCompletedRef.current = completedSessions;
      return;
    }
    if (prevCompletedRef.current !== completedSessions && completedSessions.length > prevCompletedRef.current.length) {
      doSync();
    }
    prevCompletedRef.current = completedSessions;
  }, [completedSessions, doSync, webinarToken]);

  useEffect(() => {
    postHydrateSyncScheduledRef.current = false;
  }, [webinarToken]);

  useEffect(() => {
    if (!webinarToken || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    getWebinarProgress(webinarToken).then((res) => {
      if (!res.success) {
        const authCleared = handleWebinarAuthFailure(res);
        restoredRef.current = true;
        if (!authCleared && !postHydrateSyncScheduledRef.current) {
          postHydrateSyncScheduledRef.current = true;
          setTimeout(() => doSyncRef.current(), 2500);
        }
        return;
      }
      const doc = extractWebinarDocFromApiResponse(res);
      applyServerDocToState(doc);
      restoredRef.current = true;
      if (!postHydrateSyncScheduledRef.current) {
        postHydrateSyncScheduledRef.current = true;
        setTimeout(() => doSyncRef.current(), 2500);
      }
    }).catch(() => {
      restoredRef.current = true;
      if (!postHydrateSyncScheduledRef.current) {
        postHydrateSyncScheduledRef.current = true;
        setTimeout(() => doSyncRef.current(), 2500);
      }
    });
  }, [webinarToken, applyServerDocToState, handleWebinarAuthFailure]);

  useEffect(() => {
    if (!webinarToken) return;
    const handleVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        doSyncRef.current();
        return;
      }
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await getWebinarProgress(webinarToken);
        if (!res.success) {
          handleWebinarAuthFailure(res);
          return;
        }
        const doc = extractWebinarDocFromApiResponse(res);
        applyServerDocToState(doc);
      } catch { /* best-effort */ }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [webinarToken, applyServerDocToState, handleWebinarAuthFailure]);

  /** Long-interval backup while logged in (not tied to playback ticks). */
  const BACKUP_SYNC_MS = 12 * 60 * 1000;
  useEffect(() => {
    if (!webinarToken) return;
    const id = window.setInterval(() => {
      if (!restoredRef.current) return;
      doSyncRef.current();
    }, BACKUP_SYNC_MS);
    return () => window.clearInterval(id);
  }, [webinarToken]);

  useEffect(() => {
    if (!webinarToken) return;
    const handleUnload = () => {
      const playbackOnly = { modules: {}, lastActiveModule: activeSessionIdRef.current || null };
      const pos = playbackPositionRef.current;
      const max = maxWatchedRef.current;
      for (const m of ALL_MODULES) {
        if (m.type !== 'Assessment') {
          playbackOnly.modules[m.id] = {
            watchedSeconds: Math.round(pos?.[m.id] || 0),
            maxWatchedSeconds: Math.round(max?.[m.id] || 0),
          };
        }
      }
      syncWebinarProgressBeacon(webinarToken, playbackOnly);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [webinarToken]);

  const updateSessionProgress = useCallback(
    (sessionId, percent) => {
      const at = new Date().toISOString();
      if (Number.isFinite(percent) && percent > 0) {
        setLastActivityAt(at);
      }
      setSessionProgress((prev) => {
        const next = { ...prev, [sessionId]: percent };
        if (Number.isFinite(percent) && percent > 0) {
          setLastActivityEvent(
            deriveLocalLastActivityEvent({
              completedSessions,
              playbackPosition,
              sessionProgress: next,
              activeSessionId,
              forModuleId: sessionId,
              atIso: at,
            })
          );
        }
        return next;
      });
    },
    [completedSessions, playbackPosition, activeSessionId]
  );

  const setCompletedSessionsTracked = useCallback(
    (value) => {
      const at = new Date().toISOString();
      setLastActivityAt(at);
      setCompletedSessions((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        setLastActivityEvent(
          deriveLocalLastActivityEvent({
            completedSessions: next,
            playbackPosition,
            sessionProgress,
            activeSessionId,
            atIso: at,
          })
        );
        return next;
      });
    },
    [playbackPosition, sessionProgress, activeSessionId]
  );

  const setPlaybackPositionTracked = useCallback(
    (value) => {
      const at = new Date().toISOString();
      setLastActivityAt(at);
      setPlaybackPosition((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        setLastActivityEvent(
          deriveLocalLastActivityEvent({
            completedSessions,
            playbackPosition: next,
            sessionProgress,
            activeSessionId,
            atIso: at,
          })
        );
        return next;
      });
    },
    [completedSessions, sessionProgress, activeSessionId]
  );

  const setSessionProgressTracked = useCallback(
    (value) => {
      const at = new Date().toISOString();
      setLastActivityAt(at);
      setSessionProgress((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        setLastActivityEvent(
          deriveLocalLastActivityEvent({
            completedSessions,
            playbackPosition,
            sessionProgress: next,
            activeSessionId,
            atIso: at,
          })
        );
        return next;
      });
    },
    [completedSessions, playbackPosition, activeSessionId]
  );

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'sidebarExpandedByDefault') setSidebarExpanded(value);
      return next;
    });
  };

  const value = useMemo(
    () => ({
    user: {
      name: profileDisplayName || 'Trainee',
      displayName: profileDisplayName,
      setDisplayName: setProfileDisplayName,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=webinar',
      completionPercent,
    },
    sidebarOpen,
    setSidebarOpen,
    sidebarExpanded,
    setSidebarExpanded,
    doubts,
    setDoubts,
    completedSessions,
    setCompletedSessions: setCompletedSessionsTracked,
    completedVideoCount,
    playbackPosition,
    setPlaybackPosition: setPlaybackPositionTracked,
    bookmarkedSessions,
    setBookmarkedSessions,
    maxWatched,
    setMaxWatched,
    settings,
    setSettings,
    updateSetting,
    activeSessionId,
    setActiveSessionId,
    activeDay,
    setActiveDay,
    sessionProgress,
    setSessionProgress: setSessionProgressTracked,
    updateSessionProgress,
    lastActivityAt,
    lastActivityEvent,
  }),
  [
    sidebarOpen,
    sidebarExpanded,
    doubts,
    completedSessions,
    completedVideoCount,
    playbackPosition,
    bookmarkedSessions,
    maxWatched,
    settings,
    profileDisplayName,
    completionPercent,
    activeSessionId,
    activeDay,
    sessionProgress,
    updateSessionProgress,
    setCompletedSessionsTracked,
    setPlaybackPositionTracked,
    setSessionProgressTracked,
    lastActivityAt,
    lastActivityEvent,
  ]
  );

  return <WebinarContext.Provider value={value}>{children}</WebinarContext.Provider>;
}

export function useWebinar() {
  const ctx = useContext(WebinarContext);
  if (!ctx) throw new Error('useWebinar must be used within WebinarProvider');
  return ctx;
}
