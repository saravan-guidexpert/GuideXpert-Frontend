import { useCallback, useEffect, useState } from 'react';
import { FiCheckCircle, FiDownload, FiEye, FiSearch } from 'react-icons/fi';
import { getJeeMockTestResultActivity, getStoredToken } from '../../utils/adminApi';

const FILTERS = [
  { id: '', label: 'All opened' },
  { id: 'downloaded', label: 'Downloaded PDF' },
  { id: 'not_downloaded', label: 'No PDF yet' },
];

const STATUS_LABELS = {
  REGISTERED_ATTEMPTED: 'Attempted',
  REGISTERED_NOT_ATTEMPTED: 'Not attempted',
  RESULT_PENDING: 'Result pending',
};

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white px-4 py-3.5 shadow-card">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
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
    const response = await getJeeMockTestResultActivity({ q: query.trim(), status, page, limit: 25 }, getStoredToken());
    setLoading(false);
    if (!response.success) {
      setError(response.message || 'Unable to load result activity.');
      return;
    }
    setData(response.data);
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const rows = data?.rows || [];
  const summary = data?.summary || { viewed: 0, downloaded: 0, notDownloaded: 0 };
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-950">JEE result activity</h1>
        <p className="mt-1 text-sm text-gray-600">
          Students who opened their mock test result, and whether they downloaded the PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Opened result" value={summary.viewed} hint="Unique students" />
        <Stat label="Downloaded PDF" value={summary.downloaded} hint="Result file saved" />
        <Stat label="Opened, no PDF" value={summary.notDownloaded} hint="Viewed without a download" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/90 bg-white p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search name or mobile"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pr-3 pl-9 text-sm text-gray-900 outline-none focus:border-[#003366]"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.id || 'all'}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(filter.id);
              }}
              className={`h-9 rounded-lg px-3 text-sm font-medium ${
                status === filter.id ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Opened result</th>
                <th className="px-4 py-3 font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading activity…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No students have opened their result yet.
                  </td>
                </tr>
              )}
              {!loading && rows.map((row) => {
                const downloaded = row.downloadCount > 0;
                return (
                  <tr key={row.mobile} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-950">{row.studentName}</p>
                      <p className="text-xs text-gray-500">{row.mobile}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{STATUS_LABELS[row.eligibility] || 'Opened'}</td>
                    <td className="px-4 py-3 text-gray-700">{scoreLabel(row)}</td>
                    <td className="px-4 py-3">
                      <p className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                        <FiEye className="h-3.5 w-3.5 text-[#0B3B65]" />
                        {row.viewCount} {row.viewCount === 1 ? 'time' : 'times'}
                      </p>
                      <p className="text-xs text-gray-500">Last {formatWhen(row.lastViewedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {downloaded ? (
                        <>
                          <p className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <FiCheckCircle className="h-3.5 w-3.5" />
                            Downloaded
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.downloadCount} {row.downloadCount === 1 ? 'time' : 'times'} · Last {formatWhen(row.lastDownloadedAt)}
                          </p>
                        </>
                      ) : (
                        <p className="inline-flex items-center gap-1.5 text-gray-500">
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
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          <span>{pagination.total} students</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="h-8 rounded-lg border border-gray-200 px-3 disabled:opacity-40"
            >
              Previous
            </button>
            <span>{pagination.page} / {pagination.pages}</span>
            <button
              type="button"
              disabled={page >= pagination.pages || loading}
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
