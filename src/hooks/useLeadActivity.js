import { useCallback, useEffect, useRef, useState } from 'react';
import { getLeadActivity, normalizeLeadInsightsResponse } from '../services/leadInsightsService';

function getCurrentIstYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  };
}

/**
 * Loads per-day activity counts for a calendar month (IST).
 */
export function useLeadActivity(initialYear, initialMonth) {
  const current = getCurrentIstYearMonth();
  const [year, setYear] = useState(initialYear || current.year);
  const [month, setMonth] = useState(initialMonth || current.month);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    const result = normalizeLeadInsightsResponse(await getLeadActivity({ year, month }));
    if (requestId !== requestIdRef.current) return;

    if (!result.ok) {
      setDays([]);
      setError(result.message || 'Failed to load activity');
      setLoading(false);
      return;
    }

    setDays(Array.isArray(result.data?.days) ? result.data.days : []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const goToMonth = useCallback((nextYear, nextMonth) => {
    let y = nextYear;
    let m = nextMonth;
    if (m < 1) {
      y -= 1;
      m = 12;
    } else if (m > 12) {
      y += 1;
      m = 1;
    }
    setYear(y);
    setMonth(m);
  }, []);

  const goToday = useCallback(() => {
    const today = getCurrentIstYearMonth();
    setYear(today.year);
    setMonth(today.month);
  }, []);

  return {
    year,
    month,
    days,
    loading,
    error,
    retry: load,
    goToMonth,
    goToday,
    getCurrentIstYearMonth,
  };
}
