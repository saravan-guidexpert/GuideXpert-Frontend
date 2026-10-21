export default function ConsultancyMetricCard({ label, value, hint, icon: Icon, tone, onClick }) {
  const textual = typeof value !== 'number';
  return (
    <button type="button" className={`gx-ov-kpi${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      <span className="gx-ov-kpi-k">
        <span className="gx-ov-kpi-ico" aria-hidden="true">{Icon ? <Icon size={14} strokeWidth={1.75} /> : null}</span>
        {label}
      </span>
      <span className={`gx-ov-kpi-v${textual ? ' is-text' : ''}`}>{value}</span>
      <span className="gx-ov-kpi-h" title={hint}>{hint}</span>
    </button>
  );
}
