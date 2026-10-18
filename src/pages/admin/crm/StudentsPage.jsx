import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createStudent, listConsultancies, listStudents } from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { ADMISSION_STATUSES } from './admissionStatuses';
import { Banner, Field, Pagination, PrimaryButton, inputClass } from './crmUi';

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  city: '',
  notes: '',
  consultancyId: '',
  admissionStatus: 'Not started',
};

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [admission, setAdmission] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [appliedAdmission, setAppliedAdmission] = useState('');
  const [consultancies, setConsultancies] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    listStudents({ page, limit, q: appliedQuery, admissionStatus: appliedAdmission }).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result, { expectList: true, emptyMessage: 'No students match this search.' });
      if (interpreted.state === 'ok') {
        setItems(interpreted.data.items);
        setTotal(interpreted.data.total);
        setNotice((current) => (current && current.tone === 'success' ? current : null));
      } else if (interpreted.state === 'empty') {
        setItems([]);
        setTotal(0);
        setNotice({ tone: 'info', message: interpreted.message });
      } else if (interpreted.state === 'forbidden') {
        setItems([]);
        setNotice({ tone: 'warning', message: interpreted.message });
      } else {
        setItems([]);
        setNotice({ tone: 'error', message: interpreted.message });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, appliedQuery, appliedAdmission, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    listConsultancies({ page: 1, limit: 100, status: 'active' }).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result, { expectList: true });
      setConsultancies(interpreted.state === 'ok' ? interpreted.data.items : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function showPage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  function applySearch(event) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setAppliedQuery(query.trim());
    setAppliedAdmission(admission);
  }

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    setConflict(null);
    if (!form.consultancyId) {
      setSaving(false);
      setNotice({ tone: 'error', message: 'Choose an active consultancy. The student and referral are saved together.' });
      return;
    }
    const result = await createStudent(form);
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setForm(EMPTY_FORM);
      setNotice({ tone: 'success', message: result.message || 'Student created.' });
      setLoading(true);
      setPage(1);
      setReloadKey((current) => current + 1);
      return;
    }
    if (interpreted.state === 'conflict' && interpreted.code === 'duplicate_student' && interpreted.data?.student) {
      setNotice({ tone: 'warning', message: interpreted.message });
      setConflict(interpreted.data.student);
      return;
    }
    if (interpreted.state === 'conflict' && interpreted.code === 'deleted_student_phone') {
      setNotice({ tone: 'warning', message: interpreted.message });
      setConflict(null);
      return;
    }
    setNotice({ tone: interpreted.state === 'forbidden' ? 'warning' : 'error', message: interpreted.message });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#003366]">CRM students</h2>
          <p className="mt-1 text-sm text-gray-500">One canonical profile per Indian mobile number.</p>
        </div>
        <Link to="/admin/crm/consultancies" className="text-sm font-medium text-[#003366] underline">Consultancies</Link>
      </div>
      {notice ? <div className="mb-4"><Banner tone={notice.tone}>{notice.message}</Banner></div> : null}
      {conflict ? (
        <div className="mb-4">
          <Banner tone="warning">
            Existing student: <Link className="underline" to={`/admin/crm/students/${conflict.id}`}>{conflict.fullName}</Link>. Their details were not overwritten.
          </Banner>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <Field label="Name"><input className={inputClass} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength={2} /></Field>
        <Field label="Mobile">
          <input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required aria-describedby="student-phone-help" />
        </Field>
        <Field label="City"><input className={inputClass} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
        <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Notes"><input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <Field label="Consultancy">
          <select className={inputClass} value={form.consultancyId} onChange={(event) => setForm({ ...form, consultancyId: event.target.value })} required>
            <option value="">Select an active consultancy</option>
            {consultancies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Admission status">
          <select className={inputClass} value={form.admissionStatus} onChange={(event) => setForm({ ...form, admissionStatus: event.target.value })}>
            {ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <p id="student-phone-help" className="md:col-span-3 text-xs text-gray-500">Use 10 digits, 91 followed by 10 digits, or +91 followed by 10 digits. The student and the first referral are saved together.</p>
        <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create student'}</PrimaryButton>
      </form>

      <form className="mb-4 flex gap-3" onSubmit={applySearch}>
        <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or mobile" aria-label="Search students" />
        <select className={inputClass} value={admission} onChange={(event) => setAdmission(event.target.value)} aria-label="Filter by admission status">
          <option value="">All admission statuses</option>
          {ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? <p className="p-6 text-sm text-gray-500">Loading students…</p> : null}
        {!loading && items.length > 0 ? (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Admission status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[#003366] underline" to={`/admin/crm/students/${item.id}`}>{item.fullName}</Link>
                  </td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.city || '—'}</td>
                  <td className="px-4 py-3">{item.admissionStatus || 'Not started'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
      {!loading && total > 0 ? <Pagination page={page} limit={limit} total={total} onPage={showPage} /> : null}
    </div>
  );
}
