import { Link } from 'react-router-dom';
import { FiBriefcase, FiLink, FiUsers } from 'react-icons/fi';

const ITEMS = [
  { key: 'students', label: 'Total students', icon: FiUsers, href: '/crm/students', field: 'students' },
  { key: 'consultancies', label: 'Total consultancies', icon: FiBriefcase, href: '/crm/consultancies', field: 'consultancies' },
  { key: 'referrals', label: 'Total referrals', icon: FiLink, href: '/crm/referrals', field: 'referrals' },
  { key: 'active', label: 'Active consultancies', icon: FiBriefcase, href: '/crm/consultancies?status=active', field: 'activeConsultancies' },
];

export default function KpiStrip({ counts, hints }) {
  return (
    <section className="gx-kpis" aria-label="Totals">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const value = counts ? counts[item.field] : null;
        return (
          <Link key={item.key} className="gx-kpi" to={item.href}>
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
