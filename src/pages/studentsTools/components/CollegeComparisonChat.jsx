import { useEffect, useRef, useState } from 'react';
import { FiLoader, FiMessageCircle, FiSend } from 'react-icons/fi';
import ChatTypingIndicator from '../../../components/websiteChat/ChatTypingIndicator';
import { chatCollegeComparisonPublic } from '../../../utils/api';
import { swBtnPrimary, swInput } from './studentWorkspaceUi';

const QUICK_PROMPTS = [
  'Which college is better for placements?',
  'Which one has better ROI for my fees?',
  'Who should prefer College A vs College B?',
  'Summarize the main trade-offs.',
];

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

    const nextHistory = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
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
    <div className="mt-6 rounded-2xl border border-[#e4e9f0] bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f1f8] text-[#0b3a5c]">
          <FiMessageCircle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="font-sw-display text-base font-bold text-[#041e30]">
            Ask doubts about this comparison
          </h3>
          <p className="mt-1 text-sm text-[#5a6570]">
            Chat about {aName} vs {bName} using the comparison facts and OpenAI.
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl bg-[#f8fafc] p-3"
        aria-live="polite"
      >
        {messages.length === 0 && !loading ? (
          <p className="text-sm leading-relaxed text-[#667085]">
            Try a quick question below, or type your own doubt about fees, placements, ROI, or fit.
          </p>
        ) : null}
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#041e30] text-white'
                  : 'border border-[#e4e9f0] bg-white text-[#334155]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading ? (
          <ChatTypingIndicator label="GuideXpert is preparing an answer" />
        ) : null}
      </div>

      {messages.length === 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-full border border-[#dce3ec] bg-white px-3 py-1.5 text-left text-xs font-medium text-[#334155] hover:border-[#f27921] hover:text-[#c45a0c] disabled:opacity-60"
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
          placeholder="Ask anything about these two colleges…"
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
  );
}
