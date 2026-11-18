import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data when `deps` change or `reload()` is called.
 * State is only set from the promise callback, so a request in flight reads as `loading`
 * without a synchronous setState inside the effect. A newer request wins over an older one.
 */
export function useAsyncData(load, deps, onResult) {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState({ key: null, result: null });
  const key = `${version}:${JSON.stringify(deps)}`;
  const latest = useRef({ load, onResult });

  useEffect(() => {
    latest.current = { load, onResult };
  });

  useEffect(() => {
    let active = true;
    Promise.resolve(latest.current.load()).then((result) => {
      if (!active) return;
      if (latest.current.onResult) latest.current.onResult(result);
      setSettled({ key, result });
    });
    return () => { active = false; };
  }, [key]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const replace = useCallback((result) => setSettled({ key, result }), [key]);
  return { loading: settled.key !== key, result: settled.result, reload, replace };
}
