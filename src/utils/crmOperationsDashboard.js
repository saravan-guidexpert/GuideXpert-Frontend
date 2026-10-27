import {
  HIDDEN_METRIC,
  RANGE_METRIC,
  admissionChartRows,
  metricText,
  populationLabel,
  volumeChartRows,
} from './crmWorkspace.js';
import { admissionBars, formatCount, referralComparison } from './crmOverview.js';

export const OPERATIONS_PERIODS = Object.freeze([
  { id: '7', label: '7D', name: 'Last 7 days' },
  { id: '30', label: '30D', name: 'Last 30 days' },
  { id: '90', label: '90D', name: 'Last 90 days' },
  { id: 'month', label: 'Month', name: 'This month' },
  { id: 'year', label: 'Year', name: 'This year' },
  { id: 'custom', label: 'Custom', name: 'Custom range' },
  { id: 'all', label: 'All', name: 'All time' },
]);

export const OPERATIONS_SORTS = Object.freeze([
  { id: 'referrals', label: 'New referrals' },
  { id: 'students', label: 'Students' },
  { id: 'assignees', label: 'Assignees' },
  { id: 'name', label: 'Name' },
]);

export function operationsPeriodName(periodId, range) {
  if (range?.label) return range.label;
  const found = OPERATIONS_PERIODS.find((item) => item.id === periodId);
  return found ? found.name : 'Selected period';
}

export function operationsScopeNote(data) {
  if (!data) return '';
  if (data.aggregateScope === 'module') {
    return data.scopeBasis === 'organization_permission'
      ? 'Organization-wide totals. Lists stay within your reporting access.'
      : 'Organization-wide totals for this account.';
  }
  if (data.recordScope === 'consultancy') return 'Limited to the selected consultancy.';
  return 'Totals and lists stay inside consultancies assigned to this account.';
}

export function operationsVolumeRows(volume) {
  if (!volume || !Array.isArray(volume.points)) return [];
  return volume.points.map((point) => ({
    key: point.key || point.label || '',
    label: point.label || point.key || '',
    count: Number(point.count) || 0,
  }));
}

export function operationsVolumeStats(rows) {
  if (!Array.isArray(rows) || !rows.length) return { total: 0, peak: null, empty: true };
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const peak = rows.reduce((best, row) => (row.count > (best ? best.count : -1) ? row : best), null);
  return { total, peak, empty: total === 0 };
}

/** Drill a volume bucket into a custom day or month window without inventing calendar routes. */
export function volumeBucketRange(point, grain) {
  const key = point && (point.key || point.label);
  if (!key) return null;
  if (grain === 'month' && /^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${key}-${String(lastDay).padStart(2, '0')}`;
    return { period: 'custom', from: `${key}-01`, to };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return { period: 'custom', from: key, to: key };
  }
  return null;
}

export function operationsKpis(data) {
  if (!data) return [];
  const comparison = referralComparison(data.period?.newReferrals, data.period?.previousNewReferrals);
  const previous = metricText(data.period?.previousNewReferrals, RANGE_METRIC);
  const students = metricText(data.current?.students?.total, HIDDEN_METRIC);
  const unassigned = metricText(data.consultancies?.unassigned, HIDDEN_METRIC);
  const active = metricText(data.current?.consultancies?.active, HIDDEN_METRIC);
  const withReferral = metricText(data.current?.students?.withCurrentReferral, HIDDEN_METRIC);

  return [
    {
      id: 'referrals',
      label: 'New referrals',
      value: data.period?.newReferrals,
      whenNull: HIDDEN_METRIC,
      hint: data.period?.meaning || 'Referrals recorded in the selected window.',
      comparison,
      tone: 'primary',
    },
    {
      id: 'previous',
      label: 'Previous period',
      value: data.period?.previousNewReferrals,
      whenNull: RANGE_METRIC,
      hint: previous.detail || 'Equal-length window ending when this range starts.',
      tone: 'neutral',
    },
    {
      id: 'students',
      label: 'Students now',
      value: data.current?.students?.total,
      whenNull: HIDDEN_METRIC,
      hint: students.unavailable
        ? students.detail
        : 'Current student count at report time — not limited to this period.',
      tone: 'neutral',
      currentState: true,
    },
    {
      id: 'unassigned',
      label: 'Unassigned houses',
      value: data.consultancies?.unassigned,
      whenNull: HIDDEN_METRIC,
      hint: unassigned.unavailable
        ? unassigned.detail
        : 'Consultancies with no active assignee (organization view).',
      tone: 'warn',
      currentState: true,
    },
    {
      id: 'active',
      label: 'Active consultancies',
      value: data.current?.consultancies?.active,
      whenNull: HIDDEN_METRIC,
      hint: active.unavailable ? active.detail : 'Current active consultancy records.',
      tone: 'neutral',
      currentState: true,
      secondary: true,
    },
    {
      id: 'referred',
      label: 'Students with referral',
      value: data.current?.students?.withCurrentReferral,
      whenNull: HIDDEN_METRIC,
      hint: withReferral.unavailable
        ? withReferral.detail
        : 'Students with a current referral link.',
      tone: 'neutral',
      currentState: true,
      secondary: true,
    },
  ];
}

export function displayMetricValue(value, whenNull) {
  const shown = metricText(value, whenNull || HIDDEN_METRIC);
  if (shown.unavailable) {
    if (whenNull === RANGE_METRIC) return { text: 'Unavailable', detail: shown.detail, unavailable: true };
    if (whenNull === HIDDEN_METRIC) return { text: 'Restricted', detail: shown.detail, unavailable: true };
    return shown;
  }
  return { text: formatCount(value), detail: '', unavailable: false };
}

export function operationsAdmission(data) {
  const bars = admissionBars(data?.current?.admissionStatus);
  return {
    ...bars,
    note: populationLabel(data?.current?.admissionStatus?.population),
  };
}

export function filterConsultancyItems(items, { q = '', sort = 'referrals' } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  let rows = Array.isArray(items) ? items.slice() : [];
  if (needle) {
    rows = rows.filter((row) => String(row.name || '').toLowerCase().includes(needle));
  }
  rows.sort((left, right) => {
    if (sort === 'name') {
      return String(left.name || '').localeCompare(String(right.name || '')) || String(left.id).localeCompare(String(right.id));
    }
    if (sort === 'students') {
      return (Number(right.students) || 0) - (Number(left.students) || 0)
        || String(left.name || '').localeCompare(String(right.name || ''));
    }
    if (sort === 'assignees') {
      return (Number(right.activeAssignees) || 0) - (Number(left.activeAssignees) || 0)
        || String(left.name || '').localeCompare(String(right.name || ''));
    }
    return (Number(right.newReferrals) || 0) - (Number(left.newReferrals) || 0)
      || String(left.name || '').localeCompare(String(right.name || ''));
  });
  return rows;
}

export function consultancyBarRows(items, limit = 8) {
  return filterConsultancyItems(items, { sort: 'referrals' })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      name: row.name || 'Untitled',
      shortName: shortenLabel(row.name || 'Untitled', 22),
      referrals: Number(row.newReferrals) || 0,
      previous: row.previousNewReferrals == null ? null : Number(row.previousNewReferrals) || 0,
      students: Number(row.students) || 0,
    }));
}

export function shortenLabel(value, max = 22) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function referralDelta(current, previous) {
  const comparison = referralComparison(current, previous);
  if (!comparison) return { text: '—', direction: 'none', title: 'No previous window for comparison.' };
  return {
    text: comparison.diff === 0 ? '0' : `${comparison.diff > 0 ? '+' : '−'}${formatCount(Math.abs(comparison.diff))}`,
    direction: comparison.direction,
    title: comparison.text,
  };
}

export function pagerLabel(page, limit, total) {
  const safeTotal = Number(total) || 0;
  if (!safeTotal) return 'No consultancies on this page';
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, safeTotal);
  return `Showing ${start.toLocaleString('en-IN')}–${end.toLocaleString('en-IN')} of ${safeTotal.toLocaleString('en-IN')}`;
}

// Re-export chart primitives used by tests that assert shared contracts.
export { volumeChartRows, admissionChartRows, formatCount };
