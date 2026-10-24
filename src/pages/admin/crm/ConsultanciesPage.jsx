import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createConsultancy, listConsultancies } from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { CONSULTANCY_PIPELINE, pipelineCounts, pipelineLabel } from '../../../utils/consultancyPipeline';
import { Banner, Field, Pagination, PrimaryButton, inputClass } from './crmUi';

const EMPTY_FORM = { name: '', status: 'active', pipelineStage: 'fresh', notes: '' };
const EMPTY_PIPELINE = { total: 0, fresh: 0, contacted: 0, meeting_done: 0, onboarded: 0 };

export default function ConsultanciesPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [applied, setApplied] = useState({ q: '', status: '', pipelineStage: '' });
  const [pipeline, setPipeline] = useState(EMPTY_PIPELINE);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    listConsultancies({ page, limit, q: applied.q, status: applied.status, pipelineStage: applied.pipelineStage }).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result, { expectList: true, emptyMessage: 'No consultancies match this search.' });
      if (interpreted.state === 'ok') {
        setItems(interpreted.data.items);
        setTotal(interpreted.data.total);
        setPipeline(interpreted.data.pipeline || pipelineCounts(interpreted.data.items));
        setNotice((current) => (current && current.tone === 'success' ? current : null));
      } else if (interpreted.state === 'empty') {
        setItems([]);
        setTotal(interpreted.data?.total || 0);
        setPipeline(interpreted.data?.pipeline || EMPTY_PIPELINE);
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
    setApplied({ q: query.trim(), status, pipelineStage: stage });
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
          <input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create consultancy'}</PrimaryButton>
        </div>
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[{ id: '', label: 'Total consultancies', hint: 'In this search', value: pipeline.total }, ...CONSULTANCY_PIPELINE.map((item) => ({ id: item.id, label: item.label, hint: item.hint, value: pipeline[item.id] }))].map((card) => {
          const selected = stage === card.id;
          return (
            <button
              key={card.label}
              type="button"
              aria-pressed={selected}
              className={`rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition ${selected ? 'border-[#003366] ring-2 ring-[#003366]/15' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => {
                const next = selected && card.id ? '' : card.id;
                setStage(next);
                setLoading(true);
                setPage(1);
                setApplied({ q: query.trim(), status, pipelineStage: next });
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#003366]">{card.value}</p>
              <p className="mt-2 text-xs text-gray-500">{card.hint}</p>
            </button>
          );
        })}
      </div>

      <form className="mb-4 flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search consultancies"
        />
        <select className={inputClass} value={stage} onChange={(event) => { const next = event.target.value; setStage(next); setLoading(true); setPage(1); setApplied({ q: query.trim(), status, pipelineStage: next }); }} aria-label="Filter by pipeline stage">
          <option value="">All pipeline stages</option>
          {CONSULTANCY_PIPELINE.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by record status">
          <option value="">Active and inactive</option>
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
                <th className="px-4 py-3 font-medium">Pipeline</th>
                <th className="px-4 py-3 font-medium">Record</th>
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
                  <td className="px-4 py-3">{pipelineLabel(item.pipelineStage)}</td>
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
