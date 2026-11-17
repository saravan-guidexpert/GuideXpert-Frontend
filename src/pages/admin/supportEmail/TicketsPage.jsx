import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSupportEmailTickets } from '../../../utils/adminApi';
import { EMPTY_COPY, ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';

const CATEGORIES = ['', 'admissions', 'counselling', 'technical', 'billing', 'feedback', 'general', 'other'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'urgent'];
const STATUSES = ['', 'open', 'needs_review', 'in_progress', 'waiting_on_student', 'resolved', 'closed', 'merged'];

function TicketCard({ ticket }) {
  return (
    <Link to={`/admin/support-email/tickets/${ticket.id}`} className={`${SUPPORT_EMAIL_LAYOUT.panel} block p-3 text-sm`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-900">{ticket.ticketNumber}</span>
        <span className="text-slate-500">{ticket.priority}</span>
      </div>
      <p className="mt-1 text-slate-800">{ticket.subject || 'No subject'}</p>
      <p className="text-slate-500">{ticket.sender?.email || 'Unknown sender'} · {ticket.status}</p>
    </Link>
  );
}

export default function SupportEmailTickets({ reviewOnly = false }) {
  const [filters, setFilters] = useState({ q: '', category: '', priority: '', status: reviewOnly ? 'needs_review' : '', sort: 'createdAt', direction: 'desc', page: 1 });
  const [state, setState] = useState({ loading: true, error: '', tickets: [], total: 0 });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    listSupportEmailTickets({ ...filters, review: reviewOnly ? '1' : '' }).then((result) => {
      if (!active) return;
      if (!result.success) setState({ loading: false, error: result.message || ERROR_COPY, tickets: [], total: 0 });
      else setState({ loading: false, error: '', tickets: result.data.tickets || [], total: result.data.total || 0 });
    });
    return () => { active = false; };
  }, [filters, reviewOnly]);

  function update(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }));
  }

  return (
    <section className="space-y-3" aria-busy={state.loading}>
      <h2 className="text-sm font-medium text-slate-900">{reviewOnly ? 'Human review queue' : 'Tickets'}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <input aria-label="Search tickets" value={filters.q} onChange={(event) => update('q', event.target.value)} placeholder="Ticket, subject, or sender" className="rounded border border-slate-300 px-2 py-1.5 text-sm lg:col-span-2" />
        <select aria-label="Category" value={filters.category} onChange={(event) => update('category', event.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm">{CATEGORIES.map((item) => <option key={item || 'all-category'} value={item}>{item || 'All categories'}</option>)}</select>
        <select aria-label="Priority" value={filters.priority} onChange={(event) => update('priority', event.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm">{PRIORITIES.map((item) => <option key={item || 'all-priority'} value={item}>{item || 'All priorities'}</option>)}</select>
        {!reviewOnly && <select aria-label="Status" value={filters.status} onChange={(event) => update('status', event.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm">{STATUSES.map((item) => <option key={item || 'all-status'} value={item}>{item || 'All statuses'}</option>)}</select>}
        <select aria-label="Sort" value={`${filters.sort}:${filters.direction}`} onChange={(event) => {
          const [sort, direction] = event.target.value.split(':');
          setFilters((current) => ({ ...current, sort, direction, page: 1 }));
        }} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
          <option value="createdAt:desc">Newest received</option>
          <option value="createdAt:asc">Oldest received</option>
          <option value="updated:desc">Recently updated</option>
          <option value="priority:desc">Priority</option>
        </select>
      </div>
      {state.loading && <PanelMessage>{LOADING_COPY}</PanelMessage>}
      {state.error && <PanelMessage tone="error">{state.error}</PanelMessage>}
      {!state.loading && !state.error && state.tickets.length === 0 && <PanelMessage>{EMPTY_COPY}</PanelMessage>}
      <div className={SUPPORT_EMAIL_LAYOUT.cards}>
        {state.tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
      </div>
      <div className={SUPPORT_EMAIL_LAYOUT.table}>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Ticket</th>
              <th className="py-2 pr-3 font-medium">Subject</th>
              <th className="py-2 pr-3 font-medium">Sender</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Priority</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Assigned</th>
              <th className="py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {state.tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-slate-100">
                <td className="py-2 pr-3"><Link className="font-medium text-slate-900 underline" to={`/admin/support-email/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link></td>
                <td className="py-2 pr-3">{ticket.subject || 'No subject'}</td>
                <td className="py-2 pr-3">{ticket.sender?.email || 'Unknown sender'}</td>
                <td className="py-2 pr-3">{ticket.category}</td>
                <td className="py-2 pr-3">{ticket.priority}</td>
                <td className="py-2 pr-3">{ticket.status}</td>
                <td className="py-2 pr-3">{ticket.assignedTo?.name || 'Unassigned'}</td>
                <td className="py-2">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{state.total} tickets</span>
        <div className="flex gap-2">
          <button type="button" disabled={filters.page <= 1} onClick={() => update('page', filters.page - 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={filters.page * 20 >= state.total} onClick={() => update('page', filters.page + 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </section>
  );
}
