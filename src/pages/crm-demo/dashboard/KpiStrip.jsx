import { Link } from 'react-router-dom';
import { FiBriefcase, FiLink, FiUsers } from 'react-icons/fi';
import { useCrmDemo } from '../useCrmDemo';

const FIELDS = [
  { key: 'students', label: 'Total students', icon: FiUsers, path: '/students', field: 'students' },
  { key: 'consultancies', label: 'Total consultancies', icon: FiBriefcase, path: '/consultancies', field: 'consultancies' },
  { key: 'referrals', label: 'Total referrals', icon: FiLink, path: '/referrals', field: 'referrals' },
  { key: 'active', label: 'Active consultancies', icon: FiBriefcase, path: '/consultancies?status=active', field: 'activeConsultancies' },
];

export default function KpiStrip({ counts, hints }) {
  const { basePath } = useCrmDemo();
  return (
    <section className="gx-kpis" aria-label="Totals">
      {FIELDS.map((item) => {
        const Icon = item.icon;
        const value = counts ? counts[item.field] : null;
        return (
          <Link key={item.key} className="gx-kpi" to={`${basePath}${item.path}`}>
            <span className="gx-kpi-top">
              <span className="gx-kpi-icon" aria-hidden="true"><Icon size={15} strokeWidth={1.75} /></span>
              <em>{item.label}</em>
            </span>
            <strong>{value == null ? '—' : value}</strong>
            <small>{hints?.[item.key] || 'On file'}</small>
          </Link>
        );
      })}
    </section>
  );
}
