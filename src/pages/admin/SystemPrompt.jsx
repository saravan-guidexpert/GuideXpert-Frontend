import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getSystemPrompt,
  setSystemPrompt,
  clearChatbotProfile,
  getSystemPromptHistory,
  getSystemPromptHistoryItem,
} from '../../utils/adminApi';

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
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function SystemPrompt() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin === true;

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

  const clearHistoryFilters = () => {
    setHistoryRange('all');
    setHistoryFrom('');
    setHistoryTo('');
    setHistoryQuery('');
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

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary-navy tracking-tight">
              System prompt history
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Filter by date, then copy or restore a prior version.
            </p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
          >
            {historyLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3.5 space-y-3">
        {historyError ? (
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {historyError}
          </div>
        ) : null}

        {history.length > 0 || historyLoading ? (
          <div className="rounded-lg border border-gray-200 bg-slate-50/80 p-2.5 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
              <div
                className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm"
                role="group"
                aria-label="Filter by date range"
              >
                {HISTORY_RANGE_OPTIONS.map((opt) => {
                  const active = historyRange === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHistoryRange(opt.id)}
                      className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ${
                        active
                          ? 'bg-primary-navy text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                <label className="relative flex-1 min-w-[14rem]">
                  <span className="sr-only">Search history</span>
                  <input
                    type="search"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Filter by admin, hash, or text…"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-navy/25 focus:border-primary-navy/40"
                  />
                </label>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={clearHistoryFilters}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-sm transition-colors duration-150"
                  >
                    Reset
                  </button>
                ) : null}
                {!historyLoading && history.length > 0 ? (
                  <p className="text-xs text-gray-500 tabular-nums whitespace-nowrap pl-1">
                    {filteredHistory.length}
                    <span className="text-gray-400"> / {history.length}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {historyRange === 'custom' ? (
              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-200/80">
                <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  From
                  <input
                    type="date"
                    value={historyFrom}
                    onChange={(e) => setHistoryFrom(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-navy/25"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  To
                  <input
                    type="date"
                    value={historyTo}
                    onChange={(e) => setHistoryTo(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-navy/25"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {historyLoading && history.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-3.5 animate-pulse space-y-2.5 min-h-[10.5rem]"
              >
                <div className="h-4 w-3/5 rounded bg-gray-100" />
                <div className="h-3 w-1/4 rounded bg-gray-100" />
                <div className="h-3 w-2/5 rounded bg-gray-100" />
                <div className="h-[4rem] rounded-md bg-gray-100" />
              </div>
            ))}
          </div>
        ) : null}

        {!historyLoading && history.length === 0 && !historyError ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50/60 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-gray-800">No versions archived yet</p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              Versions appear after each save. The live prompt is seeded into history on first open when available.
            </p>
          </div>
        ) : null}

        {!historyLoading && history.length > 0 && filteredHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50/60 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-gray-800">No matching versions</p>
            <p className="mt-1 text-sm text-gray-500">Widen the date range or clear the search query.</p>
            <button
              type="button"
              onClick={clearHistoryFilters}
              className="mt-3 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-150"
            >
              Reset filters
            </button>
          </div>
        ) : null}

        {filteredHistory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredHistory.map((item) => {
              const isLive = Boolean(meta.hash && item.hash && item.hash === meta.hash);
              const timeLabel = formatHistoryTime(item.updatedAt);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openHistoryItem(item.id)}
                  className={`group relative flex flex-col text-left rounded-lg border bg-white p-3.5 transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out motion-safe:hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/45 focus-visible:ring-offset-2 ${
                    isLive
                      ? 'border-emerald-300/80 border-l-[3px] border-l-emerald-500 hover:border-emerald-400/90 hover:bg-emerald-50/30'
                      : 'border-gray-200 hover:border-primary-navy/35 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-primary-navy leading-snug truncate">
                        {formatHistoryDate(item.updatedAt)}
                      </h3>
                      {timeLabel ? (
                        <p className="mt-0.5 text-xs text-gray-500 tabular-nums">{timeLabel}</p>
                      ) : null}
                    </div>
                    {isLive ? (
                      <span
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
                        title="Currently live system prompt"
                      >
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                        />
                        Live
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <div className="min-w-0">
                      <dt className="text-gray-400 font-medium uppercase tracking-wide">Editor</dt>
                      <dd className="mt-0.5 text-gray-700 truncate">
                        {item.updatedByEmail || 'Unknown'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400 font-medium uppercase tracking-wide">Size</dt>
                      <dd className="mt-0.5 text-gray-700 tabular-nums">{formatBytes(item.bytes)}</dd>
                    </div>
                    {item.hash ? (
                      <div className="col-span-2 min-w-0">
                        <dt className="text-gray-400 font-medium uppercase tracking-wide">Hash</dt>
                        <dd className="mt-0.5 font-mono text-gray-600 truncate">{item.hash.slice(0, 12)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-2.5 flex-1 rounded-md border border-gray-100 bg-slate-50 px-2.5 py-2 min-h-[4rem]">
                    <p className="text-[11px] leading-relaxed text-gray-600 font-mono line-clamp-3">
                      {item.textPreview || 'No preview available'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-500 group-hover:text-primary-navy transition-colors duration-150">
                      Open version
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-gray-300 group-hover:text-primary-navy transition-colors duration-150 text-sm leading-none motion-safe:group-hover:translate-x-0.5 inline-block"
                    >
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
        </div>
      </section>

      {selectedId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/45 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-history-title"
          onClick={closeHistoryModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Saved version
                </p>
                <h3 id="prompt-history-title" className="mt-1 text-lg font-semibold text-primary-navy tracking-tight">
                  {selectedItem
                    ? formatHistoryDate(selectedItem.updatedAt)
                    : detailLoading
                      ? 'Loading…'
                      : 'Prompt version'}
                </h3>
                {selectedItem ? (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    {formatHistoryTime(selectedItem.updatedAt) ? (
                      <span className="tabular-nums">{formatHistoryTime(selectedItem.updatedAt)}</span>
                    ) : null}
                    {selectedItem.updatedByEmail ? (
                      <span className="truncate max-w-[16rem]">{selectedItem.updatedByEmail}</span>
                    ) : null}
                    <span className="tabular-nums">{formatBytes(selectedItem.bytes)}</span>
                    {selectedItem.hash ? (
                      <span className="font-mono text-gray-500 truncate max-w-[12rem]">{selectedItem.hash}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                aria-label="Close"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 sm:px-6 py-4">
              {detailLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-gray-100" />
                  <div className="h-48 rounded-lg bg-gray-100" />
                </div>
              ) : null}
              {detailError ? (
                <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
                  {detailError}
                </div>
              ) : null}
              {selectedItem?.text ? (
                <textarea
                  readOnly
                  value={selectedItem.text}
                  spellCheck={false}
                  className="w-full min-h-[20rem] h-[52vh] font-mono text-sm leading-relaxed rounded-lg border border-gray-200 px-4 py-3 bg-slate-50 text-gray-900 select-text focus:outline-none focus:ring-2 focus:ring-primary-navy/25"
                />
              ) : null}
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 rounded-b-xl">
              <p className="text-xs text-gray-500">
                {copyStatus || 'Esc to close · Copy or load into the editor to restore'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!selectedItem?.text}
                  className="px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Copy all
                </button>
                <button
                  type="button"
                  onClick={handleLoadIntoEditor}
                  disabled={!selectedItem?.text || !isSuperAdmin}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load into editor
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
