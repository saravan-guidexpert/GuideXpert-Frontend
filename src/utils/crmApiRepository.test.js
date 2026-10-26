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
    followUps: [],
    remarks: [],
    owners: {},
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
    if (method === 'GET' && path.endsWith('/follow-ups')) {
      const id = path.split('/')[2];
      return page(data.followUps.filter((row) => row.consultancyId === id));
    }
    if (method === 'GET' && path.endsWith('/remarks')) {
      const id = path.split('/')[2];
      return page(data.remarks.filter((row) => row.consultancyId === id));
    }
    if (method === 'POST' && path === '/consultancies') {
      const row = {
        id: `c${data.consultancies.length + 1}`,
        name: body.name,
        status: body.status || 'active',
        notes: body.notes || '',
        followUpStatus: body.followUpStatus || 'Fresh Lead',
        callingStatus: body.callingStatus || '',
        pipelineStage: body.followUpStatus === 'Contacted' ? 'contacted' : 'fresh',
        ownerId: null,
        ownerName: '',
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
      };
      data.consultancies.push(row);
      return { success: true, status: 201, message: 'Consultancy created.', data: { consultancy: row } };
    }
    if (method === 'POST' && /\/remarks$/.test(path)) {
      const id = path.split('/')[2];
      const remark = { id: `rm${data.remarks.length + 1}`, consultancyId: id, text: body.text, authorId: 'user-1', authorName: 'Asha Rao', createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', previousText: null, history: [] };
      data.remarks.unshift(remark);
      return { success: true, status: 201, message: 'Remark saved.', data: { remark } };
    }
    if (method === 'POST' && /\/follow-ups$/.test(path)) {
      const id = path.split('/')[2];
      const row = data.consultancies.find((item) => item.id === id);
      if (row && body.followUpStatus) row.followUpStatus = body.followUpStatus;
      if (row && Object.prototype.hasOwnProperty.call(body, 'callingStatus')) row.callingStatus = body.callingStatus || '';
      const followUp = { id: `fu${data.followUps.length + 1}`, consultancyId: id, status: body.followUpStatus, scheduledAt: body.scheduledAt || null };
      data.followUps.unshift(followUp);
      return { success: true, status: 200, message: 'Consultancy status saved.', data: { followUp } };
    }
    if (method === 'POST' && path.endsWith('/owner')) {
      const id = path.split('/')[2];
      const row = data.consultancies.find((item) => item.id === id);
      if (row) {
        row.ownerId = body.ownerId;
        row.ownerName = 'Next Owner';
      }
      return { success: true, status: 200, message: 'Owner updated. The creator is unchanged.', data: { consultancy: row } };
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

test('signed-in CRM saves consultancy workspace fields and keeps demo tools off the server', async () => {
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
  const write = api.calls.find((call) => call.method === 'POST' && call.path === '/consultancies');
  assert.deepEqual(write.body, { name: 'North Star', status: 'active', notes: 'Desk', followUpStatus: 'Contacted', callingStatus: 'Connected' });
  const listed = repo.listConsultancies({ page: 1, limit: 20 });
  assert.equal(listed.data.items[0].pipelineStored, true);
  assert.equal(listed.data.items[0].followUpStatus, 'Contacted');
  assert.equal(listed.data.items[0].callingStatus, 'Connected');
  const student = await repo.createStudent({ fullName: 'Meera Iyer', phone: '9012345678', consultancyId: listed.data.items[0].id, admissionStatus: 'Not started' });
  assert.equal(student.success, true);
  const duplicate = await repo.createStudent({ fullName: 'Other', phone: '9012345678', consultancyId: listed.data.items[0].id });
  assert.equal(duplicate.code, 'duplicate_student');
  assert.equal(duplicate.data.student.fullName, 'Meera Iyer');
  const remarked = await repo.addRemark(listed.data.items[0].id, { text: 'Called' });
  assert.equal(remarked.success, true);
  assert.equal(repo.listRemarks(listed.data.items[0].id, { page: 1, limit: 20 }).data.items[0].text, 'Called');
  const followed = await repo.setFollowUp(listed.data.items[0].id, { followUpStatus: 'Meeting Scheduled', scheduledAt: '2099-01-01T00:00:00.000Z' });
  assert.equal(followed.success, true);
  assert.equal(repo.listFollowUps(listed.data.items[0].id, { page: 1, limit: 20 }).data.total, 1);
  const reassigned = await repo.reassignOwner(listed.data.items[0].id, { ownerId: 'other' });
  assert.equal(reassigned.success, true);
  assert.equal(repo.getConsultancy(listed.data.items[0].id).data.consultancy.ownerName, 'Next Owner');
  assert.equal((await repo.resetDemoData()).success, false);
  assert.equal((await repo.loadVolumeData()).success, false);
  assert.equal(repo.capabilities().demoTools, false);
  assert.equal(repo.capabilities().remarks, true);
  assert.equal(api.calls.some((call) => String(call.path).includes('demo')), false);
  assert.doesNotMatch(fs.readFileSync(new URL('./crmApiRepository.js', import.meta.url), 'utf8'), /crmDemoStore|guidexpert_crm_demo_v1/);
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
