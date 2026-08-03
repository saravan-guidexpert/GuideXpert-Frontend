import { useEffect, useRef } from 'react';
import { FiInbox, FiMessageCircle } from 'react-icons/fi';
import { formatChatTime } from './leadIntelligenceUtils';

function senderLabel(message) {
  if (message?.direction === 'in') return 'Student';
  const type = String(message?.senderType || 'bot').toLowerCase();
  if (type === 'agent') return message?.senderName || 'Agent';
  if (type === 'system') return 'System';
  return 'Bot';
}

export default function LeadChatTranscript({ messages, loading, error, onRetry }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center bg-[#ece5dd]/40 px-4 text-sm text-slate-500">
        Loading chat history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 bg-[#ece5dd]/40 px-4 text-sm text-red-700">
        <span>{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-2 bg-[#ece5dd]/40 px-4 text-center">
        <FiInbox className="h-6 w-6 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">No chat history yet</p>
        <p className="max-w-xs text-xs text-slate-500">
          Messages appear here after the student chats with the WhatsApp bot.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[20rem] flex-col bg-[linear-gradient(180deg,#e8f0e9_0%,#ece5dd_40%,#e5ddd3_100%)]">
      <div className="flex items-center gap-2 border-b border-black/5 bg-white/70 px-4 py-2.5 backdrop-blur-sm">
        <FiMessageCircle className="h-4 w-4 text-emerald-700" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Full chat history · {messages.length} messages
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
        {messages.map((message) => {
          const isIn = message.direction === 'in';
          return (
            <div
              key={String(message.id)}
              className={`flex ${isIn ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[75%] ${
                  isIn
                    ? 'rounded-tl-md bg-white text-slate-800'
                    : 'rounded-tr-md bg-[#dcf8c6] text-slate-900'
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {senderLabel(message)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.text || (isIn ? '[non-text message]' : '—')}
                </p>
                <div className="mt-1 flex items-center justify-end gap-2">
                  {!isIn && message.status ? (
                    <span className="text-[10px] capitalize text-slate-500">{message.status}</span>
                  ) : null}
                  <time className="text-[10px] tabular-nums text-slate-500">
                    {formatChatTime(message.at)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
