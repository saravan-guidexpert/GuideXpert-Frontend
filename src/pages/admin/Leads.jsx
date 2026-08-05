import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCopy, FiX } from 'react-icons/fi';
import { getAdminLeads, getLead, updateLeadNotes, updateLeadSlotBooking, getSlotsForDate, getStoredToken } from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useAdminDateRange } from '../../hooks/useAdminDateRange';
import TableSkeleton from '../../components/UI/TableSkeleton';
import { ContentSkeleton } from '../../components/UI/Skeleton';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import {
  leadListFiltersFromSearchParams,
  leadListFiltersToSearchParams,
  leadListFiltersToApiParams,
  STUDENT_ACTIVITY_TYPE_OPTIONS,
} from '../../utils/adminLeadFiltersShared';
import { copyTextToClipboard } from '../../utils/clipboard';
import { ADMIN_VIEW_ALL_LIMIT } from '../../constants/adminListLimits';
import { fetchAllPaginatedRows } from '../../utils/adminPagedFetch';
import { RANK_PREDICTOR_LEAD_UTM } from '../../utils/rankPredictorLeadConstants';
import { STUDENT_WORKSPACE_LEAD_UTM } from '../../utils/studentWorkspaceLeadConstants';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Display-only title case; keeps raw API values untouched. */
function toDisplayName(name) {
  if (!name || typeof name !== 'string') return '—';
  return name
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function normalizeEnumKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Convert snake_case / kebab / underscore enums into readable labels. */
function humanizeLabel(value) {
  if (value == null || value === '') return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const known = {
    in_progress: 'In progress',
    registered: 'Registered',
    completed: 'Completed',
    student_workspace_login: 'Student workspace',
    student_tool: 'Student tools',
    organic_rank_predictor: 'Organic rank predictor',
    rank_predictor: 'Rank Predictor',
    college_predictor: 'College Predictor',
    branch_predictor: 'Branch Predictor',
    exam_predictor: 'Exam Predictor',
    college_comparison: 'College Comparison',
    deadline_manager: 'Deadline Manager',
    college_fit_test: 'College Fit Test',
    course_fit_test: 'Course Fit Test',
    profile_update: 'Profile update',
    counselling_booking: 'Counselling booking',
    auth: 'Login / signup',
    login: 'Login',
    signup: 'Signup',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    organic: 'Organic',
  };
  const key = normalizeEnumKey(raw);
  if (known[key]) return known[key];
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatusLabel(status) {
  if (!status) return '—';
  return humanizeLabel(status);
}

function formatOccupation(occupation) {
  if (!occupation) return null;
  const raw = String(occupation).trim();
  if (!raw) return null;
  if (/student/i.test(raw) && /guide.?xpert/i.test(raw)) return 'Student';
  return humanizeLabel(raw);
}

function statusBadgeClass(status) {
  const key = normalizeEnumKey(status);
  if (key === 'completed') return 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20';
  if (key === 'registered') return 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20';
  if (key === 'in_progress') return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20';
  return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15';
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-[12px] text-gray-400">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-tight ${statusBadgeClass(status)}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

/** Compact label/value row — skips empty values. */
function DetailField({ label, children, className = '' }) {
  if (children == null || children === '' || children === '—') return null;
  return (
    <div
      className={`grid grid-cols-[5.75rem_minmax(0,1fr)] items-baseline gap-x-2 border-b border-gray-100 py-1.5 last:border-b-0 ${className}`}
    >
      <dt className="text-[11px] leading-none text-gray-500">{label}</dt>
      <dd className="text-[12.5px] font-medium leading-snug text-gray-900">{children}</dd>
    </div>
  );
}

function DetailSection({ title, children, action }) {
  if (children == null || children === false) return null;
  return (
    <section>
      {title ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {title}
          </h4>
          {action || null}
        </div>
      ) : null}
      <div className="overflow-hidden">{children}</div>
    </section>
  );
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatSlotIdForDisplay(slotId) {
  if (!slotId || typeof slotId !== 'string') return slotId || '';
  const match = slotId.match(/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)_(7PM|11AM|3PM|6PM)$/i);
  if (match) {
    const dayNames = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
    return `${dayNames[match[1]] || match[1]} ${match[2]}`;
  }
  return slotId;
}

function formatSlotIdForDropdown(slotId) {
  if (!slotId || typeof slotId !== 'string') return slotId || '';
  const match = slotId.match(/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)_(7PM|11AM|3PM|6PM)$/i);
  if (match) {
    const dayNames = { MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday' };
    const time = match[2].replace(/(\d+)(AM|PM)/i, '$1 $2');
    return `${dayNames[match[1]] || match[1]} ${time}`;
  }
  return slotId;
}

function slotLabel(lead) {
  if (!lead.slotBooked) return 'Not booked';
  const slot = formatSlotIdForDisplay(lead.selectedSlot) || lead.selectedSlot || '';
  const date = lead.slotDate ? formatDate(lead.slotDate) : '';
  return date ? `${slot}, ${date}` : slot || 'Booked';
}

const COPY_FIELDS = [
  { key: 'fullName', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'otpVerified', label: 'OTP Verified' },
  { key: 'slotBooked', label: 'Slot Booked' },
  { key: 'selectedSlot', label: 'Selected Slot' },
  { key: 'slotDate', label: 'Slot Date' },
  { key: 'applicationStatus', label: 'Status' },
  { key: 'currentStep', label: 'Step' },
  { key: 'email', label: 'Email' },
  { key: 'interestLevel', label: 'Interest' },
  { key: 'utm_content', label: 'Influencer' },
  { key: 'utm_source', label: 'Platform' },
  { key: 'utm_medium', label: 'UTM Medium' },
  { key: 'utm_campaign', label: 'UTM Campaign' },
  { key: 'createdAt', label: 'Created' },
  { key: 'updatedAt', label: 'Updated' },
  { key: 'adminNotes', label: 'Admin Notes' },
  { key: 'leadStatus', label: 'Lead Status' },
  { key: 'leadDescription', label: 'Lead Description' },
  { key: 'rankPredictorLead', label: 'Rank predictor' },
];

function formatRankPredictorLead(lead) {
  const r = lead?.rankPredictorLead;
  if (!r || typeof r !== 'object') return '';
  const parts = [r.examId, r.score != null && r.score !== '' ? String(r.score) : ''];
  if (r.difficulty) parts.push(r.difficulty);
  if (r.predictedValue !== undefined && r.predictedValue !== null && r.predictedValue !== '') {
    const pv =
      typeof r.predictedValue === 'number' ? r.predictedValue.toLocaleString() : String(r.predictedValue);
    parts.push(`Predicted: ${pv}`);
  }
  if (
    r.rangeLow != null &&
    r.rangeHigh != null &&
    Number.isFinite(Number(r.rangeLow)) &&
    Number.isFinite(Number(r.rangeHigh))
  ) {
    parts.push(`Range: ${Number(r.rangeLow).toLocaleString()}–${Number(r.rangeHigh).toLocaleString()}`);
  }
  if (r.metricLabel) parts.push(r.metricLabel);
  if (r.predictionMessage) {
    const msg = String(r.predictionMessage);
    parts.push(msg.length > 100 ? `${msg.slice(0, 100)}…` : msg);
  }
  return parts.filter(Boolean).join(' · ');
}

/** Short label + full string for hover (organic leads table). */
function rankPredictionTablePreview(lead) {
  const r = lead?.rankPredictorLead;
  if (!r || typeof r !== 'object') return { display: '—', title: '', chip: false };
  const exam = r.examId || r.metricLabel || 'Prediction';
  const score =
    r.predictedValue !== undefined && r.predictedValue !== null && r.predictedValue !== ''
      ? typeof r.predictedValue === 'number'
        ? r.predictedValue.toLocaleString()
        : String(r.predictedValue)
      : r.score != null && r.score !== ''
        ? String(r.score)
        : '';
  const display = score ? `${exam} · ${score}` : String(exam);
  return { display, title: formatRankPredictorLead(lead), chip: true };
}

function getLeadCellValue(lead, key) {
  if (key === 'rankPredictorLead') return formatRankPredictorLead(lead);
  const v = lead[key];
  if (key === 'otpVerified') return v ? 'Yes' : 'No';
  if (key === 'slotBooked') return v ? 'Yes' : 'No';
  if (key === 'selectedSlot') return v ? formatSlotIdForDisplay(v) : '';
  if (key === 'slotDate') return v ? formatDate(v) : '';
  if (key === 'createdAt' || key === 'updatedAt') return v ? formatDate(v) : '';
  if (key === 'applicationStatus') return formatStatusLabel(v);
  if (v == null || v === '') return '';
  return String(v);
}

function formatStudentProfile(lead) {
  const p = lead?.studentProfile;
  if (!p || typeof p !== 'object') return '';
  const parts = [];
  if (p.age != null) parts.push(`Age ${p.age}`);
  if (p.currentlyStudying) parts.push(humanizeLabel(p.currentlyStudying));
  if (p.city) parts.push(p.city);
  return parts.join(' · ');
}

const ACTIVITY_TOOL_LABELS = Object.fromEntries(
  STUDENT_ACTIVITY_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

function inferActivityToolKey(activity) {
  if (!activity || typeof activity !== 'object') return '';
  const raw = String(activity.tool || activity.type || '').toLowerCase().trim();
  if (raw) return raw;
  const title = String(activity.title || '').toLowerCase();
  if (title.includes('auth') || title.includes('logged in') || title.includes('login') || title.includes('signup') || title.includes('sign up')) {
    return 'auth';
  }
  for (const opt of STUDENT_ACTIVITY_TYPE_OPTIONS) {
    if (!opt.value) continue;
    if (title.includes(opt.value.replace(/_/g, ' ')) || title.includes(opt.label.toLowerCase())) {
      return opt.value;
    }
  }
  return '';
}

function activityToolLabel(activity) {
  const raw = inferActivityToolKey(activity);
  if (ACTIVITY_TOOL_LABELS[raw]) {
    if (raw === 'auth') return 'Login';
    return ACTIVITY_TOOL_LABELS[raw].replace(/ only$/, '');
  }
  if (raw.includes('auth') || raw.includes('login')) return 'Login';
  if (raw.includes('signup') || raw.includes('sign_up')) return 'Signup';
  return humanizeLabel(raw || 'Activity');
}

/** Strip redundant tool prefixes from activity titles for readable copy. */
function activityDetailText(activity) {
  let title = String(activity?.title || '').trim();
  if (!title) return String(activity?.summary || '').trim();
  title = title
    .replace(/^(student\s+)?auth\s*:\s*/i, '')
    .replace(/^login(\s*\/\s*signup)?\s*:\s*/i, '')
    .replace(/^sign\s*up\s*:\s*/i, '')
    .replace(/^rank\s*predictor\s*:\s*/i, '')
    .replace(/^college\s*predictor\s*:\s*/i, '')
    .replace(/^branch\s*predictor\s*:\s*/i, '')
    .replace(/^exam\s*predictor\s*:\s*/i, '')
    .replace(/^college\s*comparison\s*:\s*/i, '')
    .replace(/^deadline\s*manager\s*:\s*/i, '')
    .trim();
  const summary = String(activity?.summary || '').trim();
  if (summary && summary.toLowerCase() !== title.toLowerCase()) {
    return title ? `${title}${summary.length < 80 ? ` · ${summary}` : ''}` : summary;
  }
  return title;
}

/** Compact activity chip for table — tool name only; full history in modal. */
function formatStudentActivityPreview(lead) {
  const list = Array.isArray(lead?.studentActivityHistory) ? lead.studentActivityHistory : [];
  const count = lead?.studentActivityCount ?? list.length;
  if (!count) return { display: '—', title: '', chip: false, count: 0 };
  const latest = list[0] || {};
  const label = activityToolLabel(latest);
  const title = list
    .slice(0, 10)
    .map((a) => {
      const tool = activityToolLabel(a);
      const detail = activityDetailText(a);
      return detail ? `${tool}: ${detail}` : tool;
    })
    .join('\n');
  return { display: label, title, chip: true, count };
}

function slotTableLabel(lead) {
  if (!lead.slotBooked) return { display: 'Not booked', muted: true, title: '' };
  const slot = formatSlotIdForDisplay(lead.selectedSlot) || lead.selectedSlot || '';
  return {
    display: slot || 'Booked',
    muted: false,
    title: slotLabel(lead),
  };
}

function formatShortDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

/**
 * @param {{ organicOnly?: boolean, studentWorkspaceOnly?: boolean }} props
 */
export default function Leads({ organicOnly = false, studentWorkspaceOnly = false }) {
  const scopedUtm = organicOnly
    ? RANK_PREDICTOR_LEAD_UTM.utm_content
    : studentWorkspaceOnly
      ? STUDENT_WORKSPACE_LEAD_UTM.utm_content
      : null;
  // Slim table: Name, Phone, Status, context column (activity / prediction / slot), View
  const leadTableColCount = 5;
  const { logout } = useAuth();
  const { dateRange, leadListFilters, setLeadListFilters } = useAdminDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState(() => leadListFilters.q || '');
  const [detailLead, setDetailLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNotes, setDetailNotes] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailSlotDate, setDetailSlotDate] = useState('');
  const [detailSlotId, setDetailSlotId] = useState('');
  const [detailSlotOptions, setDetailSlotOptions] = useState([]);
  const [detailSlotLoading, setDetailSlotLoading] = useState(false);
  const [detailSlotSaving, setDetailSlotSaving] = useState(false);
  const [detailSlotError, setDetailSlotError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyRecords, setCopyRecords] = useState([]);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef(0);

  const [viewAll, setViewAll] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- apply query string to context + UI */
  useEffect(() => {
    const raw = searchParams.toString();
    if (!raw) return;
    const parsed = leadListFiltersFromSearchParams(searchParams);
    if (scopedUtm) {
      setLeadListFilters({ ...parsed, utm_content: scopedUtm });
    } else {
      setLeadListFilters(parsed);
    }
    setSearchDraft(parsed.q || '');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchParams, setLeadListFilters, scopedUtm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openLeadDetail = (leadId) => {
    setDetailLead(null);
    setDetailNotes('');
    setDetailLoading(true);
    getLead(leadId, getStoredToken()).then((res) => {
      setDetailLoading(false);
      if (res.success && res.data?.data) {
        setDetailLead(res.data.data);
        setDetailNotes(res.data.data.adminNotes || '');
        const initialSlotDate = toDateInputValue(res.data.data.slotDate);
        setDetailSlotDate(initialSlotDate);
        setDetailSlotId(res.data.data.selectedSlot || '');
        setDetailSlotLoading(!!initialSlotDate);
        setDetailSlotError('');
      }
    });
  };

  const closeLeadDetail = () => {
    setDetailLead(null);
    setDetailNotes('');
    setDetailSlotDate('');
    setDetailSlotId('');
    setDetailSlotOptions([]);
    setDetailSlotError('');
  };

  const saveLeadNotes = () => {
    if (!detailLead?.id || detailSaving) return;
    setDetailSaving(true);
    updateLeadNotes(detailLead.id, detailNotes, getStoredToken()).then((res) => {
      setDetailSaving(false);
      if (res.success && res.data?.data) {
        setDetailLead(res.data.data);
        setDetailNotes(res.data.data.adminNotes || '');
        setLeads((prev) =>
          prev.map((l) => (l.id === detailLead.id ? { ...l, adminNotes: res.data.data.adminNotes } : l))
        );
      }
    });
  };

  const saveLeadSlot = () => {
    if (!detailLead?.id || detailSlotSaving) return;
    if (!detailSlotDate || !detailSlotId) {
      setDetailSlotError('Please select both date and slot.');
      return;
    }
    setDetailSlotSaving(true);
    setDetailSlotError('');
    updateLeadSlotBooking(
      detailLead.id,
      { slotDate: detailSlotDate, selectedSlot: detailSlotId },
      getStoredToken()
    ).then((res) => {
      setDetailSlotSaving(false);
      if (!res.success) {
        setDetailSlotError(res.message || 'Failed to update slot booking');
        return;
      }
      if (res.data?.data) {
        setDetailLead(res.data.data);
        setLeads((prev) => prev.map((l) => (l.id === detailLead.id ? { ...l, ...res.data.data } : l)));
      }
    });
  };

  useEffect(() => {
    if (!detailLead || !detailSlotDate) return;
    Promise.resolve(getSlotsForDate(detailSlotDate, getStoredToken()))
      .then((slots) => {
        const options = Array.isArray(slots) ? slots : [];
        setDetailSlotOptions(options);
        setDetailSlotId((current) => (current && !options.some((s) => s.slotId === current) ? '' : current));
      })
      .catch(() => {
        setDetailSlotOptions([]);
      })
      .finally(() => setDetailSlotLoading(false));
  }, [detailLead, detailSlotDate]);

  const copyPhone = (phone) => {
    if (!phone) return;
    copyTextToClipboard(phone).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    });
  };

  /* eslint-disable react-hooks/set-state-in-effect -- mirror panel search q into local draft when field not focused */
  useEffect(() => {
    const el = searchInputRef.current;
    if (el && document.activeElement === el) return;
    setSearchDraft(leadListFilters.q || '');
  }, [leadListFilters.q]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const t = setTimeout(() => {
      setLeadListFilters((prev) => {
        if ((prev.q || '') === searchDraft) return prev;
        const next = { ...prev, q: searchDraft };
        const forUrl = scopedUtm ? { ...next, utm_content: scopedUtm } : next;
        setSearchParams(leadListFiltersToSearchParams(forUrl), { replace: true });
        setPagination((p) => ({ ...p, page: 1 }));
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchDraft, setLeadListFilters, setSearchParams, scopedUtm]);

  useEffect(() => {
    cancelledRef.current = false;
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    const page = viewAll ? 1 : pagination.page;
    const limit = viewAll ? ADMIN_VIEW_ALL_LIMIT : 50;
    const params = {
      page,
      limit,
      ...(dateRange.from && { from: dateRange.from }),
      ...(dateRange.to && { to: dateRange.to }),
      ...leadListFiltersToApiParams(leadListFilters),
      ...(scopedUtm ? { utm_content: scopedUtm } : {}),
    };
    const tick = queueMicrotask || ((fn) => setTimeout(fn, 0));
    tick(() => {
      if (!cancelledRef.current) {
        setLoading(true);
        setError('');
      }
    });
    getAdminLeads(params, getStoredToken()).then((result) => {
      if (cancelledRef.current) return;
      if (thisRequestId !== requestIdRef.current) return;
      setLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        setError(result.message || 'Failed to load leads');
        return;
      }
      setLeads(result.data.data || []);
      setPagination(result.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [viewAll, pagination.page, dateRange.from, dateRange.to, leadListFilters, logout, scopedUtm]);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(p, pagination.totalPages));
    setPagination((prev) => ({ ...prev, page: next }));
  };

  const prepareCopyLeads = async () => {
    setCopyLoading(true);
    setError('');
    const baseParams = {
      ...(dateRange.from && { from: dateRange.from }),
      ...(dateRange.to && { to: dateRange.to }),
      ...leadListFiltersToApiParams(leadListFilters),
      ...(scopedUtm ? { utm_content: scopedUtm } : {}),
    };
    const result = await fetchAllPaginatedRows((page, limit) =>
      getAdminLeads({ ...baseParams, page, limit }, getStoredToken())
    );
    setCopyLoading(false);
    if (!result.success) {
      const r = result.result;
      if (r?.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setError(r?.message || 'Failed to load leads for copy');
      return;
    }
    setCopyRecords(result.rows || []);
    setCopyModalOpen(true);
  };

  const pageTitle = organicOnly
    ? 'Organic rank predictor leads'
    : studentWorkspaceOnly
      ? 'Student workspace leads'
      : 'Leads';

  return (
    <div className="max-w-[1400px] mx-auto px-1">
      <h2
        className="text-xl font-semibold text-gray-800 mb-4 tracking-tight"
        aria-label={`${pageTitle}, ${pagination.total.toLocaleString()} total`}
      >
        {pageTitle}{' '}
        <span className={`font-semibold text-gray-600 tabular-nums ${loading ? 'opacity-60' : ''}`}>
          ({pagination.total.toLocaleString()})
        </span>
      </h2>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
        <p className="text-sm text-gray-600 mb-3">
          {organicOnly
            ? (
              <>
                This list is scoped to <strong className="font-medium text-gray-800">organic rank predictor</strong> leads. Date range and other lead filters are in{' '}
                <strong className="font-medium text-gray-800">Filters</strong> in the header. Search below updates the same query as the panel.
              </>
            )
            : studentWorkspaceOnly
              ? (
                <>
                  Students who signed up / logged in via the <strong className="font-medium text-gray-800">GuideXpert tools</strong> workspace (OTP). Profile details and every tool prediction appear in the lead detail.
                </>
              )
            : (
              <>
                Date range and lead filters (status, OTP, slot, influencer, etc.) are in <strong className="font-medium text-gray-800">Filters</strong> in the header. Search below updates the same query as the panel.
              </>
            )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search name, phone, email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500 outline-none text-sm"
          />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              checked={viewAll}
              onChange={(e) => {
                setViewAll(e.target.checked);
                if (!e.target.checked) setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded border-gray-300 text-primary-blue-500 focus:ring-primary-blue-500"
              aria-label="View all leads in one list"
            />
            View all
          </label>
          <button
            type="button"
            onClick={prepareCopyLeads}
            disabled={copyLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Copy to sheets"
          >
            <FiCopy className="w-4 h-4" /> {copyLoading ? 'Preparing...' : 'Copy'}
          </button>
        </div>
        {studentWorkspaceOnly ? (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by tool or action">
            {STUDENT_ACTIVITY_TYPE_OPTIONS.filter((o) =>
              ['', 'auth', 'rank_predictor', 'college_predictor', 'branch_predictor', 'exam_predictor', 'college_comparison', 'deadline_manager'].includes(
                o.value
              )
            ).map((opt) => {
              const active = (leadListFilters.activityType || '') === opt.value;
              return (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  onClick={() => {
                    setLeadListFilters((prev) => {
                      const next = { ...prev, activityType: opt.value };
                      const forUrl = scopedUtm ? { ...next, utm_content: scopedUtm } : next;
                      setSearchParams(leadListFiltersToSearchParams(forUrl), { replace: true });
                      return next;
                    });
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                    active
                      ? 'bg-primary-navy text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 py-2 px-3 bg-red-50 rounded-lg border border-red-100" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <TableSkeleton rows={8} cols={leadTableColCount} />
      ) : (
        <>
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="w-[28%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                      Name
                    </th>
                    <th className="w-[18%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                      Phone
                    </th>
                    <th className="w-[16%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                      Status
                    </th>
                    <th className="w-[24%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                      {studentWorkspaceOnly ? 'Last activity' : organicOnly ? 'Prediction' : 'Slot'}
                    </th>
                    <th className="w-[14%] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={leadTableColCount}
                        className="px-4 py-10 text-center text-[13px] text-gray-500"
                      >
                        No leads found
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const predPreview = organicOnly ? rankPredictionTablePreview(lead) : null;
                      const activityPreview = studentWorkspaceOnly
                        ? formatStudentActivityPreview(lead)
                        : null;
                      const slotPreview = !studentWorkspaceOnly && !organicOnly
                        ? slotTableLabel(lead)
                        : null;
                      return (
                        <tr
                          key={lead.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="truncate px-4 py-3 text-[13px] font-medium text-gray-900">
                            {toDisplayName(lead.fullName)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] tabular-nums text-gray-600">
                            {lead.phone || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={lead.applicationStatus} />
                          </td>
                          <td className="px-4 py-3">
                            {studentWorkspaceOnly ? (
                              activityPreview?.chip ? (
                                <span
                                  className="inline-flex max-w-full items-center gap-1.5"
                                  title={activityPreview.title}
                                >
                                  <span className="truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    {activityPreview.display}
                                  </span>
                                  {activityPreview.count > 1 ? (
                                    <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
                                      +{activityPreview.count - 1}
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-[13px] text-gray-400">—</span>
                              )
                            ) : organicOnly ? (
                              predPreview?.chip ? (
                                <span
                                  className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                  title={predPreview.title}
                                >
                                  {predPreview.display}
                                </span>
                              ) : (
                                <span className="text-[13px] text-gray-400">—</span>
                              )
                            ) : (
                              <span
                                className={`text-[13px] ${slotPreview?.muted ? 'text-gray-400' : 'text-gray-700'}`}
                                title={slotPreview?.title || ''}
                              >
                                {slotPreview?.display || '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openLeadDetail(lead.id)}
                              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                              aria-label={`View details for ${toDisplayName(lead.fullName)}`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(detailLoading || detailLead) && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
              aria-modal="true"
              role="dialog"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeLeadDetail();
              }}
            >
              <div className="flex w-full max-w-[420px] max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
                {detailLoading ? (
                  <div className="p-6">
                    <ContentSkeleton lines={5} />
                  </div>
                ) : detailLead ? (
                  <>
                    <div className="shrink-0 border-b border-gray-100 px-5 pb-4 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[17px] font-semibold tracking-tight text-gray-900">
                            {toDisplayName(detailLead.fullName)}
                          </h3>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {detailLead.phone ? (
                              <button
                                type="button"
                                onClick={() => copyPhone(detailLead.phone)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[12px] tabular-nums text-gray-700 transition-colors hover:bg-gray-50"
                                title="Copy phone"
                              >
                                {detailLead.phone}
                                <FiCopy className="h-3 w-3 text-gray-400" />
                                <span className="sr-only">
                                  {copyFeedback ? 'Copied' : 'Copy phone'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[12px] text-gray-400">No phone</span>
                            )}
                            {copyFeedback ? (
                              <span className="text-[11px] font-medium text-emerald-600">Copied</span>
                            ) : null}
                            <StatusBadge status={detailLead.applicationStatus} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={closeLeadDetail}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Close"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
                      <DetailSection title="Overview">
                        <dl>
                          <DetailField label="Email">
                            {detailLead.email ? (
                              <span className="break-all font-normal">{detailLead.email}</span>
                            ) : null}
                          </DetailField>
                          <DetailField label="Occupation">
                            {formatOccupation(detailLead.occupation)}
                          </DetailField>
                          {formatStudentProfile(detailLead) ? (
                            <DetailField label="Profile">
                              <span className="font-normal text-gray-700">
                                {formatStudentProfile(detailLead)}
                              </span>
                            </DetailField>
                          ) : null}
                          <DetailField label="OTP">
                            {detailLead.otpVerified ? 'Verified' : 'Not verified'}
                          </DetailField>
                          <DetailField label="Slot">{slotLabel(detailLead)}</DetailField>
                          <DetailField label="Step">
                            {detailLead.currentStep != null && detailLead.currentStep !== ''
                              ? String(detailLead.currentStep)
                              : null}
                          </DetailField>
                          <DetailField label="Interest">
                            {detailLead.interestLevel
                              ? humanizeLabel(detailLead.interestLevel)
                              : null}
                          </DetailField>
                          <DetailField label="Created">
                            {detailLead.createdAt ? (
                              <span className="font-normal tabular-nums text-gray-700">
                                {formatDate(detailLead.createdAt)}
                              </span>
                            ) : null}
                          </DetailField>
                          <DetailField label="Updated">
                            {detailLead.updatedAt ? (
                              <span className="font-normal tabular-nums text-gray-700">
                                {formatDate(detailLead.updatedAt)}
                              </span>
                            ) : null}
                          </DetailField>
                        </dl>
                      </DetailSection>

                      {(detailLead.utm_content ||
                        detailLead.utm_source ||
                        detailLead.utm_medium ||
                        formatRankPredictorLead(detailLead)) ? (
                        <DetailSection title="Source">
                          <dl>
                            <DetailField label="Channel">
                              {detailLead.utm_content
                                ? humanizeLabel(detailLead.utm_content)
                                : null}
                            </DetailField>
                            <DetailField label="Platform">
                              {detailLead.utm_source
                                ? humanizeLabel(detailLead.utm_source)
                                : null}
                            </DetailField>
                            <DetailField label="Medium">
                              {detailLead.utm_medium
                                ? humanizeLabel(detailLead.utm_medium)
                                : null}
                            </DetailField>
                            {formatRankPredictorLead(detailLead) ? (
                              <DetailField label="Prediction">
                                <span className="wrap-break-word font-normal text-gray-700">
                                  {formatRankPredictorLead(detailLead)}
                                  {detailLead.rankPredictorLead?.predictedAt ? (
                                    <span className="mt-0.5 block text-[12px] text-gray-500">
                                      Saved {formatDate(detailLead.rankPredictorLead.predictedAt)}
                                    </span>
                                  ) : null}
                                </span>
                              </DetailField>
                            ) : null}
                          </dl>
                        </DetailSection>
                      ) : null}

                      {Array.isArray(detailLead.studentActivityHistory) &&
                      detailLead.studentActivityHistory.length > 0 ? (
                        <DetailSection
                          title={`Activity · ${
                            detailLead.studentActivityCount ||
                            detailLead.studentActivityHistory.length
                          }`}
                        >
                          <ul className="-mx-3.5">
                            {detailLead.studentActivityHistory.slice(0, 20).map((a, idx) => {
                              const tool = activityToolLabel(a);
                              const detail = activityDetailText(a);
                              const isLast =
                                idx ===
                                Math.min(19, detailLead.studentActivityHistory.length - 1);
                              return (
                                <li
                                  key={`${a.createdAt || idx}-${a.title || tool}`}
                                  className={`px-3.5 py-2.5 ${isLast ? '' : 'border-b border-gray-100'}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-medium text-gray-900">
                                        {tool}
                                      </p>
                                      {detail ? (
                                        <p className="mt-0.5 text-[12px] leading-snug text-gray-500">
                                          {detail}
                                        </p>
                                      ) : null}
                                    </div>
                                    {a.createdAt ? (
                                      <time className="shrink-0 pt-0.5 text-[11px] tabular-nums text-gray-400">
                                        {formatShortDate(a.createdAt)}
                                      </time>
                                    ) : null}
                                  </div>
                                  {a.payload ? (
                                    <details className="mt-1.5">
                                      <summary className="cursor-pointer select-none text-[11px] font-medium text-gray-400 hover:text-gray-600">
                                        Technical details
                                      </summary>
                                      <pre className="mt-1.5 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 p-2 font-mono text-[10px] leading-relaxed text-gray-500">
                                        {typeof a.payload === 'string'
                                          ? a.payload
                                          : JSON.stringify(a.payload, null, 2)}
                                      </pre>
                                    </details>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        </DetailSection>
                      ) : null}
                    </div>

                    <div className="shrink-0 border-t border-gray-100 bg-gray-50/90 px-5 py-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                        Actions
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label
                              htmlFor="lead-slot-date"
                              className="mb-1 block text-[11px] text-gray-500"
                            >
                              Slot date
                            </label>
                            <input
                              id="lead-slot-date"
                              type="date"
                              value={detailSlotDate}
                              onChange={(e) => {
                                const nextDate = e.target.value;
                                setDetailSlotDate(nextDate);
                                if (!nextDate) {
                                  setDetailSlotOptions([]);
                                  setDetailSlotId('');
                                  setDetailSlotLoading(false);
                                  setDetailSlotError('');
                                } else {
                                  setDetailSlotLoading(true);
                                  setDetailSlotError('');
                                }
                              }}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="lead-slot-id"
                              className="mb-1 block text-[11px] text-gray-500"
                            >
                              Time slot
                            </label>
                            <select
                              id="lead-slot-id"
                              value={detailSlotId}
                              onChange={(e) => setDetailSlotId(e.target.value)}
                              disabled={!detailSlotDate || detailSlotLoading}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-100"
                            >
                              <option value="">
                                {detailSlotLoading ? 'Loading…' : 'Select slot'}
                              </option>
                              {detailSlotOptions.map((slot) => (
                                <option key={slot.slotId} value={slot.slotId}>
                                  {slot.label || formatSlotIdForDropdown(slot.slotId)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {detailSlotError ? (
                          <p className="text-[12px] text-red-600">{detailSlotError}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={saveLeadSlot}
                          disabled={detailSlotSaving || detailSlotLoading}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {detailSlotSaving ? 'Updating…' : 'Update slot'}
                        </button>

                        <div className="border-t border-gray-200/70 pt-3">
                          <label
                            htmlFor="lead-admin-notes"
                            className="mb-1 block text-[11px] text-gray-500"
                          >
                            Admin notes
                          </label>
                          <textarea
                            id="lead-admin-notes"
                            value={detailNotes}
                            onChange={(e) => setDetailNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                            placeholder="Internal notes"
                          />
                          <button
                            type="button"
                            onClick={saveLeadNotes}
                            disabled={detailSaving}
                            className="mt-2 rounded-md bg-primary-navy px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {detailSaving ? 'Saving…' : 'Save notes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          <CopyToSheetsModal
            fields={COPY_FIELDS}
            records={copyRecords}
            getCellValue={getLeadCellValue}
            open={copyModalOpen}
            onClose={() => setCopyModalOpen(false)}
            recordLabel="leads"
            dedupeByPhoneKey="phone"
            loading={copyLoading}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-1">
            {viewAll ? (
              <>
                <p className="text-sm text-gray-500">
                  {pagination.total > ADMIN_VIEW_ALL_LIMIT
                    ? `Showing first ${ADMIN_VIEW_ALL_LIMIT.toLocaleString()} of ${pagination.total} leads`
                    : `Showing all ${pagination.total} leads`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewAll(false);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Show paginated
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 min-w-[100px] text-center">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
}
