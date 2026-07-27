import { useEffect, useRef, useState } from 'react';
import { FiLoader, FiMessageCircle, FiSend, FiStar } from 'react-icons/fi';
import ChatTypingIndicator from '../../../components/websiteChat/ChatTypingIndicator';
import { chatCollegeComparisonPublic } from '../../../utils/api';
import { formatChatReplyHtml } from '../../../utils/formatChatReplyHtml';
import { swBtnPrimary, swInput } from './studentWorkspaceUi';
import './collegeComparisonChat.css';

const QUICK_PROMPTS = [
  'Which college is better for placements?',
  'Which one has better ROI for my fees?',
  'Who should prefer College A vs College B?',
  'Summarize the main trade-offs.',
];

function AssistantReply({ content }) {
  const html = formatChatReplyHtml(content);
  return (
    <div
      className="gx-chat-reply max-w-[92%] rounded-2xl rounded-bl-md border border-[#dce8f2] bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(4,30,48,0.04)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function CollegeComparisonChat({ comparison }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const pairKey = `${comparison?.institutionA?.id || comparison?.institutionA?.name}::${
    comparison?.institutionB?.id || comparison?.institutionB?.name
  }`;

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setError('');
  }, [pairKey]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (rawText) => {
    const text = String(rawText || '').trim();
    if (!text || loading || !comparison) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setDraft('');
    setLoading(true);
    setError('');

    try {
      const response = await chatCollegeComparisonPublic({
        message: text,
        comparison,
        history: messages.slice(-6),
      });
      if (!response.success) {
        throw new Error(
          response?.data?.response || response?.message || 'Could not get an answer right now.'
        );
      }
      const reply = response.data?.reply || 'No answer returned.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Could not get an answer right now.');
      setMessages((prev) => prev.slice(0, -1));
      setDraft(text);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    sendMessage(draft);
  };

  const aName = comparison?.institutionA?.name || 'College A';
  const bName = comparison?.institutionB?.name || 'College B';

  return (
    <div
      id="comparison-doubts"
      className="mt-6 overflow-hidden rounded-2xl border-2 border-[#0b3a5c]/25 bg-white shadow-[0_12px_40px_rgba(4,30,48,0.08)] ring-4 ring-[#e8f1f8]"
    >
      <div className="border-b border-[#d7e6f2] bg-gradient-to-r from-[#041e30] via-[#0b3a5c] to-[#124a6e] px-4 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/20">
              <FiMessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f27921] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                <FiStar className="h-3 w-3" aria-hidden />
                Doubts based on this comparison
              </p>
              <h3 className="mt-2.5 font-sw-display text-lg font-bold tracking-tight text-white sm:text-xl">
                Ask anything about {aName} vs {bName}
              </h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/75">
                Answers stay grounded in the comparison table above — placements, fees, ROI, and fit.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div
          ref={listRef}
          className="max-h-80 space-y-3.5 overflow-y-auto rounded-xl border border-[#e8eef5] bg-[#f7fafc] p-3.5 sm:p-4"
          aria-live="polite"
        >
          {messages.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-[#cfdceb] bg-white px-4 py-5 text-center">
              <p className="text-sm font-semibold text-[#041e30]">Start with a comparison doubt</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#667085]">
                Ask about placements, fees, ROI, location, or which college suits your profile better.
              </p>
            </div>
          ) : null}

          {messages.map((msg, index) =>
            msg.role === 'user' ? (
              <div key={`u-${index}`} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[#041e30] px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={`a-${index}`} className="flex justify-start">
                <AssistantReply content={msg.content} />
              </div>
            )
          )}

          {loading ? <ChatTypingIndicator label="Preparing a clear answer" /> : null}
        </div>

        {messages.length === 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="rounded-full border border-[#c5d6e6] bg-white px-3 py-1.5 text-left text-xs font-medium text-[#0b3a5c] transition hover:border-[#0b3a5c] hover:bg-[#e8f1f8] disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}

        <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={`${swInput} !mt-0`}
            placeholder="Ask a doubt about this comparison…"
            disabled={loading}
            maxLength={500}
            aria-label="Comparison chat message"
          />
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            className={`${swBtnPrimary} !w-auto shrink-0 px-4`}
            aria-label="Send question"
          >
            {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
