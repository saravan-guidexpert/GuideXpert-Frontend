import { Link } from 'react-router-dom';

export default function ReferralSources({ sources, total, error, onRetry }) {
  return (
    <section className="gx-panel gx-sources-card" aria-labelledby="gx-sources-title">
      <div className="gx-panel-head">
        <div>
          <h3 id="gx-sources-title">Referral sources</h3>
          <p>Share of recorded referrals by original consultancy.</p>
        </div>
      </div>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : sources.length === 0 ? <p className="gx-help">No referrals recorded yet.</p> : (
        <ol className="gx-board">
          {sources.map((source) => (
            <li key={source.id}>
              <div className="gx-source-row">
                <Link className="gx-ellipsis" to={`/crm/demo/consultancies/${source.id}`}>{source.name}</Link>
                <strong>{source.count}</strong>
              </div>
              <div
                className="gx-track"
                role="img"
                aria-label={`${source.name}: ${source.count} of ${total} referrals, ${source.shareLabel}`}
              >
                <b style={{ width: `${source.shareWidth}%` }} />
              </div>
              <small>{source.shareLabel} of {total} {total === 1 ? 'referral' : 'referrals'} · demo data</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
