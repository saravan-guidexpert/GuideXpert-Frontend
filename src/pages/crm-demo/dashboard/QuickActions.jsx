import { Link } from 'react-router-dom';
import { FiLink, FiPlus, FiUserPlus } from 'react-icons/fi';

const ACTIONS = [
  { to: '/crm/students?new=1', label: 'Add student', icon: FiUserPlus },
  { to: '/crm/consultancies?new=1', label: 'Add consultancy', icon: FiPlus },
  { to: '/crm/referrals', label: 'View referrals', icon: FiLink },
];

export default function QuickActions() {
  return (
    <section className="gx-panel gx-actions-card" aria-labelledby="gx-actions-title">
      <div className="gx-panel-head">
        <div>
          <h3 id="gx-actions-title">Quick actions</h3>
          <p>Open the existing local demo forms.</p>
        </div>
      </div>
      <div className="gx-action-list">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.to} className="gx-action" to={action.to}>
              <span aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>
              <strong>{action.label}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
