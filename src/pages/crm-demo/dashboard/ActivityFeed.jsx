import { Link } from 'react-router-dom';
import { activityTitle } from '../crmFormat';

function activityStamp(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ActivityFeed({ entries, error, onRetry }) {
  return (
    <section className="gx-panel gx-feed" aria-labelledby="gx-activity-title">
      <div className="gx-panel-head">
        <h3 id="gx-activity-title">Recent activity</h3>
        <Link className="gx-link" to="/crm/audit">View all</Link>
      </div>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : entries.length === 0 ? <p className="gx-help">No local activity yet.</p> : (
        <div className="gx-feed-list">
          {entries.map((entry) => {
            const sample = entry.actorLabel === 'Demo seed';
            return (
              <Link key={entry.id} className="gx-activity" to={`/crm/audit?id=${entry.id}`}>
                <span className="gx-act-copy">
                  <strong>{activityTitle(entry.action)}</strong>
                  <small>{entry.related}{sample ? ' · demo record' : ''}</small>
                </span>
                <time className="gx-act-time" dateTime={entry.createdAt}>{activityStamp(entry.createdAt)}</time>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
