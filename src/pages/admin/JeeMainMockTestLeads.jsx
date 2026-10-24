import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiInbox,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { CURRENT_STUDYING_OPTIONS } from '../../constants/jeeMainMockTestForm';
import { useAuth } from '../../hooks/useAuth';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';
import { getJeeMainMockTestLeads, getJeeMainMockTestSummary, getStoredToken } from '../../utils/adminApi';

function formatDateParts(d) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const time = date
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
    .replace(/\s?(am|pm)$/i, (_, mer) => ` ${mer.toUpperCase()}`);
  return { day, time };
}

function formatDate(d) {
  const parts = formatDateParts(d);
  return parts ? `${parts.day}, ${parts.time}` : '—';
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
  'h-10 w-full rounded-lg border border-gray-200 bg-gray-50/70 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-navy focus:bg-white focus:ring-2 focus:ring-primary-navy/10';

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function EmptyMark() {
  return <span className="text-gray-300">—</span>;
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
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Step 1 only
    </span>
  );
}

function InfluencerCell({ row }) {
  const name = String(row.influencerName || '').trim();
  const platform = platformLabel(row.utm_source);
  const campaign = String(row.utm_campaign || '').trim();
  if (!name && !platform) return <EmptyMark />;
  const detail = [name ? platform : '', campaign].filter(Boolean).join(' · ');
  return (
    <div className="min-w-[9rem]" title={[name || platform, detail].filter(Boolean).join(' — ')}>
      <div className="font-medium text-gray-950">{name || platform}</div>
      {detail ? <div className="mt-0.5 text-xs text-gray-500">{detail}</div> : null}
    </div>
  );
}

const KPI_TONES = {
  navy: 'bg-primary-blue-50 text-primary-navy',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
};

function KpiCard({ label, value, hint, active, onClick, icon: Icon, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-white px-4 py-4 text-left shadow-card transition ${
        active
          ? 'border-primary-navy/25 bg-primary-blue-50/40 shadow-[inset_3px_0_0_0_#003366]'
          : 'border-gray-200/90 hover:border-gray-300 hover:shadow-card-hover'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">{label}</span>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${KPI_TONES[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </span>
      <span className="mt-3 block text-[30px] font-semibold leading-none tabular-nums tracking-tight text-gray-950">{value}</span>
      <span className="mt-2.5 block text-xs leading-4 text-gray-500">{hint}</span>
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
    <div className="space-y-4">
      <p className="text-[13px] leading-5 text-gray-500">
        JEE Main mock test registrations, kept separate from Mock Test and 1-on-1 counselling. Times are India time.
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Registrations"
          value={summary ? kpis.total : '—'}
          hint="Matching the current filters"
          active={!filters.status}
          onClick={() => handleFilterChange('status', '')}
          icon={FiUsers}
          tone="navy"
        />
        <KpiCard
          label="Completed"
          value={summary ? kpis.completed : '—'}
          hint={summary ? `${completionRate}% finished both steps` : 'Finished both steps'}
          active={filters.status === 'completed'}
          onClick={() => handleFilterChange('status', filters.status === 'completed' ? '' : 'completed')}
          icon={FiCheckCircle}
          tone="green"
        />
        <KpiCard
          label="In progress"
          value={summary ? kpis.incomplete : '—'}
          hint="Phone verified, step 2 still open"
          active={filters.status === 'incomplete'}
          onClick={() => handleFilterChange('status', filters.status === 'incomplete' ? '' : 'incomplete')}
          icon={FiClock}
          tone="amber"
        />
        <KpiCard
          label="Today"
          value={summary ? kpis.today : '—'}
          hint="Started since midnight, IST"
          active={filters.from === todayKey && filters.to === todayKey}
          onClick={() => selectDay(todayKey)}
          icon={FiCalendar}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Calendar</h2>
              <p className="mt-0.5 text-[13px] font-medium text-gray-700">{monthLabel(month)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, from: todayKey, to: todayKey }));
                  setMonth(todayKey.slice(0, 7));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="mr-1 h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonth((current) => shiftMonth(current, -1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="Previous month"
              >
                <FiChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMonth((current) => shiftMonth(current, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="Next month"
              >
                <FiChevronRight aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 border-b border-gray-100 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((dateKey, index) => {
              if (!dateKey) return <span key={`empty-${index}`} className="h-12" />;
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
                  className={`flex h-12 flex-col items-center justify-center rounded-lg text-[13px] tabular-nums transition ${
                    inRange && isEdge
                      ? 'bg-primary-navy font-semibold text-white shadow-sm'
                      : inRange
                        ? 'bg-primary-blue-50 font-medium text-primary-navy'
                        : isToday
                          ? 'font-semibold text-primary-navy ring-1 ring-inset ring-primary-navy/30'
                          : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label={count == null ? dateKey : `${dateKey}, ${count} registrations`}
                >
                  <span>{Number(dateKey.slice(-2))}</span>
                  <span className={`mt-0.5 text-[10px] font-semibold leading-none ${count ? (isEdge ? 'text-white/85' : 'text-primary-navy') : 'text-transparent'}`}>
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-950">Filters</h2>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
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
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Current studying</h3>
            <ul className="mt-3 space-y-0.5">
              {studyingRows.map((row) => {
                const active = filters.currentStudying === row.label;
                const width = summary && row.count ? Math.max(6, Math.round((row.count / maxStudying) * 100)) : 0;
                const share = summary && kpis.total ? Math.round((row.count / kpis.total) * 100) : 0;
                const selectable = row.label !== 'Not selected yet';
                return (
                  <li key={row.label}>
                    <button
                      type="button"
                      onClick={() => selectable && handleFilterChange('currentStudying', active ? '' : row.label)}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_7.5rem_2rem] items-center gap-3 rounded-lg px-2 py-2 text-left ${
                        active ? 'bg-primary-blue-50' : selectable ? 'hover:bg-gray-50' : ''
                      }`}
                    >
                      <span className={`truncate text-[13px] ${active ? 'font-medium text-primary-navy' : row.count ? 'text-gray-800' : 'text-gray-400'}`}>
                        {row.label}
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className={`block h-full rounded-full ${active ? 'bg-primary-navy' : 'bg-primary-navy/70'}`}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className="text-right text-sm font-semibold tabular-nums text-gray-900" title={summary && kpis.total ? `${share}% of registrations` : undefined}>
                        {summary ? row.count : '—'}
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

      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-950">Registrations</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {viewAll ? (
                <>
                  Showing {records.length} of {pagination.total}
                </>
              ) : (
                <>
                  {pagination.total} total · page {pagination.page} of {pagination.totalPages}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
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
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-navy px-3.5 text-sm font-medium text-white transition hover:bg-primary-navy/90 disabled:opacity-50"
            >
              <FiCopy className="h-3.5 w-3.5" aria-hidden />
              {copyLoading ? 'Preparing…' : 'Copy'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 px-5 py-5" aria-busy="true" aria-label="Loading registrations">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
              <FiInbox className="h-5 w-5 text-gray-400" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium text-gray-800">No registrations in this view</p>
            <p className="mt-1 text-xs text-gray-400">Adjust the calendar or filters to see more.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
                  {['Started', 'Status', 'Influencer', 'Student', 'Mobile', 'WhatsApp', 'Studying', 'College', 'Location', 'Remarks'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((row) => {
                  const started = formatDateParts(row.createdAt);
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {started ? (
                          <div>
                            <div className="text-[13px] font-medium text-gray-800">{started.day}</div>
                            <div className="mt-0.5 text-xs text-gray-400">{started.time}</div>
                          </div>
                        ) : (
                          <EmptyMark />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge completed={row.formCompleted} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        <InfluencerCell row={row} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-950">{row.studentName || <EmptyMark />}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums tracking-tight text-gray-800">{row.mobileNumber || <EmptyMark />}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-gray-600">{row.whatsappNumber || <EmptyMark />}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-700">
                        {row.currentStudying ? (
                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {row.currentStudying}
                          </span>
                        ) : (
                          <EmptyMark />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-700">{row.collegeName || <EmptyMark />}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-600">{row.location || <EmptyMark />}</td>
                      <td className="max-w-[220px] truncate px-4 py-3.5 text-gray-500" title={row.remarks || ''}>
                        {row.remarks || <EmptyMark />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !viewAll && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <FiChevronLeft aria-hidden />
                Prev
              </button>
              <button
                type="button"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
