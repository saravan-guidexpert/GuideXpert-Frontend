import { Link } from 'react-router-dom';

export default function NeedsAttentionPanel({ items, error, onRetry, onOpen }) {
  return (
    <section className="gx-ov-card gx-ov-attention gx-ov-rise" aria-labelledby="gx-attention-title">
      <div className="gx-ov-card-head">
        <h3 id="gx-attention-title">Needs attention</h3>
      </div>
      {error ? (
        <div className="gx-ov-empty" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : null}
      {!error && items.length === 0 ? (
        <p className="gx-ov-empty">Nothing needs attention. Overdue work and missing details will show up here.</p>
      ) : null}
      {items.length ? (
        <div className="gx-ov-attn-list">
          {items.map((item) => {
            const body = (
              <>
                <span className={`gx-ov-sev is-${item.severity}`}>{item.severityLabel}</span>
                <span className="gx-ov-attn-copy">
                  <strong>{item.count == null ? item.label : `${item.count} ${item.label}`}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="gx-ov-attn-go">{item.cta}</span>
              </>
            );
            if (item.action === 'students') {
              return <Link key={item.id} className={`gx-ov-attn is-${item.severity}`} to="/crm/demo/students?tab=open">{body}</Link>;
            }
            return (
              <button key={item.id} type="button" className={`gx-ov-attn is-${item.severity}`} onClick={() => onOpen(item)}>
                {body}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
