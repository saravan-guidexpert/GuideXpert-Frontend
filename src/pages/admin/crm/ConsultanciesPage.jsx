import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createConsultancy, listConsultancies } from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { Banner, Field, Pagination, PrimaryButton, inputClass } from './crmUi';

const EMPTY_FORM = { name: '', status: 'active', notes: '' };

export default function ConsultanciesPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ q: '', status: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    listConsultancies({ page, limit, q: applied.q, status: applied.status }).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result, { expectList: true, emptyMessage: 'No consultancies match this search.' });
      if (interpreted.state === 'ok') {
        setItems(interpreted.data.items);
        setTotal(interpreted.data.total);
        setNotice((current) => (current && current.tone === 'success' ? current : null));
      } else if (interpreted.state === 'empty') {
        setItems([]);
        setTotal(interpreted.data?.total || 0);
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
  }, [page, applied]);

  function showPage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  function applySearch(event) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setApplied({ q: query.trim(), status });
  }

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const result = await createConsultancy(form);
    setSaving(false);
    const interpreted = interpretCrmResult(result);
    if (interpreted.state === 'ok') {
      setForm(EMPTY_FORM);
      setNotice({ tone: 'success', message: result.message || 'Consultancy created.' });
      setLoading(true);
      setPage(1);
      setApplied((current) => ({ ...current }));
      return;
    }
    setNotice({ tone: interpreted.state === 'forbidden' ? 'warning' : 'error', message: interpreted.message });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#003366]">Consultancies</h2>
          <p className="mt-1 text-sm text-gray-500">Directory of external admission consultancies.</p>
        </div>
        <Link to="/admin/crm/students" className="text-sm font-medium text-[#003366] underline">
          CRM students
        </Link>
      </div>

      {notice ? <div className="mb-4"><Banner tone={notice.tone}>{notice.message}</Banner></div> : null}

      <form onSubmit={onCreate} className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} />
        </Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Notes">
          <input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create consultancy'}</PrimaryButton>
        </div>
      </form>

      <form className="mb-4 flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search consultancies"
        />
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? <p className="p-6 text-sm text-gray-500">Loading consultancies…</p> : null}
        {!loading && items.length > 0 ? (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Linked students</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[#003366] underline" to={`/admin/crm/consultancies/${item.id}`}>
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.status}</td>
                  <td className="px-4 py-3">{item.studentCount ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}</td>
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
