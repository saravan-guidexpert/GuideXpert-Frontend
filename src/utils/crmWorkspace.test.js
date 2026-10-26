import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HIDDEN_METRIC,
  RANGE_METRIC,
  accountActions,
  activityListQuery,
  activitySummaryQuery,
  admissionChartRows,
  applyCrmResult,
  applyFilterPatch,
  directoryQuery,
  emptyCopy,
  metricText,
  observedSessionSpan,
  operationsQuery,
  overviewQuery,
  reduceCrmLoad,
  snapshotValue,
  visibleWorkspaceSections,
  WORKSPACE_HOME,
  workspaceRouteDecision,
  workspaceServerDecision,
} from './crmWorkspace.js';

const administrator = {
  role: 'crm_administrator',
  roleLabel: 'CRM Administrator',
  permissions: ['crm.roles.manage', 'crm.users.deactivate', 'crm.analytics.read'],
};
const manager = {
  role: 'crm_manager',
  roleLabel: 'CRM Manager',
  permissions: ['crm.analytics.read', 'crm.consultancies.read', 'crm.audit.read'],
};
const viewer = { role: 'crm_viewer', roleLabel: 'CRM Viewer', permissions: ['crm.analytics.read'] };
const platformAdmin = { isSuperAdmin: true, sectionAccess: ['consultancy-crm', 'crm-access-management'] };

test('workspace sections follow the CRM administrator permission and ignore platform admin flags', () => {
  assert.equal(WORKSPACE_HOME, '/crm/admin');
  assert.deepEqual(visibleWorkspaceSections(administrator).map((item) => item.to), [
    '/crm/admin/overview',
    '/crm/admin/users',
    '/crm/admin/consultancies',
    '/crm/admin/activity',
    '/crm/admin/analytics',
  ]);
  assert.deepEqual(visibleWorkspaceSections(manager), []);
  assert.deepEqual(visibleWorkspaceSections(viewer), []);
  assert.deepEqual(visibleWorkspaceSections(platformAdmin), []);
  assert.equal(workspaceRouteDecision(administrator, 'users').state, 'allowed');
  assert.equal(workspaceRouteDecision(manager, 'overview').state, 'forbidden');
  assert.equal(workspaceRouteDecision(platformAdmin, 'analytics').state, 'forbidden');
  assert.equal(accountActions(administrator).revokeSession, true);
  assert.equal(accountActions(administrator).manageAssignment, true);
  assert.equal(accountActions({ permissions: ['crm.roles.manage'] }).revokeSession, false);
  assert.equal(accountActions(manager).manageAssignment, false);
});

test('queries keep required pagination and drop unsupported empty filters', () => {
  assert.deepEqual(directoryQuery({ page: 2, limit: 20, q: '  ', presence: '' }), { page: 2, limit: 20 });
  assert.deepEqual(overviewQuery({ page: 1, status: 'inactive' }), { page: 1, limit: 20, status: 'inactive' });
  const operations = operationsQuery({ period: '30', timeZone: 'UTC', page: 1, limit: 20 });
  assert.deepEqual(operations.query, { period: '30', timeZone: 'UTC', page: 1, limit: 20 });
  const custom = operationsQuery({ period: 'custom', from: '2026-02-02', to: '2026-02-01', timeZone: 'UTC' });
  assert.equal(typeof custom.error, 'string');
  const activity = activityListQuery({ page: 3, source: 'both', action: 'not a real action', q: 'login' });
  assert.equal(activity.query.page, 3);
  assert.equal(activity.query.action, undefined);
  assert.equal(activity.query.q, 'login');
  const summary = activitySummaryQuery({ source: 'security', from: '2026-01-01', to: '2026-01-31', summaryLimit: 50 });
  assert.equal(summary.query.page, undefined);
  assert.equal(summary.query.limit, 20);
  assert.equal(summary.query.source, 'security');
  assert.equal(activityListQuery({ from: '2026-02-02', to: '2026-02-01' }).error.includes('start date'), true);
});

test('filter changes return to the first page and a page change stays put', () => {
  const next = applyFilterPatch({ page: 4, q: '' }, { q: 'Asha' });
  assert.equal(next.page, 1);
  assert.equal(next.q, 'Asha');
  assert.equal(applyFilterPatch({ page: 2, q: 'Asha' }, { page: 3 }).page, 3);
});

test('null metrics stay unavailable and failed responses clear stored data', () => {
  assert.equal(metricText(null, HIDDEN_METRIC).text, 'Hidden');
  assert.equal(metricText(0, HIDDEN_METRIC).text, '0');
  assert.equal(metricText(null, RANGE_METRIC).unavailable, true);
  const forbidden = applyCrmResult({ success: false, status: 403, message: 'Section required.' });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.data, null);
  const missing = applyCrmResult({ success: false, status: 404, message: 'That record was not found.' });
  assert.equal(missing.notice.message, 'That record was not found.');
  const started = reduceCrmLoad(null, { type: 'start', requestId: 2 });
  const late = reduceCrmLoad(
    { loading: false, data: { items: [{ id: 'new' }] }, notice: null, requestId: 2 },
    { type: 'failure', requestId: 1, notice: { tone: 'error', message: 'old' } }
  );
  assert.equal(late.data.items[0].id, 'new');
  assert.equal(started.data, null);
  assert.equal(emptyCopy('users').includes('No CRM accounts'), true);
});

test('charts use current admission rows and do not read a history field', () => {
  const rows = admissionChartRows({
    population: 'all_non_deleted_students',
    history: [{ status: 'Applied', count: 9 }],
    rows: [{ status: 'Not started', count: 2 }, { status: 'Admitted', count: 1 }],
  });
  assert.deepEqual(rows, [
    { status: 'Not started', count: 2 },
    { status: 'Admitted', count: 1 },
  ]);
  assert.equal(snapshotValue(null, true), 'absent');
  assert.equal(snapshotValue(null, false), 'null');
});

test('the directory response is the server gate for the super admin workspace', () => {
  assert.equal(workspaceServerDecision({ success: true, status: 200, data: { items: [], total: 0 } }).state, 'allowed');
  assert.equal(workspaceServerDecision({ success: false, status: 403, code: 'permission_denied' }).state, 'forbidden');
  assert.equal(workspaceServerDecision({ success: false, status: 401 }).state, 'anonymous');
  assert.equal(workspaceServerDecision({ success: false, status: 0, message: 'Cannot reach the server.' }).state, 'error');
});

test('admin CRM routes stay behind ProtectedAdmin and the public demo stays mounted', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(app, /function ProtectedAdmin/);
  assert.match(app, /path="\/crm\/login"/);
  assert.match(app, /path="\/crm\/demo"/);
  assert.match(app, /path="\/crm\/app"/);
  assert.match(app, /Navigate to="\/crm\/login"/);
  assert.match(app, /path="crm\/consultancies"/);
  assert.match(app, /path="crm-access"/);
  assert.equal(app.includes('path="crm/workspace"'), false);
  assert.equal(app.includes('crm-demo/ConsultanciesPage'), true);
  assert.match(app, /CrmDemoLayout/);
  const userAt = app.indexOf('path="/crm/app"');
  const adminAt = app.indexOf('path="/crm/admin"\n');
  const platformAt = app.indexOf('path="/admin/login"');
  assert.ok(adminAt > userAt);
  assert.ok(platformAt > adminAt);
  const userCrm = app.slice(userAt, adminAt);
  const superAdmin = app.slice(adminAt, platformAt);
  assert.match(userCrm, /CrmAppShell/);
  assert.doesNotMatch(userCrm, /CrmWorkspaceLayout/);
  assert.match(superAdmin, /RequireCrmSession/);
  assert.match(superAdmin, /CrmWorkspaceLayout/);
  assert.match(superAdmin, /CrmWorkspaceUsersPage/);
  assert.match(superAdmin, /CrmWorkspaceConsultanciesPage/);
  assert.match(superAdmin, /CrmWorkspaceActivityPage/);
  assert.match(superAdmin, /CrmWorkspaceOverviewPage/);
  assert.match(superAdmin, /CrmWorkspaceAnalyticsPage/);
  assert.doesNotMatch(superAdmin, /ProtectedAdmin|CrmDemoLayout|CrmAppShell/);
  const layout = readFileSync(new URL('../pages/admin/crm/workspace/CrmWorkspaceLayout.jsx', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../pages/crm-app/CrmAppShell.jsx', import.meta.url), 'utf8');
  assert.match(layout, /fetchPortalDirectory/);
  assert.match(layout, /workspaceServerDecision/);
  assert.match(shell, /crm\.roles\.manage/);
  assert.match(shell, /superAdminHref=\{canManageAssignments \? '\/crm\/admin' : null\}/);
  assert.match(layout, /crmShell\.css/);
  assert.doesNotMatch(layout, /Settings/);
});

test('observed session span uses stored timestamps and does not treat a heartbeat as working time', () => {
  const open = observedSessionSpan({
    createdAt: '2026-10-25T10:00:00.000Z',
    lastSeenAt: '2026-10-25T10:40:00.000Z',
  });
  assert.equal(open.text, '40 min');
  assert.match(open.detail, /not active working time/);
  const revoked = observedSessionSpan({
    createdAt: '2026-10-25T10:00:00.000Z',
    lastSeenAt: '2026-10-25T12:00:00.000Z',
    revokedAt: '2026-10-25T11:00:00.000Z',
  });
  assert.equal(revoked.text, '1 h 0 min');
  assert.match(revoked.detail, /revocation/);
  assert.match(observedSessionSpan({ createdAt: '2026-10-25T10:00:00.000Z' }).detail, /not working time/);
});

test('activity filters accept stored follow-up actions and still drop unknown actions', () => {
  assert.equal(activityListQuery({ action: 'consultancy.follow_up_completed', timeZone: 'Asia/Kolkata', from: '2026-04-01', to: '2026-04-02' }).query.timeZone, 'Asia/Kolkata');
  assert.equal(activityListQuery({ action: 'consultancy.follow_up_completed' }).query.action, 'consultancy.follow_up_completed');
  assert.equal(activityListQuery({ action: 'not a real action' }).query.action, undefined);
});
