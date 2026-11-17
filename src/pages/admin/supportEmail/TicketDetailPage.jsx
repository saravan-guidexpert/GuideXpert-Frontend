import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStoredToken, getSupportEmailTicket, reviewSupportEmailTicket, supportEmailAttachmentUrl } from '../../../utils/adminApi';
import { ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';

const CATEGORIES = ['admissions', 'counselling', 'technical', 'billing', 'feedback', 'general', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'needs_review', 'in_progress', 'waiting_on_student', 'resolved', 'closed', 'merged'];

async function downloadAttachment(id, name) {
  const response = await fetch(supportEmailAttachmentUrl(id), {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!response.ok) throw new Error('attachment_unavailable');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name || 'attachment';
  link.click();
  URL.revokeObjectURL(url);
}

export default function SupportEmailTicketDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', ticket: null, saving: false, notice: '' });
  const [form, setForm] = useState(null);

  function load() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    getSupportEmailTicket(id).then((result) => {
      if (!result.success) {
        setState({ loading: false, error: result.message || ERROR_COPY, ticket: null, saving: false, notice: '' });
        return;
      }
      const ticket = result.data.ticket;
      setForm({ category: ticket.category, subCategory: ticket.subCategory || '', priority: ticket.priority, status: ticket.status, note: '' });
      setState({ loading: false, error: '', ticket, saving: false, notice: '' });
    });
  }

  useEffect(() => { load(); }, [id]);

  async function save(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, notice: '' }));
    const result = await reviewSupportEmailTicket(id, form);
    if (!result.success) {
      setState((current) => ({ ...current, saving: false, notice: result.message || ERROR_COPY }));
      return;
    }
    const refreshed = await getSupportEmailTicket(id);
    if (!refreshed.success) {
      setState((current) => ({ ...current, saving: false, notice: refreshed.message || ERROR_COPY }));
      return;
    }
    const ticket = refreshed.data.ticket;
    setForm({ category: ticket.category, subCategory: ticket.subCategory || '', priority: ticket.priority, status: ticket.status, note: '' });
    setState({ loading: false, error: '', ticket, saving: false, notice: 'Review saved. No email was sent.' });
  }

  if (state.loading) return <PanelMessage>{LOADING_COPY}</PanelMessage>;
  if (state.error) return <PanelMessage tone="error">{state.error}</PanelMessage>;
  const ticket = state.ticket;
  const classification = ticket.classification || {};

  return (
    <article className="space-y-4">
      <header>
        <h2 className="text-base font-semibold text-slate-900">{ticket.ticketNumber}</h2>
        <p className="text-sm text-slate-700">{ticket.subject}</p>
        <p className="text-sm text-slate-500">{ticket.sender?.name} · {ticket.sender?.email} · {ticket.receivedAt ? new Date(ticket.receivedAt).toLocaleString() : ''}</p>
      </header>
      <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3`}>
        <h3 className="text-sm font-medium text-slate-900">Original email</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{ticket.bodyText || 'No text body was stored.'}</p>
      </section>
      <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h3 className="font-medium text-slate-900">Classification</h3>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-slate-500">Summary</dt><dd>{classification.summary || ticket.summary || 'No summary'}</dd></div>
          <div><dt className="text-slate-500">Category</dt><dd>{classification.category || ticket.category} / {classification.subcategory || ticket.subCategory || 'none'}</dd></div>
          <div><dt className="text-slate-500">Intent and sentiment</dt><dd>{classification.intent || 'unknown'} · {classification.sentiment || ticket.sentiment}</dd></div>
          <div><dt className="text-slate-500">Priority and urgency</dt><dd>{classification.priority || ticket.priority} · {classification.urgency || 'unspecified'}</dd></div>
          <div><dt className="text-slate-500">Confidence</dt><dd>{classification.confidence == null ? 'Not scored' : classification.confidence}</dd></div>
          <div><dt className="text-slate-500">Recommended action</dt><dd>{classification.recommendedAction || 'None recorded'}</dd></div>
          <div><dt className="text-slate-500">Review reason</dt><dd>{classification.reviewReason || 'Not flagged'}</dd></div>
          <div><dt className="text-slate-500">Sheets</dt><dd>{ticket.sheets?.state}{ticket.sheets?.rowNumber ? ` row ${ticket.sheets.rowNumber}` : ''}{ticket.sheets?.lastError ? ` · ${ticket.sheets.lastError}` : ''}</dd></div>
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-900">Conversation</h3>
        {(ticket.conversation || []).map((message) => (
          <article key={message.id} className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
            <p className="text-slate-500">{message.sender?.email} · {message.receivedAt ? new Date(message.receivedAt).toLocaleString() : ''}</p>
            <p className="font-medium text-slate-900">{message.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.bodyText}</p>
          </article>
        ))}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-900">Attachments</h3>
        {(ticket.attachments || []).length === 0 && <PanelMessage>No attachments were stored.</PanelMessage>}
        {(ticket.attachments || []).map((file) => (
          <article key={file.id} className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{file.name}</p>
              <p className="text-slate-500">{file.contentType} · {file.size} bytes · {file.extractStatus}</p>
            </div>
            {file.extractError && <p className="text-slate-600">Extraction: {file.extractError}. Image text and scanned PDFs are not read.</p>}
            {file.extractedText && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-slate-800">{file.extractedText}</pre>}
            {file.hasFile ? (
              <button type="button" className="mt-2 rounded border border-slate-300 px-2 py-1" onClick={() => downloadAttachment(file.id, file.name)}>Download</button>
            ) : <p className="mt-2 text-slate-500">The file bytes are no longer stored.</p>}
          </article>
        ))}
      </section>
      <form onSubmit={save} className={`${SUPPORT_EMAIL_LAYOUT.panel} grid gap-2 p-3 sm:grid-cols-2`}>
        <h3 className="sm:col-span-2 text-sm font-medium text-slate-900">Review decision</h3>
        <label className="text-sm">Category
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-sm">Subcategory
          <input value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="text-sm">Priority
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1">{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-sm">Status
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1">{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="text-sm sm:col-span-2">Note
          <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" rows={3} />
        </label>
        <button type="submit" disabled={state.saving} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 sm:col-span-2">{state.saving ? 'Saving' : 'Save review'}</button>
        {state.notice && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{state.notice}</p>}
      </form>
    </article>
  );
}
