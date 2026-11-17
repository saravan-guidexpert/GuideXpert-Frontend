import { useCallback, useEffect, useState } from 'react';
import { FiCheckCircle, FiDownload, FiEye, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { getJeeMockTestResultActivity, getStoredToken } from '../../utils/adminApi';

const FILTERS = [
  { id: '', label: 'All opened' },
  { id: 'downloaded', label: 'Downloaded PDF' },
  { id: 'not_downloaded', label: 'No PDF yet' },
];

const STATUS = {
  REGISTERED_ATTEMPTED: { label: 'Attempted', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REGISTERED_NOT_ATTEMPTED: { label: 'Not attempted', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  RESULT_PENDING: { label: 'Result pending', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function scoreLabel(row) {
  if (row.eligibility !== 'REGISTERED_ATTEMPTED') return '—';
  if (typeof row.overallObtained !== 'number') return 'Not available';
  return typeof row.overallTotal === 'number' ? `${row.overallObtained} / ${row.overallTotal}` : String(row.overallObtained);
}

function readableError(response) {
  if (response?.message && response.message !== 'Invalid response') return response.message;
  if (response?.status === 404) return 'Result activity is not available on this server yet.';
  return 'The activity list could not be loaded. Try again.';
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white px-4 py-3 shadow-card">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-[1.65rem] leading-none font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

export default function JeeMockTestResultActivity() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let response = await getJeeMockTestResultActivity(
      { q: query.trim(), status, page, limit: 25 },
      getStoredToken(),
    );
    if (!response.success && response.message === 'Invalid response') {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      response = await getJeeMockTestResultActivity(
        { q: query.trim(), status, page, limit: 25 },
        getStoredToken(),
      );
    }
    if (!response.success || !Array.isArray(response.data?.rows) || !response.data?.summary) {
      setData(null);
      setError(readableError(response));
      setLoading(false);
      return;
    }
    setData(response.data);
    setLoading(false);
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const rows = data?.rows || [];
  const summary = data?.summary;
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-950">JEE result activity</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-600">
            Who opened the mock test result, and who downloaded the PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Metric label="Opened result" value={summary ? summary.viewed : '—'} hint="Unique students" />
        <Metric label="Downloaded PDF" value={summary ? summary.downloaded : '—'} hint="Result file saved" />
        <Metric label="Opened, no PDF" value={summary ? summary.notDownloaded : '—'} hint="Still waiting on a download" />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200/90 bg-white p-2.5 shadow-card sm:flex-row sm:items-center">
        <label className="relative block min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search name or mobile"
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/70 pr-3 pl-9 text-sm text-gray-900 outline-none focus:border-[#003366] focus:bg-white"
          />
        </label>
        <div className="flex rounded-xl bg-gray-100 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.id || 'all'}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(filter.id);
              }}
              className={`h-8 rounded-lg px-3 text-sm font-medium ${
                status === filter.id ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
          <button type="button" onClick={load} className="h-8 rounded-lg bg-white px-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
            Try again
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-[#F7F8FA] text-[11px] tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold">Result</th>
                <th className="px-4 py-2.5 font-semibold">Opened</th>
                <th className="px-4 py-2.5 font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">Loading result activity…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">Activity did not load.</td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                    No students match this view yet.
                  </td>
                </tr>
              )}
              {!loading && !error && rows.map((row) => {
                const downloaded = row.downloadCount > 0;
                const statusMeta = STATUS[row.eligibility] || { label: 'Opened', className: 'bg-slate-100 text-slate-700 ring-slate-200' };
                return (
                  <tr key={row.mobile} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-950">{row.studentName}</p>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">{row.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <p className="mt-1 text-sm font-medium text-gray-800">{scoreLabel(row)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                        <FiEye className="h-3.5 w-3.5 text-[#0B3B65]" />
                        {row.viewCount} {row.viewCount === 1 ? 'time' : 'times'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">Last {formatWhen(row.lastViewedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {downloaded ? (
                        <>
                          <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                            <FiCheckCircle className="h-3.5 w-3.5" />
                            Downloaded
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {row.downloadCount} {row.downloadCount === 1 ? 'time' : 'times'} · {formatWhen(row.lastDownloadedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="inline-flex items-center gap-1.5 font-medium text-gray-500">
                          <FiDownload className="h-3.5 w-3.5" />
                          Not downloaded
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm text-gray-600">
          <span>{summary ? `${pagination.total} students` : '—'}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="h-8 rounded-lg border border-gray-200 px-3 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="tabular-nums">{summary ? `${pagination.page} / ${pagination.pages}` : '—'}</span>
            <button
              type="button"
              disabled={!summary || page >= pagination.pages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="h-8 rounded-lg border border-gray-200 px-3 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
