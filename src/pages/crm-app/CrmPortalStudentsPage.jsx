import { useEffect, useState } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { crmPortalGet, crmPortalSend } from '../../utils/crmSessionApi';
import { useCrmSession } from './useCrmSession';

const EMPTY = { fullName: '', phone: '', city: '', consultancyId: '' };

export default function CrmPortalStudentsPage() {
  const { user } = useCrmSession();
  const canRead = crmCan(user, 'crm.students.read');
  const canCreate = crmCan(user, 'crm.students.create');
  const canUpdate = crmCan(user, 'crm.students.update');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [consultancies, setConsultancies] = useState([]);

  function load(search) {
    setLoading(true);
    crmPortalGet('/students', { page: 1, limit: 50, q: search }).then((result) => {
      setLoading(false);
      if (!result.success) {
        setItems([]);
        setNotice({ tone: 'error', text: result.message || 'Students could not be loaded.' });
        return;
      }
      setNotice(null);
      setItems(result.data?.items || []);
    });
  }

  useEffect(() => {
    if (!canRead) return undefined;
    let cancelled = false;
    crmPortalGet('/students', { page: 1, limit: 50, q: applied }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setItems([]);
        setNotice({ tone: 'error', text: result.message || 'Students could not be loaded.' });
        return;
      }
      setNotice(null);
      setItems(result.data?.items || []);
    });
    return () => {
      cancelled = true;
    };
  }, [applied, canRead]);

  useEffect(() => {
    if (!canCreate) return undefined;
    let cancelled = false;
    crmPortalGet('/consultancies', { page: 1, limit: 100 }).then((result) => {
      if (cancelled || !result.success) return;
      setConsultancies(result.data?.items || []);
    });
    return () => {
      cancelled = true;
    };
  }, [canCreate]);

  async function onCreate(event) {
    event.preventDefault();
    if (saving || !form.consultancyId) return;
    setSaving(true);
    const result = await crmPortalSend('/students', 'POST', form);
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', text: result.message || 'Student was not created.' });
      return;
    }
    setForm(EMPTY);
    setNotice({ tone: 'success', text: result.message || 'Student created.' });
    load(applied);
  }

  async function onUpdate(event) {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    const result = await crmPortalSend(`/students/${editing.id}`, 'PATCH', { fullName: editing.fullName, city: editing.city });
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', text: result.message || 'Student was not updated.' });
      return;
    }
    setEditing(null);
    setNotice({ tone: 'success', text: 'Student updated.' });
    load(applied);
  }

  if (!canRead) {
    return (
      <section>
        <header className="gx-page-head"><div><h2 className="gx-title">Students</h2></div></header>
        <p>This section is outside your CRM permissions.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Students</h2>
          <p>Production records for accounts that can read students.</p>
        </div>
      </header>
      <form className="gx-form gx-portal-form" onSubmit={(event) => { event.preventDefault(); setApplied(query.trim()); }}>
        <input aria-label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or phone" />
        <button className="gx-ghost" type="submit">Search</button>
      </form>
      {notice ? (
        <div className={`gx-notice ${notice.tone === 'success' ? 'success' : 'error'}`} role="alert">
          <p>{notice.text}</p>
          {notice.tone === 'error' ? <button type="button" className="gx-ghost" onClick={() => load(applied)}>Retry</button> : null}
        </div>
      ) : null}
      {loading ? <p>Loading students…</p> : null}
      {!loading && items.length === 0 && !notice ? <p>No students yet.</p> : null}
      {!loading && items.length > 0 ? (
        <div className="gx-table-wrap">
          <table className="gx-table">
            <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Status</th>{canUpdate ? <th>Actions</th> : null}</tr></thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.fullName}</td>
                  <td>{row.phone}</td>
                  <td>{row.city || '—'}</td>
                  <td>{row.admissionStatus || 'Not started'}</td>
                  {canUpdate ? <td><button type="button" className="gx-text" onClick={() => setEditing({ id: row.id, fullName: row.fullName, city: row.city || '' })}>Edit</button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canCreate ? (
        <form className="gx-form gx-portal-form" onSubmit={onCreate}>
          <h3>Add student</h3>
          <label>
            <span>Consultancy</span>
            <select aria-label="Student consultancy" value={form.consultancyId} onChange={(event) => setForm({ ...form, consultancyId: event.target.value })}>
              <option value="">Select a consultancy</option>
              {consultancies.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label><span>Name</span><input aria-label="Student name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label><span>Phone</span><input aria-label="Student phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label><span>City</span><input aria-label="Student city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <button className="gx-lime" type="submit" disabled={saving || !form.consultancyId}>{saving ? 'Saving…' : 'Create student'}</button>
        </form>
      ) : null}
      {editing ? (
        <form className="gx-form gx-portal-form" onSubmit={onUpdate}>
          <h3>Edit student</h3>
          <label><span>Name</span><input aria-label="Edit student name" value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></label>
          <label><span>City</span><input aria-label="Edit student city" value={editing.city} onChange={(event) => setEditing({ ...editing, city: event.target.value })} /></label>
          <button className="gx-lime" type="submit" disabled={saving}>Save changes</button>
          <button className="gx-ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      ) : null}
    </section>
  );
}
