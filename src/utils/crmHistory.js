import { PHASE_A_TIME_ZONE, formatTimestamp, historyDefaultRange, isObjectId } from './crmWorkspace.js';

export const HISTORY_PERIODS = Object.freeze([
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'custom', label: 'Custom' },
]);

export const HISTORY_ADMISSION_KINDS = Object.freeze([
  { id: '', label: 'Initial and changes' },
  { id: 'initial', label: 'Initial status only' },
  { id: 'transition', label: 'Status changes only' },
]);

export const HISTORY_ASSIGNMENT_STATES = Object.freeze([
  { id: '', label: 'Active and revoked' },
  { id: 'active', label: 'Still active' },
  { id: 'revoked', label: 'Revoked in this window' },
]);

export const HISTORY_ADMISSION_STATUSES = Object.freeze([
  'Not started',
  'Contacted',
  'Counselling',
  'Applied',
  'Admitted',
  'Enrolled',
  'Not proceeding',
]);

export const HISTORY_ACTION_LABELS = Object.freeze({
  'student.created': 'Student created',
  'student.updated': 'Student updated',
  'referral.created': 'Referral created',
  'referral.updated': 'Referral updated',
  'consultancy.created': 'Consultancy created',
  'consultancy.updated': 'Consultancy updated',
  'crm_assignment.created': 'Assignment created',
  'crm_assignment.revoked': 'Assignment revoked',
  'follow_up.created': 'Follow-up created',
  'follow_up.updated': 'Follow-up updated',
  'follow_up.completed': 'Follow-up completed',
  'contact.created': 'Contact created',
  'contact.updated': 'Contact updated',
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

export function resolveHistoryPeriod(period, custom, now = new Date(), timeZone = PHASE_A_TIME_ZONE) {
  const today = dayInZone(now, timeZone);
  if (period === '7') return { from: shiftDays(today, -6), to: today };
  if (period === '30') return { from: shiftDays(today, -29), to: today };
  if (period === '90') return { from: shiftDays(today, -89), to: today };
  return {
    from: custom?.from || '',
    to: custom?.to || '',
  };
}

export function defaultHistoryFilters(now = new Date()) {
  const range = historyDefaultRange(now);
  return {
    period: '30',
    from: range.from,
    to: range.to,
    kind: '',
    assignment: '',
    fromStatus: '',
    toStatus: '',
    consultancyId: '',
    actorId: '',
    userId: '',
    search: '',
  };
}

export function historyActionLabel(action) {
  if (!action) return 'Recorded activity';
  return HISTORY_ACTION_LABELS[action] || String(action).replace(/[._]/g, ' ');
}

export function actorDisplay(actor) {
  if (!actor) return 'Actor was not stored';
  const series = actor.type === 'admin' ? 'Platform admin' : 'CRM user';
  const name = actor.name || actor.id || 'Unknown';
  return `${name} · ${series}`;
}

export function countActiveHistoryFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  if (filters.kind) count += 1;
  if (filters.assignment) count += 1;
  if (filters.fromStatus) count += 1;
  if (filters.toStatus) count += 1;
  if (filters.consultancyId) count += 1;
  if (filters.actorId) count += 1;
  if (filters.userId) count += 1;
  if (filters.search && String(filters.search).trim()) count += 1;
  return count;
}

export function historyFilterChips(filters) {
  if (!filters) return [];
  const chips = [];
  if (filters.kind) {
    const match = HISTORY_ADMISSION_KINDS.find((row) => row.id === filters.kind);
    chips.push({ key: 'kind', label: match?.label || filters.kind, clear: { kind: '' } });
  }
  if (filters.assignment) {
    const match = HISTORY_ASSIGNMENT_STATES.find((row) => row.id === filters.assignment);
    chips.push({ key: 'assignment', label: match?.label || filters.assignment, clear: { assignment: '' } });
  }
  if (filters.fromStatus) {
    chips.push({ key: 'fromStatus', label: `From: ${filters.fromStatus}`, clear: { fromStatus: '' } });
  }
  if (filters.toStatus) {
    chips.push({ key: 'toStatus', label: `To: ${filters.toStatus}`, clear: { toStatus: '' } });
  }
  if (filters.consultancyId) {
    chips.push({
      key: 'consultancyId',
      label: isObjectId(filters.consultancyId) ? `Consultancy ${filters.consultancyId.slice(-6)}` : 'Consultancy filter',
      clear: { consultancyId: '' },
    });
  }
  if (filters.actorId) {
    chips.push({
      key: 'actorId',
      label: isObjectId(filters.actorId) ? `Actor ${filters.actorId.slice(-6)}` : 'Actor filter',
      clear: { actorId: '' },
    });
  }
  if (filters.userId) {
    chips.push({
      key: 'userId',
      label: isObjectId(filters.userId) ? `Assignee ${filters.userId.slice(-6)}` : 'Assignee filter',
      clear: { userId: '' },
    });
  }
  if (filters.search && String(filters.search).trim()) {
    chips.push({ key: 'search', label: `Search: ${String(filters.search).trim()}`, clear: { search: '' } });
  }
  return chips;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pageComplete(data) {
  if (!data) return false;
  const total = finiteNumber(data.total);
  const items = Array.isArray(data.items) ? data.items : [];
  if (total == null) return false;
  return total <= items.length;
}

export function historyMetricCards({ admissions, assignments, daily, rangeLabel, filters }) {
  const period = rangeLabel || 'Selected reporting period';
  const kindFilter = filters?.kind || '';
  const cards = [];

  if (!admissions) {
    cards.push({
      key: 'admissions',
      label: 'Admission events',
      text: '—',
      detail: 'Waiting for recorded admission history.',
      unavailable: true,
    });
  } else {
    const total = finiteNumber(admissions.total);
    cards.push({
      key: 'admissions',
      label: 'Admission events',
      text: total == null ? '—' : String(total),
      detail: total == null
        ? 'Admission total is unavailable.'
        : `Recorded admission audits · ${period}`,
      unavailable: total == null,
      filter: { kind: '' },
    });

    const items = Array.isArray(admissions.items) ? admissions.items : [];
    const complete = pageComplete(admissions);
    const initials = items.filter((row) => row.kind === 'initial').length;
    const transitions = items.filter((row) => row.kind === 'transition').length;

    let initialText;
    let initialDetail;
    let initialScoped = false;
    if (kindFilter === 'initial' && total != null) {
      initialText = String(total);
      initialDetail = `Student creation with a recorded status · ${period}`;
    } else if (complete) {
      initialText = String(initials);
      initialDetail = `Student creation with a recorded status · ${period}`;
    } else {
      initialText = String(initials);
      initialDetail = `Among ${items.length} loaded rows · not the full filtered set`;
      initialScoped = true;
    }

    let transitionText;
    let transitionDetail;
    let transitionScoped = false;
    if (kindFilter === 'transition' && total != null) {
      transitionText = String(total);
      transitionDetail = `Recorded previous → new status changes · ${period}`;
    } else if (complete) {
      transitionText = String(transitions);
      transitionDetail = `Recorded previous → new status changes · ${period}`;
    } else {
      transitionText = String(transitions);
      transitionDetail = `Among ${items.length} loaded rows · not the full filtered set`;
      transitionScoped = true;
    }

    cards.push({
      key: 'initial',
      label: 'Initial records',
      text: initialText,
      detail: initialDetail,
      unavailable: false,
      pageScoped: initialScoped,
      filter: { kind: 'initial' },
    });

    cards.push({
      key: 'transitions',
      label: 'Status transitions',
      text: transitionText,
      detail: transitionDetail,
      unavailable: false,
      pageScoped: transitionScoped,
      filter: { kind: 'transition' },
    });
  }

  if (!assignments) {
    cards.push({
      key: 'assignments',
      label: 'Assignment rows',
      text: '—',
      detail: 'Waiting for assignment history.',
      unavailable: true,
    });
  } else {
    const total = finiteNumber(assignments.total);
    const items = Array.isArray(assignments.items) ? assignments.items : [];
    const opened = items.filter((row) => row.openedAt && rangeContains(row.openedAt, assignments.range)).length;
    const revoked = items.filter((row) => row.revokedAt && rangeContains(row.revokedAt, assignments.range)).length;

    cards.push({
      key: 'assignments',
      label: 'Assignment rows',
      text: total == null ? '—' : String(total),
      detail: total == null
        ? 'Assignment total is unavailable.'
        : `Stored intervals overlapping ${period}`,
      unavailable: total == null,
      filter: { assignment: '' },
    });

    cards.push({
      key: 'opened',
      label: 'Opened in period',
      text: String(opened),
      detail: pageComplete(assignments)
        ? `Assignment creations inside ${period}`
        : `Among ${items.length} loaded rows · opened timestamps in range`,
      unavailable: false,
      pageScoped: !pageComplete(assignments),
    });

    cards.push({
      key: 'revoked',
      label: 'Revoked in period',
      text: String(revoked),
      detail: pageComplete(assignments)
        ? `Revocations inside ${period}`
        : `Among ${items.length} loaded rows · revocation timestamps in range`,
      unavailable: false,
      pageScoped: !pageComplete(assignments),
      filter: { assignment: 'revoked' },
    });
  }

  if (!daily) {
    cards.push({
      key: 'activity',
      label: 'Activity groups',
      text: '—',
      detail: 'Waiting for daily recorded activity.',
      unavailable: true,
    });
  } else {
    const total = finiteNumber(daily.total);
    const items = Array.isArray(daily.items) ? daily.items : [];
    const recorded = items.reduce((sum, row) => sum + (finiteNumber(row.count) || 0), 0);
    cards.push({
      key: 'activity',
      label: 'Activity groups',
      text: total == null ? '—' : String(total),
      detail: total == null
        ? 'Daily group total is unavailable.'
        : `Day · action · actor groups · ${period}`,
      unavailable: total == null,
    });
    cards.push({
      key: 'recorded',
      label: 'Recorded rows',
      text: String(recorded),
      detail: pageComplete(daily)
        ? `Sum of audit counts in ${period}`
        : `Sum among ${items.length} loaded groups · not the full set`,
      unavailable: false,
      pageScoped: !pageComplete(daily),
    });
  }

  return cards;
}

function rangeContains(stamp, range) {
  if (!stamp || !range?.start || !range?.end) return false;
  const at = new Date(stamp).getTime();
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  if (!Number.isFinite(at) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return at >= start && at <= end;
}

export function assignmentSummary(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const complete = pageComplete(data);
  const active = items.filter((row) => row.state === 'active').length;
  const revoked = items.filter((row) => row.state === 'revoked').length;
  const opened = items.filter((row) => row.openedAt && rangeContains(row.openedAt, data?.range)).length;
  const revokedInPeriod = items.filter((row) => row.revokedAt && rangeContains(row.revokedAt, data?.range)).length;
  return {
    total: finiteNumber(data?.total),
    active,
    revoked,
    opened,
    revokedInPeriod,
    loaded: items.length,
    complete,
    pageScoped: !complete,
  };
}

export function assignmentDuration(row, now = new Date()) {
  if (!row?.openedAt) {
    return { text: 'Unavailable', detail: 'Assignment open time was not stored.', elapsed: false };
  }
  const start = new Date(row.openedAt).getTime();
  if (!Number.isFinite(start)) {
    return { text: 'Unavailable', detail: 'Assignment open time is not readable.', elapsed: false };
  }
  const end = row.revokedAt ? new Date(row.revokedAt).getTime() : now.getTime();
  if (!Number.isFinite(end) || end < start) {
    return { text: 'Unavailable', detail: 'Duration cannot be calculated from stored times.', elapsed: false };
  }
  const ms = end - start;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  let text;
  if (days >= 1) text = `${days}d ${remHours}h`;
  else if (hours >= 1) text = `${hours}h`;
  else text = `${Math.max(1, Math.round(ms / (1000 * 60)))}m`;
  return {
    text,
    detail: row.revokedAt
      ? 'Stored open → revoke interval. Not credited as work performed.'
      : 'Elapsed duration to date. Not credited as work performed.',
    elapsed: !row.revokedAt,
  };
}

export function admissionStatusDistribution(items) {
  const counts = new Map();
  (items || []).forEach((row) => {
    if (!row || row.kind !== 'transition' || !row.nextStatus) return;
    counts.set(row.nextStatus, (counts.get(row.nextStatus) || 0) + 1);
  });
  const rows = [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / max) * 100),
  }));
}

export function filterAdmissionItems(items, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter((row) => {
    const hay = [
      row.studentName,
      row.studentId,
      row.nextStatus,
      row.previousStatus,
      row.kind,
      actorDisplay(row.actor),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function filterAssignmentItems(items, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter((row) => {
    const hay = [
      row.consultancyName,
      row.consultancyId,
      row.userName,
      row.userId,
      row.state,
      actorDisplay(row.openedBy),
      actorDisplay(row.revokedBy),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function filterDailyItems(items, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter((row) => {
    const hay = [
      row.day,
      row.action,
      historyActionLabel(row.action),
      row.source,
      actorDisplay(row.actor),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Aggregate daily page rows into a day series. Omits zero-filled missing days. */
export function dailyTrendRows(items) {
  const byDay = new Map();
  (items || []).forEach((row) => {
    if (!row?.day) return;
    const current = byDay.get(row.day) || { day: row.day, label: row.day.slice(5), total: 0, business: 0, security: 0, byAction: {} };
    const count = finiteNumber(row.count) || 0;
    current.total += count;
    if (row.source === 'security') current.security += count;
    else current.business += count;
    const action = row.action || 'other';
    current.byAction[action] = (current.byAction[action] || 0) + count;
    byDay.set(row.day, current);
  });
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function dailyActionBreakdown(items) {
  const counts = new Map();
  (items || []).forEach((row) => {
    if (!row?.action) return;
    const key = `${row.source || 'business'}:${row.action}`;
    const current = counts.get(key) || {
      id: key,
      action: row.action,
      source: row.source || 'business',
      label: historyActionLabel(row.action),
      count: 0,
    };
    current.count += finiteNumber(row.count) || 0;
    counts.set(key, current);
  });
  const rows = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / max) * 100),
  }));
}

export function reportingPeriodLabel(from, to, timeZone = PHASE_A_TIME_ZONE) {
  if (!from || !to) return 'Reporting period unavailable';
  if (from === to) return `${from} · ${timeZone}`;
  return `${from} → ${to} · ${timeZone}`;
}

export function formatHistoryWhen(value, timeZone = PHASE_A_TIME_ZONE) {
  return formatTimestamp(value, timeZone);
}
