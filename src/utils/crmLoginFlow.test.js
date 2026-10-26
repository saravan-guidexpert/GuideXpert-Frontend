import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CRM_PERMISSIONS, CRM_ROLES, adminCanManageCrmUsers, clampPage, userListQuery, validateCrmAccountForm } from '../constants/crmUserAccess.js';
import { adminAccessDecision, beginLogin, crmSessionRedirect, loginButtonState, loginFailure, safeCrmNext } from './crmLoginFlow.js';
import { readCrmTheme, revealTheme, writeCrmTheme } from '../pages/crm-demo/crmTheme.js';

const root = path.join(import.meta.dirname, '..');

test('login validation, button state, and failure messages', () => {
  const missing = beginLogin({ identifier: ' ', password: '' });
  assert.equal(missing.ok, false);
  assert.equal(missing.phase, 'idle');
  assert.match(missing.errors.identifier, /email/i);
  const ready = beginLogin({ identifier: 'a@example.com', password: 'secret' });
  assert.equal(ready.ok, true);
  assert.equal(ready.phase, 'submitting');
  assert.deepEqual(loginButtonState('submitting'), { disabled: true, label: 'Signing in…' });
  assert.deepEqual(loginButtonState('success'), { disabled: true, label: 'Signed in' });
  assert.equal(loginButtonState('idle').disabled, false);
  assert.equal(loginFailure({ status: 0 }).kind, 'network');
  assert.equal(loginFailure({ status: 401, code: 'invalid_credentials' }).kind, 'invalid');
  assert.equal(loginFailure({ status: 403, code: 'account_inactive', message: 'This account is inactive.' }).kind, 'inactive');
  assert.equal(loginFailure({ status: 429, message: 'Too many attempts. Try again later.' }).kind, 'rate');
});

test('theme preference is stored independently of CRM records', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
  globalThis.document = { documentElement: { setAttribute() {} } };
  writeCrmTheme('dark');
  assert.equal(readCrmTheme(), 'dark');
  assert.equal(store.get('gx-crm-theme'), 'dark');
  assert.equal(store.has('guidexpert_crm_demo_v1'), false);
  globalThis.window = {
    matchMedia: () => ({ matches: true }),
    innerWidth: 800,
    innerHeight: 600,
  };
  let applied = null;
  revealTheme('light', { x: 10, y: 12 }, (value) => {
    applied = value;
  });
  assert.equal(applied, 'light');
});

test('protected redirects reject external destinations', () => {
  assert.equal(safeCrmNext('/crm/app/students?q=a'), '/crm/app/students?q=a');
  assert.equal(safeCrmNext('/crm-app/students?q=a'), '/crm/app/students?q=a');
  assert.equal(safeCrmNext('https://evil.example/crm/app'), '/crm/app');
  assert.equal(safeCrmNext('//evil.example'), '/crm/app');
  assert.equal(safeCrmNext('/crm/login?next=/admin'), '/crm/app');
  assert.equal(safeCrmNext('/admin/crm'), '/crm/app');
  assert.equal(safeCrmNext('/crm'), '/crm/app');
  assert.equal(safeCrmNext('/crm/demo'), '/crm/app');
  assert.equal(safeCrmNext('/crm/demo/students'), '/crm/app');
  assert.equal(safeCrmNext('/crm/app/overview'), '/crm/app/overview');
  assert.equal(safeCrmNext('/crm/admin'), '/crm/admin');
  assert.equal(safeCrmNext('/crm/admin/users?q=a'), '/crm/admin/users?q=a');
  assert.equal(safeCrmNext('/crm/administration'), '/crm/app');
  assert.equal(safeCrmNext('https://evil.example/crm/admin'), '/crm/app');
  assert.equal(safeCrmNext('/crm/admin/../app'), '/crm/app');
  assert.equal(safeCrmNext(undefined, '/crm/admin'), '/crm/admin');
  assert.equal(safeCrmNext('https://evil.example/crm/admin', '/crm/admin'), '/crm/admin');
  assert.equal(safeCrmNext('/crm/admin/users?page=2', '/crm/admin'), '/crm/admin/users?page=2');
  assert.equal(safeCrmNext('/crm/admin/login', '/crm/admin'), '/crm/admin');
});

test('super admin sign-in enters only after the directory permission check', () => {
  const allowed = adminAccessDecision({
    loginResult: { success: true, status: 200 },
    sessionResult: { success: true, status: 200, data: { user: { permissions: ['crm.roles.manage'] } } },
    accessResult: { success: true, status: 200, data: { items: [], total: 0 } },
    next: '/crm/admin/users',
  });
  assert.equal(allowed.action, 'enter');
  assert.equal(allowed.to, '/crm/admin/users');
  const home = adminAccessDecision({
    loginResult: { success: true, status: 200 },
    sessionResult: { success: true, status: 200 },
    accessResult: { success: true, status: 200, data: { items: [{ id: '1' }] } },
  });
  assert.equal(home.to, '/crm/admin');
  const invalid = adminAccessDecision({
    loginResult: { success: false, status: 401, code: 'invalid_credentials' },
  });
  assert.equal(invalid.action, 'error');
  assert.equal(invalid.error.kind, 'invalid');
  const denied = adminAccessDecision({
    loginResult: { success: true, status: 200 },
    sessionResult: { success: true, status: 200 },
    accessResult: { success: false, status: 403, code: 'permission_denied' },
    next: '/crm/admin/users',
  });
  assert.equal(denied.action, 'denied');
  assert.equal(denied.to, undefined);
  const expired = adminAccessDecision({
    loginResult: { success: true, status: 200 },
    sessionResult: { success: true, status: 200 },
    accessResult: { success: false, status: 401, code: 'session_expired' },
  });
  assert.equal(expired.action, 'error');
  assert.equal(expired.to, undefined);
  const offline = adminAccessDecision({
    loginResult: { success: false, status: 0 },
  });
  assert.equal(offline.error.kind, 'network');
});

test('an ended super admin session returns to its own login', () => {
  assert.equal(crmSessionRedirect('ready', '/crm/admin/users', '', '/crm/admin/login'), null);
  assert.equal(
    crmSessionRedirect('anonymous', '/crm/admin/users', '?page=2', '/crm/admin/login'),
    '/crm/admin/login?next=%2Fcrm%2Fadmin%2Fusers%3Fpage%3D2',
  );
  assert.equal(crmSessionRedirect('anonymous', '/crm/app', '', '/crm/login'), '/crm/login?next=%2Fcrm%2Fapp');
  const app = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8');
  const userLogin = fs.readFileSync(path.join(root, 'pages/crm-app/CrmLoginPage.jsx'), 'utf8');
  const adminLogin = fs.readFileSync(path.join(root, 'pages/crm-app/CrmAdminLoginPage.jsx'), 'utf8');
  const loginAt = app.indexOf('path="/crm/admin/login"');
  const workspaceAt = app.indexOf('path="/crm/admin"\n');
  assert.ok(loginAt > 0);
  assert.ok(workspaceAt > loginAt);
  const loginRoute = app.slice(loginAt, app.indexOf('/>', loginAt) + 2);
  assert.match(loginRoute, /CrmAdminLoginPage/);
  assert.doesNotMatch(loginRoute, /RequireCrmSession/);
  assert.match(app.slice(workspaceAt, workspaceAt + 500), /loginPath="\/crm\/admin\/login"/);
  assert.match(adminLogin, /fetchPortalDirectory/);
  assert.match(adminLogin, /adminAccessDecision/);
  assert.doesNotMatch(adminLogin, /password\s*[:=]\s*['"][^'"]+['"]/);
  assert.doesNotMatch(userLogin, /fetchPortalDirectory|CrmAdminLoginPage/);
  assert.match(userLogin, /safeCrmNext\(params\.get\('next'\)\)/);
});

test('access management filters, pagination, and form validation', () => {
  assert.deepEqual(userListQuery({ q: ' Asha ', role: 'crm_viewer', status: 'active', page: 2, limit: 20 }), {
    q: 'Asha',
    role: 'crm_viewer',
    status: 'active',
    page: 2,
    limit: 20,
  });
  assert.equal(clampPage(9, 20, 25), 2);
  assert.equal(clampPage(0, 20, 0), 1);
  const invalid = validateCrmAccountForm({ fullName: 'A', email: 'nope', role: 'crm_viewer', permissions: [], password: 'short' }, 'create');
  assert.ok(invalid.fullName);
  assert.ok(invalid.email);
  assert.ok(invalid.password);
  assert.ok(invalid.permissions);
  const valid = validateCrmAccountForm({
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    role: 'crm_manager',
    permissions: CRM_ROLES.crm_manager.permissions,
    password: 'Password123',
    invite: false,
  }, 'create');
  assert.deepEqual(valid, {});
  assert.equal(adminCanManageCrmUsers({ isSuperAdmin: true, sectionAccess: [] }), true);
  assert.equal(adminCanManageCrmUsers({ isSuperAdmin: false, sectionAccess: ['consultancy-crm'] }), false);
  assert.equal(adminCanManageCrmUsers({ isSuperAdmin: false, sectionAccess: ['crm-access-management'] }), true);
});

test('login and access screens are wired without storing a CRM session token', () => {
  const app = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8');
  const login = fs.readFileSync(path.join(root, 'pages/crm-app/CrmLoginPage.jsx'), 'utf8');
  const frame = fs.readFileSync(path.join(root, 'pages/crm-app/CrmAuthFrame.jsx'), 'utf8');
  const access = fs.readFileSync(path.join(root, 'pages/admin/crm/CrmAccessPage.jsx'), 'utf8');
  const demo = fs.readFileSync(path.join(root, 'pages/crm-demo/CrmDemoLayout.jsx'), 'utf8');
  const loginAt = app.indexOf('path="/crm"');
  const demoAt = app.indexOf('path="/crm/demo"');
  const portalAt = app.indexOf('path="/crm/login"');
  assert.ok(loginAt > 0);
  assert.ok(demoAt > loginAt);
  assert.ok(portalAt > loginAt);
  assert.match(app.slice(loginAt, loginAt + 120), /Navigate to="\/crm\/login"/);
  assert.match(app.slice(demoAt, demoAt + 400), /CrmDemoLayout/);
  assert.doesNotMatch(app.slice(demoAt, demoAt + 400), /ProtectedAdmin/);
  assert.match(app, /path="\/crm\/app"/);
  assert.match(app, /path="crm-access"/);
  assert.match(frame, /revealTheme/);
  assert.match(frame, /Switch to dark mode/);
  assert.match(login, /Remember this browser/);
  assert.match(login, /aria-invalid/);
  assert.match(login, /loginButtonState/);
  assert.equal(login.includes('localStorage.setItem'), false);
  assert.match(access, /fetchCrmUsers/);
  assert.match(access, /deactivateCrmUser/);
  assert.match(access, /Create account/);
  assert.match(demo, /selectCrmClient\('demo'/);
  const backend = fs.readFileSync(path.join(root, '../../GuideXpert-Backend/constants/crmUsers.js'), 'utf8');
  CRM_PERMISSIONS.forEach((key) => assert.match(backend, new RegExp(key.replace(/\./g, '\\.'))));
});
