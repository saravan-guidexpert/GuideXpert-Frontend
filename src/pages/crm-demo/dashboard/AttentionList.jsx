import { Link } from 'react-router-dom';

function headline(item) {
  const count = item.count;
  if (item.id === 'unreferred') return `${count} student${count === 1 ? '' : 's'} without a referral`;
  if (item.id === 'untouched') return `${count} referral${count === 1 ? '' : 's'} without a status update`;
  if (item.id === 'inactive') return `${count} inactive consultanc${count === 1 ? 'y' : 'ies'}`;
  if (item.id === 'inactive-source') return `${count} referral${count === 1 ? '' : 's'} tied to an inactive source`;
  return item.title;
}

export default function AttentionList({ items, error, onRetry }) {
  const unreferred = items.find((item) => item.id === 'unreferred');
  return (
    <section className="gx-panel gx-attention-card" aria-labelledby="gx-attention-title">
      <div className="gx-panel-head"><h3 id="gx-attention-title">Needs attention</h3></div>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : items.length === 0 ? <p className="gx-help">Nothing in the local records needs attention.</p> : (
        <div className="gx-attention">
          {items.map((item) => (
            <Link key={item.id} to={item.href}>
              <span>
                <strong>{headline(item)}</strong>
                <small>{item.detail}</small>
              </span>
            </Link>
          ))}
          {unreferred ? (
            <Link className="is-plain" to={unreferred.href}>
              <span><strong>Open a student without a referral</strong></span>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
