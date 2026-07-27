import { useCallback, useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from 'react-icons/fi';
import { getCollegeComparisons, getStoredToken } from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import TableSkeleton from '../../components/UI/TableSkeleton';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SnapshotPreview({ snapshot }) {
  if (!snapshot) return <span className="text-slate-400">No snapshot</span>;
  const rows = Array.isArray(snapshot.rows) ? snapshot.rows.slice(0, 4) : [];
  const a = snapshot.institutionA?.name || snapshot.collegeA?.name || 'A';
  const b = snapshot.institutionB?.name || snapshot.collegeB?.name || 'B';
  return (
    <div className="space-y-2 text-xs text-slate-600">
      <p className="font-medium text-slate-800">
        {a} <span className="text-slate-400">vs</span> {b}
      </p>
      {rows.length ? (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.metric || row.factor} className="flex gap-2">
              <span className="min-w-24 font-medium text-slate-700">{row.metric || row.factor}</span>
              <span className="truncate">{row.aValue || row.collegeA || '—'}</span>
              <span className="text-slate-300">/</span>
              <span className="truncate">{row.bValue || row.collegeB || '—'}</span>
              <span className="uppercase text-orange-600">{row.better || row.edge || ''}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Result saved without metric rows.</p>
      )}
      {snapshot.summary ? (
        <p className="text-emerald-700">AI summary included</p>
      ) : null}
    </div>
  );
}

export default function CollegeComparisonsAdmin() {
  const { token: authToken } = useAuth() || {};
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ comparisons: [], total: 0, totalPages: 1, limit: 50 });
  const [expandedId, setExpandedId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = authToken || getStoredToken();
    const result = await getCollegeComparisons(
      {
        page,
        limit: 50,
        q: q.trim() || undefined,
        phone: phone.trim() || undefined,
      },
      token
    );
    if (!result.success) {
      setError(result.message || 'Could not load college comparisons');
      setData({ comparisons: [], total: 0, totalPages: 1, limit: 50 });
      setLoading(false);
      return;
    }
    setData({
      comparisons: result.data?.comparisons || [],
      total: result.data?.total || 0,
      totalPages: result.data?.totalPages || 1,
      limit: result.data?.limit || 50,
      page: result.data?.page || page,
    });
    setLoading(false);
  }, [authToken, page, phone, q]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = (event) => {
    event.preventDefault();
    if (page === 1) {
      load();
      return;
    }
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003366]">
            <FiColumns className="h-5 w-5" />
            <h1 className="text-xl font-semibold">College comparisons</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Who compared which colleges, with saved result snapshots.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="block flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">Search name / college</span>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
              placeholder="e.g. Rahul, NIAT, VIT"
            />
          </div>
        </label>
        <label className="block w-full text-sm sm:w-44">
          <span className="mb-1 block font-medium text-slate-700">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="10 digits"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#00264d]"
        >
          Search
        </button>
      </form>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">College A</th>
                  <th className="px-4 py-3">College B</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.comparisons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No college comparison searches yet.
                    </td>
                  </tr>
                ) : (
                  data.comparisons.map((row) => {
                    const open = expandedId === row.id;
                    return (
                      <tr key={row.id} className="border-t border-slate-100 align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(row.comparedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <FiUser className="mt-0.5 h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-800">{row.fullName || '—'}</p>
                              <p className="text-xs text-slate-500">{row.phone || 'No phone'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.collegeAName || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.collegeBName || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.freeTextUsed ? (
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                Free text
                              </span>
                            ) : null}
                            {row.summaryGenerated ? (
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                AI table
                              </span>
                            ) : null}
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              A:{row.winnersCountA} B:{row.winnersCountB}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? '' : row.id)}
                            className="mb-2 text-xs font-medium text-[#003366] hover:underline"
                          >
                            {open ? 'Hide snapshot' : 'View snapshot'}
                          </button>
                          {open ? <SnapshotPreview snapshot={row.resultSnapshot} /> : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            {data.total} total · page {data.page || page} of {data.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              <FiChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
