import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createContact,
  deactivateContact,
  getConsultancy,
  listContacts,
  listReferrals,
  updateConsultancy,
  updateContact,
} from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { CONSULTANCY_PIPELINE, consultancyStage } from '../../../utils/consultancyPipeline';
import { Banner, Field, PrimaryButton, inputClass } from './crmUi';

const EMPTY_CONTACT = { name: '', phone: '', email: '', role: '' };

export default function ConsultancyProfilePage() {
  const { id } = useParams();
  const [seenId, setSeenId] = useState(id);
  const [reloadKey, setReloadKey] = useState(0);
  const [consultancy, setConsultancy] = useState(null);
  const [form, setForm] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  if (seenId !== id) {
    setSeenId(id);
    setLoading(true);
    setConsultancy(null);
    setForm(null);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getConsultancy(id),
      listContacts(id, { page: 1, limit: 100 }),
      listReferrals({ page: 1, limit: 50, consultancyId: id }),
    ]).then(([profile, contactResult, referralResult]) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(profile);
      if (interpreted.state !== 'ok') {
        setConsultancy(null);
        setNotice({ tone: interpreted.state === 'forbidden' ? 'warning' : 'error', message: interpreted.message });
        setLoading(false);
        return;
      }
      setConsultancy(interpreted.data.consultancy);
      setForm({
        name: interpreted.data.consultancy.name,
        status: interpreted.data.consultancy.status,
        pipelineStage: consultancyStage(interpreted.data.consultancy.pipelineStage),
        notes: interpreted.data.consultancy.notes || '',
      });
      const contactView = interpretCrmResult(contactResult, { expectList: true, emptyMessage: 'No contacts yet.' });
      setContacts(contactView.state === 'ok' ? contactView.data.items : []);
      const referralView = interpretCrmResult(referralResult, { expectList: true });
      setReferrals(referralView.state === 'ok' ? referralView.data.items : []);
      if (contactView.state === 'forbidden' || referralView.state === 'forbidden') {
        setNotice({ tone: 'warning', message: contactView.message || referralView.message });
      } else if (contactView.state === 'empty') {
        setNotice((current) => (current && current.tone === 'success' ? current : { tone: 'info', message: contactView.message }));
      } else {
        setNotice((current) => (current && current.tone === 'success' ? current : null));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    const result = await updateConsultancy(id, form);
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setNotice({ tone: 'success', message: result.message || 'Consultancy updated.' });
      setConsultancy(interpreted.data.consultancy);
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  async function onAddContact(event) {
    event.preventDefault();
    setSaving(true);
    const result = await createContact(id, contactForm);
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setContactForm(EMPTY_CONTACT);
      setNotice({ tone: 'success', message: result.message || 'Contact created.' });
      refresh();
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  async function onDeactivate(contact) {
    const confirmed = window.confirm(`Deactivate ${contact.name}? The contact record will stay in the history.`);
    if (!confirmed) return;
    const result = await deactivateContact(id, contact.id);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setNotice({ tone: 'success', message: result.message || 'Contact deactivated.' });
      refresh();
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  async function onRename(contact) {
    const name = window.prompt('Contact name', contact.name);
    if (!name || name.trim() === contact.name) return;
    const result = await updateContact(id, contact.id, { name: name.trim() });
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setNotice({ tone: 'success', message: result.message || 'Contact updated.' });
      refresh();
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading consultancy…</p>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/admin/crm/consultancies" className="text-sm font-medium text-[#003366] underline">Back to consultancies</Link>
      {notice ? <Banner tone={notice.tone}>{notice.message}</Banner> : null}
      {!consultancy || !form ? null : (
        <>
          <form onSubmit={onSave} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl font-bold text-[#003366]">Consultancy profile</h2>
            <p className="md:col-span-2 text-sm text-gray-500">Linked students: {consultancy.studentCount ?? 0}. This counts referrals whose current source is this consultancy.</p>
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} />
            </Field>
            <Field label="Pipeline">
              <select className={inputClass} value={form.pipelineStage} onChange={(event) => setForm({ ...form, pipelineStage: event.target.value })}>
                {CONSULTANCY_PIPELINE.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Record status">
              <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
            <div className="flex items-end">
              <PrimaryButton type="submit" disabled={saving}>Save profile</PrimaryButton>
            </div>
          </form>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-[#003366]">Contacts</h3>
            {contacts.length === 0 ? <p className="mb-4 text-sm text-gray-500">No contacts yet.</p> : (
              <ul className="mb-4 divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-500">
                        {[contact.role, contact.phone, contact.email].filter(Boolean).join(' · ') || 'No details'} · {contact.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" onClick={() => onRename(contact)}>Edit name</button>
                      {contact.status === 'active' ? (
                        <button type="button" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700" onClick={() => onDeactivate(contact)}>Deactivate</button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={onAddContact} className="grid gap-3 md:grid-cols-4">
              <Field label="Name"><input className={inputClass} value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} required minLength={2} /></Field>
              <Field label="Mobile"><input className={inputClass} value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} aria-describedby="contact-phone-help" /></Field>
              <Field label="Email"><input className={inputClass} type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} /></Field>
              <Field label="Role"><input className={inputClass} value={contactForm.role} onChange={(event) => setContactForm({ ...contactForm, role: event.target.value })} /></Field>
              <p id="contact-phone-help" className="md:col-span-4 text-xs text-gray-500">Provide a mobile number or an email address. The same mobile can exist at another consultancy.</p>
              <PrimaryButton type="submit" disabled={saving}>Add contact</PrimaryButton>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-[#003366]">Referrals</h3>
            {referrals.length === 0 ? <p className="text-sm text-gray-500">No students are attributed to this consultancy yet.</p> : (
              <ul className="divide-y divide-gray-100">
                {referrals.map((referral) => (
                  <li key={referral.id} className="py-3 text-sm">
                    <Link className="font-medium text-[#003366] underline" to={`/admin/crm/students/${referral.crmStudentId}`}>
                      {referral.studentName || 'Student'}
                    </Link>
                    <span className="text-gray-500"> · {referral.consultancyName}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
