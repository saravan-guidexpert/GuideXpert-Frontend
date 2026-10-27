import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCount } from '../../../../utils/crmOverview';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useAdminTheme } from './adminThemeContext';

function opsPalette(theme) {
  const base = chartPalette(theme);
  if (theme === 'dark') {
    return {
      line: '#e8ecf2',
      fill: '#d6ff4a',
      fillOpacity: 0.18,
      bar: '#c5ccd6',
      barMuted: '#5a616c',
      grid: base.grid,
      axis: base.tick,
      cursor: '#3a404a',
      surface: '#1c1f26',
      peak: '#d6ff4a',
    };
  }
  return {
    line: '#1c1c1a',
    fill: '#1c1c1a',
    fillOpacity: 0.08,
    bar: '#2a2a28',
    barMuted: '#c9c6bf',
    grid: base.grid,
    axis: base.tick,
    cursor: '#d5d3ce',
    surface: '#ffffff',
    peak: '#c6f000',
  };
}

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function TrendTip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="ops-tip">
      <span>{point.label}</span>
      <strong>{formatCount(point.count)} <em>{point.count === 1 ? 'referral' : 'referrals'}</em></strong>
      <small>{unit}</small>
    </div>
  );
}

export function OperationsTrendChart({ rows, grain, label, peakKey, onSelect }) {
  const palette = opsPalette(useAdminTheme());
  const gradient = `ops-ref-${useId().replace(/:/g, '')}`;
  const unit = grain === 'month' ? 'Month total by referredAt' : 'Day total by referredAt';

  return (
    <>
      <div className="ops-chart" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
            onClick={(state) => {
              if (!onSelect || !state?.activePayload?.length) return;
              onSelect(state.activePayload[0].payload);
            }}
          >
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
              tickMargin={8}
              minTickGap={32}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: palette.axis }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
              tick={{ fontSize: 11, fill: palette.axis }}
              domain={[0, (max) => Math.max(Number(max) || 0, 1)]}
              tickCount={4}
            />
            <Tooltip content={<TrendTip unit={unit} />} cursor={{ stroke: palette.cursor, strokeDasharray: '3 3' }} isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={palette.line}
              strokeWidth={2}
              fill={`url(#${gradient})`}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                if (cx == null || cy == null) return null;
                const isPeak = peakKey && payload?.key === peakKey && payload.count > 0;
                const show = isPeak || (rows.length <= 14 && payload?.count > 0);
                if (!show) return null;
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isPeak ? 4 : 2.5}
                    fill={isPeak ? palette.peak : palette.line}
                    stroke={palette.surface}
                    strokeWidth={isPeak ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 5, fill: palette.line, stroke: palette.surface, strokeWidth: 2 }}
              isAnimationActive={!reducedMotion()}
              animationDuration={480}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{grain === 'month' ? 'Month' : 'Day'}</th>
            <th scope="col">Referrals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key || row.label}>
              <td>{row.label}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function houseTitle(row) {
  const parts = [`${row.name}: ${formatCount(row.referrals)} new referrals`];
  if (row.previous != null) parts.push(`previous window ${formatCount(row.previous)}`);
  parts.push(`${formatCount(row.students)} current students`);
  return parts.join(' · ');
}

export function ConsultancyCompareChart({ rows, label }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((row) => row.referrals), 0);

  return (
    <ol className="ops-rank" aria-label={label}>
      {rows.map((row) => {
        const width = max > 0 ? (row.referrals / max) * 100 : 0;
        const isPeak = max > 0 && row.referrals === max;
        return (
          <li key={row.id} className={`ops-rank-row${isPeak ? ' is-peak' : ''}`} title={houseTitle(row)}>
            <span className="ops-rank-name">{row.shortName}</span>
            <span className="ops-rank-track" aria-hidden="true">
              <span style={{ width: `${row.referrals ? Math.max(width, 2) : 0}%` }} />
            </span>
            <span className="ops-rank-value">{formatCount(row.referrals)}</span>
          </li>
        );
      })}
    </ol>
  );
}
