import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  beginCrmRequest,
  rememberCrmSessionKey,
  resetCrmSessionGuardForTests,
  retireCrmSession,
  shouldEndCrmSession,
} from './crmSessionGuard.js';

test('a heartbeat 401 from the previous session does not end the session after re-login', () => {
  resetCrmSessionGuardForTests();
  rememberCrmSessionKey('csrf-before-logout');
  const previousHeartbeat = beginCrmRequest();
  retireCrmSession();
  rememberCrmSessionKey('');
  rememberCrmSessionKey('csrf-after-login');
  assert.equal(shouldEndCrmSession(401, '/crm-auth/heartbeat', previousHeartbeat), false);
  const currentHeartbeat = beginCrmRequest();
  assert.equal(shouldEndCrmSession(401, '/crm-auth/heartbeat', currentHeartbeat), true);
  assert.equal(shouldEndCrmSession(403, '/crm-auth/heartbeat', currentHeartbeat), false);
  assert.equal(shouldEndCrmSession(0, '/crm-auth/heartbeat', currentHeartbeat), false);
  assert.equal(shouldEndCrmSession(401, '/crm-auth/login', currentHeartbeat), false);
});

test('the CRM fetch client applies the session epoch before treating a 401 as logout', () => {
  const source = readFileSync(new URL('./crmSessionApi.js', import.meta.url), 'utf8');
  const fetchAt = source.indexOf('await fetch(');
  const epochAt = source.indexOf('beginCrmRequest()');
  assert.ok(epochAt !== -1 && epochAt < fetchAt);
  assert.match(source, /shouldEndCrmSession\(response\.status, path, startedEpoch\)/);
  const context = readFileSync(new URL('../pages/crm-app/CrmSessionContext.jsx', import.meta.url), 'utf8');
  assert.match(context, /retireCrmSession\(\)/);
});
