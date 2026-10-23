import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiInbox,
  FiSearch,
} from 'react-icons/fi';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { CURRENT_STUDYING_OPTIONS } from '../../constants/jeeMainMockTestForm';
import { useAuth } from '../../hooks/useAuth';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';
import { getJeeMainMockTestLeads, getJeeMainMockTestSummary, getStoredToken } from '../../utils/adminApi';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-IN', { dateStyle: 'short' }) +
    ' ' +
    date.toLocaleTimeString('en-IN', { timeStyle: 'short' })
  );
}

function istTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthCells(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, '0')}`);
  }
  return cells;
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  x: 'X',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

function platformLabel(source) {
  const value = String(source || '').trim();
  if (!value) return '';
  return PLATFORM_LABELS[value.toLowerCase()] || value;
}

const COPY_FIELDS = [
  { key: 'createdAt', label: 'Started' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
  { key: 'influencerName', label: 'Influencer' },
  { key: 'utm_source', label: 'Platform' },
  { key: 'utm_campaign', label: 'Campaign' },
  { key: 'studentName', label: 'Student name' },
  { key: 'mobileNumber', label: 'Mobile number' },
  { key: 'whatsappNumber', label: 'WhatsApp number' },
  { key: 'currentStudying', label: 'Current studying' },
  { key: 'collegeName', label: 'College name' },
  { key: 'location', label: 'Location (City/Town)' },
  { key: 'remarks', label: 'Remarks' },
];

function getCellValue(row, key) {
  if (key === 'createdAt' || key === 'submittedAt') return row[key] ? formatDate(row[key]) : '';
  if (key === 'status') return row.formCompleted ? 'Completed' : 'Step 1 only';
  if (key === 'utm_source') return platformLabel(row.utm_source);
  const value = row[key];
  if (value == null || value === '') return '';
  return String(value);
}

const EMPTY_FILTERS = { q: '', from: '', to: '', status: '', currentStudying: '' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fieldClass =
  'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10';

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function apiErrorMessage(result, fallback) {
  if (result?.status === 404) {
    return 'JEE mock test data is not on the live API yet. Deploy the backend update, then refresh this page.';
  }
  return result?.message || fallback;
}

function StatusBadge({ completed }) {
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Step 1 only
    </span>
  );
}

function InfluencerCell({ row }) {
  const name = String(row.influencerName || '').trim();
  const platform = platformLabel(row.utm_source);
  const campaign = String(row.utm_campaign || '').trim();
  if (!name && !platform) return '—';
  const detail = [name ? platform : '', campaign].filter(Boolean).join(' · ');
  return (
    <div className="min-w-[8rem]" title={[name || platform, detail].filter(Boolean).join(' — ')}>
      <div className="font-medium text-gray-950">{name || platform}</div>
      {detail ? <div className="text-xs text-gray-500">{detail}</div> : null}
    </div>
  );
}

function KpiCard({ label, value, hint, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-white px-4 py-3.5 text-left transition ${
        active ? 'border-primary-navy shadow-sm' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">{label}</span>
      <span className="mt-2 block text-[28px] font-semibold leading-none tabular-nums tracking-tight text-gray-950">{value}</span>
      <span className="mt-2 block text-xs text-gray-500">{hint}</span>
      {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-navy" aria-hidden /> : null}
    </button>
  );
}

export default function JeeMainMockTestLeads() {
  const { logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [month, setMonth] = useState(() => istTodayKey().slice(0, 7));
  const [viewAll, setViewAll] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyRecords, setCopyRecords] = useState([]);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef(0);

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const dayCounts = useMemo(() => {
    const map = new Map();
    (summary?.calendar?.days || []).forEach((day) => map.set(day.date, day.count));
    return map;
  }, [summary]);
  const cells = useMemo(() => monthCells(month), [month]);
  const maxStudying = Math.max(1, ...(summary?.byStudying || []).map((row) => row.count));

  useEffect(() => {
    cancelledRef.current = false;
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    const shared = {
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      status: filters.status || undefined,
      currentStudying: filters.currentStudying || undefined,
    };

    queueMicrotask(() => {
      if (cancelledRef.current) return;
      setLoading(true);
      setError('');
    });

    Promise.all([
      getJeeMainMockTestLeads(
        {
          ...shared,
          page: viewAll ? 1 : pagination.page,
          limit: viewAll ? ADMIN_VIEW_ALL_LIMIT : pagination.limit,
        },
        getStoredToken()
      ),
      getJeeMainMockTestSummary({ ...shared, month }, getStoredToken()),
    ]).then(([listResult, summaryResult]) => {
      if (cancelledRef.current || thisRequestId !== requestIdRef.current) return;
      setLoading(false);
      if (listResult.status === 401 || summaryResult.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      if (!listResult.success) {
        setError(apiErrorMessage(listResult, 'Failed to load JEE mock test registrations'));
        setRecords([]);
      } else {
        setRecords(listResult.data?.data || []);
        setPagination((prev) => ({
          ...prev,
          ...(listResult.data?.pagination || {}),
        }));
      }
      if (summaryResult.success) {
        setSummary(summaryResult.data?.data || null);
      } else if (listResult.success) {
        setError(apiErrorMessage(summaryResult, 'Could not load JEE mock test summary'));
      }
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [filters, month, pagination.page, pagination.limit, viewAll, logout]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    if ((key === 'from' || key === 'to') && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setMonth(value.slice(0, 7));
    }
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const selectDay = (dateKey) => {
    if (filters.from === dateKey && filters.to === dateKey) {
      setFilters((prev) => ({ ...prev, from: '', to: '' }));
    } else {
      setFilters((prev) => ({ ...prev, from: dateKey, to: dateKey }));
      setMonth(dateKey.slice(0, 7));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const prepareCopy = async () => {
    setCopyLoading(true);
    const result = await fetchAllPaginatedRows((page, limit) =>
      getJeeMainMockTestLeads(
        {
          q: filters.q.trim() || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          status: filters.status || undefined,
          currentStudying: filters.currentStudying || undefined,
          page,
          limit,
        },
        getStoredToken()
      )
    );
    setCopyLoading(false);
    if (!result.success) {
      if (result.result?.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setError(result.result?.message || 'Failed to load registrations for copy');
      return;
    }
    setCopyRecords(result.rows || []);
    setCopyModalOpen(true);
  };

  const kpis = summary?.kpis || { total: 0, completed: 0, incomplete: 0, today: 0 };
  const todayKey = summary?.calendar?.today || istTodayKey();
  const completionRate = kpis.total ? Math.round((kpis.completed / kpis.total) * 100) : 0;
  const studyingRows = summary?.byStudying || CURRENT_STUDYING_OPTIONS.map((label) => ({ label, count: 0 }));

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Student registrations, kept separate from Mock Test and 1-on-1 counselling. Times are India time.
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Registrations"
          value={summary ? kpis.total : '—'}
          hint="In the current filters"
          active={!filters.status}
          onClick={() => handleFilterChange('status', '')}
        />
        <KpiCard
          label="Completed"
          value={summary ? kpis.completed : '—'}
          hint={summary ? `${completionRate}% finished both steps` : 'Finished both steps'}
          active={filters.status === 'completed'}
          onClick={() => handleFilterChange('status', filters.status === 'completed' ? '' : 'completed')}
        />
        <KpiCard
          label="In progress"
          value={summary ? kpis.incomplete : '—'}
          hint="Verified, step 2 still open"
          active={filters.status === 'incomplete'}
          onClick={() => handleFilterChange('status', filters.status === 'incomplete' ? '' : 'incomplete')}
        />
        <KpiCard
          label="Today"
          value={summary ? kpis.today : '—'}
          hint="Started today"
          active={filters.from === todayKey && filters.to === todayKey}
          onClick={() => selectDay(todayKey)}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Calendar</h2>
              <p className="mt-0.5 text-xs text-gray-500">{monthLabel(month)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, from: todayKey, to: todayKey }));
                  setMonth(todayKey.slice(0, 7));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="mr-1 h-8 rounded-lg px-2 text-xs font-medium text-primary-navy hover:bg-gray-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonth((current) => shiftMonth(current, -1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
                aria-label="Previous month"
              >
                <FiChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMonth((current) => shiftMonth(current, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
                aria-label="Next month"
              >
                <FiChevronRight aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((dateKey, index) => {
              if (!dateKey) return <span key={`empty-${index}`} className="h-10" />;
              const count = summary ? dayCounts.get(dateKey) || 0 : null;
              const hasRange = Boolean(filters.from && filters.to);
              const inRange = hasRange ? dateKey >= filters.from && dateKey <= filters.to : dateKey === filters.from || dateKey === filters.to;
              const isEdge = dateKey === filters.from || dateKey === filters.to;
              const isToday = dateKey === todayKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDay(dateKey)}
                  className={`flex h-11 flex-col items-center justify-center rounded-lg text-xs tabular-nums ${
                    inRange && isEdge
                      ? 'bg-primary-navy font-medium text-white'
                      : inRange
                        ? 'bg-primary-navy/10 font-medium text-primary-navy'
                        : isToday
                          ? 'font-medium text-primary-navy ring-1 ring-primary-navy/30'
                          : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label={count == null ? dateKey : `${dateKey}, ${count} registrations`}
                >
                  <span>{Number(dateKey.slice(-2))}</span>
                  <span className={`text-[9px] leading-none ${count ? (isEdge ? 'text-white/80' : 'text-primary-navy') : 'text-transparent'}`}>
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-950">Filters</h2>
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary-navy hover:underline">
                Clear all
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FilterField label="Search">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  placeholder="Name, phone, college, city, influencer"
                  className={`${fieldClass} pl-9`}
                  aria-label="Search JEE mock test registrations"
                />
              </div>
            </FilterField>
            <FilterField label="Current studying">
              <select
                value={filters.currentStudying}
                onChange={(e) => handleFilterChange('currentStudying', e.target.value)}
                className={fieldClass}
              >
                <option value="">All classes</option>
                {CURRENT_STUDYING_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={fieldClass}
              >
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Step 1 only</option>
              </select>
            </FilterField>
            <FilterField label="From">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className={fieldClass}
                aria-label="From date"
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                className={fieldClass}
                aria-label="To date"
              />
            </FilterField>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">By current studying</h3>
            <ul className="mt-3 space-y-1">
              {studyingRows.map((row) => {
                const active = filters.currentStudying === row.label;
                const width = summary ? Math.round((row.count / maxStudying) * 100) : 0;
                return (
                  <li key={row.label}>
                    <button
                      type="button"
                      onClick={() =>
                        row.label !== 'Not selected yet' &&
                        handleFilterChange('currentStudying', active ? '' : row.label)
                      }
                      className={`block w-full rounded-lg px-2 py-2 text-left ${
                        active ? 'bg-primary-navy/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm text-gray-800">{row.label}</span>
                        <span className="text-sm font-medium tabular-nums text-gray-900">{summary ? row.count : '—'}</span>
                      </span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-primary-navy" style={{ width: `${width}%` }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-950">Registrations</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {viewAll ? (
                <>
                  {records.length} of {pagination.total}
                </>
              ) : (
                <>
                  {pagination.total} total · page {pagination.page} of {pagination.totalPages}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
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
              className="inline-flex h-9 items-center rounded-lg bg-primary-navy px-3.5 text-sm font-medium text-white transition hover:bg-primary-navy/90 disabled:opacity-50"
            >
              {copyLoading ? 'Preparing…' : 'Copy'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-16 text-center text-sm text-gray-400">Loading registrations…</div>
        ) : records.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <FiInbox className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-gray-700">No registrations in this view</p>
            <p className="mt-1 text-xs text-gray-400">Adjust the calendar or filters to see more.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {['Started', 'Status', 'Influencer', 'Student', 'Mobile', 'WhatsApp', 'Studying', 'College', 'Location', 'Remarks'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge completed={row.formCompleted} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <InfluencerCell row={row} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-950">{row.studentName || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-700">{row.mobileNumber || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-700">{row.whatsappNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.currentStudying || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.collegeName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.location || '—'}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-500" title={row.remarks || ''}>
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
        dedupeByPhoneKey="mobileNumber"
      />
    </div>
  );
}
