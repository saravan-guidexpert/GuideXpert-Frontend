import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { createCrmApiRepository } from './crmApiRepository.js';

function memoryApi() {
  const data = {
    consultancies: [],
    students: [],
    referrals: [],
    contacts: [],
    audits: [],
  };
  const calls = [];
  async function request(method, path, _params, body) {
    calls.push({ method, path, body });
    if (method === 'GET' && path === '/consultancies') return page(data.consultancies);
    if (method === 'GET' && path === '/students') return page(data.students);
    if (method === 'GET' && path === '/referrals') return page(data.referrals);
    if (method === 'GET' && path === '/audits') return page(data.audits);
    if (method === 'GET' && path.endsWith('/contacts')) {
      const id = path.split('/')[2];
      return page(data.contacts.filter((row) => row.consultancyId === id));
    }
    if (method === 'POST' && path === '/consultancies') {
      const row = { id: `c${data.consultancies.length + 1}`, name: body.name, status: body.status || 'active', notes: body.notes || '', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z' };
      data.consultancies.push(row);
      return { success: true, status: 201, message: 'Consultancy created.', data: { consultancy: row } };
    }
    if (method === 'POST' && path === '/students') {
      if (data.students.some((row) => row.phone === body.phone)) {
        return { success: false, status: 409, code: 'duplicate_student', message: 'A student with this mobile number already exists. No duplicate was created.', data: { student: data.students.find((row) => row.phone === body.phone) } };
      }
      const row = { id: `s${data.students.length + 1}`, ...body, createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z' };
      data.students.push(row);
      data.referrals.push({ id: `r${data.referrals.length + 1}`, crmStudentId: row.id, studentName: row.fullName, consultancyId: body.consultancyId, consultancyName: 'North Star', originalConsultancyId: body.consultancyId, originalConsultancyName: 'North Star', createdAt: row.createdAt });
      return { success: true, status: 201, message: 'Student created.', data: { student: row } };
    }
    return { success: false, status: 404, code: 'not_found', message: 'Missing route.' };
  }
  return { request, calls, data };
}

function page(items) {
  return { success: true, status: 200, data: { items, total: items.length, page: 1, limit: 100 } };
}

test('signed-in CRM saves supported records and rejects unstored demo fields', async () => {
  const api = memoryApi();
  const repo = createCrmApiRepository({ request: api.request, user: { id: 'user-1', fullName: 'Asha Rao' } });
  assert.equal(repo.storageKey, null);
  assert.equal(repo.inspect().code, 'loading');
  await repo.reload();
  const created = await repo.createConsultancy({
    name: 'North Star',
    status: 'active',
    notes: 'Desk',
    followUpStatus: 'Contacted',
    callingStatus: 'Connected',
  });
  assert.equal(created.success, true);
  assert.match(created.message, /not stored/i);
  const write = api.calls.find((call) => call.method === 'POST' && call.path === '/consultancies');
  assert.deepEqual(write.body, { name: 'North Star', status: 'active', notes: 'Desk' });
  const listed = repo.listConsultancies({ page: 1, limit: 20 });
  assert.equal(listed.data.items[0].pipelineStored, false);
  assert.equal(listed.data.items[0].followUpStatus, '');
  assert.equal(listed.data.items[0].ownerName, '');
  const student = await repo.createStudent({ fullName: 'Meera Iyer', phone: '9012345678', consultancyId: listed.data.items[0].id, admissionStatus: 'Not started' });
  assert.equal(student.success, true);
  const duplicate = await repo.createStudent({ fullName: 'Other', phone: '9012345678', consultancyId: listed.data.items[0].id });
  assert.equal(duplicate.code, 'duplicate_student');
  assert.equal(duplicate.data.student.fullName, 'Meera Iyer');
  assert.equal((await repo.addRemark(listed.data.items[0].id, { text: 'Called' })).code, 'not_stored');
  assert.equal((await repo.setFollowUp(listed.data.items[0].id, { followUpStatus: 'Contacted' })).code, 'not_stored');
  assert.equal((await repo.reassignOwner(listed.data.items[0].id, { ownerId: 'other' })).code, 'not_stored');
  assert.equal((await repo.resetDemoData()).success, false);
  assert.equal((await repo.loadVolumeData()).success, false);
  assert.equal(repo.capabilities().demoTools, false);
  assert.equal(api.calls.some((call) => String(call.path).includes('demo')), false);
});

test('the signed-in CRM uses the demo screens and not the demo store', () => {
  const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  const shell = fs.readFileSync(new URL('../pages/crm-app/CrmAppShell.jsx', import.meta.url), 'utf8');
  const portalAt = app.indexOf('path="/crm/app"');
  const demoAt = app.indexOf('path="/crm/demo"');
  const legacyAt = app.indexOf('path="/crm-app"');
  assert.ok(portalAt > demoAt);
  assert.ok(legacyAt > portalAt);
  const portal = app.slice(portalAt, legacyAt);
  assert.match(portal, /CrmAppShell/);
  assert.match(portal, /CrmDemoOverviewPage/);
  assert.match(portal, /path="consultancies"/);
  assert.match(portal, /path="students"/);
  assert.match(portal, /path="referrals"/);
  assert.match(portal, /path="audit"/);
  assert.match(portal, /path="settings"/);
  assert.match(portal, /path="analytics"/);
  assert.match(portal, /path="calendar"/);
  assert.doesNotMatch(portal, /crmDemoStore|guidexpert_crm_demo_v1/);
  assert.match(shell, /createCrmApiRepository/);
  assert.doesNotMatch(shell, /crmDemoStore|guidexpert_crm_demo_v1|localStorage/);
  assert.match(app.slice(demoAt, demoAt + 500), /CrmDemoLayout/);
});
