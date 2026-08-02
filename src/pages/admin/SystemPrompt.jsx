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

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-primary-navy">System prompt history</h2>
            <p className="mt-1 text-sm text-gray-600">
              Saved versions with date and time. Tap a row to view, copy, or load into the editor.
            </p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {historyLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {historyError ? (
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {historyError}
          </div>
        ) : null}

        {historyLoading && history.length === 0 ? (
          <p className="text-sm text-gray-500">Loading history…</p>
        ) : null}

        {!historyLoading && history.length === 0 && !historyError ? (
          <p className="text-sm text-gray-500">
            No history yet — versions appear after the next Save (current prompt is seeded on first open).
          </p>
        ) : null}

        {history.length > 0 ? (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openHistoryItem(item.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary-navy">
                      {formatWhen(item.updatedAt)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatBytes(item.bytes)}
                      {item.hash ? ` · ${item.hash}` : ''}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.updatedByEmail ? `by ${item.updatedByEmail}` : 'Unknown editor'}
                  </p>
                  {item.textPreview ? (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2 font-mono">
                      {item.textPreview}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {selectedId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-history-title"
          onClick={closeHistoryModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="prompt-history-title" className="text-base font-semibold text-primary-navy">
                  Prompt version
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedItem
                    ? `${formatWhen(selectedItem.updatedAt)}${
                        selectedItem.updatedByEmail ? ` · ${selectedItem.updatedByEmail}` : ''
                      } · ${formatBytes(selectedItem.bytes)}${
                        selectedItem.hash ? ` · ${selectedItem.hash}` : ''
                      }`
                    : detailLoading
                      ? 'Loading…'
                      : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              {detailLoading ? (
                <p className="text-sm text-gray-500">Loading prompt text…</p>
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
                  className="w-full min-h-[20rem] h-[55vh] font-mono text-sm leading-relaxed rounded-lg border border-gray-300 px-3 py-2 bg-gray-50 text-gray-900 select-text"
                />
              ) : null}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">{copyStatus || 'Select text or use Copy all'}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!selectedItem?.text}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
