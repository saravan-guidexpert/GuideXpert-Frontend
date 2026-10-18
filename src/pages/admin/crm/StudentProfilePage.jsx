import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  correctReferralSource,
  createReferral,
  getStudent,
  getStudentReferral,
  listConsultancies,
  listContacts,
  updateStudent,
} from '../../../utils/crmApi';
import { canCorrectCrmReferralSource, interpretCrmResult } from '../../../utils/crmAccess';
import { ADMISSION_STATUSES } from './admissionStatuses';
import { Banner, Field, PrimaryButton, inputClass } from './crmUi';

export default function StudentProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canCorrect = canCorrectCrmReferralSource(user);
  const [seenId, setSeenId] = useState(id);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(null);
  const [referral, setReferral] = useState(null);
  const [consultancies, setConsultancies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [correctionContacts, setCorrectionContacts] = useState([]);
  const [referralForm, setReferralForm] = useState({ consultancyId: '', consultancyContactId: '' });
  const [correction, setCorrection] = useState({ consultancyId: '', consultancyContactId: '', reason: '' });
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  if (seenId !== id) {
    setSeenId(id);
    setLoading(true);
    setStudent(null);
    setForm(null);
    setReferral(null);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStudent(id),
      getStudentReferral(id),
      listConsultancies({ page: 1, limit: 100, status: 'active' }),
    ]).then(([studentResult, referralResult, consultancyResult]) => {
      if (cancelled) return;
      const studentView = interpretCrmResult(studentResult);
      if (studentView.state !== 'ok') {
        setStudent(null);
        setNotice({ tone: studentView.state === 'forbidden' ? 'warning' : 'error', message: studentView.message });
        setLoading(false);
        return;
      }
      const nextStudent = studentView.data.student;
      setStudent(nextStudent);
      setForm({
        fullName: nextStudent.fullName,
        phone: nextStudent.phone,
        email: nextStudent.email || '',
        city: nextStudent.city || '',
        notes: nextStudent.notes || '',
        admissionStatus: nextStudent.admissionStatus || 'Not started',
      });
      const referralView = interpretCrmResult(referralResult);
      setReferral(referralView.state === 'ok' ? referralView.data.referral : null);
      const consultancyView = interpretCrmResult(consultancyResult, { expectList: true });
      setConsultancies(consultancyView.state === 'ok' ? consultancyView.data.items : []);
      if (studentView.state === 'forbidden') {
        setNotice({ tone: 'warning', message: studentView.message });
      } else {
        setNotice(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function loadContacts(consultancyId, assign) {
    if (!consultancyId) {
      assign([]);
      return;
    }
    listContacts(consultancyId, { page: 1, limit: 100, status: 'active' }).then((result) => {
      const interpreted = interpretCrmResult(result, { expectList: true });
      const items = interpreted.state === 'ok' ? interpreted.data.items : [];
      assign(items.filter((contact) => contact.status === 'active'));
    });
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      city: form.city,
      notes: form.notes,
    };
    if (form.admissionStatus !== student.admissionStatus) {
      payload.admissionStatus = form.admissionStatus;
    }
    const result = await updateStudent(id, payload);
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      const saved = interpreted.data.student;
      setStudent(saved);
      setForm({
        fullName: saved.fullName,
        phone: saved.phone,
        email: saved.email || '',
        city: saved.city || '',
        notes: saved.notes || '',
        admissionStatus: saved.admissionStatus || 'Not started',
      });
      setNotice({ tone: 'success', message: result.message || 'Student updated.' });
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  async function onRefer(event) {
    event.preventDefault();
    setSaving(true);
    setConflict(null);
    const result = await createReferral({
      crmStudentId: id,
      consultancyId: referralForm.consultancyId,
      consultancyContactId: referralForm.consultancyContactId || undefined,
    });
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setReferral(interpreted.data.referral);
      setNotice({ tone: 'success', message: result.message || 'Referral recorded.' });
      return;
    }
    if (interpreted.state === 'conflict') {
      const existing = interpreted.data?.referral || referral;
      setConflict(existing);
      if (interpreted.data?.referral) setReferral(interpreted.data.referral);
      setNotice({ tone: 'warning', message: interpreted.message });
      return;
    }
    setNotice({ tone: 'error', message: interpreted.message });
  }

  async function onConfirmCorrection() {
    setSaving(true);
    const result = await correctReferralSource(referral.id, {
      consultancyId: correction.consultancyId,
      consultancyContactId: correction.consultancyContactId || undefined,
      reason: correction.reason.trim(),
    });
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setReferral(interpreted.data.referral);
      setConfirming(false);
      setCorrection({ consultancyId: '', consultancyContactId: '', reason: '' });
      setNotice({ tone: 'success', message: result.message || 'Referral source corrected.' });
      return;
    }
    setNotice({ tone: interpreted.state === 'forbidden' ? 'warning' : 'error', message: interpreted.message });
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading student…</p>;

  const correctionTarget = consultancies.find((item) => item.id === correction.consultancyId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/admin/crm/students" className="text-sm font-medium text-[#003366] underline">Back to CRM students</Link>
      {notice ? <Banner tone={notice.tone}>{notice.message}</Banner> : null}
      {!student || !form ? null : (
        <>
          {student.deletedAt ? <Banner tone="warning">This student is deleted. The profile was not restored.</Banner> : null}
          <form onSubmit={onSave} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl font-bold text-[#003366]">Student profile</h2>
            <Field label="Name"><input className={inputClass} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength={2} /></Field>
            <Field label="Mobile"><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="City"><input className={inputClass} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Notes"><textarea className={inputClass} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <Field label="Admission status">
              <select className={inputClass} value={form.admissionStatus || 'Not started'} onChange={(event) => setForm({ ...form, admissionStatus: event.target.value })}>
                {ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <div className="flex items-end"><PrimaryButton type="submit" disabled={saving || Boolean(student.deletedAt)}>Save profile</PrimaryButton></div>
          </form>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-[#003366]">Original consultancy attribution</h3>
            <p className="mb-4 text-sm text-gray-500">The first referral wins. A later referral from another consultancy does not replace this source.</p>
            {referral ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p><span className="font-medium">Current source:</span> {referral.consultancyName}</p>
                <p><span className="font-medium">Original source:</span> {referral.originalConsultancyName}</p>
                {referral.contactName ? <p><span className="font-medium">Contact:</span> {referral.contactName}</p> : null}
              </div>
            ) : <p className="mb-4 text-sm text-gray-500">No referral has been recorded for this existing student.</p>}
            {conflict ? (
              <div className="mb-4">
                <Banner tone="warning">
                  Existing source remains {conflict.consultancyName || conflict.originalConsultancyName}. It was not changed.
                </Banner>
              </div>
            ) : null}
            {referral ? null : <form onSubmit={onRefer} className="grid gap-3 md:grid-cols-3">
              <Field label="Consultancy">
                <select
                  className={inputClass}
                  value={referralForm.consultancyId}
                  onChange={(event) => {
                    const consultancyId = event.target.value;
                    setReferralForm({ consultancyId, consultancyContactId: '' });
                    setContacts([]);
                    loadContacts(consultancyId, setContacts);
                  }}
                  required
                >
                  <option value="">Select a consultancy</option>
                  {consultancies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Contact">
                <select className={inputClass} value={referralForm.consultancyContactId} onChange={(event) => setReferralForm({ ...referralForm, consultancyContactId: event.target.value })}>
                  <option value="">No contact</option>
                  {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                </select>
              </Field>
              <div className="flex items-end">
                <PrimaryButton type="submit" disabled={saving || !referralForm.consultancyId}>Record referral</PrimaryButton>
              </div>
            </form>}
          </section>

          {canCorrect && referral ? (
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-[#003366]">Correct referral source</h3>
              <p className="mb-4 text-sm text-gray-500">This is an administrative exception. The original source stays in the audit history. Leaving the contact blank clears the recorded contact.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="New consultancy">
                  <select
                    className={inputClass}
                    value={correction.consultancyId}
                    onChange={(event) => {
                      const consultancyId = event.target.value;
                      setCorrection({ ...correction, consultancyId, consultancyContactId: '' });
                      setCorrectionContacts([]);
                      loadContacts(consultancyId, setCorrectionContacts);
                    }}
                  >
                    <option value="">Select a consultancy</option>
                    {consultancies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Field>
                <Field label="New contact">
                  <select className={inputClass} value={correction.consultancyContactId} onChange={(event) => setCorrection({ ...correction, consultancyContactId: event.target.value })}>
                    <option value="">No contact</option>
                    {correctionContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                  </select>
                </Field>
                <Field label="Reason">
                  <textarea className={inputClass} rows={3} value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} minLength={10} required />
                </Field>
              </div>
              <div className="mt-3">
                <PrimaryButton
                  type="button"
                  disabled={correction.reason.trim().length < 10 || !correction.consultancyId}
                  onClick={() => setConfirming(true)}
                >
                  Review correction
                </PrimaryButton>
              </div>
            </section>
          ) : null}
        </>
      )}

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="correction-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 id="correction-title" className="text-lg font-semibold text-[#003366]">Confirm source correction</h3>
            <p className="mt-3 text-sm text-gray-700">
              Change the source from {referral?.consultancyName} to {correctionTarget?.name || 'the selected consultancy'}.
            </p>
            <p className="mt-2 text-sm text-gray-700">Reason: {correction.reason.trim()}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" onClick={() => setConfirming(false)}>Cancel</button>
              <PrimaryButton type="button" disabled={saving} onClick={onConfirmCorrection}>{saving ? 'Saving…' : 'Confirm correction'}</PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
