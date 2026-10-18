import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartPalette } from '../crmTheme';
import { useCrmDemo } from '../useCrmDemo';
import { PERIODS, axisMax } from './dashboardModel';

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const total = Number(point.students || 0) + Number(point.referrals || 0);
  return (
    <div className="gx-tip" role="tooltip">
      <strong>{total}</strong>
      <span>{point.label} · {point.students} students · {point.referrals} referrals</span>
    </div>
  );
}

function barKey(entry) {
  return entry?.payload?.key || entry?.key || '';
}

function GrowthChart({ points, picked, onSelect }) {
  const { theme } = useCrmDemo();
  const palette = chartPalette(theme);
  const dense = points.length > 16;
  const rows = points.map((point) => ({
    ...point,
    total: Number(point.students || 0) + Number(point.referrals || 0),
  }));
  const peak = rows.reduce((best, point) => (point.total > (best?.total || 0) ? point : best), null);
  const hot = picked || (peak && peak.total > 0 ? peak.key : '');
  const yMax = axisMax(points);
  function select(entry) {
    const key = barKey(entry);
    const point = points.find((item) => item.key === key);
    if (key) onSelect(key, point);
  }
  return (
    <div className="gx-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barCategoryGap={dense ? '18%' : '22%'} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gx-hot-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d6ff4a" />
              <stop offset="100%" stopColor="#8adf2a" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis dataKey="label" interval={dense ? 4 : 0} tick={{ fill: palette.tick, fontSize: 11, fontFamily: 'Satoshi, Source Sans 3, Inter, sans-serif' }} axisLine={false} tickLine={false} dy={8} />
          <YAxis domain={[0, yMax]} allowDecimals={false} width={28} tick={{ fill: palette.tick, fontSize: 11, fontFamily: 'Satoshi, Source Sans 3, Inter, sans-serif' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={false} content={<Tip />} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} isAnimationActive={false} />
          <Bar dataKey="total" name="Records" radius={[12, 12, 12, 12]} maxBarSize={dense ? 22 : 48} isAnimationActive={false} onClick={select}>
            {rows.map((point) => (
              <Cell key={point.key} fill={point.key === hot && point.total > 0 ? 'url(#gx-hot-bar)' : palette.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="gx-sr">
        <caption>Students and referrals by period</caption>
        <thead>
          <tr><th>Period</th><th>Students</th><th>Referrals</th></tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}><td>{point.fullLabel}</td><td>{point.students}</td><td>{point.referrals}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GrowthPanel({
  period,
  onPeriod,
  subtitle,
  chart,
  picked,
  onSelect,
  error,
  onRetry,
}) {
  return (
    <section className="gx-panel gx-chart-card" aria-labelledby="gx-growth-title">
      <div className="gx-panel-head">
        <div>
          <h3 id="gx-growth-title">Student & Referral Growth</h3>
          <p>{subtitle}</p>
        </div>
        <label className="gx-year">
          <select aria-label="Chart period" value={period} onChange={(event) => onPeriod(event.target.value)}>
            {PERIODS.map((item) => (
              <option key={item.id} value={item.id}>{item.id === 'year' ? new Date().getFullYear() : item.full}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="gx-legend">
        <span><i className="is-students" />Other months</span>
        <span><i className="is-referrals" />Busiest month</span>
        {picked ? <span><i className="is-lime" />Selected</span> : null}
      </p>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : !chart.hasActivity ? (
        <div className="gx-empty-block">
          <p>{chart.points.length === 0 ? 'No students or referrals are on file yet.' : 'No students or referrals were recorded in this period.'}</p>
        </div>
      ) : (
        <GrowthChart points={chart.points} picked={picked} onSelect={onSelect} />
      )}
    </section>
  );
}
