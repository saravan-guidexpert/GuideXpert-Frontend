import { Navigate, useLocation } from 'react-router-dom';

const SECTION = {
  overview: '',
  users: 'settings',
  activity: 'audit',
  'consultancy-records': 'consultancies',
};

export default function CrmAppIndex() {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/crm\/app\/?/, '').replace(/\/$/, '');
  const [head, ...tail] = rest.split('/').filter(Boolean);
  const mapped = head ? SECTION[head] : '';
  const section = mapped === undefined
    ? [head, ...tail].join('/')
    : [mapped, ...tail].filter(Boolean).join('/');
  const target = section ? `/crm/demo/${section}` : '/crm/demo';
  return <Navigate to={`${target}${search}${hash}`} replace />;
}
