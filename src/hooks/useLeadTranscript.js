import { useCallback, useEffect, useRef, useState } from 'react';
import { getLeadTranscript, normalizeLeadInsightsResponse } from '../services/leadInsightsService';

export function useLeadTranscript(phone) {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const phone10 = String(phone || '').trim();
    if (!/^\d{10}$/.test(phone10)) {
      setMessages([]);
      setConversation(null);
      setLoading(false);
      setError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    const result = normalizeLeadInsightsResponse(
      await getLeadTranscript(phone10, { limit: 200 })
    );
    if (requestId !== requestIdRef.current) return;

    if (!result.ok) {
      setMessages([]);
      setConversation(null);
      setError(result.message || 'Failed to load chat history');
      setLoading(false);
      return;
    }

    setMessages(Array.isArray(result.data?.messages) ? result.data.messages : []);
    setConversation(result.data?.conversation || null);
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    messages,
    conversation,
    loading,
    error,
    retry: load,
  };
}
