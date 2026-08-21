import { useState, useEffect, useRef, Fragment } from 'react';
import { getTrainingFeedback, getCertifiedCounsellors2627, getStoredToken } from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import {
  FiMessageSquare,
  FiUsers,
  FiUser,
  FiSearch,
  FiSliders,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiInbox,
  FiChevronDown,
  FiChevronUp,
  FiCopy
} from 'react-icons/fi';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { dateStyle: 'short' }) + ' ' + date.toLocaleTimeString('en-IN', { timeStyle: 'short' });
}

function formatDob(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

const COPY_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'mobileNumber', label: 'Mobile' },
  { key: 'whatsappNumber', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'DOB' },
  { key: 'educationQualification', label: 'Education' },
  { key: 'yearsOfExperience', label: 'YOE' },
  { key: 'addressOfCommunication', label: 'Address' },
  { key: 'createdAt', label: 'Submitted' },
];

function getFeedbackCellValue(row, key) {
  const v = row[key];
  if (key === 'createdAt') return v ? formatDate(v) : '';
  if (key === 'dateOfBirth') return v ? formatDob(v) : '';
  if (v == null || v === '') return '';
  return String(v);
}

export default function TrainingFeedback({ cohort = '25-26' } = {}) {
  const is2627 = cohort === '26-27';
  const title = is2627 ? 'Certified counsellors 26-27' : 'Onboarded counsellors 25-26';
  const subtitle = is2627
    ? 'Activation submissions from the 26–27 counsellor cohort'
    : 'Activation submissions from the 25–26 counsellor cohort';
  const fetchFn = is2627 ? getCertifiedCounsellors2627 : getTrainingFeedback;
  const { logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalSubmissions: 0, uniqueCount: 0, duplicateCount: 0, byGender: {} });
  const [filters, setFilters] = useState({
    q: '',
    from: '',
    to: '',
    gender: '',
    occupation: ''
  });
  const [expandedId, setExpandedId] = useState(null);
  const [viewAll, setViewAll] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyRecords, setCopyRecords] = useState([]);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    const page = viewAll ? 1 : pagination.page;
    const limit = viewAll ? ADMIN_VIEW_ALL_LIMIT : pagination.limit;
    const params = {
      page,
      limit,
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      gender: filters.gender || undefined,
      occupation: filters.occupation.trim() || undefined
    };
    queueMicrotask(() => {
      if (cancelledRef.current) return;
      setLoading(true);
      setError('');
    });
    fetchFn(params, getStoredToken()).then((result) => {
      if (cancelledRef.current) return;
      if (thisRequestId !== requestIdRef.current) return;
      setLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setRecords([]);
        setError(result.message || 'Failed to load submissions');
        return;
      }
      const raw = result.data;
      const dataList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const paginationData = raw?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 };
      const responseStats = raw?.stats ?? {};
      setRecords(dataList);
      setPagination(paginationData);
      setStats({
        totalSubmissions: responseStats.totalSubmissions ?? 0,
        uniqueCount: responseStats.uniqueCount ?? paginationData.total ?? 0,
        duplicateCount: responseStats.duplicateCount ?? 0,
        byGender: responseStats.byGender || {}
      });
    });
    return () => { cancelledRef.current = true; };
  }, [viewAll, pagination.page, pagination.limit, filters.q, filters.from, filters.to, filters.gender, filters.occupation, fetchFn, logout]);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(p, pagination.totalPages));
    setPagination((prev) => ({ ...prev, page: next }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: '', from: '', to: '', gender: '', occupation: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleViewAllChange = (e) => {
    setViewAll(e.target.checked);
    if (!e.target.checked) setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = filters.q || filters.from || filters.to || filters.gender || filters.occupation;

  const prepareCopyRecords = async () => {
    setCopyLoading(true);
    setError('');
    const baseParams = {
      q: filters.q.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      gender: filters.gender || undefined,
      occupation: filters.occupation.trim() || undefined
    };
    const result = await fetchAllPaginatedRows((page, limit) =>
      fetchFn({ ...baseParams, page, limit }, getStoredToken())
    );
    setCopyLoading(false);
    if (!result.success) {
      const r = result.result;
      if (r?.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
        setError(r?.message || 'Failed to load submissions for copy');
      return;
    }
    setCopyRecords(result.rows || []);
    setCopyModalOpen(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-1">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-[#003366] to-[#004080] text-white shadow-lg">
            <FiMessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-[#003366] to-[#004080]" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#003366]/10 text-[#003366]">
                <FiUsers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-emerald-500" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600">
                <FiUsers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Unique (after dedupe)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-amber-500" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600">
                <FiAlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Duplicates removed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.duplicateCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-slate-400" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600">
                <FiUser className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">By gender (unique)</p>
                <p className="text-sm font-bold text-gray-900">Male {stats.byGender?.Male ?? 0} · Female {stats.byGender?.Female ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-6">
        <div className="bg-linear-to-r from-gray-50 to-slate-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <FiSliders className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-800">Filters</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search name, email, mobile..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] outline-none text-sm"
                aria-label="Search feedback"
              />
            </div>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[140px]"
              aria-label="From date"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[140px]"
              aria-label="To date"
            />
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[120px]"
              aria-label="Gender"
            >
              <option value="">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <input
              type="text"
              placeholder="Occupation"
              value={filters.occupation}
              onChange={(e) => handleFilterChange('occupation', e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#003366]/20 outline-none text-sm min-w-[140px]"
              aria-label="Occupation"
            />
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 ml-2 pl-2 border-l border-gray-200">
              <input
                type="checkbox"
                checked={viewAll}
                onChange={handleViewAllChange}
                className="rounded border-gray-300 text-primary-blue-500 focus:ring-primary-blue-500"
                aria-label="View all feedback in one list"
              />
              View all
            </label>
            <button
              type="button"
              onClick={prepareCopyRecords}
              disabled={copyLoading}
              className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Copy to sheets"
            >
              <FiCopy className="w-4 h-4" /> {copyLoading ? 'Preparing...' : 'Copy'}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800" role="alert">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#003366]/10 text-[#003366] mb-4">
              <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Loading submissions…</p>
            <p className="text-sm text-gray-400 mt-1">Please wait</p>
          </div>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 text-gray-400 mb-5">
              <FiInbox className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No submissions yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              {hasActiveFilters ? 'No submissions match your filters. Try clearing filters or adjusting dates.' : 'Activation submissions will appear here once users submit the form.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 py-2.5 px-5 rounded-xl font-medium text-white bg-[#003366] hover:bg-[#004080] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead>
                  <tr className="bg-linear-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Mobile</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">WhatsApp</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Occupation</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Education</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider text-center">YOE</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Address</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">Submitted</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-14 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Array.isArray(records) ? records : []).map((row) => (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-[#003366]/4 transition-colors">
                        <td className="px-4 py-3 align-middle font-medium text-gray-900">{row.name || '—'}</td>
                        <td className="px-4 py-3 align-middle text-gray-700 whitespace-nowrap font-mono text-xs">{row.mobileNumber || '—'}</td>
                        <td className="px-4 py-3 align-middle text-gray-700 whitespace-nowrap font-mono text-xs">{row.whatsappNumber || '—'}</td>
                        <td className="px-4 py-3 align-middle text-gray-700 max-w-[180px] truncate" title={row.email || ''}>{row.email || '—'}</td>
                        <td className="px-4 py-3 align-middle text-gray-700">{row.occupation || '—'}</td>
                        <td className="px-4 py-3 align-middle">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${row.gender === 'Female' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {row.gender || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-gray-700 whitespace-nowrap text-xs">{formatDob(row.dateOfBirth)}</td>
                        <td className="px-4 py-3 align-middle text-gray-700 max-w-[140px] truncate" title={row.educationQualification || ''}>{row.educationQualification || '—'}</td>
                        <td className="px-4 py-3 align-middle text-center">
                          <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                            {row.yearsOfExperience ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-gray-600 max-w-[200px] truncate text-xs" title={row.addressOfCommunication || ''}>{row.addressOfCommunication || '—'}</td>
                        <td className="px-4 py-3 align-middle text-gray-500 whitespace-nowrap text-xs">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#003366] transition-colors"
                            aria-label={expandedId === row.id ? 'Collapse' : 'Expand'}
                          >
                            {expandedId === row.id ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                      {expandedId === row.id && (
                        <tr key={`${row.id}-exp`}>
                          <td colSpan={12} className="p-0">
                            <div className="bg-linear-to-r from-gray-50/80 to-slate-50/80 border-t border-gray-100 px-4 py-4">
                              <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div className="md:col-span-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
                                    <p className="text-gray-800">{row.addressOfCommunication || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Education</p>
                                    <p className="text-gray-800">{row.educationQualification || '—'}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Anything to convey</p>
                                    <p className="text-gray-800">{row.anythingToConvey || '—'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 bg-gray-50/80 border-t border-gray-200">
              {viewAll ? (
                <p className="text-sm text-gray-500">
                  {pagination.total > ADMIN_VIEW_ALL_LIMIT
                    ? `Showing first ${ADMIN_VIEW_ALL_LIMIT.toLocaleString()} of ${pagination.total} feedback`
                    : `Showing all ${pagination.total} feedback`}
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Page <span className="font-semibold text-gray-900">{pagination.page}</span> of <span className="font-semibold text-gray-900">{pagination.totalPages}</span>
                    <span className="text-gray-500 ml-1">({pagination.total} total)</span>
                  </p>
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-4 h-4" /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next <FiChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <CopyToSheetsModal
            fields={COPY_FIELDS}
            records={copyRecords}
            getCellValue={getFeedbackCellValue}
            open={copyModalOpen}
            onClose={() => setCopyModalOpen(false)}
            recordLabel="feedback"
            dedupeByPhoneKey="mobileNumber"
            loading={copyLoading}
          />
        </>
      )}
    </div>
  );
}
