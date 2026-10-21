import {
  FiActivity, FiEdit2, FiLink, FiMessageSquare, FiPhone, FiUser, FiUserPlus, FiXCircle,
} from 'react-icons/fi';
import { activityPresentation } from './overviewModel';

const ICONS = {
  call: FiPhone,
  done: FiPhone,
  status: FiActivity,
  remark: FiMessageSquare,
  student: FiUserPlus,
  referral: FiLink,
  owner: FiUser,
  cancelled: FiXCircle,
  'consultancy.updated': FiEdit2,
  'consultancy.remark_edited': FiMessageSquare,
};

export default function RecentActivityFeed({ entries, total, now, error, onRetry, onViewAll }) {
  const shown = entries.length;
  const countLabel = total === 0 ? '' : shown === total ? `${total}` : `${shown} of ${total}`;
  return (
    <section className="gx-ov-card gx-ov-activity gx-ov-rise" aria-labelledby="gx-activity-title">
      <div className="gx-ov-card-head">
        <div className="gx-ov-title-line">
          <h3 id="gx-activity-title">Recent activity</h3>
          {countLabel ? <span className="gx-ov-count">{countLabel}</span> : null}
        </div>
        <button type="button" className="gx-text" onClick={onViewAll}>View all</button>
      </div>
      {error ? (
        <div className="gx-ov-empty" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : shown === 0 ? (
        <p className="gx-ov-empty">No recorded events for this consultancy yet. Status updates, remarks, and referrals will appear here.</p>
      ) : (
        <ol className="gx-ov-feed">
          {entries.map((row) => {
            const item = activityPresentation(row, now);
            const Icon = ICONS[item.kind] || FiActivity;
            return (
              <li key={row.id}>
                <span className="gx-ov-act-ico" aria-hidden="true"><Icon size={15} strokeWidth={1.75} /></span>
                <span className="gx-ov-act-copy">
                  <strong>{item.title}</strong>
                  {item.context ? <span className="gx-ov-act-context">{item.context}</span> : null}
                  <span className="gx-ov-act-meta">
                    <span>{item.actor}</span>
                    <time dateTime={item.createdAt} title={item.exact}>{item.relative || item.exact}</time>
                    {item.relative ? <span className="gx-ov-act-exact">{item.exact}</span> : null}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
