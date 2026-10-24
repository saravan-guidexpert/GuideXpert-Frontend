import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmLogout, crmMe, rememberCrmCsrf } from '../../utils/crmSessionApi';
import { CrmSessionContext } from './crmSessionStore';

export function CrmSessionProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    const result = await crmMe();
    if (!result.success) {
      rememberCrmCsrf('');
      setState({ status: 'anonymous', user: null });
      return null;
    }
    rememberCrmCsrf(result.data?.csrfToken);
    const next = { status: 'ready', user: result.data.user };
    setState(next);
    return next.user;
  }, []);

  useEffect(() => {
    let cancelled = false;
    crmMe().then((result) => {
      if (cancelled) return;
      if (!result.success) {
        rememberCrmCsrf('');
        setState({ status: 'anonymous', user: null });
        return;
      }
      rememberCrmCsrf(result.data?.csrfToken);
      setState({ status: 'ready', user: result.data.user });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await crmLogout();
    rememberCrmCsrf('');
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(() => ({ ...state, refresh, logout }), [state, refresh, logout]);
  return <CrmSessionContext.Provider value={value}>{children}</CrmSessionContext.Provider>;
}
