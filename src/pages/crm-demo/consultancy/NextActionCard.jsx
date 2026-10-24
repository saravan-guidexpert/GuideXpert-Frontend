import { actionStateLabel, exactDateTime } from './overviewModel';

export default function NextActionCard({ action, saving, onSchedule, onOpen, onComplete }) {
  if (!action) {
    return (
      <section className="gx-ov-next gx-ov-rise" aria-labelledby="gx-next-title">
        <div>
          <p className="gx-ov-kicker" id="gx-next-title">Next action</p>
          <h3>No call or follow-up scheduled</h3>
          <p className="gx-ov-next-copy">Schedule the next conversation with this consultancy.</p>
        </div>
        <div className="gx-ov-next-actions">
          <button type="button" className="gx-lime" onClick={onSchedule} disabled={saving}>Schedule call</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`gx-ov-next gx-ov-rise is-${action.state}`} aria-labelledby="gx-next-title">
      <div>
        <p className="gx-ov-kicker" id="gx-next-title">Next action</p>
        <h3>{action.type}</h3>
        <p className="gx-ov-next-meta">
          <time dateTime={action.scheduledAt}>{exactDateTime(action.scheduledAt)}</time>
          <span>Owner {action.owner}</span>
          <span className={`gx-ov-pill is-${action.state}`}>{actionStateLabel(action.state)}</span>
        </p>
      </div>
      <div className="gx-ov-next-actions">
        <button type="button" className="gx-lime" onClick={onOpen}>Open follow-up</button>
        {action.canComplete ? (
          <button type="button" className="gx-btn" onClick={onComplete} disabled={saving}>Complete</button>
        ) : null}
      </div>
    </section>
  );
}
