import { Navigate, useLocation } from 'react-router-dom';
import { useCrmSession } from './useCrmSession';

export function RequireCrmSession({ children }) {
  const location = useLocation();
  const { status } = useCrmSession();
  if (status === 'loading') {
    return <div className="gx-login" data-theme="light"><p className="gx-login-lede">Checking session…</p></div>;
  }
  if (status !== 'ready') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/crm/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
