import {
  PHASE_A_TIME_ZONE,
  completionRateText,
  dayEndAccuracy,
  formatTimestamp,
  historyDefaultRange,
  isObjectId,
} from './crmWorkspace.js';

export const INTEL_PERIODS = Object.freeze([
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'custom', label: 'Custom' },
]);

export const INTEL_BUCKETS = Object.freeze([
  { id: '', label: 'Open commitments', short: 'Open' },
  { id: 'overdue', label: 'Overdue now', short: 'Overdue' },
  { id: 'due_today', label: 'Due today', short: 'Due today' },
  { id: 'upcoming', label: 'Upcoming', short: 'Upcoming' },
  { id: 'unscheduled', label: 'No due date', short: 'Unscheduled' },
  { id: 'completed', label: 'Completed in range', short: 'Completed' },
  { id: 'cancelled', label: 'Cancelled in range', short: 'Cancelled' },
]);

export const INTEL_EVENTS = Object.freeze([
  { id: '', label: 'All recorded rows' },
  { id: 'admission', label: 'Admissions' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'follow_up', label: 'Follow-ups' },
  { id: 'exception', label: 'Exceptions' },
]);

export const INTEL_WORKLOAD_METRICS = Object.freeze([
  { id: 'assignedConsultancies', label: 'Assigned consultancies' },
  { id: 'openFollowUps', label: 'Open follow-ups' },
  { id: 'overdueFollowUps', label: 'Overdue follow-ups' },
  { id: 'admissionsRecorded', label: 'Admission events' },
  { id: 'followUpsCompleted', label: 'Completed follow-ups' },
]);

const DAY_KIND_META = Object.freeze({
  'student.created': { category: 'admission', label: 'New student' },
  'admission.changed': { category: 'admission', label: 'Admission status change' },
  'assignment.opened': { category: 'assignment', label: 'Assignment opened' },
  'assignment.revoked': { category: 'assignment', label: 'Assignment revoked' },
  'follow_up.created': { category: 'follow_up', label: 'Follow-up created' },
  'follow_up.completed': { category: 'follow_up', label: 'Follow-up completed' },
  'follow_up.cancelled': { category: 'follow_up', label: 'Follow-up cancelled' },
  'follow_up.outstanding_approximate': { category: 'follow_up', label: 'Outstanding (reconstructed)' },
  'follow_up.overdue_approximate': { category: 'follow_up', label: 'Overdue (reconstructed)' },
});

function dayInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shiftDays(isoDay, days) {
  const stamp = new Date(`${isoDay}T12:00:00Z`);
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10);
}

export function resolveIntelPeriod(period, custom, now = new Date(), timeZone = PHASE_A_TIME_ZONE) {
  const today = dayInZone(now, timeZone);
  if (period === '7') return { from: shiftDays(today, -6), to: today };
  if (period === '30') return { from: shiftDays(today, -29), to: today };
  if (period === '90') return { from: shiftDays(today, -89), to: today };
  return {
    from: custom?.from || '',
    to: custom?.to || '',
  };
}

export function defaultIntelFilters(now = new Date()) {
  const range = historyDefaultRange(now);
  return {
    period: '30',
    from: range.from,
    to: range.to,
    date: range.to,
    bucket: '',
    event: '',
    consultancyId: '',
    userId: '',
    actorId: '',
  };
}

export function countActiveIntelFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  if (filters.bucket) count += 1;
  if (filters.event) count += 1;
  if (filters.consultancyId) count += 1;
  if (filters.userId) count += 1;
  if (filters.actorId) count += 1;
  return count;
}

export function intelFilterChips(filters) {
  if (!filters) return [];
  const chips = [];
  if (filters.bucket) {
    const match = INTEL_BUCKETS.find((row) => row.id === filters.bucket);
    chips.push({ key: 'bucket', label: match?.label || filters.bucket, clear: { bucket: '' } });
  }
  if (filters.event) {
    const match = INTEL_EVENTS.find((row) => row.id === filters.event);
    chips.push({ key: 'event', label: match?.label || filters.event, clear: { event: '' } });
  }
  if (filters.consultancyId) {
    chips.push({
      key: 'consultancyId',
      label: isObjectId(filters.consultancyId) ? `Consultancy ${filters.consultancyId.slice(-6)}` : 'Consultancy filter',
      clear: { consultancyId: '' },
    });
  }
  if (filters.userId) {
    chips.push({
      key: 'userId',
      label: isObjectId(filters.userId) ? `Staff ${filters.userId.slice(-6)}` : 'Staff filter',
      clear: { userId: '' },
    });
  }
  if (filters.actorId) {
    chips.push({
      key: 'actorId',
      label: isObjectId(filters.actorId) ? `Actor ${filters.actorId.slice(-6)}` : 'Actor filter',
      clear: { actorId: '' },
    });
  }
  return chips;
}

function finite(value) {
  // Number(null) and Number('') are 0; a missing value must stay missing, never become zero.
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function actorDisplay(actor) {
  if (!actor) return 'Actor was not stored';
  const series = actor.type === 'admin' ? 'Platform admin' : 'CRM user';
  return `${actor.name || actor.id} · ${series}`;
}

export function bucketLabel(bucket) {
  const match = INTEL_BUCKETS.find((row) => row.id === (bucket || ''));
  return match?.label || bucket || 'Open commitments';
}

export function followUpMetricCards(data) {
  if (!data?.current) {
    return [
      { key: 'overdue', label: 'Overdue now', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
      { key: 'due_today', label: 'Due today', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
      { key: 'upcoming', label: 'Upcoming', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
      { key: 'completed', label: 'Completed in range', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
      { key: 'unscheduled', label: 'Unscheduled', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
      { key: 'rate', label: 'Completion rate', text: '—', detail: 'Waiting for follow-up intelligence.', unavailable: true },
    ];
  }
  const current = data.current;
  const rate = completionRateText(current.completion);
  return [
    {
      key: 'overdue',
      label: 'Overdue now',
      text: String(finite(current.overdue) ?? 0),
      detail: 'Open rows with a scheduled time already past.',
      tone: 'warn',
      filter: { bucket: 'overdue' },
    },
    {
      key: 'due_today',
      label: 'Due today',
      text: String(finite(current.dueToday) ?? 0),
      detail: 'Still scheduled later today.',
      filter: { bucket: 'due_today' },
    },
    {
      key: 'upcoming',
      label: 'Upcoming',
      text: String(finite(current.upcoming) ?? 0),
      detail: 'Scheduled after today.',
      filter: { bucket: 'upcoming' },
    },
    {
      key: 'completed',
      label: 'Completed in range',
      text: String(finite(current.completedInRange) ?? 0),
      detail: 'completedAt falls in the selected dates.',
      filter: { bucket: 'completed' },
    },
    {
      key: 'unscheduled',
      label: 'Unscheduled',
      text: String(finite(current.unscheduled) ?? 0),
      detail: 'Open rows with no due date — not counted as overdue.',
      filter: { bucket: 'unscheduled' },
    },
    {
      key: 'rate',
      label: 'Completion rate',
      text: rate.text,
      detail: rate.detail,
      unavailable: rate.unavailable,
    },
  ];
}

export function followUpDistribution(data) {
  if (!data?.current) return [];
  const current = data.current;
  const rows = [
    { id: 'overdue', label: 'Overdue', count: finite(current.overdue) ?? 0, filter: 'overdue', tone: 'warn' },
    { id: 'due_today', label: 'Due today', count: finite(current.dueToday) ?? 0, filter: 'due_today', tone: 'ok' },
    { id: 'upcoming', label: 'Upcoming', count: finite(current.upcoming) ?? 0, filter: 'upcoming', tone: 'info' },
    { id: 'unscheduled', label: 'Unscheduled', count: finite(current.unscheduled) ?? 0, filter: 'unscheduled', tone: 'muted' },
    { id: 'completed', label: 'Completed', count: finite(current.completedInRange) ?? 0, filter: 'completed', tone: 'brand' },
    { id: 'cancelled', label: 'Cancelled', count: finite(current.cancelledInRange) ?? 0, filter: 'cancelled', tone: 'muted' },
  ];
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / max) * 100),
  }));
}

export function dayEndMetricCards(data) {
  if (!data?.summary) {
    return [
      { key: 'students', label: 'New students', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'admissions', label: 'Admission changes', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'opened', label: 'Assignments opened', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'revoked', label: 'Assignments revoked', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'completed', label: 'Follow-ups completed', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'outstanding', label: 'Outstanding at day end', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
      { key: 'overdue', label: 'Overdue at day end', text: '—', detail: 'Waiting for day-end report.', unavailable: true },
    ];
  }
  const summary = data.summary;

  function countCard(key, label, value, detail, extras = {}) {
    if (value == null) {
      return {
        key,
        label,
        text: '—',
        detail: extras.nullDetail || 'Unavailable — cannot be reconstructed from existing records.',
        unavailable: true,
        ...extras,
      };
    }
    return {
      key,
      label,
      text: String(value),
      detail,
      unavailable: false,
      ...extras,
    };
  }

  return [
    countCard('students', 'New students', summary.studentsCreated, 'student.created audits on this day.', {
      nullDetail: 'Unavailable — admission audit scan was truncated or empty.',
      filter: { event: 'admission' },
    }),
    countCard('admissions', 'Admission changes', summary.admissionChanges, 'Recorded status changes. Not a conversion rate.', {
      nullDetail: 'Unavailable — admission audit scan was truncated or empty.',
      filter: { event: 'admission' },
    }),
    countCard('opened', 'Assignments opened', summary.assignmentsOpened, 'Assignment rows created this day.', {
      filter: { event: 'assignment' },
    }),
    countCard('revoked', 'Assignments revoked', summary.assignmentsRevoked, 'Revoked rows stay in the report.', {
      filter: { event: 'assignment' },
    }),
    countCard('completed', 'Follow-ups completed', summary.followUpsCompleted, 'completedAt on this day.', {
      filter: { event: 'follow_up' },
    }),
    countCard(
      'outstanding',
      'Outstanding at day end',
      summary.outstanding?.count,
      'Approximate reconstruction. Not an end-of-day snapshot.',
      {
        nullDetail: 'No follow-up rows exist to reconstruct this day.',
        approximate: true,
        filter: { event: 'follow_up' },
      }
    ),
    countCard(
      'overdue',
      'Overdue at day end',
      summary.overdue?.count,
      'Approximate. A row with no due date is not overdue.',
      {
        nullDetail: 'No follow-up rows exist to reconstruct this day.',
        approximate: true,
        tone: 'warn',
        filter: { event: 'follow_up' },
      }
    ),
  ];
}

export function dayEndCategoryBreakdown(items) {
  const counts = new Map();
  (items || []).forEach((row) => {
    const meta = DAY_KIND_META[row.kind] || { category: 'other', label: row.kind || 'Other' };
    const key = meta.category;
    const current = counts.get(key) || { id: key, label: categoryTitle(key), count: 0, kinds: {} };
    current.count += 1;
    current.kinds[row.kind] = (current.kinds[row.kind] || 0) + 1;
    counts.set(key, current);
  });
  const rows = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / max) * 100),
  }));
}

function categoryTitle(category) {
  if (category === 'admission') return 'Admissions';
  if (category === 'assignment') return 'Assignments';
  if (category === 'follow_up') return 'Follow-ups';
  if (category === 'exception') return 'Exceptions';
  return 'Other recorded events';
}

export function dayEndKindLabel(kind) {
  return DAY_KIND_META[kind]?.label || kind || 'Recorded event';
}

export function dayEndEventDetail(row) {
  if (!row) return '—';
  if (row.exceptionReason) return `${row.exceptionReason}${row.severity ? ` · ${row.severity}` : ''}`;
  if (row.outcome || row.nextAction) return [row.outcome, row.nextAction].filter(Boolean).join(' · ');
  if (row.previousStatus || row.nextStatus) {
    return `${row.previousStatus || 'Unavailable'} → ${row.nextStatus || 'Unavailable'}`;
  }
  if (row.status) return row.status;
  return 'No additional outcome was stored.';
}

export function workloadAggregateCards(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = finite(data?.total);
  const pageScoped = total != null && total > items.length;

  function sum(field) {
    return items.reduce((acc, row) => acc + (finite(row[field]) || 0), 0);
  }

  if (!data) {
    return [
      { key: 'staff', label: 'Staff in report', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
      { key: 'assigned', label: 'Active assignments', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
      { key: 'open', label: 'Open follow-ups', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
      { key: 'overdue', label: 'Overdue follow-ups', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
      { key: 'admissions', label: 'Admission events', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
      { key: 'completed', label: 'Completed follow-ups', text: '—', detail: 'Waiting for workload intelligence.', unavailable: true },
    ];
  }

  return [
    {
      key: 'staff',
      label: 'Staff in report',
      text: total == null ? '—' : String(total),
      detail: 'Listed by name. Not ranked by volume.',
      unavailable: total == null,
    },
    {
      key: 'assigned',
      label: 'Active assignments',
      text: String(sum('assignedConsultancies')),
      detail: pageScoped ? `Among ${items.length} loaded staff · not the full set` : 'Current consultancy assignments on this page.',
      pageScoped,
    },
    {
      key: 'open',
      label: 'Open follow-ups',
      text: String(sum('openFollowUps')),
      detail: pageScoped
        ? `Among ${items.length} loaded staff · shared consultancies counted per assignee`
        : 'Shared consultancy follow-ups are counted for every current assignee.',
      pageScoped,
    },
    {
      key: 'overdue',
      label: 'Overdue follow-ups',
      text: String(sum('overdueFollowUps')),
      detail: 'Open rows with a scheduled time already past.',
      tone: 'warn',
      pageScoped,
    },
    {
      key: 'admissions',
      label: 'Admission events',
      text: String(sum('admissionsRecorded')),
      detail: 'Recorded status changes attributed to the staff member. Not conversions.',
      pageScoped,
    },
    {
      key: 'completed',
      label: 'Completed follow-ups',
      text: String(sum('followUpsCompleted')),
      detail: 'Completions attributed to the staff member in the selected range.',
      pageScoped,
    },
  ];
}

export function workloadChartRows(items, metricId = 'openFollowUps') {
  const metric = INTEL_WORKLOAD_METRICS.find((row) => row.id === metricId) || INTEL_WORKLOAD_METRICS[1];
  return (items || [])
    .map((row) => ({
      id: row.userId,
      name: row.name || row.userId || 'Staff member',
      label: shortName(row.name || row.userId || 'Staff'),
      value: finite(row[metric.id]) || 0,
      metric: metric.id,
      metricLabel: metric.label,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
}

function shortName(name) {
  const text = String(name || '').trim();
  if (text.length <= 18) return text;
  return `${text.slice(0, 16)}…`;
}

export function formatIntelWhen(value, timeZone = PHASE_A_TIME_ZONE) {
  return formatTimestamp(value, timeZone);
}

export function reportingDayLabel(date, timeZone = PHASE_A_TIME_ZONE) {
  if (!date) return 'Reporting day unavailable';
  return `${date} · ${timeZone}`;
}

/* ------------------------------------------------------------------ */
/* Simplified page view-models. Pure functions so the rules for 0 vs   */
/* Unavailable vs Not enough data are testable without rendering.      */
/* ------------------------------------------------------------------ */

const UNAVAILABLE = 'Unavailable';

function countText(value) {
  const n = finite(value);
  return n == null ? UNAVAILABLE : n.toLocaleString('en-US');
}

function dayParts(isoDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDay || ''))) return null;
  const stamp = new Date(`${isoDay}T12:00:00Z`);
  return Number.isNaN(stamp.getTime()) ? null : stamp;
}

const MONTHS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

// Fixed month names: Intl output differs between locales/ICU builds ("Sep" vs "Sept").
function formatDay(stamp, withYear) {
  const base = `${stamp.getUTCDate()} ${MONTHS[stamp.getUTCMonth()]}`;
  return withYear ? `${base} ${stamp.getUTCFullYear()}` : base;
}

/** "27 Oct 2026" or '' when the value is not a calendar day. */
export function intelDayLabel(isoDay) {
  const stamp = dayParts(isoDay);
  return stamp ? formatDay(stamp, true) : '';
}

/** "28 Sep – 27 Oct 2026" (year shown once when both ends share it). */
export function intelRangeLabel(from, to) {
  const start = dayParts(from);
  const end = dayParts(to);
  if (!start || !end) return '';
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${formatDay(start, !sameYear)} – ${formatDay(end, true)}`;
}

/** True when the visible filters differ from a fresh page load. */
export function intelFiltersChanged(filters, defaults) {
  if (!filters || !defaults) return false;
  return ['period', 'from', 'to', 'date', 'bucket', 'event', 'consultancyId', 'userId', 'actorId']
    .some((key) => (filters[key] || '') !== (defaults[key] || ''));
}

/** Short scope badge. The long sentence stays available as the tooltip. */
export function intelScopeBadge(data, note = '') {
  if (!data) return null;
  let label = '';
  if (data.scopeBasis === 'organization_permission' && data.scope === 'module') label = 'Organization-wide';
  else if (data.aggregateScope === 'module' && data.scope === 'assigned') label = 'Totals: organization · Records: assigned';
  else if (data.scope === 'assigned' || data.aggregateScope === 'assigned') label = 'Assigned consultancies only';
  else if (data.scope === 'module') label = 'Platform account scope';
  return label ? { label, title: note || label } : null;
}

const BUCKET_PILLS = Object.freeze({
  overdue: 'Overdue',
  due_today: 'Due today',
  upcoming: 'Upcoming',
  unscheduled: 'No due date',
  completed: 'Completed',
  cancelled: 'Cancelled',
});

export function bucketPillLabel(bucket, status) {
  return BUCKET_PILLS[bucket] || status || 'Open';
}

export function dayEndSourceLabel(source) {
  if (source === 'crmAuditLogs') return 'Audit log';
  if (source === 'crmConsultancyAssignments') return 'Assignment records';
  if (source === 'crmConsultancyFollowUps') return 'Follow-up records';
  return source ? String(source) : 'Source not stored';
}

function completionSummary(completion) {
  const rate = completionRateText(completion);
  if (rate.unavailable) {
    return {
      available: false,
      text: 'Not enough scheduled follow-ups',
      detail: 'A rate needs follow-ups scheduled inside the selected dates.',
    };
  }
  return { available: true, text: rate.text, detail: rate.detail };
}

/**
 * Four primary cards plus secondary facts. A missing count is "Unavailable",
 * never 0. Only a successfully calculated zero is shown as 0.
 */
export function followUpOverview(data) {
  const current = data?.current || null;
  function card(key, label, raw, detail, bucket, attention) {
    const value = current ? finite(raw) : null;
    return {
      key,
      label,
      value,
      text: countText(current ? raw : null),
      detail,
      unavailable: value == null,
      attention: Boolean(attention && value != null && value > 0),
      filter: value == null ? null : { bucket },
    };
  }
  const unscheduled = current ? finite(current.unscheduled) : null;
  const previous = data?.comparison || null;
  let previousText = null;
  if (previous) {
    const prevRate = completionRateText(previous.completion);
    previousText = `Previous window of the same length: ${countText(previous.completions)} completed · rate ${prevRate.unavailable ? 'not enough data' : prevRate.text}.`;
  }
  return {
    cards: [
      card('overdue', 'Overdue', current?.overdue, 'Open and past their scheduled time.', 'overdue', true),
      card('due_today', 'Due today', current?.dueToday, 'Open and scheduled later today.', 'due_today'),
      card('upcoming', 'Upcoming', current?.upcoming, 'Open and scheduled after today.', 'upcoming'),
      card('completed', 'Completed', current?.completedInRange, 'Completed inside the selected dates.', 'completed'),
    ],
    unscheduled: {
      value: unscheduled,
      text: countText(current ? current.unscheduled : null),
      detail: 'Open with no due date. Not counted as overdue.',
      filter: unscheduled == null ? null : { bucket: 'unscheduled' },
    },
    completion: current ? completionSummary(current.completion) : { available: false, unavailable: true, text: UNAVAILABLE, detail: 'This report could not be loaded.' },
    previous: previousText,
  };
}

/**
 * Distribution bars for overdue / due today / upcoming / unscheduled / completed.
 * state: 'ready' | 'empty' (all zero) | 'unavailable' (a count is missing).
 */
export function followUpChartState(data) {
  const current = data?.current;
  if (!current) return { state: 'unavailable', rows: [], total: 0 };
  const spec = [
    ['overdue', 'Overdue', current.overdue, 'overdue', 'warn'],
    ['due_today', 'Due today', current.dueToday, 'due_today', 'ok'],
    ['upcoming', 'Upcoming', current.upcoming, 'upcoming', 'info'],
    ['unscheduled', 'Unscheduled', current.unscheduled, 'unscheduled', 'muted'],
    ['completed', 'Completed', current.completedInRange, 'completed', 'brand'],
  ];
  const rows = spec.map(([id, label, raw, bucket, tone]) => ({ id, label, count: finite(raw), bucket, tone }));
  if (rows.some((row) => row.count == null)) return { state: 'unavailable', rows: [], total: 0 };
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return { state: 'empty', rows: [], total: 0 };
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return {
    state: 'ready',
    total,
    rows: rows.map((row) => ({ ...row, percent: Math.round((row.count / max) * 100) })),
  };
}

const DAY_GROUPS = Object.freeze([
  { id: 'student', title: 'Student activity', keys: ['students', 'admissions'] },
  { id: 'assignment', title: 'Assignment activity', keys: ['opened', 'revoked'] },
  { id: 'follow_up', title: 'Follow-up activity', keys: ['completed', 'outstanding', 'overdue'] },
]);

const DAY_LABELS = Object.freeze({
  students: 'New students',
  admissions: 'Admission-status changes',
  opened: 'Assignments opened',
  revoked: 'Assignments revoked',
  completed: 'Follow-ups completed',
  outstanding: 'Outstanding at day end',
  overdue: 'Overdue at day end',
});

/**
 * Day-end metrics grouped by activity. Every metric is tagged
 * recorded | reconstructed | unavailable so facts, estimates, and gaps never blur.
 */
export function dayEndGroups(data) {
  const loaded = Boolean(data?.summary);
  const byKey = Object.fromEntries(dayEndMetricCards(data).map((card) => [card.key, card]));
  return DAY_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    metrics: group.keys.map((key) => {
      const card = byKey[key];
      const unavailable = !loaded || card.unavailable;
      const kind = unavailable ? 'unavailable' : (card.approximate ? 'reconstructed' : 'recorded');
      return {
        key,
        label: DAY_LABELS[key] || card.label,
        text: unavailable ? UNAVAILABLE : card.text,
        detail: loaded ? card.detail : 'This report could not be loaded.',
        kind,
        unavailable,
        tone: card.tone,
        filter: unavailable ? null : card.filter,
      };
    }),
  }));
}

/** One short sentence about what was recorded, plus the reconstruction caveat. */
export function dayEndHeadline(data) {
  if (!data?.summary) return { summary: '', note: '' };
  const s = data.summary;
  const facts = [
    [s.studentsCreated, 'new student', 'new students'],
    [s.admissionChanges, 'admission-status change', 'admission-status changes'],
    [s.assignmentsOpened, 'assignment opened', 'assignments opened'],
    [s.assignmentsRevoked, 'assignment revoked', 'assignments revoked'],
    [s.followUpsCompleted, 'follow-up completed', 'follow-ups completed'],
  ];
  const known = facts.filter(([value]) => finite(value) != null);
  const missing = facts.length - known.length;
  const active = known
    .filter(([value]) => Number(value) > 0)
    .map(([value, one, many]) => `${Number(value).toLocaleString('en-US')} ${Number(value) === 1 ? one : many}`);
  let summary;
  if (active.length) summary = `Recorded: ${active.join(', ')}.`;
  else if (!known.length) summary = 'Recorded activity is unavailable for this day.';
  else if (missing) summary = 'No activity in the figures that are available.';
  else summary = 'No student, assignment, or follow-up activity was recorded.';
  if (missing && known.length) summary += ` ${missing} figure${missing === 1 ? ' is' : 's are'} unavailable.`;
  return {
    summary,
    note: data.exactSnapshot === false
      ? 'Outstanding and overdue are reconstructed from surviving records. No end-of-day snapshot is stored.'
      : '',
  };
}

/** Only three workload headline metrics; detail states the attribution rule. */
export function workloadSummaryCards(data) {
  const cards = workloadAggregateCards(data);
  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  const loaded = Boolean(data);
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = finite(data?.total);
  const partial = total != null && total > items.length;
  const scoped = partial ? `Among the ${items.length} staff on this page. ` : '';
  return [
    {
      key: 'staff',
      label: 'Staff members',
      text: loaded ? (total == null ? UNAVAILABLE : total.toLocaleString('en-US')) : UNAVAILABLE,
      detail: 'Listed by name, not ranked.',
      unavailable: !loaded || total == null,
    },
    {
      key: 'assigned',
      label: 'Active consultancy assignments',
      text: loaded ? byKey.assigned.text : UNAVAILABLE,
      detail: `${scoped}Current assignments, one per staff member and consultancy.`,
      unavailable: !loaded,
    },
    {
      key: 'open',
      label: 'Open follow-ups',
      text: loaded ? byKey.open.text : UNAVAILABLE,
      detail: `${scoped}Shared consultancies count once for each assignee.`,
      unavailable: !loaded,
    },
  ];
}

/** Scope line shared by the comparison chart and the staff list. */
export function workloadScopeLine(data) {
  if (!data) return '';
  const items = Array.isArray(data.items) ? data.items : [];
  const total = finite(data.total);
  if (total == null || total <= items.length) return `${items.length} staff member${items.length === 1 ? '' : 's'}`;
  return `${items.length} of ${total.toLocaleString('en-US')} staff on this page`;
}

export { dayEndAccuracy, completionRateText };
