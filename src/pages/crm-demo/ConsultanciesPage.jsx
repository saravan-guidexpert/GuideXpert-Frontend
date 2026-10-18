import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { interpretCrmResult } from '../../utils/crmAccess';
import { Badge, DataTable, Dialog, Notice, PageHeader, SearchField } from './CrmKit';
import ConsultancyInsight from './ConsultancyInsight';
import { shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';

const EMPTY = { name: '', status: 'active', notes: '' };
const EMPTY_CONTACT = { name: '', phone: '', email: '', role: '' };

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state };
}

export default function ConsultanciesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { client, refresh } = useCrmDemo();
  const search = params.get('q') || '';
  const statusParam = params.get('status');
  const status = statusParam === 'active' || statusParam === 'inactive' ? statusParam : 'all';
  const creating = params.get('new') === '1';
  const sort = params.get('sort') === 'name' ? 'name' : 'updated';
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [addingContact, setAddingContact] = useState(false);
  const [contactEdit, setContactEdit] = useState(null);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);

  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const contactsById = new Map();
  let contactError = '';
  if (consultanciesLoad.ok) {
    consultanciesLoad.items.forEach((row) => {
      const loaded = loadAll((page) => client.listContacts(row.id, { page, limit: 100 }));
      contactsById.set(row.id, loaded.ok ? loaded.items : []);
      if (!loaded.ok && !contactError) contactError = loaded.message;
    });
  }
  const directoryError = (!consultanciesLoad.ok && consultanciesLoad.message) || contactError;
  const all = consultanciesLoad.items;
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const auditsLoad = loadAll((page) => client.listAudits({ page, limit: 100 }));
  const historyError = [referralsLoad, auditsLoad].find((item) => !item.ok)?.message || '';
  const referrals = referralsLoad.items;
  const audits = auditsLoad.items;
  const needle = search.trim().toLowerCase();
  const rows = all.filter((row) => {
    if (status !== 'all' && row.status !== status) return false;
    if (!needle) return true;
    const contacts = contactsById.get(row.id) || [];
    const hay = `${row.name || ''} ${contacts.map((contact) => contact.name || '').join(' ')}`.toLowerCase();
    return hay.includes(needle);
  }).sort((a, b) => (sort === 'name' ? String(a.name || '').localeCompare(String(b.name || '')) : String(b.updatedAt).localeCompare(String(a.updatedAt))));
  const selected = all.find((row) => row.id === id) || null;
  const selectedMissing = Boolean(id) && !directoryError && !selected;
  const contacts = selected ? (contactsById.get(selected.id) || []) : [];
  const mentioned = selected ? referrals.filter((row) => row.consultancyId === selected.id || row.originalConsultancyId === selected.id) : [];
  const linked = mentioned.filter((row) => row.consultancyId === selected.id);
  const history = selected ? audits.filter((row) => row.entityId === selected.id || mentioned.some((item) => item.id === row.entityId)) : [];
  const primary = contacts.find((row) => row.status === 'active');

  function replaceParams(mutate) {
    const copy = new URLSearchParams(params);
    mutate(copy);
    setParams(copy, { replace: true });
  }

  function directoryQuery() {
    const copy = new URLSearchParams(params);
    copy.delete('new');
    const searchText = copy.toString();
    return searchText ? `?${searchText}` : '';
  }

  function setSearch(value) {
    replaceParams((copy) => {
      if (value) copy.set('q', value);
      else copy.delete('q');
    });
  }

  function setStatus(next) {
    replaceParams((copy) => {
      if (next === 'all') copy.delete('status');
      else copy.set('status', next);
    });
  }

  function setSort(next) {
    replaceParams((copy) => {
      if (next === 'name') copy.set('sort', 'name');
      else copy.delete('sort');
    });
  }

  function openConsultancy(nextId) {
    navigate({ pathname: `/crm/consultancies/${nextId}`, search: directoryQuery() });
  }

  function openCreate() {
    setNotice(null);
    replaceParams((copy) => copy.set('new', '1'));
  }

  function closeCreate() {
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createConsultancy(form));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setForm(EMPTY);
      closeCreate();
      navigate({ pathname: `/crm/consultancies/${result.data.consultancy.id}`, search: directoryQuery() });
    }
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.updateConsultancy(selected.id, editForm));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') setEditing(false);
  }

  async function onAddContact(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createContact(selected.id, contactForm));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setContactForm(EMPTY_CONTACT);
      setAddingContact(false);
    }
  }

  async function onSaveContact(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.updateContact(selected.id, contactEdit.id, contactEdit));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') setContactEdit(null);
  }

  async function onDeactivate() {
    const result = await Promise.resolve(client.deactivateContact(selected.id, pending.id));
    setPending(null);
    setNotice(messageOf(result));
  }

  return (
    <>
      <PageHeader title="Consultancies" subtitle="Directory of consultancy profiles, contacts and referred students.">
        <button type="button" className="gx-lime" onClick={openCreate}>Add consultancy</button>
      </PageHeader>
      {directoryError ? (
        <div className="gx-notice error" role="alert">
          <p>{directoryError}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
      <>
      <div className="gx-toolbar">
        <SearchField value={search} onChange={setSearch} label="Search consultancy or contact" />
        <select className="gx-select" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="gx-select" aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updated">Last activity</option>
          <option value="name">Name</option>
        </select>
        <span className="gx-count">{rows.length} records</span>
      </div>
      {!creating && !pending ? <Notice notice={notice} /> : null}
      <div className={`gx-split${selected || selectedMissing ? ' is-open' : ''}${id ? ' is-routed' : ''}`}>
        <DataTable
          columns={[
            { key: 'name', label: 'Consultancy', render: (row) => <span className="gx-strong">{row.name || '—'}</span> },
            { key: 'contact', label: 'Primary contact', render: (row) => (contactsById.get(row.id) || []).find((item) => item.status === 'active')?.name || '—' },
            { key: 'reach', label: 'Phone / email', render: (row) => {
              const contact = (contactsById.get(row.id) || []).find((item) => item.status === 'active');
              return contact?.phone || contact?.email || '—';
            } },
            { key: 'refs', label: 'Linked students', render: (row) => row.studentCount ?? 0 },
            { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'on' : 'off'}>{row.status}</Badge> },
            { key: 'updated', label: 'Last activity', render: (row) => shortDate(row.updatedAt) },
            { key: 'open', label: 'Actions', render: (row) => <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); openConsultancy(row.id); }}>Open</button> },
          ]}
          rows={rows}
          selectedId={selected?.id}
          onSelect={openConsultancy}
          empty="No consultancies match these filters."
        />
        {selected ? (
          <aside className="gx-profile gx-consultancy">
            <section className="gx-co-card">
            <Link className="gx-text gx-back" to={`/crm/consultancies${directoryQuery()}`}>Back to directory</Link>
            {rows.some((row) => row.id === selected.id) ? null : <p className="gx-note">This profile stays open. The current filters hide it in the directory.</p>}
            <div className="gx-profile-top">
              <div>
                <p className="gx-kicker">Consultancy</p>
                <h3>{selected.name}</h3>
              </div>
              <div className="gx-co-actions">
                <Badge tone={selected.status === 'active' ? 'on' : 'off'}>{selected.status}</Badge>
                {editing ? null : <button type="button" className="gx-lime" onClick={() => { setEditing(true); setEditForm({ name: selected.name, status: selected.status, notes: selected.notes || '' }); }}>Edit consultancy</button>}
              </div>
            </div>
            {editing ? (
              <form className="gx-form" onSubmit={onSave}>
                <label>Name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required minLength={2} /></label>
                <label>Status
                  <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label>Notes<textarea rows={3} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} /></label>
                <div className="gx-form-actions">
                  <button type="submit" className="gx-lime" disabled={saving}>Save consultancy</button>
                  <button type="button" className="gx-ghost" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <dl className="gx-facts">
                <div><dt>Primary contact</dt><dd>{primary?.name || 'None'}</dd></div>
                <div><dt>Reach</dt><dd>{primary?.phone || primary?.email || '—'}</dd></div>
                <div><dt>Linked students</dt><dd>{selected.studentCount ?? linked.length}</dd></div>
                <div><dt>Updated</dt><dd>{shortDate(selected.updatedAt)}</dd></div>
              </dl>
            )}
            {selected.notes ? <p className="gx-note">{selected.notes}</p> : null}
            </section>
            <ConsultancyInsight consultancy={selected} contacts={contacts} />
            <section className="gx-co-card">
              <p className="gx-kicker">Contacts</p>
              {contacts.map((contact) => (
                <p key={contact.id} className="gx-list-link">
                  <span><strong>{contact.name}</strong><em>{[contact.status, contact.role, contact.phone, contact.email].filter(Boolean).join(' · ')}</em></span>
                  {contact.status === 'active' ? (
                    <span>
                      <button type="button" className="gx-text" onClick={() => setContactEdit({ id: contact.id, name: contact.name, phone: contact.phone || '', email: contact.email || '', role: contact.role || '' })}>Edit</button>
                      <button type="button" className="gx-text" onClick={() => { setNotice(null); setPending(contact); }}>Deactivate</button>
                    </span>
                  ) : null}
                </p>
              ))}
              {contactEdit ? (
                <form className="gx-form" onSubmit={onSaveContact}>
                  <label>Name<input value={contactEdit.name} onChange={(event) => setContactEdit({ ...contactEdit, name: event.target.value })} required minLength={2} /></label>
                  <label>Mobile<input value={contactEdit.phone} onChange={(event) => setContactEdit({ ...contactEdit, phone: event.target.value })} /></label>
                  <label>Email<input type="email" value={contactEdit.email} onChange={(event) => setContactEdit({ ...contactEdit, email: event.target.value })} /></label>
                  <label>Role<input value={contactEdit.role} onChange={(event) => setContactEdit({ ...contactEdit, role: event.target.value })} /></label>
                  <div className="gx-form-actions">
                    <button className="gx-lime" type="submit" disabled={saving}>Save contact</button>
                    <button className="gx-ghost" type="button" onClick={() => setContactEdit(null)}>Cancel</button>
                  </div>
                </form>
              ) : null}
              {addingContact ? (
                <form className="gx-form" onSubmit={onAddContact}>
                  <p className="gx-note">Add a contact with a mobile number or an email. The same mobile may exist at another consultancy.</p>
                  <label>Name<input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} required minLength={2} /></label>
                  <label>Mobile<input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} /></label>
                  <label>Email<input type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} /></label>
                  <label>Role<input value={contactForm.role} onChange={(event) => setContactForm({ ...contactForm, role: event.target.value })} /></label>
                  <div className="gx-form-actions">
                    <button className="gx-lime" type="submit" disabled={saving}>Save contact</button>
                    <button className="gx-ghost" type="button" onClick={() => setAddingContact(false)}>Cancel</button>
                  </div>
                </form>
              ) : <button type="button" className="gx-btn" onClick={() => setAddingContact(true)}>Add contact</button>}
            </section>
            <section className="gx-co-card gx-co-audit">
              <p className="gx-kicker">Audit</p>
              {historyError ? <p className="gx-note" role="alert">{historyError}</p> : history.length === 0 ? <p className="gx-note">No local audit rows for this consultancy.</p> : history.slice(0, 6).map((row) => (
                <p key={row.id} className="gx-note">{row.action} · {row.actorLabel || 'Demo'} · {shortDate(row.createdAt)}{row.reason ? ` · ${row.reason}` : ''}</p>
              ))}
            </section>
          </aside>
        ) : selectedMissing ? (
          <aside className="gx-profile">
            <Link className="gx-text gx-back" to={`/crm/consultancies${directoryQuery()}`}>Back to directory</Link>
            <p className="gx-note" role="status">Consultancy not found.</p>
          </aside>
        ) : null}
      </div>
      </>
      )}
      {creating ? (
        <Dialog title="Add consultancy" onClose={closeCreate}>
          <form onSubmit={onCreate}>
            <Notice notice={notice} />
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></label>
            <label>Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>Notes<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save consultancy</button>
          </form>
        </Dialog>
      ) : null}
      {pending ? (
        <Dialog title={`Deactivate ${pending.name}?`} onClose={() => setPending(null)}>
          <Notice notice={notice} />
          <p className="gx-help">The contact stays in the local history and can no longer be chosen for a new referral.</p>
          <button type="button" className="gx-lime" onClick={onDeactivate}>Deactivate</button>
        </Dialog>
      ) : null}
    </>
  );
}
