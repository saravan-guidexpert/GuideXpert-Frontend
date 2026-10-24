import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmHeartbeat, crmLogout, crmMe, rememberCrmCsrf } from '../../utils/crmSessionApi';
import { retireCrmSession } from '../../utils/crmSessionGuard';
import { createPresenceHeartbeat } from '../../utils/crmPresenceHeartbeat';
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
    function onUnauthorized() {
      rememberCrmCsrf('');
      setState({ status: 'anonymous', user: null });
    }
    window.addEventListener('gx-crm-unauthorized', onUnauthorized);
    return () => window.removeEventListener('gx-crm-unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const loop = createPresenceHeartbeat({ send: crmHeartbeat });
    loop.start();
    return () => loop.stop();
  }, [state.status]);

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
    retireCrmSession();
    const result = await crmLogout();
    if (result.success || result.status === 401) {
      rememberCrmCsrf('');
      setState({ status: 'anonymous', user: null });
    }
    return result;
  }, []);

  const value = useMemo(() => ({ ...state, refresh, logout }), [state, refresh, logout]);
  return <CrmSessionContext.Provider value={value}>{children}</CrmSessionContext.Provider>;
}
