import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStoredToken, getSupportEmailTicket, reviewSupportEmailTicket, supportEmailAttachmentUrl } from '../../../utils/adminApi';
import { ERROR_COPY, LOADING_COPY, NO_OCR_NOTICE, SUPPORT_EMAIL_LAYOUT, attachmentNotAnalysed, formatWhen } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';
import { useAsyncData } from './useAsyncData';

export const SAVED_COPY = 'Review saved. No email was sent.';
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

function recipientList(list) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) return 'None recorded';
  return rows.map((row) => row.email || row.name).join(', ');
}

function historyLine(row) {
  if (row.kind === 'ai_run') {
    return `AI classification ${row.state} · ${row.model || 'model'} · prompt ${row.promptVersion || 'unknown'} · confidence ${row.confidence == null ? 'n/a' : row.confidence}`;
  }
  if (row.kind === 'single_email_test') return `Single email test ${row.state}${row.promptVersion ? ` · prompt ${row.promptVersion}` : ''}`;
  return `${row.stage} ${row.state} · attempts ${row.attempts}/${row.maxAttempts}`;
}

export default function SupportEmailTicketDetail() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  function formFrom(ticket) {
    return { category: ticket.category, subCategory: ticket.subCategory || '', priority: ticket.priority, status: ticket.status, note: '' };
  }

  const { loading, result, replace } = useAsyncData(
    () => getSupportEmailTicket(id),
    [id],
    (response) => {
      if (response && response.success) setForm(formFrom(response.data.ticket));
      setNotice('');
    }
  );
  const state = {
    loading: loading && !result,
    error: result && !result.success ? (result.message || ERROR_COPY) : '',
    ticket: result && result.success ? result.data.ticket : null,
    saving,
    notice
  };

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice('');
    const reviewed = await reviewSupportEmailTicket(id, form);
    if (!reviewed.success) {
      setSaving(false);
      setNotice(reviewed.message || ERROR_COPY);
      return;
    }
    const refreshed = await getSupportEmailTicket(id);
    setSaving(false);
    if (!refreshed.success) {
      setNotice(refreshed.message || ERROR_COPY);
      return;
    }
    setForm(formFrom(refreshed.data.ticket));
    replace(refreshed);
    setNotice(SAVED_COPY);
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
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div><dt className="inline text-slate-500">To: </dt><dd className="inline">{recipientList(ticket.recipients?.to)}</dd></div>
          <div><dt className="inline text-slate-500">Cc: </dt><dd className="inline">{recipientList(ticket.recipients?.cc)}</dd></div>
          <div className="sm:col-span-2"><dt className="inline text-slate-500">Message id: </dt><dd className="inline break-all">{ticket.internetMessageId || 'Not recorded'}</dd></div>
          <div><dt className="inline text-slate-500">Processing: </dt><dd className="inline">{ticket.pipeline?.state || 'received'}</dd></div>
          <div><dt className="inline text-slate-500">Retries: </dt><dd className="inline">{ticket.retry?.totalAttempts ?? 0} attempts · {ticket.retry?.failedJobs ?? 0} failed jobs{ticket.retry?.lastError ? ` · last error ${ticket.retry.lastError}` : ''}</dd></div>
        </dl>
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
            {attachmentNotAnalysed(file) && <p className="mt-1 text-amber-800" role="note">{NO_OCR_NOTICE}</p>}
            {file.extractError && <p className="text-slate-600">Extraction: {file.extractError}</p>}
            {file.extractedText && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-slate-800">{file.extractedText}</pre>}
            {file.hasFile ? (
              <button type="button" className="mt-2 rounded border border-slate-300 px-2 py-1" onClick={() => downloadAttachment(file.id, file.name)}>Download</button>
            ) : <p className="mt-2 text-slate-500">The file bytes are no longer stored.</p>}
          </article>
        ))}
      </section>
      <section className="space-y-2" aria-label="Processing history">
        <h3 className="text-sm font-medium text-slate-900">Processing history</h3>
        {(ticket.processingHistory || []).length === 0 && <PanelMessage>No processing history was recorded.</PanelMessage>}
        <ul className="space-y-1 text-sm">
          {(ticket.processingHistory || []).map((row, index) => (
            <li key={`${row.kind}-${row.at}-${index}`} className={`${SUPPORT_EMAIL_LAYOUT.panel} p-2`}>
              <span className="text-slate-900">{historyLine(row)}</span>
              <span className="block text-slate-500">{formatWhen(row.at)}{row.error ? ` · ${row.error}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2" aria-label="Audit history">
        <h3 className="text-sm font-medium text-slate-900">Audit history</h3>
        {(ticket.auditHistory || []).length === 0 && <PanelMessage>No audit entries were recorded.</PanelMessage>}
        <ul className="space-y-1 text-sm">
          {(ticket.auditHistory || []).map((row) => (
            <li key={row.id} className={`${SUPPORT_EMAIL_LAYOUT.panel} p-2`}>
              <span className="text-slate-900">{row.action.replace(/_/g, ' ')} by {row.actor}</span>
              <span className="block text-slate-500">{formatWhen(row.createdAt)}{row.details?.outcome ? ` · ${row.details.outcome}` : ''}</span>
            </li>
          ))}
        </ul>
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
        {state.notice && (state.notice === SAVED_COPY
          ? <p className="text-sm text-green-800 sm:col-span-2" role="status">{state.notice}</p>
          : <p className="text-sm text-red-700 sm:col-span-2" role="alert">{state.notice}</p>)}
      </form>
    </article>
  );
}
