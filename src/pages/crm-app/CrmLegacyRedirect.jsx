import { Navigate, useLocation } from 'react-router-dom';

const EXACT = {
  '/crm-app': '/crm/app',
  '/crm-app/login': '/crm/login',
  '/crm-app/reset': '/crm/reset',
  '/crm-app/students': '/crm/app/students',
  '/crm-app/consultancies': '/crm/app/consultancy-records',
  '/crm-app/referrals': '/crm/app/referrals',
};

export default function CrmLegacyRedirect() {
  const location = useLocation();
  const target = EXACT[location.pathname] || '/crm/app';
  return <Navigate to={`${target}${location.search}`} replace />;
}
