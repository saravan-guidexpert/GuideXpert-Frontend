import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { trendHasEvents } from '../../../utils/crmConsultancyInsight';

function useCrmDark() {
  const [dark, setDark] = useState(() => document.querySelector('.gx-app')?.getAttribute('data-theme') === 'dark');
  useEffect(() => {
    const node = document.querySelector('.gx-app');
    if (!node) return undefined;
    const read = () => setDark(node.getAttribute('data-theme') === 'dark');
    read();
    const observer = new MutationObserver(read);
    observer.observe(node, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduce(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="gx-ov-tip">
      <p className="gx-ov-tip-date">{point.label}</p>
      <p><span>Original referrals</span> <strong>{point.referrals}</strong></p>
      <p><span>Student registrations</span> <strong>{point.registrations}</strong></p>
    </div>
  );
}

const INTERVAL_LABEL = { day: 'Counted by day', week: 'Counted by week', month: 'Counted by month' };

export default function ReferralTrendChart({ points, rangeLabel, invalid, error, onRetry, rangeControl }) {
  const dark = useCrmDark();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState({ referrals: false, registrations: false });
  const colors = dark
    ? { referrals: '#f3f4f6', registrations: '#d6ff4a', grid: '#343842', tick: '#a3a8b0' }
    : { referrals: '#20231f', registrations: '#6f8f00', grid: '#e6e8e3', tick: '#747970' };
  const hasEvents = trendHasEvents(points);
  const referrals = (points || []).reduce((sum, point) => sum + (point.referrals || 0), 0);
  const registrations = (points || []).reduce((sum, point) => sum + (point.registrations || 0), 0);
  const interval = points?.[0]?.interval;
  const visibleMax = Math.max(0, ...(points || []).flatMap((point) => [
    hidden.referrals ? 0 : point.referrals || 0,
    hidden.registrations ? 0 : point.registrations || 0,
  ]));
  const yMax = Math.max(1, visibleMax);
  const ticks = yMax <= 5 ? Array.from({ length: yMax + 1 }, (_, index) => index) : undefined;
  const summary = `${rangeLabel}. ${referrals} original ${referrals === 1 ? 'referral' : 'referrals'} and ${registrations} student ${registrations === 1 ? 'registration' : 'registrations'}.`;
  const bothHidden = hidden.referrals && hidden.registrations;

  function toggle(key) {
    setHidden((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="gx-ov-card gx-ov-chart gx-ov-rise" aria-labelledby="gx-trend-title">
      <div className="gx-ov-card-head">
        <div>
          <h3 id="gx-trend-title">Referral trends</h3>
          <p className="gx-ov-note">{hasEvents && interval ? INTERVAL_LABEL[interval] : 'Original referrals and student registrations'}</p>
        </div>
        {rangeControl}
      </div>
      {invalid ? <p className="gx-ov-empty">Choose a start date that is on or before the end date.</p> : null}
      {!invalid && error ? (
        <div className="gx-ov-empty" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : null}
      {!invalid && !error && !hasEvents ? (
        <p className="gx-ov-empty">No original referrals or student registrations in this range. Choose a wider range to see earlier records.</p>
      ) : null}
      {!invalid && !error && hasEvents ? (
        <>
          <p className="gx-ov-summary">{summary}</p>
          <div className="gx-ov-legend" role="group" aria-label="Chart series">
            <button type="button" aria-pressed={!hidden.referrals} className={hidden.referrals ? 'is-off' : ''} onClick={() => toggle('referrals')}>
              <i style={{ background: colors.referrals }} aria-hidden="true" /> Original referrals
            </button>
            <button type="button" aria-pressed={!hidden.registrations} className={hidden.registrations ? 'is-off' : ''} onClick={() => toggle('registrations')}>
              <i style={{ background: colors.registrations }} aria-hidden="true" /> Student registrations
            </button>
          </div>
          {bothHidden ? <p className="gx-ov-empty">Both series are hidden. Turn one on to see the chart.</p> : (
            <div className="gx-ov-plot" role="img" aria-label={summary}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="label" minTickGap={28} interval="preserveStartEnd" tick={{ fontSize: 11, fill: colors.tick, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={32} domain={[0, yMax]} ticks={ticks} tick={{ fontSize: 11, fill: colors.tick, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: colors.grid, strokeWidth: 1 }} />
                  <Line type="linear" dataKey="referrals" name="Original referrals" stroke={colors.referrals} strokeWidth={2} dot={points.length <= 45 ? { r: 3, fill: colors.referrals, strokeWidth: 0 } : false} activeDot={{ r: 5 }} hide={hidden.referrals} isAnimationActive={!reduce} animationDuration={240} />
                  <Line type="linear" dataKey="registrations" name="Student registrations" stroke={colors.registrations} strokeWidth={2} dot={points.length <= 45 ? { r: 3, fill: colors.registrations, strokeWidth: 0 } : false} activeDot={{ r: 5 }} hide={hidden.registrations} isAnimationActive={!reduce} animationDuration={240} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="gx-sr">
            <caption>{summary}</caption>
            <thead>
              <tr><th>Period</th><th>Original referrals</th><th>Student registrations</th></tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.key}><td>{point.label}</td><td>{point.referrals}</td><td>{point.registrations}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
