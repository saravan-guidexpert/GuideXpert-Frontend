import {
  endOfLocalDay,
  formatRate,
  parseIso,
  previousRange,
  ratio,
  resolveRange,
  statusOf,
  within,
} from './crmAnalytics.js';

export const ADMISSION_PIPELINE = ['Not started', 'Contacted', 'Counselling', 'Applied', 'Admitted', 'Enrolled', 'Not proceeding'];

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function insightRange(period, now, custom = {}) {
  if (period === '12') {
    return {
      id: '12',
      start: monthStart(addMonths(now, -11)),
      end: endOfLocalDay(now),
      label: 'Last 12 months',
      invalid: false,
    };
  }
  return resolveRange(period, now, custom);
}

function windowFor(range, referrals, students) {
  if (range?.invalid) return null;
  if (range?.start && range?.end) return { start: monthStart(range.start), end: range.end };
  const times = [...(referrals || []), ...(students || [])]
    .map((row) => parseIso(row.createdAt))
    .filter(Boolean)
    .map((date) => date.getTime());
  if (!times.length) return null;
  return { start: monthStart(new Date(Math.min(...times))), end: new Date(Math.max(...times)) };
}

export function monthlySeries(referrals, students, range) {
  const window = windowFor(range, referrals, students);
  if (!window) return [];
  const points = [];
  for (let cursor = window.start; cursor <= window.end; cursor = addMonths(cursor, 1)) {
    const key = monthKey(cursor);
    const inMonth = (row) => {
      const date = parseIso(row.createdAt);
      return date && within(row.createdAt, range) && monthKey(date) === key;
    };
    points.push({
      key,
      label: monthLabel(cursor),
      referrals: (referrals || []).filter(inMonth).length,
      registrations: (students || []).filter(inMonth).length,
    });
  }
  return points;
}

export function cumulativeSeries(points) {
  let total = 0;
  return (points || []).map((point) => {
    total += point.referrals || 0;
    return { ...point, cumulative: total };
  });
}

export function pipelineCounts(students) {
  return ADMISSION_PIPELINE.map((status) => ({
    status,
    count: (students || []).filter((row) => statusOf(row) === status).length,
  }));
}

export function countCreated(rows, range) {
  return (rows || []).filter((row) => within(row.createdAt, range)).length;
}

export function compareCounts(current, previous) {
  if (!previous) {
    return { current, previous: previous || 0, absolute: current - (previous || 0), percent: null, message: 'No records in previous period' };
  }
  return {
    current,
    previous,
    absolute: current - previous,
    percent: Math.round(((current - previous) / previous) * 100),
    message: '',
  };
}

export function completionRate(followUps, range) {
  const scoped = (followUps || []).filter((row) => !row.cancelledAt && within(row.scheduledAt || row.createdAt, range));
  const completed = scoped.filter((row) => row.completedAt);
  return ratio(completed.length, scoped.length);
}

export function followUpBuckets(followUps, now = new Date()) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = endOfLocalDay(now).getTime();
  const soonEnd = todayEnd + 7 * 86400000;
  const when = (row) => parseIso(row.scheduledAt);
  const open = (row) => !row.cancelledAt && !row.completedAt && when(row);
  const rows = followUps || [];
  return {
    dueToday: rows.filter((row) => open(row) && when(row).getTime() >= todayStart && when(row).getTime() <= todayEnd),
    upcoming: rows.filter((row) => open(row) && when(row).getTime() > todayEnd),
    overdue: rows.filter((row) => open(row) && when(row).getTime() < todayStart),
    completed: rows.filter((row) => row.completedAt && !row.cancelledAt),
    dueSoon: rows.filter((row) => open(row) && when(row).getTime() > todayEnd && when(row).getTime() <= soonEnd),
  };
}

export function previousCount(rows, range) {
  const previous = previousRange(range);
  if (!previous) return null;
  return countCreated(rows, previous);
}

export { formatRate };
