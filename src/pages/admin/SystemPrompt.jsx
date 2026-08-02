import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSystemPrompt, setSystemPrompt, clearChatbotProfile } from '../../utils/adminApi';

function formatBytes(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function normalizePhoneInput(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
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
  }, [load]);

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
    </div>
  );
}
