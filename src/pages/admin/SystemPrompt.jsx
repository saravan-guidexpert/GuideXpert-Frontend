import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import {
  getSystemPrompt,
  setSystemPrompt,
  clearChatbotProfile,
  getSystemPromptHistory,
  getSystemPromptHistoryItem,
} from '../../utils/adminApi';

const historyCardEase = [0.22, 1, 0.36, 1];

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
      `Reset WhatsApp lead for ${phone10}?\n\nThis permanently deletes chat history, profile details, bot state, handoffs, and lead scoring. The next message from this number will be treated as a new lead.`
    );
    if (!confirmed) return;

    setClearingProfile(true);
    setClearStatus({ type: null, message: '' });
    const res = await clearChatbotProfile(phone10);
    setClearingProfile(false);
    if (!res.success) {
      setClearStatus({
        type: 'error',
        message: res.message || res.data?.message || 'Failed to reset chatbot lead.',
      });
      return;
    }
    const deleted = res.data?.deleted || {};
    setClearStatus({
      type: 'success',
      message:
        res.data?.message ||
        `Reset lead ${phone10} (${deleted.inboundMessages ?? 0} inbound, ${deleted.outboundMessages ?? 0} outbound messages removed).`,
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

  const showHistoryControls = history.length > 0 || historyLoading;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-4 md:px-6 md:py-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-[#111827]">System Prompt</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">
          Edit the Flow V3 chatbot system prompt. Saves update MongoDB (and the{' '}
          <code className="rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[13px] text-[#374151]">
            prompts/system_prompt.v1.md
          </code>{' '}
          file when writable) and apply to new chatbot replies immediately.
        </p>
      </div>

      {status.message ? (
        <div
          role="status"
          className={`rounded-[10px] border px-4 py-3 text-[14px] ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:p-6"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#6B7280]">
          <span>
            Source:{' '}
            <span className="font-medium text-[#111827]">{meta.source || (loading ? '…' : '—')}</span>
          </span>
          <span>
            Hash:{' '}
            <span className="font-mono text-[#111827]">{meta.hash || '—'}</span>
          </span>
          <span>
            Size:{' '}
            <span className="font-medium text-[#111827]">
              {loading ? '…' : `${formatBytes(meta.bytes)} · ${charCount.toLocaleString()} chars`}
            </span>
          </span>
          {meta.updatedAt ? (
            <span>
              Updated:{' '}
              <span className="font-medium text-[#111827]">
                {new Date(meta.updatedAt).toLocaleString()}
                {meta.updatedByEmail ? ` by ${meta.updatedByEmail}` : ''}
              </span>
            </span>
          ) : null}
          {dirty ? (
            <span className="font-semibold text-amber-700">Unsaved changes</span>
          ) : null}
        </div>

        <label className="block">
          <span className="sr-only">System prompt</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading || !isSuperAdmin}
            spellCheck={false}
            className="min-h-[28rem] w-full rounded-[10px] border border-[#D1D5DB] px-3 py-2.5 font-mono text-[14px] leading-relaxed text-[#111827] transition-all duration-200 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
            placeholder={loading ? 'Loading…' : 'System prompt markdown…'}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#6B7280]">
            Draft size: {formatBytes(byteEstimate)} / 100 KB max
            {!isSuperAdmin ? (
              <span className="ml-2 text-amber-700">Only super-admins can save.</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!dirty || submitting || loading}
              className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] transition-all duration-200 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={load}
              disabled={submitting || loading}
              className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] transition-all duration-200 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reload
            </button>
            <button
              type="submit"
              disabled={!isSuperAdmin || !dirty || submitting || loading || !text.trim()}
              className="h-10 rounded-[10px] bg-[#2563EB] px-5 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save prompt'}
            </button>
          </div>
        </div>
      </form>

      <form
        onSubmit={handleClearProfile}
        className="space-y-4 rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:p-6"
      >
        <div>
          <h2 className="text-[20px] font-semibold text-[#111827]">Reset WhatsApp chatbot lead</h2>
          <p className="mt-2 text-[15px] text-[#6B7280]">
            Delete chat history and profile data for one number so the next message is treated as a
            brand-new lead (facts, predictor session, opt-out, handoffs, and transcripts).
          </p>
        </div>

        {clearStatus.message ? (
          <div
            role="status"
            className={`rounded-[10px] border px-4 py-3 text-[14px] ${
              clearStatus.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {clearStatus.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-2 block text-[14px] font-medium text-[#374151]">Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={clearPhone}
              onChange={(e) => setClearPhone(e.target.value)}
              disabled={!isSuperAdmin || clearingProfile}
              placeholder="e.g. 9347763131"
              className="h-10 w-full rounded-[10px] border border-[#D1D5DB] px-3 text-[14px] text-[#111827] transition-all duration-200 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
            />
          </label>
          <button
            type="submit"
            disabled={!isSuperAdmin || clearingProfile || normalizePhoneInput(clearPhone).length !== 10}
            className="h-10 rounded-[10px] bg-red-600 px-5 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto w-full"
          >
            {clearingProfile ? 'Resetting…' : 'Reset lead'}
          </button>
        </div>
        {!isSuperAdmin ? (
          <p className="text-[13px] text-amber-700">Only super-admins can reset chatbot leads.</p>
        ) : null}
      </form>

      <section className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:p-5">
        <div className="flex min-h-12 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <h2 className="shrink-0 text-[20px] font-semibold text-[#111827]">Prompt history</h2>

          {showHistoryControls ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:flex-1 xl:items-center xl:justify-center xl:gap-6">
              <div
                className="inline-flex h-[38px] items-center rounded-[10px] bg-[#F3F4F6] p-1"
                role="group"
                aria-label="Date range"
              >
                {HISTORY_RANGE_OPTIONS.map((opt) => {
                  const active = historyRange === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHistoryRange(opt.id)}
                      className={`h-full rounded-[8px] px-[14px] text-[14px] font-medium transition-all duration-200 ${
                        active
                          ? 'bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                          : 'text-[#6B7280] hover:bg-[#E5E7EB]/60 hover:text-[#111827]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showHistoryControls ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0 lg:gap-3">
              <div className="relative w-full sm:w-[320px]">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Search admin, hash, text…"
                  aria-label="Search history"
                  className="h-10 w-full rounded-[10px] border border-[#D1D5DB] bg-white pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-all duration-200 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              <div className="flex items-center gap-3">
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={clearHistoryFilters}
                    className="text-[13px] font-medium text-[#6B7280] transition-colors duration-200 hover:text-[#111827]"
                  >
                    Clear filters
                  </button>
                ) : null}

                {!historyLoading && history.length > 0 ? (
                  <span className="min-w-[2.5rem] text-center text-[13px] tabular-nums text-[#6B7280]">
                    {filteredHistory.length}/{history.length}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-[14px] font-medium text-[#374151] transition-all duration-200 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto w-full justify-center"
                >
                  <FiRefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
                  {historyLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {historyRange === 'custom' && showHistoryControls ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-[#F8FAFC] px-3 py-3">
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
              aria-label="From date"
              className="h-10 rounded-[10px] border border-[#D1D5DB] bg-white px-3 text-[14px] transition-all duration-200 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
            <span className="text-[13px] text-[#9CA3AF]">to</span>
            <input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
              aria-label="To date"
              className="h-10 rounded-[10px] border border-[#D1D5DB] bg-white px-3 text-[14px] transition-all duration-200 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
        ) : null}

        <div className="mt-5">
          {historyError ? (
            <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              {historyError}
            </div>
          ) : null}

          {historyLoading && history.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[14px] border border-[#E5E7EB] bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                >
                  <div className="h-4 w-2/5 rounded bg-[#F3F4F6]" />
                  <div className="mt-3 h-3 w-3/5 rounded bg-[#F3F4F6]" />
                  <div className="mt-4 h-[72px] rounded-[10px] bg-[#F3F4F6]" />
                </div>
              ))}
            </div>
          ) : null}

          {!historyLoading && history.length === 0 && !historyError ? (
            <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-6 py-12 text-center">
              <p className="text-[15px] font-medium text-[#111827]">No versions yet</p>
              <p className="mt-2 text-[13px] text-[#6B7280]">Versions appear after you save a prompt.</p>
            </div>
          ) : null}

          {!historyLoading && history.length > 0 && filteredHistory.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-6 py-12 text-center">
              <p className="text-[15px] font-medium text-[#111827]">No matches</p>
              <button
                type="button"
                onClick={clearHistoryFilters}
                className="mt-3 text-[14px] font-medium text-[#2563EB] transition-colors duration-200 hover:text-[#1D4ED8]"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {filteredHistory.length > 0 ? (
            <div
              className={`grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(340px,340px))] ${
                filteredHistory.length === 1 ? 'sm:justify-center' : 'sm:justify-start'
              }`}
            >
              {filteredHistory.map((item) => {
                const isLive = isHistoryItemLive(item);
                const timeLabel = formatHistoryTime(item.updatedAt);
                const metaLine = [
                  timeLabel,
                  item.updatedByEmail || 'Unknown',
                  formatBytes(item.bytes),
                  item.hash ? item.hash.slice(0, 10) : null,
                ]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openHistoryItem(item.id)}
                    className={`group flex w-full flex-col rounded-[14px] border bg-white p-[18px] text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:w-[340px] ${
                      isLive ? 'border-emerald-200' : 'border-[#E5E7EB]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[18px] font-semibold leading-tight text-[#111827]">
                        {formatHistoryDate(item.updatedAt)}
                      </p>
                      {isLive ? (
                        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Live
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 truncate text-[13px] text-[#6B7280]">{metaLine}</p>

                    <div className="relative mt-4 h-[72px] overflow-hidden rounded-[10px] bg-[#111827] p-3">
                      <p className="font-mono text-[13px] leading-relaxed text-slate-300">
                        {item.textPreview || 'No preview'}
                      </p>
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#111827] to-transparent"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[13px] transition-colors duration-200">
                      <span className="font-medium text-[#6B7280] group-hover:text-[#2563EB]">
                        {isLive ? 'Currently in use' : 'View version'}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-[#9CA3AF] transition-colors duration-200 group-hover:text-[#2563EB]"
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

      <AnimatePresence>
        {selectedId ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-history-title"
            onClick={closeHistoryModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: historyCardEase }}
          >
            <motion.div
              className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              onClick={(e) => e.stopPropagation()}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: historyCardEase }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 id="prompt-history-title" className="text-[20px] font-semibold text-[#111827]">
                      {selectedItem
                        ? formatHistoryDate(selectedItem.updatedAt)
                        : detailLoading
                          ? 'Loading…'
                          : 'Prompt version'}
                    </h3>
                    {selectedItem && isHistoryItemLive(selectedItem) ? (
                      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        In use
                      </span>
                    ) : null}
                  </div>
                  {selectedItem ? (
                    <p className="mt-2 truncate text-[13px] text-[#6B7280]">
                      {[
                        formatHistoryTime(selectedItem.updatedAt),
                        selectedItem.updatedByEmail,
                        formatBytes(selectedItem.bytes),
                        selectedItem.hash,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#D1D5DB] text-[#6B7280] transition-all duration-200 hover:bg-[#F9FAFB]"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-auto px-5 py-4">
                {detailLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 w-1/3 rounded bg-[#F3F4F6]" />
                    <div className="h-40 rounded-[10px] bg-[#F3F4F6]" />
                  </div>
                ) : null}
                {detailError ? (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
                    {detailError}
                  </div>
                ) : null}
                {selectedItem?.text ? (
                  <textarea
                    readOnly
                    value={selectedItem.text}
                    spellCheck={false}
                    className="min-h-[20rem] h-[52vh] w-full select-text rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 font-mono text-[14px] leading-relaxed text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4">
                <p className="text-[13px] text-[#6B7280]">{copyStatus || 'Esc to close'}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!selectedItem?.text}
                    className="h-10 rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-[14px] font-medium text-[#374151] transition-all duration-200 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadIntoEditor}
                    disabled={!selectedItem?.text || !isSuperAdmin}
                    className="h-10 rounded-[10px] bg-[#2563EB] px-4 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
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
