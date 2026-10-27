import { CRM_ROLE_OPTIONS, crmCan, permissionsForRole } from '../constants/crmUserAccess.js';
import { interpretCrmResult } from './crmAccess.js';
import { analyticsParams } from '../pages/admin/crm/crmProductionQuery.js';

export const WORKSPACE_HOME = '/crm/admin';
export const CRM_WORKSPACE_PERMISSION = 'crm.roles.manage';

export const WORKSPACE_SECTIONS = Object.freeze([
  { id: 'overview', to: `${WORKSPACE_HOME}/overview`, label: 'Overview', access: 'workspace', end: true },
  { id: 'users', to: `${WORKSPACE_HOME}/users`, label: 'CRM Users', access: 'workspace', end: false },
  { id: 'access', to: `${WORKSPACE_HOME}/access`, label: 'Manage Access', access: 'workspace', end: false },
  { id: 'consultancies', to: `${WORKSPACE_HOME}/consultancies`, label: 'Consultancies', access: 'workspace', end: false },
  { id: 'activity', to: `${WORKSPACE_HOME}/activity`, label: 'Activity', access: 'workspace', end: false },
  { id: 'analytics', to: `${WORKSPACE_HOME}/analytics`, label: 'Operations', access: 'workspace', end: false },
  { id: 'history', to: `${WORKSPACE_HOME}/history`, label: 'History', access: 'workspace', end: false },
  { id: 'intelligence', to: `${WORKSPACE_HOME}/intelligence`, label: 'Intelligence', access: 'workspace', end: false },
]);

const ACTIVITY_ACTIONS = Object.freeze([
  'consultancy.created',
  'consultancy.updated',
  'contact.created',
  'contact.updated',
  'contact.deactivated',
  'student.created',
  'student.updated',
  'referral.created',
  'referral.source_corrected',
  'crm_assignment.created',
  'crm_assignment.revoked',
  'crm_user.created',
  'crm_user.invited',
  'crm_user.updated',
  'crm_user.deactivated',
  'crm_user.reset_issued',
  'crm_user.password_reset',
  'crm_user.login_succeeded',
  'crm_user.login_failed',
  'crm_user.login_inactive',
  'crm_user.logout',
  'crm_user.reset_requested',
  'crm_user.reset_completed',
  'crm_session.revoked',
  'crm_session.revoked_all',
  'crm_permission.updated',
  'crm_permission.revoked',
  'consultancy.follow_up',
  'consultancy.follow_up_updated',
  'consultancy.follow_up_completed',
  'consultancy.follow_up_cancelled',
  'consultancy.calling_status',
  'consultancy.remark_added',
  'consultancy.remark_edited',
  'consultancy.owner_reassigned',
]);

export function activityActionOptions() {
  return ACTIVITY_ACTIONS;
}

export function workspaceAccess(user) {
  const workspace = crmCan(user, CRM_WORKSPACE_PERMISSION);
  return {
    workspace,
    operations: workspace,
    accounts: workspace,
  };
}

export function visibleWorkspaceSections(user) {
  const access = workspaceAccess(user);
  return WORKSPACE_SECTIONS.filter((section) => access[section.access]);
}

export function workspaceServerDecision(result) {
  const interpreted = interpretCrmResult(result, { expectList: true });
  if (interpreted.state === 'ok' || interpreted.state === 'empty') {
    return { state: 'allowed', message: '' };
  }
  if (interpreted.state === 'forbidden') {
    return {
      state: 'forbidden',
      message: 'This workspace is limited to CRM administrators.',
    };
  }
  if (interpreted.state === 'unauthorized') {
    return { state: 'anonymous', message: interpreted.message };
  }
  return { state: 'error', message: interpreted.message || 'Cannot reach the server.' };
}

export function workspaceRouteDecision(user, sectionId) {
  const section = WORKSPACE_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return { state: 'missing', message: 'That section is not part of this workspace.' };
  const access = workspaceAccess(user);
  if (access[section.access]) return { state: 'allowed', message: '' };
  return {
    state: 'forbidden',
    message: 'This workspace is limited to CRM administrators.',
  };
}

export function accountActions(user) {
  return {
    viewDirectory: crmCan(user, CRM_WORKSPACE_PERMISSION),
    revokeSession: crmCan(user, 'crm.users.deactivate'),
    manageAssignment: crmCan(user, CRM_WORKSPACE_PERMISSION),
    createAccount: crmCan(user, 'crm.users.create'),
    updateAccount: crmCan(user, 'crm.users.update'),
    deactivateAccount: crmCan(user, 'crm.users.deactivate'),
  };
}

const ROLE_RANK = Object.freeze({ crm_administrator: 3, crm_manager: 2, crm_viewer: 1 });

export function grantableRoles(user) {
  const rank = ROLE_RANK[user?.role] || 0;
  return CRM_ROLE_OPTIONS.filter((option) => (ROLE_RANK[option.id] || 0) <= rank);
}

export function grantablePermissions(user, role) {
  const granted = new Set(Array.isArray(user?.permissions) ? user.permissions : []);
  return permissionsForRole(role).filter((key) => granted.has(key));
}

export function applyFilterPatch(current, patch) {
  const next = { ...current, ...patch };
  const changesPage = Object.keys(patch).some((key) => key !== 'page' && patch[key] !== current[key]);
  if (changesPage) next.page = 1;
  return next;
}

export function operationsQuery({ period, from, to, timeZone, page, limit, consultancyId }) {
  const built = analyticsParams({ period, from, to, timeZone });
  if (built.error) return built;
  const query = { ...built.query, page: page || 1, limit: limit || 20 };
  if (consultancyId) query.consultancyId = consultancyId;
  return { query };
}

export function overviewQuery({ page, limit, status, assignment }) {
  const query = { page: page || 1, limit: limit || 20 };
  if (status) query.status = status;
  if (assignment) query.assignment = assignment;
  return query;
}

export function directoryQuery({ page, limit, status, role, q, consultancyId, assignment, presence }) {
  const query = { page: page || 1, limit: limit || 20 };
  if (status) query.status = status;
  if (role) query.role = role;
  if (q && String(q).trim()) query.q = String(q).trim();
  if (consultancyId) query.consultancyId = consultancyId;
  if (assignment) query.assignment = assignment;
  if (presence) query.presence = presence;
  return query;
}

export function activityListQuery(input) {
  const from = input.from || '';
  const to = input.to || '';
  if ((from && !to) || (!from && to)) return { error: 'Enter both dates, or clear them.' };
  if (from && to && from > to) return { error: 'Enter a start date on or before the end date.' };
  const query = { page: input.page || 1, limit: input.limit || 20 };
  if (input.source === 'business' || input.source === 'security') query.source = input.source;
  if (input.action && ACTIVITY_ACTIONS.includes(input.action)) query.action = input.action;
  if (from) query.from = from;
  if (to) query.to = to;
  const search = input.q && String(input.q).trim();
  if (search) query.q = search;
  if (input.consultancyId && isObjectId(input.consultancyId)) query.consultancyId = input.consultancyId;
  if (input.actorId && isObjectId(input.actorId)) query.actorId = input.actorId;
  if (input.actorType === 'admin' || input.actorType === 'crm-user') query.actorType = input.actorType;
  if (input.entityType) query.entityType = input.entityType;
  if (input.entityId && isObjectId(input.entityId)) query.entityId = input.entityId;
  if (input.timeZone) query.timeZone = input.timeZone;
  return { query };
}

export function activitySummaryQuery(input) {
  const built = activityListQuery({ ...input, page: 1, limit: 20 });
  if (built.error) return built;
  const query = { ...built.query };
  delete query.page;
  delete query.limit;
  const limit = Number(input.summaryLimit || 10);
  query.limit = Math.min(20, Math.max(1, limit));
  return { query };
}

export function historyDefaultRange(now = new Date(), timeZone = PHASE_A_TIME_ZONE) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const to = format.format(now);
  const from = format.format(new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000)));
  return { from, to, timeZone };
}

export function historyQuery(input) {
  const from = input.from || '';
  const to = input.to || '';
  if (!from || !to) return { error: 'Enter both dates.' };
  if (from > to) return { error: 'Enter a start date on or before the end date.' };
  const query = {
    page: input.page || 1,
    limit: input.limit || 20,
    from,
    to,
  };
  if (input.timeZone) query.timeZone = input.timeZone;
  if (input.kind === 'initial' || input.kind === 'transition') query.kind = input.kind;
  if (input.assignment === 'active' || input.assignment === 'revoked') query.assignment = input.assignment;
  if (input.actorId && isObjectId(input.actorId)) query.actorId = input.actorId;
  if (input.consultancyId && isObjectId(input.consultancyId)) query.consultancyId = input.consultancyId;
  if (input.userId && isObjectId(input.userId)) query.userId = input.userId;
  if (input.fromStatus) query.fromStatus = input.fromStatus;
  if (input.toStatus) query.toStatus = input.toStatus;
  return { query };
}

export function historyEmptyMessage(section) {
  if (section === 'admissions') {
    return 'No recorded admission-status events match these filters. Students without an audit are not shown.';
  }
  if (section === 'assignments') {
    return 'No assignment intervals overlap these filters.';
  }
  return 'No recorded activity falls on these days. Missing days are not shown as zero.';
}

const INTELLIGENCE_BUCKETS = Object.freeze(['overdue', 'due_today', 'upcoming', 'unscheduled', 'completed', 'cancelled']);
const INTELLIGENCE_EVENTS = Object.freeze(['admission', 'assignment', 'follow_up', 'exception']);

function intelligenceIds(input, query) {
  if (input.timeZone) query.timeZone = input.timeZone;
  if (input.consultancyId && isObjectId(input.consultancyId)) query.consultancyId = input.consultancyId;
  if (input.userId && isObjectId(input.userId)) query.userId = input.userId;
}

export function intelligenceQuery(input) {
  const from = input.from || '';
  const to = input.to || '';
  if (!from || !to) return { error: 'Enter both dates.' };
  if (from > to) return { error: 'Enter a start date on or before the end date.' };
  const query = { page: input.page || 1, limit: input.limit || 20, from, to };
  intelligenceIds(input, query);
  if (INTELLIGENCE_BUCKETS.includes(input.bucket)) query.bucket = input.bucket;
  return { query };
}

export function dayEndQuery(input) {
  const date = input.date || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Enter a reporting date.' };
  const query = { page: input.page || 1, limit: input.limit || 20, date };
  intelligenceIds(input, query);
  if (input.actorId && isObjectId(input.actorId)) query.actorId = input.actorId;
  if (INTELLIGENCE_EVENTS.includes(input.event)) query.event = input.event;
  return { query };
}

export function intelligenceEmptyMessage(section) {
  if (section === 'follow-ups') {
    return 'No follow-ups match these filters. A follow-up with no due date is not listed as overdue.';
  }
  if (section === 'day-end') {
    return 'No recorded events match this reporting day. Missing history is not filled in.';
  }
  return 'No assigned staff match these filters. Staff are not ranked by activity.';
}

export function dayEndAccuracy(row) {
  if (!row || row.exact !== false) return 'Recorded';
  if (row.scheduleKnown === false) return 'Approximate · schedule at day end unknown';
  if (row.rescheduledLater) return 'Approximate · rescheduled later';
  return 'Approximate';
}

export function dayEndScheduleNote(summary) {
  const overdue = summary && summary.overdue;
  const base = 'Outstanding means an open Meeting Scheduled or Follow-up Required row that was not completed or cancelled by the end of the day. Other statuses are recorded outcomes and never count as outstanding.';
  if (!overdue) return base;
  const parts = [base];
  if (overdue.rescheduledLater) {
    parts.push(`${overdue.rescheduledLater} outstanding ${overdue.rescheduledLater === 1 ? 'row was' : 'rows were'} rescheduled after this day; the recorded earlier time is used where it was stored.`);
  }
  if (overdue.scheduleUnknown) {
    parts.push(`${overdue.scheduleUnknown} ${overdue.scheduleUnknown === 1 ? 'row has' : 'rows have'} no stored earlier time, so the current time is used and overdue may be wrong.`);
  }
  return parts.join(' ');
}

export function completionRateText(completion) {
  if (!completion || completion.rate == null) {
    return {
      text: '—',
      detail: 'No scheduled follow-ups form a denominator in this window.',
      unavailable: true,
    };
  }
  const percent = Math.round(completion.rate * 1000) / 10;
  return {
    text: `${percent}%`,
    detail: `${completion.numerator} completed of ${completion.denominator} scheduled. Cancelled rows are excluded.`,
    unavailable: false,
  };
}

export function intelligenceScopeNote(data) {
  if (!data) return '';
  if (data.scopeBasis === 'organization_permission' && data.scope === 'module') {
    return 'These totals and records cover every consultancy in the organization. This account holds organization-wide read access.';
  }
  if (data.aggregateScope === 'module' && data.scope === 'assigned') {
    return 'These totals are organization-wide. The records below stay inside consultancies assigned to this account.';
  }
  if (data.scope === 'assigned' || data.aggregateScope === 'assigned') {
    return 'These totals and records stay inside consultancies assigned to this account.';
  }
  if (data.scope === 'module') {
    return 'These totals and records include what this platform account can read.';
  }
  return '';
}

export function historyAdmissionScopeNote(data) {
  if (!data) return '';
  if (data.scopeBasis === 'organization_permission' && data.scope === 'module') {
    return 'This list covers every consultancy in the organization. This account holds organization-wide read access.';
  }
  if (data.scope === 'assigned') {
    return 'This list stays inside consultancies assigned to this account. It is not the whole organization.';
  }
  if (data.scope === 'module') {
    return 'This list includes every recorded event the platform account can read.';
  }
  return '';
}

export function historyDailyScopeNote(data) {
  if (!data) return '';
  if (data.scopeBasis === 'organization_permission' && data.aggregateScope === 'module') {
    return 'These counts and the lists above are organization-wide.';
  }
  if (data.aggregateScope === 'module') {
    return 'These counts are organization-wide. The lists above stay assignment-scoped.';
  }
  if (data.aggregateScope === 'assigned' || data.aggregateScope === 'consultancy') {
    return 'These counts stay inside the consultancies this account can read.';
  }
  return '';
}

export function paginationSummary(page, limit, total) {
  const count = Number(total);
  const safeTotal = Number.isFinite(count) ? count : 0;
  if (safeTotal <= 0) {
    return {
      label: '0 results',
      pageCount: 0,
      previousDisabled: true,
      nextDisabled: true,
    };
  }
  const pageCount = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    label: `Page ${page} of ${pageCount} · ${safeTotal} total`,
    pageCount,
    previousDisabled: page <= 1,
    nextDisabled: page >= pageCount,
  };
}

export function metricText(value, whenNull) {
  if (value == null) return { text: whenNull.text, detail: whenNull.detail, unavailable: true };
  return { text: String(value), detail: '', unavailable: false };
}

export const HIDDEN_METRIC = Object.freeze({
  text: 'Hidden',
  detail: 'This count is outside your access.',
});

export const RANGE_METRIC = Object.freeze({
  text: '—',
  detail: 'No preceding window applies to this range.',
});

export function populationLabel(population) {
  if (population === 'all_non_deleted_students') {
    return 'Current status of every non-deleted student. Students with no referral are included.';
  }
  if (population === 'students_with_current_referral_in_scope') {
    return 'Current status of students with a referral in this view.';
  }
  return 'Current admission status.';
}

export function admissionChartRows(admission) {
  if (!admission || !Array.isArray(admission.rows)) return [];
  return admission.rows.map((row) => ({
    status: row.status,
    count: Number(row.count) || 0,
  }));
}

export function volumeChartRows(volume) {
  if (!volume || !Array.isArray(volume.points)) return [];
  return volume.points.map((point) => ({
    label: point.label || point.key,
    count: Number(point.count) || 0,
  }));
}

export function consultancyComparisonRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map((row) => ({
    name: row.name,
    referrals: Number(row.newReferrals) || 0,
    students: Number(row.students) || 0,
  }));
}

export function overviewConsultancyNote(data) {
  const items = data && data.consultancies && data.consultancies.items;
  if (!Array.isArray(items) || items.length) return '';
  if (data.aggregateScope === 'module' && data.scope === 'assigned') {
    return 'No consultancies are assigned to this account. Organization totals above are not this list.';
  }
  return 'No consultancies are in this view.';
}

export const PHASE_A_TIME_ZONE = 'Asia/Kolkata';

export function presenceBadge(state) {
  if (state === 'online') return { label: 'Online', tone: 'online' };
  if (state === 'idle') return { label: 'Idle', tone: 'idle' };
  if (state === 'offline') return { label: 'Offline', tone: 'offline' };
  if (state === 'inactive') return { label: 'Inactive', tone: 'inactive' };
  if (state === 'invited') return { label: 'Invited', tone: 'invited' };
  return { label: 'Unknown', tone: 'offline' };
}

export function accountBadge(status) {
  if (status === 'active') return { label: 'Active', tone: 'online' };
  if (status === 'inactive') return { label: 'Inactive', tone: 'offline' };
  if (status === 'invited') return { label: 'Invited', tone: 'idle' };
  return { label: status || 'Unknown', tone: 'offline' };
}

export function snapshotValue(value, missing) {
  if (missing) return 'absent';
  if (value == null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function observedSessionSpan(session) {
  const start = Date.parse(session && session.createdAt);
  if (!Number.isFinite(start)) {
    return { text: '—', detail: 'Sign-in time is not stored.' };
  }
  const revoked = Date.parse(session.revokedAt);
  const seen = Date.parse(session.lastSeenAt);
  const end = Number.isFinite(revoked) ? revoked : seen;
  if (!Number.isFinite(end) || end < start) {
    return { text: '—', detail: 'No observed end. A heartbeat is not working time.' };
  }
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const text = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return {
    text,
    detail: Number.isFinite(revoked)
      ? 'Sign-in to revocation. This is not active working time.'
      : 'Sign-in to the last heartbeat. This is not active working time.',
  };
}

export function formatTimestamp(value, timeZone) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, timeZone ? { timeZone } : undefined);
}

export function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export function reduceCrmLoad(state, event) {
  if (event.type === 'reset') return { loading: false, data: null, notice: null, requestId: 0 };
  if (event.type === 'start') {
    return { loading: true, data: event.keep && state ? state.data : null, notice: null, requestId: event.requestId };
  }
  if (!state || event.requestId !== state.requestId) return state;
  if (event.type === 'success') {
    return { loading: false, data: event.data, notice: null, requestId: event.requestId };
  }
  return { loading: false, data: null, notice: event.notice, requestId: event.requestId };
}

export function applyCrmResult(result, options = {}) {
  const interpreted = interpretCrmResult(result, options);
  if (interpreted.state === 'ok' || interpreted.state === 'empty') {
    return { ok: true, data: interpreted.data, notice: null };
  }
  const tone = interpreted.state === 'forbidden' ? 'warning' : 'error';
  return {
    ok: false,
    data: null,
    notice: { tone, message: interpreted.message },
  };
}

export function emptyCopy(section) {
  const copy = {
    users: 'No CRM accounts match these filters.',
    consultancies: 'No consultancies match these filters.',
    activity: 'No activity matches these filters.',
    comparison: 'No consultancies are on this page.',
  };
  return copy[section] || 'Nothing to show yet.';
}
