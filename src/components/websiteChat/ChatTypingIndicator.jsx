/** Animated “assistant is typing” bubble for chat UIs */
export default function ChatTypingIndicator({ label = 'GuideXpert is typing' }) {
  return (
    <div className="flex justify-start" aria-live="polite" aria-busy="true">
      <div className="flex max-w-[90%] flex-col items-start">
        <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#041e30] text-[9px] font-bold tracking-wide text-white">
            GX
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a94a0]">
            GuideXpert
          </span>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#dce3ec] bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(4,30,48,0.03)]"
          role="status"
        >
          <span className="sr-only">{label}</span>
          <span className="flex items-center gap-1" aria-hidden>
            <span className="gx-chat-typing-dot h-1.5 w-1.5 rounded-full bg-[#f27921]" />
            <span className="gx-chat-typing-dot gx-chat-typing-dot-2 h-1.5 w-1.5 rounded-full bg-[#f27921]" />
            <span className="gx-chat-typing-dot gx-chat-typing-dot-3 h-1.5 w-1.5 rounded-full bg-[#f27921]" />
          </span>
          <span className="text-[12px] font-medium text-[#667085]">Typing…</span>
        </div>
      </div>
      <style>{`
        @keyframes gx-chat-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
        .gx-chat-typing-dot {
          animation: gx-chat-typing-bounce 1.05s ease-in-out infinite;
        }
        .gx-chat-typing-dot-2 { animation-delay: 0.15s; }
        .gx-chat-typing-dot-3 { animation-delay: 0.3s; }
        @media (prefers-reduced-motion: reduce) {
          .gx-chat-typing-dot { animation: none !important; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
