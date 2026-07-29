import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMessageSquare, FiSend, FiX, FiLoader, FiRotateCcw, FiColumns, FiSearch, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useStudentAuth } from '../../contexts/StudentAuthContext';
import { resetWebChatSession, sendWebChatMessage } from '../../utils/api';
import ChatTypingIndicator from './ChatTypingIndicator';

const SESSION_KEY = 'gx_web_chat_session_v1';

function loadSessionId() {
  try {
    return localStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

function saveSessionId(id) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
  } catch {
    // ignore
  }
}

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function ToolResultCard({ toolResult }) {
  if (!toolResult?.type) return null;
  const { type, data } = toolResult;

  if (type === 'rank_predictor' && data) {
    const range =
      typeof data.range === 'object' && data.range
        ? `${data.range.low}–${data.range.high}`
        : data.range || data.predictedValue || '—';
    return (
      <div className="mt-3 overflow-hidden rounded-md border border-[#d5dde8] bg-[#fbfcfe]">
        <div className="flex items-center gap-2 border-b border-[#e8eef5] bg-white px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#fff4ed] text-[#f27921]">
            <FiTrendingUp className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a94a0]">
            Rank result
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="font-sw-display text-sm font-bold text-[#041e30]">{data.examName}</p>
          <p className="mt-1 text-xs text-[#5a6570]">
            <span className="font-semibold text-[#2c3640]">{data.metricLabel}:</span> {range}
          </p>
        </div>
      </div>
    );
  }

  if (type === 'college_predictor' && Array.isArray(data?.colleges)) {
    return (
      <div className="mt-3 overflow-hidden rounded-md border border-[#d5dde8] bg-[#fbfcfe]">
        <div className="flex items-center gap-2 border-b border-[#e8eef5] bg-white px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#e8f1f8] text-[#0b3a5c]">
            <FiSearch className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a94a0]">
            Top matches
          </p>
        </div>
        <ul className="divide-y divide-[#eef2f7] px-1">
          {data.colleges.slice(0, 5).map((college) => (
            <li
              key={college.id || college.name}
              className="truncate px-2.5 py-2 text-xs text-[#2c3640]"
            >
              <span className="font-semibold text-[#041e30]">{college.name}</span>
              {college.city ? (
                <span className="text-[#8a94a0]"> · {college.city}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="border-t border-[#e8eef5] bg-white px-3 py-2">
          <Link
            to="/students/college-predictor"
            className="text-xs font-semibold text-[#f27921] underline decoration-[#f27921]/35 underline-offset-2 hover:text-[#e06810]"
          >
            Open full college predictor
          </Link>
        </div>
      </div>
    );
  }

  if (type === 'college_comparison' && data) {
    const a = data.institutionA?.name || data.collegeA?.name;
    const b = data.institutionB?.name || data.collegeB?.name;
    return (
      <div className="mt-3 overflow-hidden rounded-md border border-[#d5dde8] bg-[#fbfcfe]">
        <div className="flex items-center gap-2 border-b border-[#e8eef5] bg-white px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#fff4ed] text-[#f27921]">
            <FiColumns className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a94a0]">
            Comparison
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="font-sw-display text-sm font-bold leading-snug text-[#041e30]">
            {a} <span className="font-semibold text-[#8a94a0]">vs</span> {b}
          </p>
          <Link
            to="/students/college-comparison"
            className="mt-2 inline-block text-xs font-semibold text-[#f27921] underline decoration-[#f27921]/35 underline-offset-2 hover:text-[#e06810]"
          >
            Open full comparison table
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser ? (
          <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#041e30] text-[9px] font-bold tracking-wide text-white">
              GX
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a94a0]">
              GuideXpert
            </span>
          </div>
        ) : null}
        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap sm:text-sm ${
            isUser
              ? 'rounded-2xl rounded-br-md bg-[#041e30] text-white shadow-[0_1px_0_rgba(4,30,48,0.12)]'
              : 'rounded-2xl rounded-bl-md border border-[#dce3ec] bg-white text-[#2c3640] shadow-[0_1px_0_rgba(4,30,48,0.03)]'
          }`}
        >
          {msg.text}
          {!isUser ? <ToolResultCard toolResult={msg.toolResult} /> : null}
        </div>
        {msg.at ? (
          <span className="mt-1 px-1 text-[10px] tabular-nums text-[#9aa3ae]">
            {formatTime(msg.at)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function WebsiteChatWidget() {
  const { session } = useStudentAuth() || {};
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(loadSessionId);
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const bootedRef = useRef(false);

  const identity = useMemo(
    () => ({
      phone: session?.phone || '',
      fullName: session?.fullName || '',
    }),
    [session?.phone, session?.fullName]
  );

  const appendMessage = useCallback((role, text, extras = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role, text, at: new Date().toISOString(), ...extras },
    ]);
  }, []);

  const send = useCallback(
    async (text, { isWelcome = false } = {}) => {
      const trimmed = String(text || '').trim();
      if (!trimmed && !isWelcome) return;
      if (!isWelcome) {
        appendMessage('user', trimmed);
        setInput('');
      }
      setLoading(true);
      setError('');
      try {
        const response = await sendWebChatMessage({
          sessionId,
          message: trimmed,
          phone: identity.phone,
          fullName: identity.fullName,
          isWelcome,
        });
        if (!response.success) {
          throw new Error(
            response?.data?.response ||
              response?.data?.message ||
              response?.message ||
              'Chat unavailable'
          );
        }
        const data = response.data || {};
        if (data.sessionId) {
          setSessionId(data.sessionId);
          saveSessionId(data.sessionId);
        }
        appendMessage('assistant', data.reply || '—', {
          toolResult: data.toolResult || null,
          source: data.source,
        });
        setQuickReplies(Array.isArray(data.quickReplies) ? data.quickReplies : []);
      } catch (err) {
        const msg = err.message || 'Chat unavailable';
        // Stale session + empty welcome used to return "Message is required" — clear and retry once.
        if (isWelcome && /message is required/i.test(msg)) {
          try {
            localStorage.removeItem(SESSION_KEY);
          } catch {
            // ignore
          }
          setSessionId('');
          const retry = await sendWebChatMessage({
            sessionId: '',
            message: '',
            phone: identity.phone,
            fullName: identity.fullName,
            isWelcome: true,
          });
          if (retry.success) {
            const data = retry.data || {};
            if (data.sessionId) {
              setSessionId(data.sessionId);
              saveSessionId(data.sessionId);
            }
            appendMessage('assistant', data.reply || '—', {
              toolResult: data.toolResult || null,
              source: data.source,
            });
            setQuickReplies(Array.isArray(data.quickReplies) ? data.quickReplies : []);
            return;
          }
        }
        setError(msg);
        if (!isWelcome) {
          appendMessage(
            'assistant',
            'Sorry, I could not respond right now. Please try again in a moment.'
          );
        }
      } finally {
        setLoading(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [appendMessage, identity.fullName, identity.phone, sessionId]
  );

  useEffect(() => {
    if (!open || bootedRef.current) return;
    bootedRef.current = true;
    if (messages.length === 0) {
      send('', { isWelcome: true });
    }
  }, [open, messages.length, send]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const onReset = async () => {
    setLoading(true);
    try {
      await resetWebChatSession(sessionId);
      setMessages([]);
      setQuickReplies([]);
      bootedRef.current = false;
      await send('', { isWelcome: true });
    } finally {
      setLoading(false);
    }
  };

  const hiddenOnAdmin =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  if (hiddenOnAdmin) return null;

  return (
    <div className="font-sw-body">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-5 right-5 z-[70] flex items-center gap-0 overflow-hidden rounded-md bg-[#041e30] text-white shadow-[0_8px_28px_rgba(4,30,48,0.28)] transition duration-200 hover:bg-[#0a2f48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f27921]/50 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
          aria-label="Open GuideXpert chat"
        >
          <span className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(242,121,33,0.35),transparent_55%)]" />
            <FiMessageSquare className="relative h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#f27921] ring-2 ring-[#041e30]" />
          </span>
          <span className="hidden max-w-0 overflow-hidden whitespace-nowrap pr-0 text-left transition-all duration-300 group-hover:max-w-[9rem] group-hover:pr-4 sm:block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
              Ask GuideXpert
            </span>
            <span className="block text-xs font-medium text-white/80">Predict · Compare · FAQ</span>
          </span>
        </button>
      ) : (
        <div
          className="fixed inset-x-3 bottom-3 z-[70] flex h-[min(620px,calc(100vh-1.25rem))] flex-col overflow-hidden rounded-xl border border-[#d0d7e1] bg-white shadow-[0_16px_48px_rgba(4,30,48,0.22)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100vh-3rem))] sm:w-[400px]"
          role="dialog"
          aria-label="GuideXpert assistant"
        >
          {/* Header */}
          <header className="relative shrink-0 overflow-hidden border-b border-[#0a2f48] bg-[#041e30] px-4 pb-3.5 pt-3.5 text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background:
                  'radial-gradient(ellipse 80% 70% at 90% -10%, rgba(242,121,33,0.28), transparent 50%), linear-gradient(135deg, #041e30 0%, #0a2f48 55%, #0f4550 100%)',
              }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 backdrop-blur-sm">
                  <span className="font-sw-display text-sm font-bold tracking-wide">GX</span>
                </div>
                <div className="min-w-0">
                  <p className="font-sw-display text-[15px] font-bold tracking-tight">
                    GuideXpert Assistant
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/70">
                    College & rank tools · counselling answers
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        loading ? 'animate-pulse bg-[#f27921]' : 'bg-[#f27921]'
                      }`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                      {loading ? 'Typing…' : 'Online'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={onReset}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  title="Start over"
                >
                  <FiRotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close chat"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Transcript */}
          <div
            ref={listRef}
            className="relative flex-1 space-y-4 overflow-y-auto px-3.5 py-4 sm:px-4"
            style={{
              background:
                'linear-gradient(180deg, #f4f7fb 0%, #f8fafc 40%, #ffffff 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(4,30,48,0.06) 1px, transparent 0)',
                backgroundSize: '18px 18px',
              }}
            />
            <div className="relative space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {loading ? <ChatTypingIndicator /> : null}
            </div>
          </div>

          {/* Quick replies */}
          {quickReplies.length ? (
            <div className="shrink-0 border-t border-[#e8eef5] bg-[#fbfcfe] px-3 py-2.5 sm:px-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a94a0]">
                Quick actions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => send(chip)}
                    className="inline-flex items-center rounded-md border border-[#d0d7e1] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#2c3640] shadow-[0_1px_0_rgba(4,30,48,0.03)] transition hover:border-[#f27921]/50 hover:bg-[#fff8f3] hover:text-[#041e30] disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Composer */}
          <form
            className="shrink-0 border-t border-[#dce3ec] bg-white px-3 py-3 sm:px-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) send(input);
            }}
          >
            {error ? (
              <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="gx-web-chat-input">
                Message
              </label>
              <input
                id="gx-web-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about colleges, rank, or GuideXpert…"
                className="min-h-[44px] min-w-0 flex-1 rounded-md border border-[#d0d7e1] bg-[#fbfcfe] px-3.5 py-2.5 text-sm text-[#041e30] placeholder:text-[#9aa3ae] transition focus:border-[#f27921] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f27921]/20 disabled:opacity-60"
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#041e30] text-white transition hover:bg-[#0a2f48] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {loading ? (
                  <FiLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <FiSend className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#9aa3ae]">
              Powered by GuideXpert · Answers may need official verification
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
