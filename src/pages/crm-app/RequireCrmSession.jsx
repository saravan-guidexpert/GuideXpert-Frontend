import { Navigate, useLocation } from 'react-router-dom';
import { crmSessionRedirect } from '../../utils/crmLoginFlow';
import { useCrmSession } from './useCrmSession';

export function RequireCrmSession({ children, loginPath = '/crm/login' }) {
  const location = useLocation();
  const { status } = useCrmSession();
  if (status === 'loading') {
    return <div className="gx-login" data-theme="light"><p className="gx-login-lede">Checking session…</p></div>;
  }
  const redirect = crmSessionRedirect(status, location.pathname, location.search, loginPath);
  if (redirect) return <Navigate to={redirect} replace />;
  return children;
}
