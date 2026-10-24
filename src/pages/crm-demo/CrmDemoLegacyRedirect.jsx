import { Navigate, useLocation } from 'react-router-dom';

export default function CrmDemoLegacyRedirect() {
  const location = useLocation();
  const suffix = location.pathname.slice('/crm'.length);
  return <Navigate to={`/crm/demo${suffix}${location.search}`} replace />;
}
