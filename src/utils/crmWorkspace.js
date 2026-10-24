import { crmCan } from '../constants/crmUserAccess.js';
import { interpretCrmResult } from './crmAccess.js';
import { analyticsParams } from '../pages/admin/crm/crmProductionQuery.js';

export const WORKSPACE_HOME = '/crm/app';
export const CRM_WORKSPACE_PERMISSION = 'crm.roles.manage';

export const WORKSPACE_SECTIONS = Object.freeze([
  { id: 'overview', to: `${WORKSPACE_HOME}/overview`, label: 'Overview', access: 'workspace', end: true },
  { id: 'users', to: `${WORKSPACE_HOME}/users`, label: 'CRM Users', access: 'workspace', end: false },
  { id: 'consultancies', to: `${WORKSPACE_HOME}/consultancies`, label: 'Consultancies', access: 'workspace', end: false },
  { id: 'activity', to: `${WORKSPACE_HOME}/activity`, label: 'Activity', access: 'workspace', end: false },
  { id: 'analytics', to: `${WORKSPACE_HOME}/analytics`, label: 'Analytics', access: 'workspace', end: false },
]);

const ACTIVITY_ACTIONS = Object.freeze([
  'consultancy.created',
  'consultancy.updated',
  'student.created',
  'student.updated',
  'referral.created',
  'referral.source_corrected',
  'crm_assignment.created',
  'crm_assignment.revoked',
  'crm_user.login_succeeded',
  'crm_user.login_failed',
  'crm_user.login_inactive',
  'crm_user.logout',
  'crm_session.revoked',
  'crm_session.revoked_all',
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
  };
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
  if (input.consultancyId) query.consultancyId = input.consultancyId;
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

export function presenceBadge(state) {
  if (state === 'online') return { label: 'Online', tone: 'online' };
  if (state === 'idle') return { label: 'Idle', tone: 'idle' };
  if (state === 'offline') return { label: 'Offline', tone: 'offline' };
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

export function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export function reduceCrmLoad(state, event) {
  if (event.type === 'reset') return { loading: false, data: null, notice: null, requestId: 0 };
  if (event.type === 'start') return { loading: true, data: null, notice: null, requestId: event.requestId };
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
