import { useEffect, useRef, useState } from 'react';
import { applyCrmResult, reduceCrmLoad } from '../../../../utils/crmWorkspace';

export function useCrmResource(enabled, queryKey, fetcher, expectList = false) {
  const activeKey = enabled ? String(queryKey) : 'disabled';
  const [seenKey, setSeenKey] = useState('');
  const [state, setState] = useState(() => reduceCrmLoad(null, { type: 'reset' }));
  const fetcherRef = useRef(fetcher);

  if (seenKey !== activeKey) {
    setSeenKey(activeKey);
    setState((current) => reduceCrmLoad(current, enabled
      ? { type: 'start', requestId: activeKey }
      : { type: 'reset' }));
  }

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetcherRef.current().then((result) => {
      if (cancelled) return;
      const applied = applyCrmResult(result, { expectList });
      setState((current) => reduceCrmLoad(current, applied.ok
        ? { type: 'success', requestId: activeKey, data: applied.data }
        : { type: 'failure', requestId: activeKey, notice: applied.notice }));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, queryKey, expectList, activeKey]);

  return state;
}
