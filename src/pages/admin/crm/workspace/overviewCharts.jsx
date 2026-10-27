import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCount } from '../../../../utils/crmOverview';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useAdminTheme } from './adminThemeContext';

function overviewPalette(theme) {
  const base = chartPalette(theme);
  if (theme === 'dark') {
    return { line: '#d6ff4a', fill: '#d6ff4a', fillOpacity: 0.22, grid: base.grid, axis: base.tick, cursor: '#3a404a', surface: '#1c1f26' };
  }
  return { line: '#1c1c1a', fill: '#c6f000', fillOpacity: 0.45, grid: base.grid, axis: base.tick, cursor: '#d5d3ce', surface: '#ffffff' };
}

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function TrendTooltip({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="ov-tip">
      <span>{point.label}</span>
      <strong>{formatCount(point.count)} <em>{point.count === 1 ? 'referral' : 'referrals'}</em></strong>
      <small>{unit}</small>
    </div>
  );
}

export function ReferralTrendChart({ rows, grain, label }) {
  const palette = overviewPalette(useAdminTheme());
  const gradient = `ov-ref-${useId().replace(/:/g, '')}`;
  const unit = grain === 'month' ? 'Month total by referredAt' : 'Day total by referredAt';
  return (
    <>
      <div className="ov-chart" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.fill} stopOpacity={palette.fillOpacity} />
                <stop offset="100%" stopColor={palette.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={palette.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={28}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: palette.axis }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={34}
              tick={{ fontSize: 11, fill: palette.axis }}
            />
            <Tooltip
              content={<TrendTooltip unit={unit} />}
              cursor={{ stroke: palette.cursor, strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={palette.line}
              strokeWidth={2}
              fill={`url(#${gradient})`}
              dot={rows.length <= 12 ? { r: 2.5, fill: palette.line, strokeWidth: 0 } : false}
              activeDot={{ r: 4.5, fill: palette.line, stroke: palette.surface, strokeWidth: 2 }}
              isAnimationActive={!reducedMotion()}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr><th scope="col">{grain === 'month' ? 'Month' : 'Day'}</th><th scope="col">Referrals</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function Sparkline({ rows }) {
  const palette = overviewPalette(useAdminTheme());
  const gradient = `ov-spark-${useId().replace(/:/g, '')}`;
  if (!rows.length) return null;
  return (
    <div className="ov-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.fill} stopOpacity={palette.fillOpacity} />
              <stop offset="100%" stopColor={palette.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, 'dataMax']} />
          <Area
            type="monotone"
            dataKey="count"
            stroke={palette.line}
            strokeWidth={1.5}
            fill={`url(#${gradient})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdmissionPipeline({ bars }) {
  return (
    <ol className="ov-pipe" aria-label="Students by current admission status">
      {bars.rows.map((row) => (
        <li key={row.status} className={`ov-pipe-row is-${row.tone}`}>
          <div className="ov-pipe-meta">
            <span className="ov-pipe-name">{row.status}</span>
            <span className="ov-pipe-num">
              <strong>{formatCount(row.count)}</strong>
              <em>{bars.total ? `${row.share}%` : '—'}</em>
            </span>
          </div>
          <div className="ov-pipe-track" aria-hidden="true">
            <span style={{ width: `${row.count ? Math.max(row.width, 1.5) : 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
