import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRM_DEMO_STORAGE_KEY,
  createCrmDemoRepository,
  createMemoryStorage,
  createSeedState,
  isFollowUpOverdue,
  normalizeConsultancyName,
  normalizeIndianMobile,
} from './crmDemoStore.js';
import { resolveRange, summarizeConsultancy } from './crmAnalytics.js';
import { loadAll } from '../pages/crm-demo/dashboard/dashboardModel.js';
import { currentConsultancyName } from '../pages/crm-demo/crmFormat.js';
import { resolveCrmDataMode, selectCrmClient } from './crmDataSource.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function repo() {
  return createCrmDemoRepository(createMemoryStorage());
}

function page(query = {}) {
  return { page: 1, limit: 20, ...query };
}

test('phone formats collapse and invalid numbers are rejected', () => {
  assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeIndianMobile('919876543210'), '9876543210');
  assert.equal(normalizeIndianMobile('98765-43210'), '9876543210');
  assert.equal(normalizeConsultancyName('  Horizon   Study Circle '), 'horizon study circle');
  for (const phone of ['09876543210', '+1 9876543210', '12345', '']) {
    assert.throws(() => normalizeIndianMobile(phone));
  }
});

test('first read seeds once and a second read does not add records', () => {
  const storage = createMemoryStorage();
  const crm = createCrmDemoRepository(storage);
  const first = crm.listStudents(page());
  const second = crm.listStudents(page());
  assert.equal(first.data.total, createSeedState().students.length);
  assert.equal(second.data.total, first.data.total);
  assert.equal(storage.getItem(CRM_DEMO_STORAGE_KEY) != null, true);
  assert.deepEqual(storage.keys(), [CRM_DEMO_STORAGE_KEY]);
});

test('malformed demo storage is kept until reset', () => {
  const storage = createMemoryStorage({ [CRM_DEMO_STORAGE_KEY]: '{not-json' });
  const crm = createCrmDemoRepository(storage);
  const broken = crm.listStudents(page());
  assert.equal(broken.success, false);
  assert.equal(broken.code, 'malformed_demo_data');
  assert.equal(storage.getItem(CRM_DEMO_STORAGE_KEY), '{not-json');
  const reset = crm.resetDemoData();
  assert.equal(reset.success, true);
  const listed = crm.listStudents(page());
  assert.equal(listed.success, true);
  assert.equal(listed.data.total, 4);
});

test('duplicate student phones do not overwrite the existing student', () => {
  const crm = repo();
  const created = crm.createStudent({ fullName: 'New Person', phone: '+91 9876543210', city: 'Mumbai' });
  assert.equal(created.status, 409);
  assert.equal(created.code, 'duplicate_student');
  assert.equal(created.data.student.fullName, 'Asha Rao');
  assert.equal(created.data.student.city, 'Hyderabad');
  const stored = crm.getStudent(created.data.student.id);
  assert.equal(stored.data.student.fullName, 'Asha Rao');
});

test('duplicate active consultancy names are rejected after normalization', () => {
  const crm = repo();
  const duplicate = crm.createConsultancy({ name: '  horizon   study circle ', status: 'active' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.code, 'duplicate_consultancy');
  const listed = crm.listConsultancies(page({ q: 'horizon' }));
  assert.equal(listed.data.total, 1);
});

test('a new consultancy keeps the chosen consultancy and calling status', () => {
  const crm = repo();
  const created = crm.createConsultancy({
    name: 'West Desk',
    status: 'active',
    followUpStatus: 'Meeting Scheduled',
    callingStatus: 'Connected',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.consultancy.followUpStatus, 'Meeting Scheduled');
  assert.equal(created.data.consultancy.callingStatus, 'Connected');
  const updated = crm.updateConsultancy(created.data.consultancy.id, {
    followUpStatus: 'On Hold',
    callingStatus: 'Busy',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.consultancy.followUpStatus, 'On Hold');
  assert.equal(updated.data.consultancy.callingStatus, 'Busy');
  const cleared = crm.updateConsultancy(created.data.consultancy.id, { callingStatus: 'Not a status' });
  assert.equal(cleared.data.consultancy.callingStatus, '');
  assert.equal(cleared.data.consultancy.followUpStatus, 'On Hold');
});

test('the first referral wins and a second referral does not change it', () => {
  const crm = repo();
  const existing = crm.getStudentReferral('st_1');
  assert.equal(existing.data.referral.originalConsultancyName, 'Horizon Study Circle');
  const competing = crm.createReferral({ crmStudentId: 'st_1', consultancyId: 'con_2' });
  assert.equal(competing.status, 409);
  assert.equal(competing.code, 'referral_exists');
  assert.equal(competing.data.referral.consultancyId, 'con_1');
  const again = crm.getStudentReferral('st_1');
  assert.equal(again.data.referral.consultancyName, 'Horizon Study Circle');
  assert.equal(again.data.referral.originalConsultancyId, 'con_1');
  assert.equal(crm.listReferrals(page({ studentId: 'st_1' })).data.total, 1);
});

test('demo manager correction requires a reason and keeps the original source', () => {
  const crm = repo();
  const denied = crm.correctReferralSource('ref_1', {
    consultancyId: 'con_2',
    reason: 'The intake form named the wrong consultancy.',
  });
  assert.equal(denied.status, 403);
  assert.equal(crm.getStudentReferral('st_1').data.referral.consultancyId, 'con_1');

  assert.equal(crm.setDemoManager(true).success, true);
  const short = crm.correctReferralSource('ref_1', { consultancyId: 'con_2', reason: 'too short' });
  assert.equal(short.status, 400);
  assert.equal(short.code, 'reason_required');

  const fixed = crm.correctReferralSource('ref_1', {
    consultancyId: 'con_2',
    consultancyContactId: 'ct_3',
    reason: 'The intake form named the wrong consultancy.',
  });
  assert.equal(fixed.status, 200);
  assert.equal(fixed.data.referral.consultancyName, 'North Star Guidance');
  assert.equal(fixed.data.referral.originalConsultancyName, 'Horizon Study Circle');
  const audits = crm.listAudits(page());
  const correction = audits.data.items.find((item) => item.action === 'referral.source_corrected');
  assert.ok(correction);
  assert.equal(correction.actorLabel, 'Demo manager');
  assert.equal(correction.reason, 'The intake form named the wrong consultancy.');
  assert.equal(correction.before.consultancyId, 'con_1');
  assert.equal(correction.after.consultancyId, 'con_2');
  assert.equal(correction.after.originalConsultancyId, 'con_1');
  assert.ok(correction.createdAt);
});

test('demo operations do not call fetch or write unrelated storage keys', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
    throw new Error('demo mode must not call the network');
  };
  try {
    const storage = createMemoryStorage({ guidexpert_admin_token: 'keep-me', guidexpert_admin_user: '{"id":"admin"}' });
    const crm = createCrmDemoRepository(storage);
    const created = await Promise.resolve(crm.createStudent({ fullName: 'Local Only', phone: '9000099999', consultancyId: 'con_1' }));
    assert.equal(created.status, 201);
    assert.equal(called, false);
    assert.equal(storage.getItem('guidexpert_admin_token'), 'keep-me');
    assert.equal(storage.keys().includes(CRM_DEMO_STORAGE_KEY), true);
    assert.equal(typeof globalThis.fetch, 'function');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('creating a student also records one consultancy referral', () => {
  const storage = createMemoryStorage();
  const crm = createCrmDemoRepository(storage);
  const created = crm.createStudent({
    fullName: 'Nisha Verma',
    phone: '9000012345',
    consultancyId: 'con_1',
    admissionStatus: 'Contacted',
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.student.admissionStatus, 'Contacted');
  assert.equal(created.data.referral.crmStudentId, created.data.student.id);
  assert.equal(created.data.referral.originalConsultancyId, 'con_1');
  assert.equal(crm.listReferrals(page({ studentId: created.data.student.id })).data.total, 1);
  const again = createCrmDemoRepository(storage);
  assert.equal(again.getStudent(created.data.student.id).data.student.fullName, 'Nisha Verma');
  assert.equal(again.getStudentReferral(created.data.student.id).data.referral.consultancyName, 'Horizon Study Circle');
  const horizon = again.listConsultancies(page()).data.items.find((row) => row.id === 'con_1');
  assert.equal(horizon.studentCount, 3);
});

test('a student cannot be created without an active consultancy', () => {
  const crm = repo();
  const students = crm.listStudents(page()).data.total;
  const referrals = crm.listReferrals(page()).data.total;
  const missing = crm.createStudent({ fullName: 'No Source', phone: '9000022222' });
  assert.equal(missing.status, 400);
  assert.equal(missing.code, 'consultancy_required');
  const inactive = crm.createStudent({ fullName: 'No Source', phone: '9000022222', consultancyId: 'con_3' });
  assert.equal(inactive.status, 409);
  assert.equal(inactive.code, 'consultancy_not_eligible');
  assert.equal(crm.listStudents(page()).data.total, students);
  assert.equal(crm.listReferrals(page()).data.total, referrals);
});

test('equivalent phone numbers are one student and a second referral is rejected', () => {
  const crm = repo();
  const first = crm.createStudent({ fullName: 'Same Number', phone: '98765 43211', consultancyId: 'con_2' });
  assert.equal(first.status, 201);
  const duplicate = crm.createStudent({ fullName: 'Other Name', phone: '+91-9876543211', consultancyId: 'con_1' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.code, 'duplicate_student');
  assert.equal(duplicate.data.student.fullName, 'Same Number');
  const second = crm.createReferral({ crmStudentId: first.data.student.id, consultancyId: 'con_1' });
  assert.equal(second.status, 409);
  assert.equal(second.code, 'referral_exists');
  assert.equal(crm.getStudentReferral(first.data.student.id).data.referral.originalConsultancyId, 'con_2');
});

test('editing a student keeps the original referral source', () => {
  const crm = repo();
  const updated = crm.updateStudent('st_1', { fullName: 'Asha Rao Nair', admissionStatus: 'Admitted', consultancyId: 'con_2' });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.student.fullName, 'Asha Rao Nair');
  assert.equal(updated.data.student.admissionStatus, 'Admitted');
  const referral = crm.getStudentReferral('st_1').data.referral;
  assert.equal(referral.originalConsultancyId, 'con_1');
  assert.equal(referral.consultancyId, 'con_1');
  assert.equal(referral.studentName, 'Asha Rao Nair');
  assert.equal(crm.listReferrals(page({ studentId: 'st_1' })).data.total, 1);
});

test('a failed save does not leave a student without a referral', () => {
  const storage = createMemoryStorage();
  const crm = createCrmDemoRepository(storage);
  crm.listStudents(page());
  const snapshot = storage.getItem(CRM_DEMO_STORAGE_KEY);
  storage.setItem = () => {
    throw new Error('disk full');
  };
  const failed = crm.createStudent({ fullName: 'Unsaved', phone: '9000033333', consultancyId: 'con_1' });
  assert.equal(failed.success, false);
  assert.equal(failed.code, 'storage_unavailable');
  assert.equal(storage.getItem(CRM_DEMO_STORAGE_KEY), snapshot);
  const saved = JSON.parse(snapshot);
  assert.equal(saved.students.length, 4);
  assert.equal(saved.referrals.length, 4);
  assert.equal(saved.students.some((row) => row.fullName === 'Unsaved'), false);
});

test('opening the demo again does not replace saved students', () => {
  const storage = createMemoryStorage();
  const first = createCrmDemoRepository(storage);
  const created = first.createStudent({ fullName: 'Kept Student', phone: '9000044444', consultancyId: 'con_1' });
  assert.equal(created.status, 201);
  const second = createCrmDemoRepository(storage);
  const listed = second.listStudents(page());
  assert.equal(listed.data.total, 5);
  assert.equal(listed.data.items.some((row) => row.fullName === 'Kept Student'), true);
  assert.equal(second.getStudentReferral(created.data.student.id).data.referral.consultancyId, 'con_1');
});

test('student and consultancy profiles link through the same referral', () => {
  const students = fs.readFileSync(path.join(root, 'pages/crm-demo/StudentsPage.jsx'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'pages/crm-demo/ConsultancyProfilePage.jsx'), 'utf8');
  assert.match(students, /\/crm\/consultancies\/\$\{/);
  assert.match(profile, /\/crm\/students\/\$\{/);
  const crm = repo();
  const referral = crm.getStudentReferral('st_3').data.referral;
  const consultancy = crm.getConsultancy(referral.consultancyId).data.consultancy;
  const listed = crm.listReferrals(page({ consultancyId: consultancy.id })).data.items;
  assert.equal(listed.some((row) => row.crmStudentId === 'st_3'), true);
  assert.equal(consultancy.studentCount, listed.length);
  assert.equal(referral.createdAt, '2026-04-02T09:30:00.000Z');
});

test('demo mode is the default and does not select the API client', () => {
  const demo = { name: 'demo' };
  const api = { name: 'api' };
  assert.equal(resolveCrmDataMode({}).name || resolveCrmDataMode({}), 'demo');
  assert.equal(resolveCrmDataMode({ VITE_CRM_DATA_MODE: '' }), 'demo');
  assert.equal(resolveCrmDataMode({ VITE_CRM_DATA_MODE: 'local' }), 'demo');
  assert.equal(resolveCrmDataMode({ VITE_CRM_DATA_MODE: 'api' }), 'api');
  assert.equal(selectCrmClient('demo', { demo, api }), demo);
  assert.equal(selectCrmClient(undefined, { demo, api }), demo);
  assert.equal(selectCrmClient('api', { demo, api }), api);
  assert.throws(() => selectCrmClient('api', { demo }));
});

test('the /crm route is public and /admin stays behind ProtectedAdmin', () => {
  const source = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8');
  const crmAt = source.indexOf('path="/crm"');
  const adminAt = source.indexOf('path="/admin"');
  assert.ok(crmAt > 0, 'standalone /crm route is registered');
  assert.ok(adminAt > crmAt, '/crm is registered outside the /admin route tree');
  const crmRoute = source.slice(crmAt, crmAt + 500);
  assert.match(crmRoute, /CrmDemoLayout/);
  assert.doesNotMatch(crmRoute, /ProtectedAdmin/);
  assert.match(source, /function ProtectedAdmin/);
  assert.match(source, /path="\/admin"[\s\S]{0,180}<ProtectedAdmin>/);
  assert.match(source, /if \(!isAuthenticated\)/);
});

test('directories page past the first hundred without dropping or repeating records', () => {
  const crm = repo();
  for (let index = 0; index < 105; index += 1) {
    const created = crm.createStudent({
      fullName: `Paged Student ${String(index).padStart(3, '0')}`,
      phone: `9${String(index).padStart(9, '0')}`,
      consultancyId: 'con_1',
    });
    assert.equal(created.status, 201);
  }
  const first = crm.listStudents({ page: 1, limit: 100 });
  const second = crm.listStudents({ page: 2, limit: 100 });
  assert.equal(first.data.total, 109);
  assert.equal(second.data.total, 109);
  assert.equal(first.data.items.length, 100);
  assert.equal(second.data.items.length, 9);
  const ids = [...first.data.items, ...second.data.items].map((row) => row.id);
  assert.equal(new Set(ids).size, 109);
  assert.equal(crm.listStudents({ page: 1, limit: 101 }).success, false);
  const loaded = loadAll((page) => crm.listStudents({ page, limit: 100 }));
  assert.equal(loaded.ok, true);
  assert.equal(loaded.items.length, 109);
  assert.equal(new Set(loaded.items.map((row) => row.id)).size, 109);
  assert.equal(crm.getConsultancy('con_1').data.consultancy.studentCount, 107);
  const late = crm.listStudents({ page: 1, limit: 100, q: 'Paged Student 104' });
  assert.equal(late.data.total, 1);
  assert.equal(late.data.items[0].fullName, 'Paged Student 104');
  assert.equal(first.data.items.some((row) => row.fullName === 'Paged Student 104'), false);
  const found = loadAll((page) => crm.listStudents({ page, limit: 100, q: 'Paged Student 104' }));
  assert.equal(found.ok, true);
  assert.deepEqual(found.items.map((row) => row.fullName), ['Paged Student 104']);
});

test('missing fields and an unknown status are shown safely and left unchanged', () => {
  const state = createSeedState();
  state.students.push({ id: 'st_x', fullName: null, phone: null, admissionStatus: 'Bogus', createdAt: 'not-a-date' });
  state.referrals.push({
    id: 'ref_x',
    crmStudentId: 'st_x',
    consultancyId: 'con_1',
    consultancyName: null,
    originalConsultancyId: 'con_1',
    createdAt: 'not-a-date',
  });
  state.consultancies.push({ id: 'con_x', name: null, normalizedName: null, status: 'active', createdAt: 'not-a-date', updatedAt: 'not-a-date' });
  const storage = createMemoryStorage({ [CRM_DEMO_STORAGE_KEY]: JSON.stringify(state) });
  const crm = createCrmDemoRepository(storage);
  assert.equal(crm.listStudents(page({ q: '9' })).success, true);
  assert.equal(crm.listConsultancies(page()).success, true);
  assert.equal(crm.listContacts('con_1', page()).success, true);
  const student = crm.getStudent('st_x');
  assert.equal(student.data.student.admissionStatus, 'Not started');
  assert.equal(student.data.student.phone, null);
  const stored = JSON.parse(storage.getItem(CRM_DEMO_STORAGE_KEY));
  assert.equal(stored.students.find((row) => row.id === 'st_x').admissionStatus, 'Bogus');
  assert.equal(stored.students.find((row) => row.id === 'st_x').phone, null);
  assert.equal(stored.students.length, state.students.length);
  assert.equal(stored.referrals.length, state.referrals.length);
  assert.equal(stored.consultancies.find((row) => row.id === 'con_x').ownerId, 'staff_me');
  assert.equal(stored.consultancies.find((row) => row.id === 'con_x').followUpStatus, 'Fresh Lead');
  assert.equal(stored.consultancies.find((row) => row.id === 'con_x').callingStatus, '');
});

test('a reopened repository keeps edits, and rejected referral writes do not land', () => {
  const storage = createMemoryStorage();
  const crm = createCrmDemoRepository(storage);
  const consultancy = crm.createConsultancy({ name: 'East Gate Desk', status: 'active' });
  assert.equal(consultancy.status, 201);
  const eastId = consultancy.data.consultancy.id;
  const created = crm.createStudent({
    fullName: 'Lifecycle Student',
    phone: '9000088881',
    consultancyId: 'con_1',
    admissionStatus: 'Applied',
  });
  assert.equal(created.status, 201);
  const studentId = created.data.student.id;
  const referralId = created.data.referral.id;
  const reopened = createCrmDemoRepository(storage);
  const edited = reopened.updateStudent(studentId, { fullName: 'Lifecycle Student Nair', admissionStatus: 'Enrolled' });
  assert.equal(edited.status, 200);
  const referral = reopened.getStudentReferral(studentId).data.referral;
  assert.equal(referral.studentName, 'Lifecycle Student Nair');
  assert.equal(referral.originalConsultancyId, 'con_1');
  assert.equal(referral.consultancyId, 'con_1');
  assert.equal(referral.createdAt, created.data.referral.createdAt);
  assert.equal(reopened.updateConsultancy('con_1', { name: 'Horizon Study Circle West' }).status, 200);
  const storedName = JSON.parse(storage.getItem(CRM_DEMO_STORAGE_KEY)).referrals.find((row) => row.id === referralId).consultancyName;
  assert.equal(storedName, 'Horizon Study Circle');
  const listed = reopened.listConsultancies(page()).data.items;
  assert.equal(currentConsultancyName(reopened.getStudentReferral(studentId).data.referral, listed), 'Horizon Study Circle West');

  assert.equal(reopened.setDemoManager(true).success, true);
  const beforeRejects = storage.getItem(CRM_DEMO_STORAGE_KEY);
  assert.equal(reopened.correctReferralSource(referralId, { consultancyId: 'con_3', reason: 'This reason is long enough.' }).status, 409);
  assert.equal(reopened.createStudent({ fullName: 'Other Person', phone: '+91 90000 88881', consultancyId: eastId }).status, 409);
  assert.equal(reopened.createReferral({ crmStudentId: studentId, consultancyId: eastId }).status, 409);
  assert.equal(reopened.createStudent({ fullName: 'No Desk', phone: '9000088882', consultancyId: 'con_missing' }).status, 404);
  assert.equal(storage.getItem(CRM_DEMO_STORAGE_KEY), beforeRejects);

  const corrected = reopened.correctReferralSource(referralId, {
    consultancyId: eastId,
    reason: 'The intake desk recorded the wrong partner on the form.',
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.data.referral.originalConsultancyId, 'con_1');
  assert.equal(corrected.data.referral.consultancyId, eastId);
  const again = createCrmDemoRepository(storage);
  const students = again.listStudents(page()).data.items;
  const referrals = again.listReferrals(page()).data.items;
  const now = new Date();
  const summary = summarizeConsultancy({
    consultancy: { id: eastId },
    students,
    referrals,
    audits: [],
    range: resolveRange('all', now),
    now,
  });
  assert.equal(summary.total, 1);
  assert.equal(summary.enrolled, 1);
  assert.equal(again.getConsultancy(eastId).data.consultancy.studentCount, 1);
  assert.equal(again.getConsultancy('con_1').data.consultancy.studentCount, 2);
});

test('public directories load every page and keep the audit warning', () => {
  for (const file of ['StudentsPage.jsx', 'ConsultanciesPage.jsx', 'ReferralsPage.jsx', 'AuditPage.jsx']) {
    const source = fs.readFileSync(path.join(root, 'pages/crm-demo', file), 'utf8');
    assert.match(source, /loadAll\(/);
    assert.doesNotMatch(source, /page: 1, limit: 100/);
  }
  const students = fs.readFileSync(path.join(root, 'pages/crm-demo/StudentsPage.jsx'), 'utf8');
  assert.match(students, /getStudent\(id\)/);
  assert.match(students, /Student not found/);
  const analytics = fs.readFileSync(path.join(root, 'pages/crm-demo/AnalyticsPage.jsx'), 'utf8');
  assert.match(analytics, /Referral volume by local day/);
  const audit = fs.readFileSync(path.join(root, 'pages/crm-demo/AuditPage.jsx'), 'utf8');
  assert.match(audit, /not tamper-proof and it is not a server audit log/);
});

test('version 1 records migrate in place and stay owned by demo staff', () => {
  const seed = createSeedState();
  const studentCount = seed.students.length;
  seed.version = 1;
  delete seed.demoRole;
  delete seed.followUps;
  delete seed.remarks;
  seed.consultancies.forEach((row) => {
    delete row.createdById;
    delete row.createdByName;
    delete row.ownerId;
    delete row.ownerName;
    delete row.followUpStatus;
    delete row.lastContactAt;
    delete row.nextFollowUpAt;
  });
  const storage = createMemoryStorage({ [CRM_DEMO_STORAGE_KEY]: JSON.stringify(seed) });
  const crm = createCrmDemoRepository(storage);
  const listed = crm.listConsultancies(page({ limit: 100 }));
  const horizon = listed.data.items.find((row) => row.id === 'con_1');
  assert.equal(horizon.createdById, 'staff_me');
  assert.equal(horizon.ownerId, 'staff_me');
  assert.equal(horizon.followUpStatus, 'Fresh Lead');
  assert.equal(horizon.callingStatus, '');
  const saved = JSON.parse(storage.getItem(CRM_DEMO_STORAGE_KEY));
  assert.equal(saved.version, 2);
  assert.equal(saved.students.length, studentCount);
  assert.equal(saved.referrals.length, seed.referrals.length);
});

test('staff sees owned consultancies and reassignment keeps the creator', () => {
  const crm = repo();
  assert.equal(crm.reassignOwner('con_2', { ownerId: 'staff_seed' }).code, 'role_required');
  assert.equal(crm.getConsultancy('con_2').data.consultancy.ownerId, 'staff_me');
  assert.equal(crm.setDemoRole('super_admin').data.demoRole, 'super_admin');
  const moved = crm.reassignOwner('con_2', { ownerId: 'staff_seed' });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.consultancy.ownerId, 'staff_seed');
  assert.equal(moved.data.consultancy.ownerName, 'Demo seed');
  assert.equal(moved.data.consultancy.createdById, 'staff_me');
  assert.equal(crm.setDemoRole('staff').success, true);
  const visible = crm.listConsultancies(page({ limit: 100 })).data.items.map((row) => row.id);
  assert.equal(visible.includes('con_2'), false);
  assert.equal(visible.includes('con_1'), true);
  assert.equal(crm.getConsultancy('con_2').status, 404);
  assert.equal(crm.setDemoRole('super_admin').success, true);
  assert.equal(crm.getConsultancy('con_2').data.consultancy.createdById, 'staff_me');
});

test('follow-up rules record activity and derive overdue without moving last contact', () => {
  const crm = repo();
  const now = new Date('2026-10-19T00:00:00.000Z');
  assert.equal(crm.setFollowUp('con_1', { followUpStatus: 'Meeting Scheduled', scheduledAt: '2020-01-01T00:00:00.000Z' }, now).status, 400);
  const future = '2026-10-20T10:00:00.000Z';
  const scheduled = crm.setFollowUp('con_1', { followUpStatus: 'Meeting Scheduled', scheduledAt: future }, now);
  assert.equal(scheduled.status, 200);
  assert.equal(scheduled.data.consultancy.followUpStatus, 'Meeting Scheduled');
  assert.equal(scheduled.data.consultancy.callingStatus, '');
  assert.equal(scheduled.data.consultancy.nextFollowUpAt, future);
  assert.equal(scheduled.data.consultancy.lastContactAt, null);
  const called = crm.setFollowUp('con_1', { callingStatus: 'Not Answered' }, now);
  assert.equal(called.status, 200);
  assert.equal(called.data.consultancy.callingStatus, 'Not Answered');
  assert.equal(called.data.consultancy.followUpStatus, 'Meeting Scheduled');
  assert.equal(called.data.consultancy.lastContactAt, null);
  assert.equal(isFollowUpOverdue(scheduled.data.consultancy, now), false);
  assert.equal(crm.setFollowUp('con_1', { followUpStatus: 'Meeting Completed', outcome: 'Spoke' }, now).status, 400);
  const completedAt = new Date('2026-10-19T04:00:00.000Z');
  const completed = crm.setFollowUp('con_1', { followUpStatus: 'Meeting Completed', outcome: 'Spoke', notes: 'Asked for the brochure.' }, completedAt);
  assert.equal(completed.data.consultancy.lastContactAt, completedAt.toISOString());
  const again = crm.setFollowUp('con_1', { followUpStatus: 'Meeting Scheduled', scheduledAt: future }, now);
  assert.equal(again.data.consultancy.lastContactAt, completedAt.toISOString());
  const required = crm.setFollowUp('con_1', {
    followUpStatus: 'Follow-up Required',
    nextAction: 'Call the owner',
    scheduledAt: '2026-10-18T00:00:00.000Z',
  }, now);
  assert.equal(required.status, 200);
  assert.equal(isFollowUpOverdue(required.data.consultancy, now), true);
  assert.equal(crm.setFollowUp('con_1', { followUpStatus: 'Follow-up Required', scheduledAt: future }, now).status, 400);
  const activity = crm.listAudits(page({ limit: 100 })).data.items.filter((row) => row.action === 'consultancy.follow_up');
  assert.equal(activity.length >= 3, true);
  assert.equal(crm.listFollowUps('con_1', page()).data.total >= 3, true);
});

test('remarks reject empty text and keep the previous wording', () => {
  const crm = repo();
  assert.equal(crm.addRemark('con_1', { text: '   ' }).status, 400);
  const added = crm.addRemark('con_1', { text: 'First note' });
  assert.equal(added.status, 201);
  assert.equal(added.data.remark.authorName, 'Demo staff');
  const edited = crm.editRemark('con_1', added.data.remark.id, { text: 'Second note' });
  assert.equal(edited.data.remark.text, 'Second note');
  assert.equal(edited.data.remark.previousText, 'First note');
  assert.equal(edited.data.remark.history[0].text, 'First note');
  assert.equal(crm.getConsultancy('con_1').data.consultancy.latestRemark.text, 'Second note');
});

test('original referral ownership stays put when the current source changes', () => {
  const crm = repo();
  crm.setDemoManager(true);
  const created = crm.createStudent({ fullName: 'Origin Hold', phone: '9000077771', consultancyId: 'con_1' });
  const before = crm.getConsultancy('con_1').data.consultancy.originalStudentCount;
  const east = crm.createConsultancy({ name: 'East Desk Origin', status: 'active' });
  const corrected = crm.correctReferralSource(created.data.referral.id, {
    consultancyId: east.data.consultancy.id,
    reason: 'The intake desk recorded the wrong partner on the form.',
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.data.referral.originalConsultancyId, 'con_1');
  assert.equal(crm.getConsultancy('con_1').data.consultancy.originalStudentCount, before);
  assert.equal(crm.getConsultancy(east.data.consultancy.id).data.consultancy.originalStudentCount, 0);
  assert.equal(crm.getConsultancy(east.data.consultancy.id).data.consultancy.studentCount, 1);
  const inactive = crm.createStudent({ fullName: 'Closed Desk', phone: '9000077772', consultancyId: 'con_3' });
  assert.equal(inactive.code, 'consultancy_not_eligible');
  assert.equal(crm.updateConsultancy('con_1', { status: 'inactive' }).status, 200);
  const scheduled = crm.setFollowUp('con_2', { followUpStatus: 'Meeting Scheduled', scheduledAt: '2099-01-01T00:00:00.000Z' });
  const beforeStatus = scheduled.data.consultancy.followUpStatus;
  const cancelled = crm.cancelFollowUp('con_2', scheduled.data.followUp.id);
  assert.equal(cancelled.status, 200);
  assert.ok(cancelled.data.followUp.cancelledAt);
  assert.equal(crm.getConsultancy('con_2').data.consultancy.followUpStatus, beforeStatus);
  assert.equal(crm.getStudent(created.data.student.id).status, 200);
  assert.equal(crm.listRemarks('con_1', page()).success, true);
});

test('volume sample replaces the starter set with a large fictional workspace', () => {
  const crm = repo();
  const loaded = crm.loadVolumeData();
  assert.equal(loaded.success, true);
  assert.equal(loaded.data.counts.students, 800);
  assert.equal(loaded.data.counts.consultancies, 64);
  assert.ok(loaded.data.counts.referrals > 700);
  const phones = new Set();
  const students = loadAll((page) => crm.listStudents({ page, limit: 100 }));
  assert.equal(students.ok, true);
  assert.equal(students.items.length, 800);
  students.items.forEach((student) => {
    assert.equal(normalizeIndianMobile(student.phone), student.phone);
    assert.equal(phones.has(student.phone), false);
    phones.add(student.phone);
  });
  const consultancies = loadAll((page) => crm.listConsultancies({ page, limit: 100 }));
  assert.equal(consultancies.ok, true);
  assert.equal(consultancies.items.length, 64);
  assert.equal(new Set(consultancies.items.map((row) => row.name)).size, 64);
  const overview = crm.overview();
  assert.equal(overview.data.demoRole, 'super_admin');
  assert.equal(overview.data.students, 800);
  const reset = crm.resetDemoData();
  assert.equal(reset.data.counts.students, 4);
});
