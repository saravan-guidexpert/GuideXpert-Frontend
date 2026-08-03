import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listLeads, normalizeLeadInsightsResponse } from '../services/leadInsightsService';
import { useDebouncedValue } from './useDebouncedValue';

const DEFAULT_LIMIT = 25;

export function useLeadList({ onExactPhoneMatch } = {}) {
  const [stage, setStage] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [searchPhone, setSearchPhone] = useState('');
  const [awaitingReply, setAwaitingReply] = useState('');
  const debouncedSearch = useDebouncedValue(searchPhone, 300);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    const params = {
      page,
      limit,
    };
    if (stage) params.stage = stage;
    if (minScore > 0) params.minScore = minScore;
    if (awaitingReply === 'true' || awaitingReply === 'false') {
      params.awaitingReply = awaitingReply;
    }

    const result = normalizeLeadInsightsResponse(await listLeads(params));
    if (requestId !== requestIdRef.current) return;

    if (!result.ok) {
      setItems([]);
      setTotal(0);
      setError(result.message || 'Failed to load leads');
      setLoading(false);
      return;
    }

    setItems(Array.isArray(result.data?.items) ? result.data.items : []);
    setTotal(Number(result.data?.total) || 0);
    setLoading(false);
  }, [stage, minScore, page, limit, awaitingReply]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const digits = String(debouncedSearch || '').replace(/\D/g, '');
    if (digits.length === 10 && typeof onExactPhoneMatch === 'function') {
      onExactPhoneMatch(digits);
    }
  }, [debouncedSearch, onExactPhoneMatch]);

  const filteredItems = useMemo(() => {
    const digits = String(debouncedSearch || '').replace(/\D/g, '');
    if (!digits || digits.length === 10) return items;
    return items.filter((row) => String(row?.phone || '').includes(digits));
  }, [items, debouncedSearch]);

  const setFilters = useCallback((patch = {}) => {
    if (patch.stage !== undefined) {
      setStage(patch.stage);
      setPage(1);
    }
    if (patch.minScore !== undefined) {
      setMinScore(patch.minScore);
      setPage(1);
    }
    if (patch.limit !== undefined) {
      setLimit(patch.limit);
      setPage(1);
    }
    if (patch.searchPhone !== undefined) {
      setSearchPhone(patch.searchPhone);
    }
    if (patch.awaitingReply !== undefined) {
      setAwaitingReply(patch.awaitingReply);
      setPage(1);
    }
    if (patch.page !== undefined) {
      setPage(patch.page);
    }
  }, []);

  return {
    stage,
    minScore,
    page,
    limit,
    searchPhone,
    debouncedSearch,
    awaitingReply,
    items: filteredItems,
    total,
    loading,
    error,
    retry: load,
    setFilters,
    setPage,
  };
}
