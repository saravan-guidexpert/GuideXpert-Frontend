import { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiInbox,
  FiSearch,
  FiSliders,
  FiUsers,
} from 'react-icons/fi';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { useAuth } from '../../hooks/useAuth';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';
import { getMockTestLeads, getStoredToken } from '../../utils/adminApi';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-IN', { dateStyle: 'short' }) +
    ' ' +
    date.toLocaleTimeString('en-IN', { timeStyle: 'short' })
  );
}

function StatusBadge({ completed }) {
  if (completed) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Step 1 only
    </span>
  );
}

const COPY_FIELDS = [
  { key: 'createdAt', label: 'Started' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
  { key: 'name', label: 'Name' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'whatsappNumber', label: 'WhatsApp / alternate' },
  { key: 'collegeName', label: 'College name' },
  { key: 'address', label: 'Address (City / Town)' },
  { key: 'remarks', label: 'Remarks' },
];

function getCellValue(row, key) {
  if (key === 'createdAt' || key === 'submittedAt') return row[key] ? formatDate(row[key]) : '';
  if (key === 'status') return row.formCompleted ? 'Completed' : 'Step 1 only';
  const value = row[key];
  if (value == null || value === '') return '';
  return String(value);
}

const EMPTY_FILTERS = {
  q: '',
  from: '',
  to: '',
  status: '',
};

function FilterField({ label, children }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function MockTestLeads() {
  const { logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [viewAll, setViewAll] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyRecords, setCopyRecords] = useState([]);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef(0);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  useEffect(() => {
    cancelledRef.current = false;
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;

    const params = {
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      status: filters.status || undefined,
      page: viewAll ? 1 : pagination.page,
      limit: viewAll ? ADMIN_VIEW_ALL_LIMIT : pagination.limit,
    };

    queueMicrotask(() => {
      if (cancelledRef.current) return;
      setLoading(true);
      setError('');
    });

    getMockTestLeads(params, getStoredToken()).then((result) => {
      if (cancelledRef.current || thisRequestId !== requestIdRef.current) return;
      setLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setError(result.message || 'Failed to load mock test registrations');
        return;
      }
      setRecords(result.data?.data || []);
      setPagination(result.data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [viewAll, pagination.page, pagination.limit, filters, logout]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page) => {
    const next = Math.max(1, Math.min(page, pagination.totalPages));
    setPagination((prev) => ({ ...prev, page: next }));
  };

  const prepareCopy = async () => {
    setCopyLoading(true);
    setError('');
    const result = await fetchAllPaginatedRows((page, limit) =>
      getMockTestLeads(
        {
          q: filters.q.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          status: filters.status || undefined,
          page,
          limit,
        },
        getStoredToken()
      )
    );
    setCopyLoading(false);
    if (!result.success) {
      const response = result.result;
      if (response?.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setError(response?.message || 'Failed to load registrations for copy');
      return;
    }
    setCopyRecords(result.rows || []);
    setCopyModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FiUsers className="text-primary-navy" aria-hidden />
            Mock Test
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Registrations from the /mock-test form
          </p>
        </div>
        <a
          href="/mock-test"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Public form
        </a>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FiSliders aria-hidden />
          Filters
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Search">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Name, phone, college, city"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                aria-label="Search mock test registrations"
              />
            </div>
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </FilterField>
          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All registrations</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Step 1 only</option>
            </select>
          </FilterField>
        </div>
        {hasActiveFilters ? (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary-navy hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FiAlertCircle aria-hidden />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-3">
          <p className="text-sm text-gray-600">
            {viewAll ? (
              <>
                Showing <span className="font-semibold text-gray-900">{records.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.total}</span> registrations
              </>
            ) : (
              <>
                Page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
                {' · '}
                <span className="font-semibold text-gray-900">{pagination.total}</span> total
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={viewAll}
                onChange={(e) => {
                  setViewAll(e.target.checked);
                  if (!e.target.checked) setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="rounded border-gray-300 text-primary-navy focus:ring-primary-navy"
              />
              View all
            </label>
            <button
              type="button"
              onClick={prepareCopy}
              disabled={copyLoading || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {copyLoading ? 'Preparing…' : 'Copy all'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse p-12 text-center text-gray-500">Loading registrations…</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FiInbox className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden />
            No registrations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-700">Started</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Contact</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">WhatsApp</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">College</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Address</th>
                  <th className="min-w-[160px] px-3 py-3 text-left font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge completed={row.formCompleted} />
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{row.name || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-700">{row.contactNumber || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-700">{row.whatsappNumber || '—'}</td>
                    <td className="px-3 py-3 text-gray-700">{row.collegeName || '—'}</td>
                    <td className="px-3 py-3 text-gray-700">{row.address || '—'}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-gray-600" title={row.remarks || ''}>
                      {row.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !viewAll && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                <FiChevronLeft aria-hidden />
                Prev
              </button>
              <button
                type="button"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
                <FiChevronRight aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <CopyToSheetsModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        fields={COPY_FIELDS}
        records={copyRecords}
        getCellValue={getCellValue}
        recordLabel="registrations"
        dedupeByPhoneKey="contactNumber"
      />
    </div>
  );
}
