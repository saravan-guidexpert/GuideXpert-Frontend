import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessConsultancyCrm,
  canCorrectCrmReferralSource,
  interpretCrmResult,
} from './crmAccess.js';

test('CRM navigation access follows section permission and super admin', () => {
  assert.equal(canAccessConsultancyCrm(null), false);
  assert.equal(canAccessConsultancyCrm({ isSuperAdmin: false, sectionAccess: ['leads'] }), false);
  assert.equal(canAccessConsultancyCrm({ isSuperAdmin: false, sectionAccess: ['consultancy-crm'] }), true);
  assert.equal(canAccessConsultancyCrm({ isSuperAdmin: true, sectionAccess: [] }), true);
});

test('referral correction is limited to CRM managers and super admins', () => {
  assert.equal(canCorrectCrmReferralSource({ sectionAccess: ['consultancy-crm'] }), false);
  assert.equal(canCorrectCrmReferralSource({ sectionAccess: ['consultancy-crm-manager'] }), false);
  assert.equal(
    canCorrectCrmReferralSource({ sectionAccess: ['consultancy-crm', 'consultancy-crm-manager'] }),
    true
  );
  assert.equal(canCorrectCrmReferralSource({ isSuperAdmin: true, sectionAccess: [] }), true);
});

test('CRM responses map to loading-independent UI states', () => {
  assert.equal(interpretCrmResult({ success: false, status: 403, message: 'No access' }).state, 'forbidden');
  assert.equal(interpretCrmResult({ success: false, status: 400, message: 'Name is required' }).state, 'validation');
  assert.equal(interpretCrmResult({ success: false, status: 409, code: 'duplicate_student', data: { student: { id: 'a' } } }).state, 'conflict');
  assert.equal(
    interpretCrmResult({ success: true, status: 200, data: { items: [] } }, { expectList: true }).state,
    'empty'
  );
  assert.equal(interpretCrmResult({ success: true, status: 200, data: { items: [{ id: '1' }] } }, { expectList: true }).state, 'ok');
});
