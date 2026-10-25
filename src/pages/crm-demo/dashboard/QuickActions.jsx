import { Link } from 'react-router-dom';
import { FiLink, FiPlus, FiUserPlus } from 'react-icons/fi';
import { useCrmDemo } from '../useCrmDemo';

const ACTIONS = [
  { path: '/students?new=1', label: 'Add student', icon: FiUserPlus },
  { path: '/consultancies?new=1', label: 'Add consultancy', icon: FiPlus },
  { path: '/referrals', label: 'View referrals', icon: FiLink },
];

export default function QuickActions() {
  const { basePath, mode } = useCrmDemo();
  return (
    <section className="gx-panel gx-actions-card" aria-labelledby="gx-actions-title">
      <div className="gx-panel-head">
        <div>
          <h3 id="gx-actions-title">Quick actions</h3>
          <p>{mode === 'api' ? 'Open the same forms. Saves go to the signed-in CRM.' : 'Open the existing local demo forms.'}</p>
        </div>
      </div>
      <div className="gx-action-list">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.path} className="gx-action" to={`${basePath}${action.path}`}>
              <span aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>
              <strong>{action.label}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
