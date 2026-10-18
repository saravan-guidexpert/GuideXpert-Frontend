import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { interpretCrmResult } from '../../utils/crmAccess';
import { ADMISSION_STATUSES } from '../../utils/crmDemoStore';
import { Badge, DataTable, Dialog, Notice, PageHeader, SearchField } from './CrmKit';
import { currentConsultancyName, shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

const EMPTY = { fullName: '', phone: '', email: '', city: '', notes: '', consultancyId: '', admissionStatus: 'Not started' };

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state, data: result.data };
}

function directorySearch(params) {
  const copy = new URLSearchParams(params);
  copy.delete('new');
  const search = copy.toString();
  return search ? `?${search}` : '';
}

export default function StudentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { client, demoManager, refresh } = useCrmDemo();
  const search = params.get('q') || '';
  const source = params.get('source') || 'all';
  const admissionParam = params.get('admission');
  const admission = ADMISSION_STATUSES.includes(admissionParam) ? admissionParam : 'all';
  const tabParam = params.get('tab');
  const tab = tabParam === 'referred' || tabParam === 'open' ? tabParam : 'all';
  const creating = params.get('new') === '1';
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY);
  const [referralForm, setReferralForm] = useState({ consultancyId: '', consultancyContactId: '' });
  const [correction, setCorrection] = useState({ consultancyId: '', reason: '' });
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100, q: search.trim() }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const directoryError = [studentsLoad, consultanciesLoad, referralsLoad].find((item) => !item.ok)?.message || '';
  const all = studentsLoad.items;
  const consultancies = consultanciesLoad.items;
  const active = consultancies.filter((row) => row.status === 'active');
  const referrals = referralsLoad.items;
  const referralOf = (studentId) => referrals.find((row) => row.crmStudentId === studentId) || null;
  const rows = all.filter((row) => {
    const referral = referralOf(row.id);
    if (tab === 'referred' && !referral) return false;
    if (tab === 'open' && referral) return false;
    if (source !== 'all' && referral?.consultancyId !== source) return false;
    if (admission !== 'all' && (row.admissionStatus || 'Not started') !== admission) return false;
    return true;
  });
  const selectedResult = id && !directoryError ? client.getStudent(id) : null;
  const selected = selectedResult?.success ? selectedResult.data.student : null;
  const selectedMissing = Boolean(id) && !directoryError && selectedResult && !selectedResult.success;
  const referral = selected ? referralOf(selected.id) : null;
  const hiddenByFilters = Boolean(selected) && !rows.some((row) => row.id === selected.id);
  const contactsLoad = referralForm.consultancyId
    ? loadAll((page) => client.listContacts(referralForm.consultancyId, { page, limit: 100, status: 'active' }))
    : { ok: true, items: [], message: '' };
  const contacts = contactsLoad.ok ? contactsLoad.items.filter((row) => row.status === 'active') : [];
  const auditsLoad = selected ? loadAll((page) => client.listAudits({ page, limit: 100 })) : { ok: true, items: [], message: '' };
  const audits = selected && auditsLoad.ok
    ? auditsLoad.items.filter((row) => row.entityId === selected.id || row.entityId === referral?.id)
    : [];

  function replaceParams(mutate) {
    const copy = new URLSearchParams(params);
    mutate(copy);
    setParams(copy, { replace: true });
  }

  function setSearch(value) {
    replaceParams((copy) => {
      if (value) copy.set('q', value);
      else copy.delete('q');
    });
  }

  function setSource(value) {
    replaceParams((copy) => {
      if (!value || value === 'all') copy.delete('source');
      else copy.set('source', value);
    });
  }

  function setAdmission(value) {
    replaceParams((copy) => {
      if (!value || value === 'all') copy.delete('admission');
      else copy.set('admission', value);
    });
  }

  function selectTab(next) {
    replaceParams((copy) => {
      if (next === 'all') copy.delete('tab');
      else copy.set('tab', next);
    });
  }

  function openCreate() {
    setNotice(null);
    replaceParams((copy) => copy.set('new', '1'));
  }

  function closeCreate() {
    replaceParams((copy) => copy.delete('new'));
  }

  function openStudent(nextId) {
    navigate({ pathname: `/crm/students/${nextId}`, search: directorySearch(params) });
  }

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createStudent(form));
    setSaving(false);
    const view = messageOf(result);
    if (view.state === 'ok') {
      setForm(EMPTY);
      closeCreate();
      setNotice(view);
      navigate({ pathname: `/crm/students/${result.data.student.id}`, search: directorySearch(params) });
      return;
    }
    const existing = result.data && result.data.student;
    setNotice({
      ...view,
      message: existing ? `${view.message} Existing student: ${existing.fullName}. Their details were not overwritten.` : view.message,
    });
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.updateStudent(selected.id, editForm));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setEditing(false);
      setEditForm({ ...editForm, phone: result.data.student.phone });
    }
  }

  async function onRefer(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createReferral({
      crmStudentId: selected.id,
      consultancyId: referralForm.consultancyId,
      consultancyContactId: referralForm.consultancyContactId || undefined,
    }));
    setSaving(false);
    setNotice(messageOf(result));
  }

  async function onConfirmCorrection() {
    setSaving(true);
    const result = await Promise.resolve(client.correctReferralSource(referral.id, {
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

  const dialogOpen = creating || confirming;
  const duplicateLink = notice?.state === 'warning' && notice.data?.student ? (
    <p className="gx-note"><Link to={`/crm/students/${notice.data.student.id}`}>Open {notice.data.student.fullName}</Link></p>
  ) : null;

  return (
    <>
      <PageHeader title="Students" subtitle="One profile per mobile number. The first referral source is kept.">
        <button type="button" className="gx-lime" onClick={openCreate}>Add student</button>
      </PageHeader>
      {directoryError ? (
        <div className="gx-notice error" role="alert">
          <p>{directoryError}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <>
          <div className="gx-toolbar">
            <SearchField value={search} onChange={setSearch} label="Search name or mobile" />
            <select className="gx-select" aria-label="Referring consultancy" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">All consultancies</option>
              {consultancies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="gx-select" aria-label="Admission status" value={admission} onChange={(event) => setAdmission(event.target.value)}>
              <option value="all">All admission statuses</option>
              {ADMISSION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <span className="gx-count">{rows.length} records</span>
          </div>
          <div className="gx-tabs" role="tablist">
            {[
              { id: 'all', label: 'All', count: all.length },
              { id: 'referred', label: 'Referred', count: all.filter((row) => referralOf(row.id)).length },
              { id: 'open', label: 'Open', count: all.filter((row) => !referralOf(row.id)).length },
            ].map((item) => (
              <button key={item.id} type="button" className={`gx-tab${tab === item.id ? ' active' : ''}`} onClick={() => selectTab(item.id)}>{item.label} <span>{item.count}</span></button>
            ))}
          </div>
          {!dialogOpen ? <Notice notice={notice} /> : null}
          {!dialogOpen ? duplicateLink : null}
          <div className={`gx-split${selected || selectedMissing ? ' is-open' : ''}${id ? ' is-routed' : ''}`}>
            <DataTable
              columns={[
                { key: 'name', label: 'Student', render: (row) => <span className="gx-strong">{row.fullName || '—'}</span> },
                { key: 'phone', label: 'Mobile', render: (row) => row.phone || '—' },
                { key: 'source', label: 'Referring consultancy', render: (row) => {
                  const item = referralOf(row.id);
                  return item ? <Link to={`/crm/consultancies/${item.consultancyId}`} onClick={(event) => event.stopPropagation()}>{currentConsultancyName(item, consultancies)}</Link> : '—';
                } },
                { key: 'referred', label: 'Referral date', render: (row) => shortDate(referralOf(row.id)?.createdAt) },
                { key: 'admission', label: 'Admission status', render: (row) => row.admissionStatus || 'Not started' },
                { key: 'open', label: 'Actions', render: (row) => <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); openStudent(row.id); }}>Open</button> },
              ]}
              rows={rows}
              selectedId={selected?.id}
              onSelect={openStudent}
              empty="No students match these filters."
            />
            {selected ? (
              <aside className="gx-profile gx-student">
                <section className="gx-co-card">
                <Link className="gx-text gx-back" to={`/crm/students${directorySearch(params)}`}>Back to directory</Link>
                <div className="gx-profile-top">
                  <div>
                    <p className="gx-kicker">Student</p>
                    <h3>{selected.fullName || '—'}</h3>
                  </div>
                  <div className="gx-co-actions">
                    <Badge tone="on">{selected.admissionStatus || 'Not started'}</Badge>
                    {editing ? null : <button type="button" className="gx-lime" onClick={() => { setEditing(true); setEditForm({ fullName: selected.fullName, phone: selected.phone, email: selected.email || '', city: selected.city || '', notes: selected.notes || '', admissionStatus: selected.admissionStatus || 'Not started' }); }}>Edit profile</button>}
                  </div>
                </div>
                {hiddenByFilters ? <p className="gx-note">This profile stays open. The current filters hide it in the directory.</p> : null}
                <p className="gx-note">The first referral wins. A second referral does not replace the original consultancy.</p>
                {editing ? (
                  <form className="gx-form" onSubmit={onSave}>
                    <label>Name<input value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} required minLength={2} /></label>
                    <label>Mobile<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} required /></label>
                    <label>Email<input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
                    <label>City<input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
                    <label>Admission status
                      <select value={editForm.admissionStatus || 'Not started'} onChange={(event) => setEditForm({ ...editForm, admissionStatus: event.target.value })}>
                        {ADMISSION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>Notes<textarea rows={3} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} /></label>
                    <p className="gx-note">Use 10 digits starting 6–9, or prefix them with 91 or +91. A duplicate number does not replace the existing name.</p>
                    <div className="gx-form-actions">
                      <button className="gx-lime" type="submit" disabled={saving}>Save profile</button>
                      <button className="gx-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <dl className="gx-facts">
                    <div><dt>Mobile</dt><dd>{selected.phone || '—'}</dd></div>
                    <div><dt>Admission status</dt><dd>{selected.admissionStatus || 'Not started'}</dd></div>
                    <div><dt>Referral date</dt><dd>{referral ? shortDate(referral.createdAt) : '—'}</dd></div>
                    <div><dt>Referring consultancy</dt><dd>{referral ? <Link to={`/crm/consultancies/${referral.consultancyId}`}>{currentConsultancyName(referral, consultancies)}</Link> : 'None'}</dd></div>
                  </dl>
                )}
                {referral && referral.originalConsultancyId !== referral.consultancyId ? <p className="gx-note">Original source remains {referral.originalConsultancyName}. Editing this profile does not change it.</p> : null}
                </section>
                {!referral ? <section className="gx-co-card"><form className="gx-form" onSubmit={onRefer}>
                  <label>Consultancy
                    <select value={referralForm.consultancyId} required onChange={(event) => setReferralForm({ consultancyId: event.target.value, consultancyContactId: '' })}>
                      <option value="">Select a consultancy</option>
                      {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>Contact
                    <select value={referralForm.consultancyContactId} onChange={(event) => setReferralForm({ ...referralForm, consultancyContactId: event.target.value })}>
                      <option value="">No contact</option>
                      {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                    </select>
                  </label>
                  {!contactsLoad.ok ? <p className="gx-note" role="alert">{contactsLoad.message}</p> : null}
                  <button className="gx-lime" type="submit" disabled={saving || !referralForm.consultancyId}>Record referral</button>
                </form></section> : null}
                {demoManager && referral ? (
                  <section className="gx-co-card"><form className="gx-form" onSubmit={(event) => { event.preventDefault(); setConfirming(true); }}>
                    <p className="gx-note">Demo manager mode is simulated in this browser. It is not secure authorization. The original consultancy stays on record.</p>
                    <label>New consultancy
                      <select value={correction.consultancyId} required onChange={(event) => setCorrection({ ...correction, consultancyId: event.target.value })}>
                        <option value="">Select a consultancy</option>
                        {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label>Reason<textarea rows={3} minLength={10} maxLength={500} required value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} /></label>
                    <button className="gx-lime" type="submit" disabled={correction.reason.trim().length < 10 || !correction.consultancyId}>Review correction</button>
                  </form></section>
                ) : null}
                {!demoManager ? <section className="gx-co-card"><p className="gx-note">Source correction stays hidden until simulated demo manager mode is turned on in Settings.</p></section> : null}
                {!auditsLoad.ok ? <section className="gx-co-card"><p className="gx-note" role="alert">{auditsLoad.message}</p></section> : audits.length ? (
                  <section className="gx-co-card gx-co-audit">
                    <p className="gx-kicker">Audit</p>
                    {audits.slice(0, 4).map((row) => (
                      <p key={row.id} className="gx-note">{row.action} · {row.actorLabel || 'Demo'} · {shortDate(row.createdAt)}{row.reason ? ` · ${row.reason}` : ''}</p>
                    ))}
                  </section>
                ) : null}
              </aside>
            ) : selectedMissing ? (
              <aside className="gx-profile">
                <Link className="gx-text gx-back" to={`/crm/students${directorySearch(params)}`}>Back to directory</Link>
                <p className="gx-note" role="status">Student not found.</p>
              </aside>
            ) : null}
          </div>
        </>
      )}
      {creating ? (
        <Dialog title="Add student" onClose={closeCreate}>
          <form onSubmit={onCreate}>
            <Notice notice={notice} />
            {duplicateLink}
            <label>Name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength={2} /></label>
            <label>Mobile<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
            <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Referring consultancy
              <select value={form.consultancyId} required onChange={(event) => setForm({ ...form, consultancyId: event.target.value })}>
                <option value="">Select an active consultancy</option>
                {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Admission status
              <select value={form.admissionStatus} onChange={(event) => setForm({ ...form, admissionStatus: event.target.value })}>
                {ADMISSION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <p className="gx-help">An active consultancy is required. Saving creates the student and the original referral together. A duplicate mobile number does not replace the existing student.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Save student</button>
          </form>
        </Dialog>
      ) : null}
      {confirming && referral ? (
        <Dialog title="Confirm source correction" onClose={() => setConfirming(false)}>
          <Notice notice={notice} />
          <p className="gx-help">Change the current source from {currentConsultancyName(referral, consultancies)} to {active.find((item) => item.id === correction.consultancyId)?.name}. The original source stays {referral.originalConsultancyName}.</p>
          <p className="gx-help">Reason: {correction.reason.trim()}</p>
          <button type="button" className="gx-lime" disabled={saving} onClick={onConfirmCorrection}>Confirm correction</button>
        </Dialog>
      ) : null}
    </>
  );
}
