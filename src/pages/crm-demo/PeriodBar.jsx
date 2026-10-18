const PERIODS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

export default function PeriodBar({ period, onPeriod, from, to, onFrom, onTo }) {
  return (
    <div className="gx-period-bar">
      <div className="gx-periods" role="radiogroup" aria-label="Date range">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={period === item.id}
            className={period === item.id ? 'is-on' : ''}
            onClick={() => onPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === 'custom' ? (
        <div className="gx-range">
          <label>From
            <input type="date" value={from} max={to || undefined} onChange={(event) => onFrom(event.target.value)} />
          </label>
          <label>To
            <input type="date" value={to} min={from || undefined} onChange={(event) => onTo(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
