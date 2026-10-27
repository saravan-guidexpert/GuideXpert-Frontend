import { activityActionOptions, PHASE_A_TIME_ZONE } from './crmWorkspace.js';
import { activityStory, actorName } from './crmConsultancies.js';

export const ACTIVITY_PERIODS = Object.freeze([
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom range' },
]);

export const ACTIVITY_SOURCES = Object.freeze([
  { id: 'both', label: 'Business and security' },
  { id: 'business', label: 'Business' },
  { id: 'security', label: 'Security' },
]);

export const ACTIVITY_ENTITY_TYPES = Object.freeze([
  { id: '', label: 'Any record type' },
  { id: 'consultancy', label: 'Consultancy' },
  { id: 'student', label: 'Student' },
  { id: 'referral', label: 'Referral' },
  { id: 'contact', label: 'Contact' },
]);

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

export function shiftCalendarMonth(year, monthIndex, delta) {
  const stamp = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: stamp.getUTCFullYear(), monthIndex: stamp.getUTCMonth() };
}

export function calendarMonthLabel(year, monthIndex, timeZone = PHASE_A_TIME_ZONE) {
  const stamp = new Date(Date.UTC(year, monthIndex, 1, 12));
  return new Intl.DateTimeFormat('en-IN', { timeZone, month: 'long', year: 'numeric' }).format(stamp);
}

/** Monday-first month grid for the Activity calendar. Counts come from trend day keys. */
export function buildActivityCalendarDays(year, monthIndex, countsByDay = {}, selectedFrom = '', selectedTo = '') {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // JS: 0 Sunday … 6 Saturday → Monday-first offset
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push({ key: `pad-${i}`, blank: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = Number(countsByDay[iso] || 0);
    const inRange = Boolean(
      selectedFrom
      && selectedTo
      && iso >= selectedFrom
      && iso <= selectedTo
    );
    cells.push({
      key: iso,
      blank: false,
      day,
      iso,
      count,
      intensity: count <= 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : 3,
      inRange,
      isStart: iso === selectedFrom,
      isEnd: iso === selectedTo,
      isSingle: selectedFrom && selectedFrom === selectedTo && iso === selectedFrom,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `trail-${cells.length}`, blank: true });
  return cells;
}

export function activityCountsByDay(trendRows) {
  const map = {};
  (trendRows || []).forEach((row) => {
    if (!row?.key) return;
    map[row.key] = Number(row.total != null ? row.total : (row.business || 0) + (row.security || 0));
  });
  return map;
}

export function resolveActivityPeriod(period, custom, now = new Date(), timeZone = PHASE_A_TIME_ZONE) {
  const today = dayInZone(now, timeZone);
  if (period === 'today') return { from: today, to: today };
  if (period === 'yesterday') {
    const day = shiftDays(today, -1);
    return { from: day, to: day };
  }
  if (period === '7') return { from: shiftDays(today, -6), to: today };
  if (period === '30') return { from: shiftDays(today, -29), to: today };
  return {
    from: custom?.from || '',
    to: custom?.to || '',
  };
}

export function defaultActivityFilters(now = new Date()) {
  const range = resolveActivityPeriod('7', null, now);
  return {
    period: '7',
    from: range.from,
    to: range.to,
    page: 1,
    limit: 20,
    source: 'both',
    action: '',
    actorId: '',
    actorType: '',
    entityType: '',
    entityId: '',
    consultancyId: '',
    q: '',
  };
}

export function hasActivityFilters(filters) {
  return Boolean(
    filters.action
    || filters.actorId
    || filters.actorType
    || filters.entityType
    || filters.entityId
    || filters.consultancyId
    || String(filters.q || '').trim()
    || (filters.source && filters.source !== 'both')
  );
}

export function activityMetricCards(summary) {
  if (!summary) return [];
  const insights = summary.insights || {};
  const meaning = insights.meaning || {};
  const security = summary.security || {};
  const rows = [
    {
      key: 'business',
      label: 'Business actions',
      value: summary.business?.total,
      detail: meaning.businessActions || 'Recorded business events',
      filter: { source: 'business' },
    },
    {
      key: 'activeUsers',
      label: 'Active CRM users',
      value: insights.activeCrmUsers,
      detail: meaning.activeCrmUsers || 'Distinct actors on business events',
      filter: { source: 'business' },
    },
    {
      key: 'consultancies',
      label: 'Consultancies touched',
      value: insights.consultanciesTouched,
      detail: meaning.consultanciesTouched || 'Distinct consultancies in events',
      filter: { source: 'business' },
    },
    {
      key: 'created',
      label: 'Records created',
      value: insights.recordsCreated,
      detail: meaning.recordsCreated || 'Create-style business actions',
      filter: { source: 'business' },
    },
    {
      key: 'updated',
      label: 'Records updated',
      value: insights.recordsUpdated,
      detail: meaning.recordsUpdated || 'Update-style business actions',
      filter: { source: 'business' },
    },
    {
      key: 'security',
      label: 'Security events',
      value: security.total,
      detail: meaning.securityEvents || 'Visible security events',
      filter: { source: 'security' },
    },
    {
      key: 'failed',
      label: 'Failed sign-ins',
      value: security.signInFailed,
      detail: security.signInFailed == null
        ? 'Restricted — account security is outside this caller’s access'
        : 'Recorded failed authentication events',
      filter: security.signInFailed == null ? null : { source: 'security', action: 'crm_user.login_failed' },
      unavailable: security.signInFailed == null,
    },
  ];
  return rows.map((row) => {
    if (row.unavailable || row.value == null) {
      return {
        ...row,
        text: 'Restricted',
        unavailable: true,
      };
    }
    return {
      ...row,
      text: Number(row.value).toLocaleString(),
      unavailable: false,
    };
  });
}

export function activityTrendRows(summary) {
  const business = summary?.series?.business || [];
  const security = summary?.series?.security || [];
  if (!business.length && !security.length) return [];
  const keys = new Map();
  business.forEach((point) => keys.set(point.key, { key: point.key, label: point.label, business: point.count, security: 0 }));
  security.forEach((point) => {
    const current = keys.get(point.key) || { key: point.key, label: point.label, business: 0, security: 0 };
    current.security = point.count;
    keys.set(point.key, current);
  });
  return [...keys.values()].map((row) => ({
    ...row,
    total: row.business + row.security,
  }));
}

export function activityDistribution(summary) {
  const rows = [
    ...(summary?.business?.byAction || []).map((row) => ({ ...row, source: 'business' })),
    ...(summary?.security?.byAction || []).map((row) => ({ ...row, source: 'security' })),
  ]
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count || left.action.localeCompare(right.action));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return rows.slice(0, 10).map((row) => ({
    id: `${row.source}:${row.action}`,
    action: row.action,
    source: row.source,
    label: actionLabel(row.action),
    count: row.count,
    percent: total ? Math.round((row.count / total) * 100) : 0,
  }));
}

export function actionLabel(action) {
  const labels = {
    'consultancy.created': 'Consultancy created',
    'consultancy.updated': 'Consultancy updated',
    'contact.created': 'Contact created',
    'contact.updated': 'Contact updated',
    'contact.deactivated': 'Contact deactivated',
    'student.created': 'Student created',
    'student.updated': 'Student updated',
    'referral.created': 'Referral recorded',
    'referral.source_corrected': 'Referral source corrected',
    'crm_assignment.created': 'Assignment created',
    'crm_assignment.revoked': 'Assignment revoked',
    'crm_user.login_succeeded': 'Sign-in succeeded',
    'crm_user.login_failed': 'Failed sign-in',
    'crm_user.login_inactive': 'Inactive sign-in denied',
    'crm_user.logout': 'Signed out',
    'crm_session.revoked': 'Session revoked',
    'crm_session.revoked_all': 'All sessions revoked',
    'consultancy.follow_up': 'Follow-up created',
    'consultancy.follow_up_updated': 'Follow-up updated',
    'consultancy.follow_up_completed': 'Follow-up completed',
    'consultancy.follow_up_cancelled': 'Follow-up cancelled',
    'consultancy.calling_status': 'Calling status changed',
    'consultancy.remark_added': 'Remark added',
    'consultancy.remark_edited': 'Remark edited',
    'consultancy.owner_reassigned': 'Owner reassigned',
    'crm_user.created': 'CRM account created',
    'crm_user.invited': 'CRM account invited',
    'crm_user.updated': 'CRM account updated',
    'crm_user.deactivated': 'CRM account deactivated',
    'crm_user.reset_issued': 'Password reset code issued',
    'crm_user.password_reset': 'Password reset by administrator',
    'crm_user.reset_requested': 'Password reset requested',
    'crm_user.reset_completed': 'Password reset completed',
    'crm_permission.updated': 'Permissions updated',
    'crm_permission.revoked': 'Permissions revoked',
  };
  return labels[action] || String(action || 'Event').replace(/\./g, ' · ');
}

export function timelineStory(event) {
  const base = activityStory(event);
  const who = event?.actor?.displayName || actorName(event?.actor);
  const record = event?.entityLabel || event?.entityName || event?.targetUserName || '';
  const house = event?.consultancyName || '';
  let title = base.title;
  if (event?.action === 'consultancy.created' && record) title = `${who} created ${record}`;
  else if (event?.action === 'consultancy.updated' && record) title = `${who} updated ${record}`;
  else if (event?.action === 'student.created' && record) title = `${who} added student ${record}`;
  else if (event?.action === 'student.updated' && record) title = `${who} updated student ${record}`;
  else if (event?.action === 'referral.created' && record) title = `${who} recorded a referral for ${record}`;
  else if (event?.action === 'consultancy.remark_edited') title = `${who} edited a remark${record ? ` on ${record}` : ''}`;
  else if (event?.action === 'consultancy.remark_added') title = `${who} added a remark${record ? ` on ${record}` : ''}`;
  else if (event?.action === 'crm_user.login_failed') title = `${who === 'Someone' ? 'Someone' : who} failed to sign in`;
  else if (event?.action === 'crm_user.login_succeeded') title = `${who} signed in`;
  else if (event?.action === 'crm_user.logout') title = `${who} signed out`;
  else if (who && who !== 'Someone' && who !== 'CRM user') title = `${who} · ${actionLabel(event?.action)}`;
  const bits = [base.detail];
  if (house && !title.includes(house)) bits.push(house);
  if (event?.source) bits.push(event.source === 'security' ? 'Security' : 'Business');
  return {
    ...base,
    title,
    detail: bits.filter(Boolean).join(' · '),
    category: event?.category || event?.source || 'event',
    source: event?.source || 'business',
    actionLabel: actionLabel(event?.action),
    consultancyName: house,
    entityName: record,
  };
}

export function formatChangeValue(value, missing) {
  if (missing) return 'Not recorded';
  if (value == null) return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

export function activityResultSummary(page, limit, total) {
  if (!total) return { label: 'No matching events', pages: 0, showPager: false };
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return {
    label: `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} events`,
    pages,
    showPager: pages > 1,
  };
}

export function mergeStaffPresence(directoryItems, summaryStaff) {
  const byId = new Map((summaryStaff || []).map((row) => [row.userId, row]));
  return (directoryItems || []).map((person) => {
    const stats = byId.get(person.id);
    return {
      ...person,
      businessEvents: stats ? stats.businessEvents : 0,
      lastBusinessAt: stats ? stats.lastBusinessAt : null,
      hasRecordedBusiness: Boolean(stats && stats.businessEvents),
    };
  }).sort((left, right) => {
    const presenceRank = { online: 0, idle: 1, offline: 2, invited: 3, inactive: 4 };
    const leftRank = presenceRank[left.presence?.state] ?? 9;
    const rightRank = presenceRank[right.presence?.state] ?? 9;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return (right.businessEvents || 0) - (left.businessEvents || 0) || String(left.fullName).localeCompare(String(right.fullName));
  });
}

export function actionOptions() {
  return activityActionOptions().map((action) => ({ id: action, label: actionLabel(action) }));
}
