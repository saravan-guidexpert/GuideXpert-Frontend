import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { interpretCrmResult } from '../../utils/crmAccess';
import { Badge, DataTable, Dialog, MonthSelects, Notice, PageHeader, SearchField } from './CrmKit';
import { currentConsultancyName, inMonthRange, monthKey, shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state };
}

export default function ReferralsPage() {
  const { client, demoManager, refresh } = useCrmDemo();
  const [params, setParams] = useSearchParams();
  const id = params.get('id') || '';
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [tab, setTab] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [notice, setNotice] = useState(null);
  const creating = params.get('new') === '1';
  function setCreating(open) {
    const copy = new URLSearchParams(params);
    if (open) copy.set('new', '1');
    else copy.delete('new');
    setParams(copy, { replace: true });
  }
  const [form, setForm] = useState({ crmStudentId: '', consultancyId: '', consultancyContactId: '' });
  const [correction, setCorrection] = useState({ consultancyId: '', reason: '' });
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const directoryError = [referralsLoad, studentsLoad, consultanciesLoad].find((item) => !item.ok)?.message || '';
  const all = referralsLoad.items;
  const students = studentsLoad.items;
  const consultancies = consultanciesLoad.items;
  const active = consultancies.filter((row) => row.status === 'active');
  const months = [...new Set(all.map((row) => monthKey(row.createdAt)).filter(Boolean))].sort();
  const newest = months[months.length - 1] || '';
  const needle = search.trim().toLowerCase();
  const rows = all.filter((row) => {
    if (source !== 'all' && row.consultancyId !== source && row.originalConsultancyId !== source) return false;
    if (tab === 'corrected' && !row.sourceCorrectedAt) return false;
    if (tab === 'recent' && monthKey(row.createdAt) !== newest) return false;
    if (needle && !`${row.studentName} ${row.consultancyName} ${row.originalConsultancyName}`.toLowerCase().includes(needle)) return false;
    return inMonthRange(row.createdAt, from, to);
  });
  const selected = all.find((row) => row.id === id) || null;
  const selectedMissing = Boolean(id) && !directoryError && !selected;
  const hiddenByFilters = Boolean(selected) && !rows.some((row) => row.id === selected.id);
  const auditsLoad = selected ? loadAll((page) => client.listAudits({ page, limit: 100 })) : { ok: true, items: [], message: '' };
  const audits = selected && auditsLoad.ok ? auditsLoad.items.filter((row) => row.entityId === selected.id) : [];
  const contactsLoad = form.consultancyId
    ? loadAll((page) => client.listContacts(form.consultancyId, { page, limit: 100, status: 'active' }))
    : { ok: true, items: [], message: '' };
  const contacts = contactsLoad.ok ? contactsLoad.items.filter((row) => row.status === 'active') : [];

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createReferral({
      crmStudentId: form.crmStudentId,
      consultancyId: form.consultancyId,
      consultancyContactId: form.consultancyContactId || undefined,
    }));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setCreating(false);
      setForm({ crmStudentId: '', consultancyId: '', consultancyContactId: '' });
      setParams({ id: result.data.referral.id });
    }
  }

  async function onConfirmCorrection() {
    setSaving(true);
    const result = await Promise.resolve(client.correctReferralSource(selected.id, {
      consultancyId: correction.consultancyId,
      reason: correction.reason.trim(),
    }));
    setSaving(false);
    const view = messageOf(result);
    if (view.state === 'ok') {
      setConfirming(false);
      setCorrection({ consultancyId: '', reason: '' });
    }
    setNotice(view);
  }

  return (
    <>
      <PageHeader title="Referrals" subtitle="The first consultancy source is kept unless a simulated demo manager corrects it.">
        <button type="button" className="gx-lime" onClick={() => setCreating(true)}>Record referral</button>
      </PageHeader>
      {directoryError ? (
        <div className="gx-notice error" role="alert">
          <p>{directoryError}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
      <>
      <div className="gx-toolbar">
        <SearchField value={search} onChange={setSearch} label="Search student or consultancy" />
        <select className="gx-select" aria-label="Source consultancy" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="all">All consultancies</option>
          {consultancies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <MonthSelects from={from} to={to} months={months} onFrom={setFrom} onTo={setTo} />
        <span className="gx-count">{rows.length} records</span>
      </div>
      <div className="gx-tabs" role="tablist">
        {[
          { id: 'all', label: 'All', count: all.length },
          { id: 'recent', label: 'Recent', count: all.filter((row) => monthKey(row.createdAt) === newest).length },
          { id: 'corrected', label: 'Corrected source', count: all.filter((row) => row.sourceCorrectedAt).length },
        ].map((item) => (
          <button key={item.id} type="button" className={`gx-tab${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>{item.label} <span>{item.count}</span></button>
        ))}
      </div>
      {!creating && !confirming ? <Notice notice={notice} /> : null}
      <div className={`gx-split${selected || selectedMissing ? ' is-open' : ''}${id ? ' is-routed' : ''}`}>
        <DataTable
          columns={[
            { key: 'student', label: 'Student', render: (row) => <span className="gx-strong">{row.studentName || '—'}</span> },
            { key: 'original', label: 'Original consultancy', render: (row) => row.originalConsultancyName || '—' },
            { key: 'current', label: 'Current consultancy', render: (row) => currentConsultancyName(row, consultancies) },
            { key: 'date', label: 'Referral date', render: (row) => shortDate(row.createdAt) },
            { key: 'status', label: 'Status', render: (row) => <Badge tone={row.sourceCorrectedAt ? 'on' : undefined}>{row.sourceCorrectedAt ? 'Corrected' : 'Original'}</Badge> },
            { key: 'open', label: 'Actions', render: (row) => <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); setParams({ id: row.id }); }}>Open</button> },
          ]}
          rows={rows}
          selectedId={selected?.id}
          onSelect={(nextId) => setParams({ id: nextId })}
          empty="No referrals match these filters."
        />
        {selected ? (
          <aside className="gx-profile gx-referral">
            <section className="gx-co-card">
            <button type="button" className="gx-text gx-back" onClick={() => setParams({})}>Back to list</button>
            {hiddenByFilters ? <p className="gx-note">This referral stays open. The current filters hide it in the list.</p> : null}
            <div className="gx-profile-top">
              <div>
                <p className="gx-kicker">Referral</p>
                <h3>{selected.studentName}</h3>
              </div>
              <div className="gx-co-actions">
                <Badge tone={selected.sourceCorrectedAt ? 'on' : undefined}>{selected.sourceCorrectedAt ? 'Corrected' : 'Original'}</Badge>
                <Link className="gx-lime" to={`/crm/demo/consultancies/${selected.consultancyId}`}>Open consultancy</Link>
              </div>
            </div>
            <dl className="gx-facts">
              <div><dt>Original source</dt><dd>{selected.originalConsultancyName}</dd></div>
              <div><dt>Current source</dt><dd>{currentConsultancyName(selected, consultancies)}{selected.contactName ? ` · ${selected.contactName}` : ''}</dd></div>
              <div><dt>Recorded</dt><dd>{shortDate(selected.createdAt)}</dd></div>
              <div><dt>Student</dt><dd><Link to={`/crm/demo/students/${selected.crmStudentId}`}>{selected.studentName}</Link></dd></div>
            </dl>
            </section>
            <section className="gx-co-card gx-co-audit">
              <p className="gx-kicker">Correction history</p>
              {!auditsLoad.ok ? <p className="gx-note" role="alert">{auditsLoad.message}</p> : audits.length === 0 ? <p className="gx-note">No local audit rows for this referral. This history is not tamper-proof.</p> : audits.map((row) => (
                <p key={row.id} className="gx-note">{row.action} · {row.actorLabel || 'Demo'} · {shortDate(row.createdAt)}{row.reason ? ` · ${row.reason}` : ''}</p>
              ))}
            </section>
            {demoManager ? (
              <section className="gx-co-card"><form className="gx-form" onSubmit={(event) => { event.preventDefault(); setConfirming(true); }}>
                <p className="gx-note">Demo manager mode is simulated in this browser. It is not secure server-side access control. The original consultancy is kept.</p>
                <label>New consultancy
                  <select value={correction.consultancyId} required onChange={(event) => setCorrection({ ...correction, consultancyId: event.target.value })}>
                    <option value="">Select a consultancy</option>
                    {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>Reason<textarea rows={3} minLength={10} maxLength={500} required value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} /></label>
                <button className="gx-lime" type="submit" disabled={correction.reason.trim().length < 10 || !correction.consultancyId}>Review correction</button>
              </form></section>
            ) : <section className="gx-co-card"><p className="gx-note">Source correction stays hidden until simulated demo manager mode is turned on in Settings.</p></section>}
          </aside>
        ) : selectedMissing ? (
          <aside className="gx-profile">
            <button type="button" className="gx-text gx-back" onClick={() => setParams({})}>Back to list</button>
            <p className="gx-note" role="status">Referral not found.</p>
          </aside>
        ) : null}
      </div>
      </>
      )}
      {creating ? (
        <Dialog title="Record referral" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate}>
            <Notice notice={notice} />
            {!contactsLoad.ok ? <p className="gx-note" role="alert">{contactsLoad.message}</p> : null}
            <label>Student
              <select value={form.crmStudentId} required onChange={(event) => setForm({ ...form, crmStudentId: event.target.value })}>
                <option value="">Select a student</option>
                {students.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
              </select>
            </label>
            <label>Consultancy
              <select value={form.consultancyId} required onChange={(event) => setForm({ ...form, consultancyId: event.target.value, consultancyContactId: '' })}>
                <option value="">Select a consultancy</option>
                {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Contact
              <select value={form.consultancyContactId} onChange={(event) => setForm({ ...form, consultancyContactId: event.target.value })}>
                <option value="">No contact</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select>
            </label>
            <p className="gx-help">The first referral wins. A second attempt keeps the original consultancy.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Save referral</button>
          </form>
        </Dialog>
      ) : null}
      {confirming && selected ? (
        <Dialog title="Confirm source correction" onClose={() => setConfirming(false)}>
          <Notice notice={notice} />
          <p className="gx-help">Change the current source from {currentConsultancyName(selected, consultancies)} to {active.find((item) => item.id === correction.consultancyId)?.name}. The original source stays {selected.originalConsultancyName}.</p>
          <p className="gx-help">Reason: {correction.reason.trim()}</p>
          <button type="button" className="gx-lime" disabled={saving} onClick={onConfirmCorrection}>Confirm correction</button>
        </Dialog>
      ) : null}
    </>
  );
}
