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
import { accountBadge, metricText, presenceBadge, snapshotValue } from '../../../../utils/crmWorkspace';

const TONE = {
  online: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  idle: 'bg-amber-50 text-amber-900 ring-amber-200',
  offline: 'bg-gray-100 text-gray-700 ring-gray-200',
};

export function StatusBadge({ kind, value }) {
  const badge = kind === 'presence' ? presenceBadge(value) : accountBadge(value);
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[badge.tone]}`}>
      {badge.label}
    </span>
  );
}

export function MetricCard({ label, value, whenNull, hint }) {
  const shown = metricText(value, whenNull);
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#003366]">{shown.text}</p>
      <p className="mt-1 text-xs text-gray-500">{shown.detail || hint}</p>
    </article>
  );
}

export function SkeletonBlock({ className = 'h-24' }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">{children}</p>;
}

export function AccessNote({ children }) {
  return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{children}</p>;
}

const fieldClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20';

export function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-1 block font-medium">{label}</span>
      <select className={`${fieldClass} w-full`} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function TextField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        className={`${fieldClass} w-full`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function CountChart({ rows, xKey, yKey, label }) {
  if (!rows.length) return <EmptyState>No points to chart for this selection.</EmptyState>;
  return (
    <div className="h-64 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={56} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#003366" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowKey || row.id} className="border-t border-gray-100">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 align-top text-gray-800">{column.render(row)}</td>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-confirm-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="crm-confirm-title" className="text-lg font-semibold text-[#003366]">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy} onClick={onConfirm}>
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
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Date range">
        {PERIODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003366] ${period === id ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-300 bg-white'}`}
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
