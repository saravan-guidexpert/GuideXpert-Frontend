import { admissionChartRows, operationsQuery } from './crmWorkspace.js';

export const OVERVIEW_PERIODS = Object.freeze([
  { id: '7', label: '7D', name: 'Last 7 days' },
  { id: '30', label: '30D', name: 'Last 30 days' },
  { id: '90', label: '90D', name: 'Last 90 days' },
  { id: 'custom', label: 'Custom', name: 'Custom range' },
]);

export const OVERVIEW_CONSULTANCY_LIMIT = 8;
export const TEAM_FETCH_LIMIT = 100;
export const TEAM_VISIBLE_ROWS = 8;

export const TEAM_FILTERS = Object.freeze([
  { id: 'all', label: 'Everyone' },
  { id: 'online', label: 'Online' },
  { id: 'idle', label: 'Idle' },
  { id: 'offline', label: 'Offline' },
  { id: 'closed', label: 'Not active' },
]);

export const TEAM_STATES = Object.freeze({
  online: { label: 'Online', hint: 'Active in the last 2 minutes' },
  idle: { label: 'Idle', hint: 'Signed in, but no activity in the last 2 minutes' },
  offline: { label: 'Offline', hint: 'No open session' },
  invited: { label: 'Invited', hint: 'Has not set up the account yet' },
  inactive: { label: 'Deactivated', hint: 'Account switched off' },
});

export function overviewOperationsQuery({ period, from, to, timeZone }) {
  return operationsQuery({ period, from, to, timeZone, page: 1, limit: OVERVIEW_CONSULTANCY_LIMIT });
}

export function teamQueries() {
  const page = { page: 1, limit: TEAM_FETCH_LIMIT };
  return {
    directory: page,
    users: page,
    updates: { ...page, source: 'business', actorType: 'crm-user' },
  };
}

function dateKeyLabel(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function customRangeLabel(range) {
  if (!range || range.id !== 'custom') return '';
  const from = dateKeyLabel(range.from);
  const to = dateKeyLabel(range.to);
  if (!from || !to) return '';
  return from === to ? from : `${from} – ${to}`;
}

export function periodName(periodId, range) {
  const custom = customRangeLabel(range);
  if (custom) return custom;
  if (range && range.label) return range.label;
  const found = OVERVIEW_PERIODS.find((item) => item.id === periodId);
  return found ? found.name : 'Selected period';
}

export function periodPhrase(periodId, range) {
  const custom = customRangeLabel(range);
  if (custom) return custom;
  const name = periodName(periodId, range);
  return /^last /i.test(name) ? `the ${name.toLowerCase()}` : name.toLowerCase();
}

export function formatCount(value) {
  const number = Number(value);
  if (value == null || !Number.isFinite(number)) return '—';
  return number.toLocaleString('en-IN');
}

export function referralComparison(current, previous) {
  if (current == null || previous == null) return null;
  const now = Number(current);
  const before = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  const diff = now - before;
  if (diff === 0) return { diff, direction: 'flat', text: 'Same as the previous period' };
  const sign = diff > 0 ? '+' : '−';
  return {
    diff,
    direction: diff > 0 ? 'up' : 'down',
    text: `${sign}${formatCount(Math.abs(diff))} vs the previous period`,
  };
}

const ADMISSION_TONE = Object.freeze({
  'Not started': 'neutral',
  Contacted: 'step-1',
  Counselling: 'step-2',
  Applied: 'step-3',
  Admitted: 'won',
  Enrolled: 'won-strong',
  'Not proceeding': 'stopped',
});

export function admissionBars(admission) {
  const rows = admissionChartRows(admission);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = rows.reduce((top, row) => Math.max(top, row.count), 0);
  return {
    total,
    rows: rows.map((row) => ({
      ...row,
      tone: ADMISSION_TONE[row.status] || 'neutral',
      share: total ? Math.round((row.count / total) * 1000) / 10 : 0,
      width: max ? (row.count / max) * 100 : 0,
    })),
  };
}

export function volumeStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { total: 0, peak: null, empty: true };
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const peak = rows.reduce((best, row) => (row.count > (best ? best.count : 0) ? row : best), null);
  return { total, peak, empty: total === 0 };
}

const AUTH_VISUAL = Object.freeze({
  'crm_user.login_succeeded': { kind: 'signin', tone: 'ok' },
  'crm_user.login_failed': { kind: 'signin', tone: 'danger' },
  'crm_user.login_inactive': { kind: 'signin', tone: 'warn' },
  'crm_user.logout': { kind: 'signout', tone: 'neutral' },
  'crm_session.revoked': { kind: 'security', tone: 'warn' },
  'crm_session.revoked_all': { kind: 'security', tone: 'warn' },
});

const ENTITY_KIND = Object.freeze({
  consultancy: 'consultancy',
  contact: 'consultancy',
  student: 'student',
  referral: 'referral',
});

export function activityVisual(event) {
  const action = event && event.action;
  const category = event && event.category;
  if (category === 'assignment') {
    return { kind: 'assignment', tone: action === 'crm_assignment.revoked' ? 'warn' : 'info' };
  }
  if (category === 'authentication') return AUTH_VISUAL[action] || { kind: 'security', tone: 'neutral' };
  if (category === 'permission') return { kind: 'permission', tone: 'info' };
  if (category === 'account') return { kind: 'account', tone: 'neutral' };
  if (category === 'business') {
    return { kind: ENTITY_KIND[event.entityType] || 'record', tone: 'accent' };
  }
  return { kind: 'security', tone: 'neutral' };
}

export function activityLabel(event) {
  const text = String((event && (event.summary || event.action)) || 'Event');
  return text.replace(/\.$/, '');
}

export function formatClock(value, timeZone) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
}

function toTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function dayKey(time, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
}

export function isSameDay(value, now, timeZone) {
  const time = toTime(value);
  return time != null && dayKey(time, timeZone) === dayKey(now.getTime(), timeZone);
}

export function relativeTime(value, timeZone, now = new Date()) {
  const time = toTime(value);
  if (time == null) return null;
  const diff = Math.max(0, now.getTime() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && isSameDay(time, now, timeZone)) return `${hours} h ago`;
  if (dayKey(time, timeZone) === dayKey(now.getTime() - 86400000, timeZone)) return 'Yesterday';
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${Math.max(days, 2)} days ago`;
  const sameYear = dayKey(time, timeZone).slice(0, 4) === dayKey(now.getTime(), timeZone).slice(0, 4);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(new Date(time));
}

export function formatMoment(value, timeZone) {
  const time = toTime(value);
  if (time == null) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
}

export function formatStamp(value, timeZone, now = new Date()) {
  const time = toTime(value);
  if (time == null) return '';
  if (isSameDay(time, now, timeZone)) return formatClock(time, timeZone);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
}

export function personInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export function updateSubject(event) {
  if (!event) return '';
  for (const snapshot of [event.after, event.before]) {
    if (!snapshot || typeof snapshot !== 'object') continue;
    const text = snapshot.fullName || snapshot.name;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  return '';
}

function latestUpdateByUser(items) {
  const latest = new Map();
  (items || []).forEach((event) => {
    const id = event && (event.actorCrmUserId || (event.actorType === 'crm-user' ? event.actorId : null));
    if (!id) return;
    const current = latest.get(id);
    if (!current || (toTime(event.createdAt) || 0) > (toTime(current.createdAt) || 0)) latest.set(id, event);
  });
  return latest;
}

const STATE_ORDER = Object.freeze({ online: 0, idle: 1, offline: 2, invited: 3, inactive: 4 });

// directory is required. users and updates are null when that request was refused,
// so a missing sign-in or change is shown as hidden rather than as "never".
export function teamRows({ directory, users, updates }) {
  const people = (directory && directory.items) || [];
  const logins = users ? new Map((users.items || []).map((row) => [String(row.id), row.lastLoginAt || null])) : null;
  const latest = updates ? latestUpdateByUser(updates.items) : null;
  const updatesComplete = updates ? Number(updates.total) <= (updates.items || []).length : false;
  const rows = people.map((person) => {
    const id = String(person.id);
    const state = TEAM_STATES[person.presence?.state] ? person.presence.state : (person.status === 'inactive' ? 'inactive' : 'offline');
    let lastLogin = { known: false, at: null };
    if (logins && logins.has(id)) lastLogin = { known: true, at: logins.get(id) };
    let lastUpdate = { known: false, event: null, complete: false };
    if (latest) lastUpdate = { known: true, event: latest.get(id) || null, complete: updatesComplete };
    const stamps = [person.presence?.lastSeenAt, lastLogin.at, lastUpdate.event?.createdAt].map(toTime).filter((value) => value != null);
    return {
      id,
      name: person.fullName || person.email || 'Unnamed account',
      email: person.email || '',
      role: person.roleLabel || person.role || '',
      initials: personInitials(person.fullName || person.email),
      state,
      lastSeenAt: person.presence?.lastSeenAt || null,
      sessions: Number(person.presence?.activeSessions) || 0,
      assignments: person.assignmentCount == null ? null : Number(person.assignmentCount),
      lastLogin,
      lastUpdate,
      latestAt: stamps.length ? Math.max(...stamps) : null,
    };
  });
  rows.sort((left, right) => (
    STATE_ORDER[left.state] - STATE_ORDER[right.state]
    || (right.latestAt || 0) - (left.latestAt || 0)
    || left.name.localeCompare(right.name)
  ));
  return rows;
}

export function teamFilter(rows, filter) {
  if (filter === 'closed') return rows.filter((row) => row.state === 'inactive' || row.state === 'invited');
  if (filter && filter !== 'all') return rows.filter((row) => row.state === filter);
  return rows;
}

export function teamTotals(rows, timeZone, now = new Date()) {
  const count = (test) => rows.filter(test).length;
  return {
    all: rows.length,
    online: count((row) => row.state === 'online'),
    idle: count((row) => row.state === 'idle'),
    offline: count((row) => row.state === 'offline'),
    closed: count((row) => row.state === 'inactive' || row.state === 'invited'),
    signedInToday: rows.some((row) => !row.lastLogin.known) ? null : count((row) => isSameDay(row.lastLogin.at, now, timeZone)),
    updatedToday: rows.some((row) => !row.lastUpdate.known) ? null : count((row) => isSameDay(row.lastUpdate.event?.createdAt, now, timeZone)),
  };
}
