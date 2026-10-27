import { useEffect, useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { accountBadge, metricText, presenceBadge, snapshotValue } from '../../../../utils/crmWorkspace';
import { AdminThemeContext, useAdminTheme } from './adminThemeContext';

export function AdminThemeProvider({ theme, children }) {
  return <AdminThemeContext.Provider value={theme}>{children}</AdminThemeContext.Provider>;
}

const TONE = { online: 'is-on', idle: 'is-warn', offline: 'is-off', inactive: 'is-off', invited: 'is-invited' };

export function StatusBadge({ kind, value }) {
  const badge = kind === 'presence' ? presenceBadge(value) : accountBadge(value);
  return <span className={`gx-badge ${TONE[badge.tone] || 'is-off'}`}>{badge.label}</span>;
}

export function MetricCard({ label, value, whenNull, hint }) {
  const shown = metricText(value, whenNull);
  return (
    <article className="gx-kpi">
      <span className="gx-kpi-top"><em>{label}</em></span>
      <strong>{shown.text}</strong>
      <small>{shown.detail || hint}</small>
    </article>
  );
}

export function SkeletonBlock({ className = 'h-24' }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function EmptyState({ children }) {
  return <p className="gx-note">{children}</p>;
}

export function AccessNote({ children }) {
  return <p className="gx-notice warning" role="status">{children}</p>;
}

export function SelectField({ label, value, onChange, children }) {
  return (
    <div className="gx-form">
      <label>
        <span>{label}</span>
        <select className="gx-select" value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
      </label>
    </div>
  );
}

export function TextField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="gx-form">
      <label>
        <span>{label}</span>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export function CountChart({ rows, xKey, yKey, label }) {
  const palette = chartPalette(useAdminTheme());
  if (!rows.length) return <EmptyState>No points to chart for this selection.</EmptyState>;
  return (
    <div className="h-64 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: palette.tick }} interval={0} angle={-28} textAnchor="end" height={56} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: palette.tick }} width={36} />
          <Tooltip />
          <Bar dataKey={yKey} fill={palette.bar} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="gx-table-wrap is-static">
      <table className="gx-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowKey || row.id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChangeList({ changes }) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return <p className="text-sm text-gray-500">No field changes were stored for this event.</p>;
  }
  return (
    <ul className="space-y-2">
      {changes.map((change) => (
        <li key={change.field} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <p className="font-medium text-gray-800">{change.field}</p>
          <p className="text-gray-600">Before: {snapshotValue(change.before, change.beforeMissing)}</p>
          <p className="text-gray-600">After: {snapshotValue(change.after, change.afterMissing)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="gx-modal" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-confirm-title"
        className="gx-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="crm-confirm-title">{title}</h3>
        <p className="gx-help">{body}</p>
        <div className="gx-actions">
          <button ref={cancelRef} type="button" className="gx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="gx-btn" disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const PERIODS = [
  ['7', '7 days'],
  ['30', '30 days'],
  ['90', '90 days'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['custom', 'Custom'],
  ['all', 'All time'],
];

export function PeriodControls({ period, from, to, onPeriod, onFrom, onTo }) {
  return (
    <div className="space-y-3">
      <div className="gx-toolbar" role="group" aria-label="Date range">
        {PERIODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`gx-chip${period === id ? ' is-on' : ''}`}
            onClick={() => onPeriod(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {period === 'custom' ? (
        <div className="flex flex-wrap gap-3">
          <TextField label="From" type="date" value={from} onChange={onFrom} />
          <TextField label="To" type="date" value={to} onChange={onTo} />
        </div>
      ) : null}
    </div>
  );
}
