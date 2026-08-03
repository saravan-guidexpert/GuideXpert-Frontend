import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDown, FiInbox } from 'react-icons/fi';
import { formatChatTime, groupMessagesByDate, LI } from './leadIntelligenceUtils';

const NEAR_BOTTOM_PX = 80;

export default function LeadChatTranscript({
  messages,
  loading,
  error,
  onRetry,
  contactName,
}) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const grouped = useMemo(() => groupMessagesByDate(messages || []), [messages]);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    setShowJumpLatest(!nearBottom);
  }, []);

  const scrollToLatest = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    stickToBottomRef.current = true;
    setShowJumpLatest(false);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      setShowJumpLatest(false);
    }
  }, [messages, loading]);

  const shellClass = `relative flex h-full min-h-0 flex-col overflow-hidden ${LI.bg}`;

  if (loading) {
    return (
      <div className={`${shellClass} items-center justify-center text-[14px] ${LI.muted}`}>
        Loading chat…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${shellClass} items-center justify-center gap-3 px-3 text-[14px] text-red-700`}>
        <span>{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={`${LI.input} px-3 py-1.5 text-[12px] font-semibold text-red-800`}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className={`${shellClass} items-center justify-center gap-2 px-3 text-center`}>
        <FiInbox className="h-5 w-5 text-[#6B7280]" />
        <p className={`text-[14px] font-semibold ${LI.text}`}>No chat history yet</p>
        <p className={`max-w-[12rem] text-[12px] ${LI.muted}`}>
          Messages appear after {contactName || 'the student'} chats on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div
        ref={scrollRef}
        onScroll={updateNearBottom}
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 ${LI.scrollbar}`}
      >
        <div className="flex w-full flex-col gap-2.5">
          {grouped.map((entry, index) => {
            if (entry.type === 'date') {
              return (
                <div key={`date-${entry.key}-${index}`} className="flex justify-center py-1.5">
                  <span className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#6B7280]">
                    {entry.label}
                  </span>
                </div>
              );
            }

            const message = entry.message;
            const isIn = message.direction === 'in';
            return (
              <div
                key={String(message.id)}
                className={`flex w-full ${isIn ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-[16px] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
                    isIn
                      ? 'rounded-tl-md bg-white text-[#111827]'
                      : 'rounded-tr-md bg-[#DCFCE7] text-[#111827]'
                  }`}
                >
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-[1.55]">
                      {message.text || (isIn ? '[non-text message]' : '—')}
                    </p>
                    <div className="ml-auto flex shrink-0 items-center gap-1.5 self-end">
                      {!isIn && message.status ? (
                        <span className="text-[12px] capitalize text-[#6B7280]">{message.status}</span>
                      ) : null}
                      <time className="text-[12px] tabular-nums text-[#6B7280]">
                        {formatChatTime(message.at)}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} className="h-px shrink-0" />
        </div>
      </div>

      {showJumpLatest ? (
        <button
          type="button"
          onClick={() => scrollToLatest('smooth')}
          className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB]"
        >
          <FiArrowDown className="h-3.5 w-3.5" />
          Latest
        </button>
      ) : null}
    </div>
  );
}
