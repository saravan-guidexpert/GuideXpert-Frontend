import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import {
  getSystemPrompt,
  setSystemPrompt,
  clearChatbotProfile,
  getSystemPromptHistory,
  getSystemPromptHistoryItem,
} from '../../utils/adminApi';

const historyEase = [0.22, 1, 0.36, 1];

const historyRowVariants = {
  hidden: { opacity: 0, y: 6 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: Math.min(i, 10) * 0.03, ease: historyEase },
  }),
};

function formatBytes(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function normalizePhoneInput(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function formatHistoryDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(iso);
  }
}

function formatHistoryTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function startOfLocalDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(value) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getHistoryRangeBounds(range, fromStr, toStr) {
  const now = new Date();
  if (range === 'today') {
    return { from: startOfLocalDay(now), to: endOfLocalDay(now) };
  }
  if (range === '7d') {
    const from = startOfLocalDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfLocalDay(now) };
  }
  if (range === '30d') {
    const from = startOfLocalDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to: endOfLocalDay(now) };
  }
  if (range === 'custom') {
    return {
      from: fromStr ? startOfLocalDay(fromStr) : null,
      to: toStr ? endOfLocalDay(toStr) : null,
    };
  }
  return { from: null, to: null };
}

const HISTORY_RANGE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function SystemPrompt() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true;
  const reduceMotion = useReducedMotion();
  const rowMotion = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : historyRowVariants;

  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [meta, setMeta] = useState({
    hash: null,
    bytes: 0,
    updatedAt: null,
    updatedByEmail: null,
    source: null,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const [clearPhone, setClearPhone] = useState('');
  const [clearingProfile, setClearingProfile] = useState(false);
  const [clearStatus, setClearStatus] = useState({ type: null, message: '' });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRange, setHistoryRange] = useState('all');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    setHistoryError('');
    return getSystemPromptHistory()
      .then((res) => {
        if (!res.success) {
          setHistoryError(res.message || 'Failed to load prompt history.');
          setHistory([]);
          return;
        }
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setHistory(items);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setStatus({ type: null, message: '' });
    return getSystemPrompt()
      .then((res) => {
        if (!res.success) {
          setStatus({ type: 'error', message: res.message || 'Failed to load system prompt.' });
          return;
        }
        const next = typeof res.data?.text === 'string' ? res.data.text : '';
        setText(next);
        setSavedText(next);
        setMeta({
          hash: res.data?.hash || null,
          bytes: res.data?.bytes || 0,
          updatedAt: res.data?.updatedAt || null,
          updatedByEmail: res.data?.updatedByEmail || null,
          source: res.data?.source || null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const dirty = text !== savedText;
  const charCount = text.length;
  const byteEstimate = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(text).length
    : charCount;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin || submitting) return;
    if (!text.trim()) {
      setStatus({ type: 'error', message: 'Prompt text cannot be empty.' });
      return;
    }
    setSubmitting(true);
    setStatus({ type: null, message: '' });
    const res = await setSystemPrompt(text);
    setSubmitting(false);
    if (!res.success) {
      setStatus({ type: 'error', message: res.message || 'Failed to save system prompt.' });
      return;
    }
    const next = typeof res.data?.text === 'string' ? res.data.text : text;
    setText(next);
    setSavedText(next);
    setMeta({
      hash: res.data?.hash || null,
      bytes: res.data?.bytes || 0,
      updatedAt: res.data?.updatedAt || null,
      updatedByEmail: res.data?.updatedByEmail || null,
      source: res.data?.source || 'db',
    });
    const mirrorNote =
      res.data?.mirroredToFile === false
        ? ' (file mirror skipped on this host — Mongo is source of truth)'
        : '';
    setStatus({
      type: 'success',
      message: `System prompt saved.${mirrorNote}`,
    });
    loadHistory();
  };

  const handleReset = () => {
    setText(savedText);
    setStatus({ type: null, message: '' });
  };

  const handleClearProfile = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin || clearingProfile) return;
    const phone10 = normalizePhoneInput(clearPhone);
    if (phone10.length !== 10) {
      setClearStatus({ type: 'error', message: 'Enter a valid 10-digit mobile number.' });
      return;
    }
    const confirmed = window.confirm(
      `Clear WhatsApp chatbot profile for ${phone10}?\n\nThis removes saved lead facts, predictor session, and opt-out flags for that number. Chat message history is kept.`
    );
    if (!confirmed) return;

    setClearingProfile(true);
    setClearStatus({ type: null, message: '' });
    const res = await clearChatbotProfile(phone10);
    setClearingProfile(false);
    if (!res.success) {
      setClearStatus({
        type: 'error',
        message: res.message || res.data?.message || 'Failed to clear chatbot profile.',
      });
      return;
    }
    const deleted = res.data?.deleted || {};
    setClearStatus({
      type: 'success',
      message:
        res.data?.message ||
        `Cleared profile for ${phone10} (bot states: ${deleted.botStates ?? 0}, lead profiles: ${deleted.leadProfiles ?? 0}).`,
    });
    setClearPhone('');
  };

  const openHistoryItem = async (id) => {
    setSelectedId(id);
    setSelectedItem(null);
    setDetailError('');
    setCopyStatus('');
    setDetailLoading(true);
    const res = await getSystemPromptHistoryItem(id);
    setDetailLoading(false);
    if (!res.success) {
      setDetailError(res.message || 'Failed to load this version.');
      return;
    }
    setSelectedItem({
      id: res.data?.id || id,
      text: typeof res.data?.text === 'string' ? res.data.text : '',
      hash: res.data?.hash || null,
      bytes: res.data?.bytes || 0,
      updatedAt: res.data?.updatedAt || null,
      updatedByEmail: res.data?.updatedByEmail || null,
    });
  };

  const closeHistoryModal = () => {
    setSelectedId(null);
    setSelectedItem(null);
    setDetailError('');
    setCopyStatus('');
    setDetailLoading(false);
  };

  useEffect(() => {
    if (!selectedId) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeHistoryModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const handleCopy = async () => {
    const value = selectedItem?.text || '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('Copied to clipboard');
    } catch {
      setCopyStatus('Copy failed — select the text and copy manually');
    }
  };

  const handleLoadIntoEditor = () => {
    if (!selectedItem?.text) return;
    setText(selectedItem.text);
    setStatus({
      type: 'success',
      message: 'Loaded history version into the editor. Click Save prompt to make it live.',
    });
    closeHistoryModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { from: historyBoundFrom, to: historyBoundTo } = getHistoryRangeBounds(
    historyRange,
    historyFrom,
    historyTo
  );
  const historyQueryNormalized = historyQuery.trim().toLowerCase();
  const filteredHistory = history.filter((item) => {
    const ts = item.updatedAt ? new Date(item.updatedAt).getTime() : NaN;
    if (historyBoundFrom && (!Number.isFinite(ts) || ts < historyBoundFrom.getTime())) return false;
    if (historyBoundTo && (!Number.isFinite(ts) || ts > historyBoundTo.getTime())) return false;
    if (historyQueryNormalized) {
      const hay = [item.updatedByEmail, item.hash, item.textPreview, formatWhen(item.updatedAt)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(historyQueryNormalized)) return false;
    }
    return true;
  });
  const filtersActive =
    historyRange !== 'all' || Boolean(historyQueryNormalized) || Boolean(historyFrom) || Boolean(historyTo);
  const liveHash = meta.hash || null;
  const hasExactLiveMatch = Boolean(
    liveHash && history.some((item) => item.hash && item.hash === liveHash)
  );
  const fallbackLiveId = !hasExactLiveMatch && history[0]?.id ? history[0].id : null;

  const clearHistoryFilters = () => {
    setHistoryRange('all');
    setHistoryFrom('');
    setHistoryTo('');
    setHistoryQuery('');
  };

  const isHistoryItemLive = (item) => {
    if (liveHash && item.hash && item.hash === liveHash) return true;
    if (fallbackLiveId && item.id === fallbackLiveId) return true;
    return false;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-navy">System Prompt</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit the Flow V3 chatbot system prompt. Saves update MongoDB (and the{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">prompts/system_prompt.v1.md</code>{' '}
          file when writable) and apply to new chatbot replies immediately.
        </p>
      </div>

      {status.message ? (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            Source:{' '}
            <span className="font-medium text-gray-700">{meta.source || (loading ? '…' : '—')}</span>
          </span>
          <span>
            Hash:{' '}
            <span className="font-mono text-gray-700">{meta.hash || '—'}</span>
          </span>
          <span>
            Size:{' '}
            <span className="font-medium text-gray-700">
              {loading ? '…' : `${formatBytes(meta.bytes)} · ${charCount.toLocaleString()} chars`}
            </span>
          </span>
          {meta.updatedAt ? (
            <span>
              Updated:{' '}
              <span className="font-medium text-gray-700">
                {new Date(meta.updatedAt).toLocaleString()}
                {meta.updatedByEmail ? ` by ${meta.updatedByEmail}` : ''}
              </span>
            </span>
          ) : null}
          {dirty ? (
            <span className="text-amber-700 font-semibold">Unsaved changes</span>
          ) : null}
        </div>

        <label className="block">
          <span className="sr-only">System prompt</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading || !isSuperAdmin}
            spellCheck={false}
            className="w-full min-h-[28rem] font-mono text-sm leading-relaxed rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-navy/40 focus:border-primary-navy disabled:bg-gray-50 disabled:text-gray-500"
            placeholder={loading ? 'Loading…' : 'System prompt markdown…'}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Draft size: {formatBytes(byteEstimate)} / 100 KB max
            {!isSuperAdmin ? (
              <span className="ml-2 text-amber-700">Only super-admins can save.</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!dirty || submitting || loading}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={load}
              disabled={submitting || loading}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reload
            </button>
            <button
              type="submit"
              disabled={!isSuperAdmin || !dirty || submitting || loading || !text.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save prompt'}
            </button>
          </div>
        </div>
      </form>

      <form
        onSubmit={handleClearProfile}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <div>
          <h2 className="text-base font-semibold text-primary-navy">Clear WhatsApp chatbot profile</h2>
          <p className="mt-1 text-sm text-gray-600">
            Reset saved profile details for one number (lead facts, predictor session, opt-out).
            Message history is not deleted.
          </p>
        </div>

        {clearStatus.message ? (
          <div
            role="status"
            className={`rounded-lg px-4 py-3 text-sm ${
              clearStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {clearStatus.message}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={clearPhone}
              onChange={(e) => setClearPhone(e.target.value)}
              disabled={!isSuperAdmin || clearingProfile}
              placeholder="e.g. 9347763131"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-navy/40 focus:border-primary-navy disabled:bg-gray-50 disabled:text-gray-500"
            />
          </label>
          <button
            type="submit"
            disabled={!isSuperAdmin || clearingProfile || normalizePhoneInput(clearPhone).length !== 10}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {clearingProfile ? 'Clearing…' : 'Clear profile'}
          </button>
        </div>
        {!isSuperAdmin ? (
          <p className="text-xs text-amber-700">Only super-admins can clear chatbot profiles.</p>
        ) : null}
      </form>

      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-primary-navy">Prompt history</h2>
          <div className="flex items-center gap-2">
            {!historyLoading && history.length > 0 ? (
              <span className="text-[11px] text-gray-400 tabular-nums">
                {filteredHistory.length}/{history.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              className="px-2.5 py-1 text-[11px] font-medium rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
            >
              {historyLoading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {(history.length > 0 || historyLoading) ? (
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-slate-50/50">
            <div className="flex flex-wrap gap-0.5" role="group" aria-label="Date range">
              {HISTORY_RANGE_OPTIONS.map((opt) => {
                const active = historyRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHistoryRange(opt.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors duration-150 ${
                      active
                        ? 'bg-primary-navy text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search history"
              className="ml-auto min-w-[10rem] flex-1 max-w-xs rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-navy/30"
            />
            {filtersActive ? (
              <button
                type="button"
                onClick={clearHistoryFilters}
                className="text-[11px] text-gray-500 hover:text-gray-800 transition-colors duration-150"
              >
                Clear
              </button>
            ) : null}
            {historyRange === 'custom' ? (
              <div className="flex w-full flex-wrap items-center gap-2 pt-1">
                <input
                  type="date"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                  aria-label="From date"
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-navy/30"
                />
                <span className="text-[11px] text-gray-400">to</span>
                <input
                  type="date"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                  aria-label="To date"
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-navy/30"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {historyError ? (
          <div className="mx-4 my-3 rounded px-3 py-2 text-xs bg-red-50 text-red-800 border border-red-200">
            {historyError}
          </div>
        ) : null}

        {historyLoading && history.length === 0 ? (
          <div className="divide-y divide-gray-100">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-3 animate-pulse space-y-2">
                <div className="h-3 w-40 rounded bg-gray-100" />
                <div className="h-2.5 w-56 rounded bg-gray-100" />
                <div className="h-2.5 w-full max-w-md rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : null}

        {!historyLoading && history.length === 0 && !historyError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-700">No versions yet</p>
            <p className="mt-1 text-xs text-gray-500">Versions appear after you save a prompt.</p>
          </div>
        ) : null}

        {!historyLoading && history.length > 0 && filteredHistory.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-700">No matches</p>
            <button
              type="button"
              onClick={clearHistoryFilters}
              className="mt-2 text-xs text-primary-navy hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {filteredHistory.length > 0 ? (
          <motion.ul
            className="divide-y divide-gray-100"
            initial="hidden"
            animate="show"
            role="list"
          >
            {filteredHistory.map((item, index) => {
              const isLive = isHistoryItemLive(item);
              const timeLabel = formatHistoryTime(item.updatedAt);
              return (
                <motion.li key={item.id} custom={index} variants={rowMotion}>
                  <button
                    type="button"
                    onClick={() => openHistoryItem(item.id)}
                    className={`group w-full text-left px-4 py-3 transition-colors duration-150 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-navy/30 ${
                      isLive ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 flex h-2 w-2 shrink-0" aria-hidden={!isLive}>
                        {isLive ? (
                          <span className="relative flex h-2 w-2" title="Currently in use">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 motion-safe:animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <span className="inline-flex h-2 w-2 rounded-full bg-gray-200" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium text-primary-navy">
                            {formatHistoryDate(item.updatedAt)}
                          </span>
                          {timeLabel ? (
                            <span className="text-xs text-gray-400 tabular-nums">{timeLabel}</span>
                          ) : null}
                          {isLive ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              In use
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                          {[
                            item.updatedByEmail || 'Unknown',
                            formatBytes(item.bytes),
                            item.hash ? item.hash.slice(0, 10) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="mt-1.5 text-[11px] font-mono text-gray-500 line-clamp-1">
                          {item.textPreview || 'No preview'}
                        </p>
                      </div>

                      <span className="shrink-0 self-center text-[11px] font-medium text-gray-400 group-hover:text-primary-navy transition-colors duration-150">
                        Open
                      </span>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </section>

      <AnimatePresence>
        {selectedId ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-history-title"
            onClick={closeHistoryModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: historyEase }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200"
              onClick={(e) => e.stopPropagation()}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: historyEase }}
            >
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 id="prompt-history-title" className="text-base font-semibold text-primary-navy">
                      {selectedItem
                        ? formatHistoryDate(selectedItem.updatedAt)
                        : detailLoading
                          ? 'Loading…'
                          : 'Prompt version'}
                    </h3>
                    {selectedItem && isHistoryItemLive(selectedItem) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        In use
                      </span>
                    ) : null}
                  </div>
                  {selectedItem ? (
                    <p className="mt-1 text-xs text-gray-500 truncate">
                      {[
                        formatHistoryTime(selectedItem.updatedAt),
                        selectedItem.updatedByEmail,
                        formatBytes(selectedItem.bytes),
                        selectedItem.hash,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors duration-150"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-auto px-4 sm:px-5 py-3">
                {detailLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 w-1/3 rounded bg-gray-100" />
                    <div className="h-40 rounded bg-gray-100" />
                  </div>
                ) : null}
                {detailError ? (
                  <div className="rounded px-3 py-2 text-xs bg-red-50 text-red-800 border border-red-200">
                    {detailError}
                  </div>
                ) : null}
                {selectedItem?.text ? (
                  <textarea
                    readOnly
                    value={selectedItem.text}
                    spellCheck={false}
                    className="w-full min-h-[20rem] h-[52vh] font-mono text-sm leading-relaxed rounded border border-gray-200 px-3 py-2.5 bg-slate-50 text-gray-900 select-text focus:outline-none focus:ring-1 focus:ring-primary-navy/25"
                  />
                ) : null}
              </div>

              <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                <p className="text-[11px] text-gray-500">
                  {copyStatus || 'Esc to close'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!selectedItem?.text}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadIntoEditor}
                    disabled={!selectedItem?.text || !isSuperAdmin}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    Load into editor
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
