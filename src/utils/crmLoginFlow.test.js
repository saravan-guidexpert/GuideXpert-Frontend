import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CRM_PERMISSIONS, CRM_ROLES, adminCanManageCrmUsers, clampPage, userListQuery, validateCrmAccountForm } from '../constants/crmUserAccess.js';
import { beginLogin, loginButtonState, loginFailure, resetFailure, safeCrmNext } from './crmLoginFlow.js';
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
  assert.match(loginFailure({ status: 0 }).message, /connection/i);
  assert.equal(loginFailure({ status: 401, code: 'invalid_credentials' }).kind, 'invalid');
  assert.match(loginFailure({ status: 401, code: 'invalid_credentials' }).message, /incorrect/i);
  assert.equal(loginFailure({ status: 401, message: 'Not found' }).kind, 'invalid');
  assert.equal(loginFailure({ status: 404, message: 'Not found' }).kind, 'missing');
  assert.match(loginFailure({ status: 404, message: 'Not found' }).message, /couldn't find an account/i);
  assert.equal(loginFailure({ status: 500, message: 'MongoServerError: stack at login (' }).message, 'Something went wrong. Please try again shortly.');
  assert.equal(loginFailure({ status: 403, code: 'account_inactive', message: 'This account is inactive.' }).kind, 'inactive');
  assert.equal(loginFailure({ status: 403, code: 'origin_forbidden', message: 'This origin is not allowed.' }).message, 'This origin is not allowed.');
  assert.equal(loginFailure({ status: 429, message: 'Too many attempts. Try again later.' }).kind, 'rate');
  assert.equal(loginFailure({ status: 400, message: 'Email and password are required.' }).message, 'Email and password are required.');
  assert.equal(resetFailure({ status: 400, message: 'Reset code is invalid or expired.' }), 'Reset code is invalid or expired.');
  assert.equal(resetFailure({ status: 404, message: 'Not found' }), 'Something went wrong. Please try again shortly.');
  assert.match(resetFailure({ status: 0 }), /connection/i);
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
  assert.equal(safeCrmNext('/crm-app/students?q=a'), '/crm-app/students?q=a');
  assert.equal(safeCrmNext('https://evil.example/crm-app'), '/crm-app');
  assert.equal(safeCrmNext('//evil.example'), '/crm-app');
  assert.equal(safeCrmNext('/crm-app/login?next=/admin'), '/crm-app');
  assert.equal(safeCrmNext('/crm/login'), '/crm-app');
  assert.equal(safeCrmNext('/admin/crm'), '/crm-app');
  assert.equal(safeCrmNext('/crm'), '/crm-app');
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
  const crmAt = app.indexOf('path="/crm"');
  const portalAt = app.indexOf('path="/crm/login"');
  assert.ok(crmAt > 0);
  assert.ok(portalAt > crmAt);
  assert.match(app.slice(crmAt, crmAt + 500), /CrmDemoLayout/);
  assert.match(app.slice(portalAt, portalAt + 80), /CrmLoginPage/);
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
