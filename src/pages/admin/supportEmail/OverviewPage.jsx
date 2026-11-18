import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupportEmailOverview } from '../../../utils/adminApi';
import { ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT, formatWhen } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';
import { useAsyncData } from './useAsyncData';

const PRESETS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['custom', 'Custom'],
];

function Bars({ rows, labelKey }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="text-sm text-slate-500">No data in this range.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={`${row[labelKey]}-${row.state || ''}`} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate text-slate-700">{row[labelKey]}{row.state ? ` ${row.state}` : ''}</span>
          <span className="h-2 rounded bg-slate-100">
            <span className="block h-2 rounded bg-slate-700" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
          </span>
          <span className="text-right text-slate-600">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SupportEmailOverview() {
  const [preset, setPreset] = useState('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customIncomplete = preset === 'custom' && (!from || !to);
  const { loading, result, reload } = useAsyncData(
    () => (customIncomplete ? null : getSupportEmailOverview({ preset, from, to })),
    [preset, from, to]
  );
  const error = result && !result.success ? (result.message || ERROR_COPY) : '';
  const overview = result && result.success && !customIncomplete ? result.data.overview : null;
  const state = { loading, error, overview };

  const totals = state.overview ? state.overview.totals : null;
  const cards = totals ? [
    ['Emails', totals.emails],
    ['Processed', totals.processed],
    ['Tickets', totals.tickets],
    ['Pending', totals.pending],
    ['Needs review', totals.needsReview],
    ['Failed', totals.failed],
    ['High priority', totals.highPriority],
    ['Urgent', totals.urgent],
  ] : [];

  return (
    <section className="space-y-4" aria-busy={state.loading}>
      <div className="flex flex-wrap items-end gap-2">
        {PRESETS.map(([value, label]) => (
          <button key={value} type="button" onClick={() => setPreset(value)} className={`rounded-md px-3 py-1.5 text-sm ${preset === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
        ))}
        <button type="button" onClick={reload} className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Refresh</button>
        {preset === 'custom' && (
          <>
            <label className="text-sm text-slate-600">From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-1 rounded border border-slate-300 px-2 py-1" /></label>
            <label className="text-sm text-slate-600">To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-1 rounded border border-slate-300 px-2 py-1" /></label>
          </>
        )}
      </div>
      {customIncomplete && <PanelMessage>Choose a start and end date.</PanelMessage>}
      {state.loading && <PanelMessage>{LOADING_COPY}</PanelMessage>}
      {state.error && <PanelMessage tone="error">{state.error}</PanelMessage>}
      {totals && (
        <>
          <div className={SUPPORT_EMAIL_LAYOUT.stats}>
            {cards.map(([label, value]) => (
              <article key={label} className={`${SUPPORT_EMAIL_LAYOUT.panel} px-3 py-2`}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-900">{value}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`}>
              <h2 className="mb-2 text-sm font-medium text-slate-900">Emails received</h2>
              <Bars rows={state.overview.emailTrend.map((row) => ({ day: row.day, count: row.count }))} labelKey="day" />
            </section>
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`}>
              <h2 className="mb-2 text-sm font-medium text-slate-900">Processing results</h2>
              <Bars rows={state.overview.processingTrend.map((row) => ({ day: `${row.day} ${row.state}`, count: row.count }))} labelKey="day" />
            </section>
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`}>
              <h2 className="mb-2 text-sm font-medium text-slate-900">Categories</h2>
              <Bars rows={state.overview.categories} labelKey="category" />
            </section>
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`}>
              <h2 className="mb-2 text-sm font-medium text-slate-900">Priority and AI</h2>
              <Bars rows={[...state.overview.priorities.map((row) => ({ label: row.priority, count: row.count })), ...state.overview.ai.map((row) => ({ label: `AI ${row.outcome}`, count: row.count }))]} labelKey="label" />
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`} aria-label="Recent tickets">
              <h2 className="mb-2 text-sm font-medium text-slate-900">Recent tickets</h2>
              {(state.overview.recentTickets || []).length === 0 && <p className="text-sm text-slate-500">No tickets in this range.</p>}
              <ul className="space-y-2">
                {(state.overview.recentTickets || []).map((ticket) => (
                  <li key={ticket.id} className="text-sm">
                    <Link className="font-medium text-slate-900 underline" to={`/admin/support-email/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link>
                    <span className="text-slate-700"> {ticket.subject || 'No subject'}</span>
                    <span className="block text-slate-500">{ticket.category} · {ticket.priority} · {ticket.status} · {formatWhen(ticket.receivedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`} aria-label="Recent processing failures">
              <h2 className="mb-2 text-sm font-medium text-slate-900">Recent processing failures</h2>
              {(state.overview.recentFailures || []).length === 0 && <p className="text-sm text-slate-500">No processing failures in this range.</p>}
              <ul className="space-y-2">
                {(state.overview.recentFailures || []).map((failure) => (
                  <li key={failure.id} className="text-sm">
                    <span className="font-medium text-slate-900">{failure.stage} · {failure.state}</span>
                    <span className="text-slate-700"> {failure.subject || 'No subject'}</span>
                    <span className="block text-slate-500">{failure.reason || 'No reason recorded'} · attempts {failure.attempts}/{failure.maxAttempts} · {formatWhen(failure.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
