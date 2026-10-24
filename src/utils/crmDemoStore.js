/**
 * Local Consultancy CRM demo repository.
 * Persists only under CRM_DEMO_STORAGE_KEY. It does not read or write auth tokens.
 * Callers in demo mode must use this module instead of crmApi.js.
 */

import { consultancyStage } from './consultancyPipeline.js';

export const CRM_DEMO_STORAGE_KEY = 'guidexpert_crm_demo_v1';

export const ADMISSION_STATUSES = ['Not started', 'Contacted', 'Counselling', 'Applied', 'Admitted', 'Enrolled', 'Not proceeding'];

const REASON_MIN = 10;
const REASON_MAX = 500;

export function normalizeIndianMobile(input) {
  const compact = String(input ?? '').trim().replace(/[\s()-]/g, '');
  if (!compact || compact.startsWith('0')) {
    throw phoneError();
  }
  let digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) throw phoneError();
  return digits;
}

export function normalizeConsultancyName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function admissionStatusOf(value) {
  if (value == null || value === '') return 'Not started';
  if (!ADMISSION_STATUSES.includes(value)) {
    const error = new Error('Choose an admission status.');
    error.code = 'invalid_admission_status';
    throw error;
  }
  return value;
}

function phoneError() {
  const error = new Error('Enter a valid Indian mobile number: 10 digits, 91 plus 10 digits, or +91 plus 10 digits.');
  error.code = 'invalid_phone';
  return error;
}

function ok(status, message, data) {
  return { success: true, status, code: null, message, data };
}

function fail(status, message, code, data = null) {
  return { success: false, status, code, message, data };
}

function text(value, label, min, max) {
  const next = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (next.length < min || next.length > max) {
    throw Object.assign(new Error(`${label} must be ${min}–${max} characters.`), { code: 'invalid_body' });
  }
  return next;
}

function asText(value) {
  return value == null ? '' : String(value);
}

export function createSeedState() {
  const at = '2026-04-02T09:30:00.000Z';
  return {
    version: 1,
    seq: 30,
    demoManager: false,
    consultancies: [
      { id: 'con_1', name: 'Horizon Study Circle', normalizedName: 'horizon study circle', status: 'active', pipelineStage: 'fresh', notes: 'Fictional Hyderabad counselling desk.', createdAt: at, updatedAt: at },
      { id: 'con_2', name: 'North Star Guidance', normalizedName: 'north star guidance', status: 'active', pipelineStage: 'contacted', notes: 'Fictional Bengaluru partner.', createdAt: at, updatedAt: at },
      { id: 'con_3', name: 'South Gate Advisors', normalizedName: 'south gate advisors', status: 'inactive', pipelineStage: 'meeting_done', notes: 'Fictional inactive desk kept for history.', createdAt: at, updatedAt: at },
    ],
    contacts: [
      { id: 'ct_1', consultancyId: 'con_1', name: 'Anita Rao', phone: '9000011111', email: '', role: 'Owner', status: 'active', deactivatedAt: null, createdAt: at, updatedAt: at },
      { id: 'ct_2', consultancyId: 'con_1', name: 'Ravi Menon', phone: null, email: 'ravi.menon@example.com', role: 'Counsellor', status: 'active', deactivatedAt: null, createdAt: at, updatedAt: at },
      { id: 'ct_3', consultancyId: 'con_2', name: 'Leela Iyer', phone: '9898989898', email: '', role: 'Partner', status: 'active', deactivatedAt: null, createdAt: at, updatedAt: at },
      { id: 'ct_4', consultancyId: 'con_3', name: 'Leela Iyer', phone: '9898989898', email: 'leela.south@example.com', role: 'Partner', status: 'active', deactivatedAt: null, createdAt: at, updatedAt: at },
    ],
    students: [
      { id: 'st_1', fullName: 'Asha Rao', phone: '9876543210', email: 'asha.rao@example.com', city: 'Hyderabad', notes: 'Fictional student.', admissionStatus: 'Counselling', createdAt: at, updatedAt: at },
      { id: 'st_2', fullName: 'Meera Iyer', phone: '9012345678', email: '', city: 'Chennai', notes: '', admissionStatus: 'Not started', createdAt: at, updatedAt: at },
      { id: 'st_3', fullName: 'Karthik Nair', phone: '9123456780', email: '', city: 'Bengaluru', notes: '', admissionStatus: 'Applied', createdAt: at, updatedAt: at },
      { id: 'st_4', fullName: 'Divya Shah', phone: '9345678901', email: '', city: 'Pune', notes: '', admissionStatus: 'Contacted', createdAt: at, updatedAt: at },
    ],
    referrals: [
      {
        id: 'ref_1',
        crmStudentId: 'st_1',
        studentName: 'Asha Rao',
        consultancyId: 'con_1',
        consultancyName: 'Horizon Study Circle',
        consultancyContactId: 'ct_1',
        contactName: 'Anita Rao',
        originalConsultancyId: 'con_1',
        originalConsultancyName: 'Horizon Study Circle',
        createdAt: at,
        updatedAt: at,
        sourceCorrectedAt: null,
        sourceCorrectedBy: null,
      },
      {
        id: 'ref_2',
        crmStudentId: 'st_3',
        studentName: 'Karthik Nair',
        consultancyId: 'con_2',
        consultancyName: 'North Star Guidance',
        consultancyContactId: 'ct_3',
        contactName: 'Leela Iyer',
        originalConsultancyId: 'con_2',
        originalConsultancyName: 'North Star Guidance',
        createdAt: at,
        updatedAt: at,
        sourceCorrectedAt: null,
        sourceCorrectedBy: null,
      },
      {
        id: 'ref_3',
        crmStudentId: 'st_2',
        studentName: 'Meera Iyer',
        consultancyId: 'con_1',
        consultancyName: 'Horizon Study Circle',
        consultancyContactId: 'ct_1',
        contactName: 'Anita Rao',
        originalConsultancyId: 'con_1',
        originalConsultancyName: 'Horizon Study Circle',
        createdAt: at,
        updatedAt: at,
        sourceCorrectedAt: null,
        sourceCorrectedBy: null,
      },
      {
        id: 'ref_4',
        crmStudentId: 'st_4',
        studentName: 'Divya Shah',
        consultancyId: 'con_2',
        consultancyName: 'North Star Guidance',
        consultancyContactId: 'ct_3',
        contactName: 'Leela Iyer',
        originalConsultancyId: 'con_2',
        originalConsultancyName: 'North Star Guidance',
        createdAt: at,
        updatedAt: at,
        sourceCorrectedAt: null,
        sourceCorrectedBy: null,
      },
    ],
    audits: [
      { id: 'audit_1', action: 'student.created', entityType: 'student', entityId: 'st_1', actorLabel: 'Demo seed', reason: '', before: null, after: { fullName: 'Asha Rao', phone: '9876543210' }, createdAt: at },
      { id: 'audit_2', action: 'referral.created', entityType: 'referral', entityId: 'ref_1', actorLabel: 'Demo seed', reason: '', before: null, after: { consultancyId: 'con_1', consultancyName: 'Horizon Study Circle', originalConsultancyId: 'con_1' }, createdAt: at },
      { id: 'audit_3', action: 'consultancy.created', entityType: 'consultancy', entityId: 'con_2', actorLabel: 'Demo seed', reason: '', before: null, after: { name: 'North Star Guidance', status: 'active' }, createdAt: at },
    ],
  };
}

function isState(value) {
  return Boolean(value)
    && value.version === 1
    && typeof value.demoManager === 'boolean'
    && Number.isInteger(value.seq)
    && Array.isArray(value.consultancies)
    && Array.isArray(value.contacts)
    && Array.isArray(value.students)
    && Array.isArray(value.referrals)
    && Array.isArray(value.audits);
}

function browserStorage() {
  if (typeof localStorage === 'undefined') {
    throw Object.assign(new Error('Local demo storage is not available.'), { code: 'storage_unavailable' });
  }
  return {
    getItem(key) {
      return localStorage.getItem(key);
    },
    setItem(key, value) {
      if (key !== CRM_DEMO_STORAGE_KEY) {
        throw new Error('The CRM demo refused to write an unrelated storage key.');
      }
      localStorage.setItem(key, value);
    },
  };
}

function readState(storage) {
  let raw;
  try {
    raw = storage.getItem(CRM_DEMO_STORAGE_KEY);
  } catch {
    return { error: fail(500, 'This browser blocked local demo storage.', 'storage_unavailable') };
  }
  if (raw == null || raw === '') {
    const state = createSeedState();
    const written = writeState(storage, state);
    if (written.error) return written;
    return { state, seeded: true };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!isState(parsed)) {
      return { error: fail(500, 'Local demo data is unreadable. Reset it from Demo data.', 'malformed_demo_data') };
    }
    return { state: parsed, seeded: false };
  } catch {
    return { error: fail(500, 'Local demo data is unreadable. Reset it from Demo data.', 'malformed_demo_data') };
  }
}

function writeState(storage, state) {
  try {
    storage.setItem(CRM_DEMO_STORAGE_KEY, JSON.stringify(state));
    return { error: null };
  } catch {
    return { error: fail(500, 'Local demo data could not be saved in this browser.', 'storage_unavailable') };
  }
}

function commit(storage, recipe) {
  const loaded = readState(storage);
  if (loaded.error) return loaded.error;
  const result = recipe(loaded.state);
  if (!result.write) return result.response;
  const written = writeState(storage, result.state);
  if (written.error) return written.error;
  return result.response;
}

function pageOf(query) {
  const page = Number(query && query.page);
  const limit = Number(query && query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: fail(400, 'page and limit are required. limit must be from 1 to 100.', 'invalid_query') };
  }
  return { page, limit, skip: (page - 1) * limit };
}

function slicePage(rows, query) {
  const parsed = pageOf(query);
  if (parsed.error) return parsed.error;
  return ok(200, '', {
    items: rows.slice(parsed.skip, parsed.skip + parsed.limit),
    page: parsed.page,
    limit: parsed.limit,
    total: rows.length,
  });
}

function actor(state) {
  return state.demoManager ? 'Demo manager' : 'Demo staff';
}

function addAudit(state, entry) {
  state.seq += 1;
  state.audits.unshift({
    id: `audit_${state.seq}`,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorLabel: entry.actorLabel || actor(state),
    reason: entry.reason || '',
    before: entry.before ?? null,
    after: entry.after ?? null,
    createdAt: new Date().toISOString(),
  });
}

function nextId(state, prefix) {
  state.seq += 1;
  return `${prefix}_${state.seq}`;
}

const SEED_PIPELINE = { con_1: 'fresh', con_2: 'contacted', con_3: 'meeting_done' };

function consultancyDto(row, state) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    pipelineStage: consultancyStage(row.pipelineStage || SEED_PIPELINE[row.id]),
    notes: row.notes || '',
    studentCount: state.referrals.filter((item) => item.consultancyId === row.id).length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function contactDto(row) {
  return {
    id: row.id,
    consultancyId: row.consultancyId,
    name: row.name,
    phone: row.phone || null,
    email: row.email || null,
    role: row.role || '',
    status: row.status,
    deactivatedAt: row.deactivatedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function studentDto(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email || '',
    city: row.city || '',
    notes: row.notes || '',
    admissionStatus: ADMISSION_STATUSES.includes(row.admissionStatus) ? row.admissionStatus : 'Not started',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function referralDto(row) {
  return { ...row };
}

function readPipelineStage(value, required = false) {
  if (value == null || value === '') {
    if (required) return { error: fail(400, 'Choose a pipeline stage.', 'invalid_body') };
    return { value: 'fresh' };
  }
  const stage = consultancyStage(value);
  if (stage !== value) {
    return { error: fail(400, 'Pipeline stage must be fresh, contacted, meeting done, or onboarded.', 'invalid_body') };
  }
  return { value: stage };
}

function activeNameOwner(state, normalizedName, exceptId) {
  return state.consultancies.find((row) => row.status === 'active' && row.normalizedName === normalizedName && row.id !== exceptId);
}

function counts(state) {
  return {
    consultancies: state.consultancies.length,
    activeConsultancies: state.consultancies.filter((row) => row.status === 'active').length,
    students: state.students.length,
    referrals: state.referrals.length,
  };
}

export function createCrmDemoRepository(storage) {
  const store = () => storage || browserStorage();

  return {
    storageKey: CRM_DEMO_STORAGE_KEY,
    inspect() {
      const loaded = readState(store());
      if (loaded.error) return loaded.error;
      return ok(200, '', { demoManager: loaded.state.demoManager, counts: counts(loaded.state), seeded: loaded.seeded === true });
    },
    overview() {
      return commit(store(), (state) => ({
        write: false,
        state,
        response: ok(200, '', {
          ...counts(state),
          demoManager: state.demoManager,
          recent: state.audits.slice(0, 6),
        }),
      }));
    },
    listConsultancies(query = {}) {
      return commit(store(), (state) => {
        const q = String(query.q || '').trim().toLowerCase();
        let rows = state.consultancies.filter((row) => !q || asText(row.normalizedName).includes(q) || asText(row.name).toLowerCase().includes(q));
        if (query.status) rows = rows.filter((row) => row.status === query.status);
        if (query.pipelineStage) rows = rows.filter((row) => consultancyStage(row.pipelineStage) === query.pipelineStage);
        rows = [...rows].sort((a, b) => asText(a.name).localeCompare(asText(b.name)));
        return { write: false, state, response: slicePage(rows.map((row) => consultancyDto(row, state)), query) };
      });
    },
    createConsultancy(body = {}) {
      return commit(store(), (state) => {
        let name;
        try {
          name = text(body.name, 'Name', 2, 200);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        const status = body.status === 'inactive' ? 'inactive' : 'active';
        const parsedStage = readPipelineStage(body.pipelineStage);
        if (parsedStage.error) return { write: false, state, response: parsedStage.error };
        const pipelineStage = parsedStage.value;
        const normalizedName = normalizeConsultancyName(name);
        if (status === 'active' && activeNameOwner(state, normalizedName)) {
          return { write: false, state, response: fail(409, 'An active consultancy with this name already exists.', 'duplicate_consultancy') };
        }
        const now = new Date().toISOString();
        const row = { id: nextId(state, 'con'), name, normalizedName, status, pipelineStage, notes: String(body.notes || '').trim().slice(0, 2000), createdAt: now, updatedAt: now };
        state.consultancies.push(row);
        addAudit(state, { action: 'consultancy.created', entityType: 'consultancy', entityId: row.id, after: { name, status, pipelineStage } });
        return { write: true, state, response: ok(201, 'Consultancy created.', { consultancy: consultancyDto(row, state) }) };
      });
    },
    getConsultancy(id) {
      return commit(store(), (state) => {
        const row = state.consultancies.find((item) => item.id === id);
        if (!row) return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        return { write: false, state, response: ok(200, '', { consultancy: consultancyDto(row, state) }) };
      });
    },
    updateConsultancy(id, body = {}) {
      return commit(store(), (state) => {
        const row = state.consultancies.find((item) => item.id === id);
        if (!row) return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        const before = { name: row.name, status: row.status, pipelineStage: consultancyStage(row.pipelineStage), notes: row.notes };
        if (Object.prototype.hasOwnProperty.call(body, 'name')) {
          try {
            row.name = text(body.name, 'Name', 2, 200);
          } catch (error) {
            return { write: false, state, response: fail(400, error.message, 'invalid_body') };
          }
          row.normalizedName = normalizeConsultancyName(row.name);
        }
        if (Object.prototype.hasOwnProperty.call(body, 'notes')) row.notes = String(body.notes || '').trim().slice(0, 2000);
        if (Object.prototype.hasOwnProperty.call(body, 'status')) row.status = body.status === 'inactive' ? 'inactive' : 'active';
        if (Object.prototype.hasOwnProperty.call(body, 'pipelineStage')) {
          const pipelineStage = readPipelineStage(body.pipelineStage, true);
          if (pipelineStage.error) return { write: false, state, response: pipelineStage.error };
          row.pipelineStage = pipelineStage.value;
        }
        if (row.status === 'active' && activeNameOwner(state, row.normalizedName, row.id)) {
          return { write: false, state, response: fail(409, 'An active consultancy with this name already exists.', 'duplicate_consultancy') };
        }
        row.updatedAt = new Date().toISOString();
        addAudit(state, { action: 'consultancy.updated', entityType: 'consultancy', entityId: row.id, before, after: { name: row.name, status: row.status, pipelineStage: consultancyStage(row.pipelineStage), notes: row.notes } });
        return { write: true, state, response: ok(200, 'Consultancy updated.', { consultancy: consultancyDto(row, state) }) };
      });
    },
    listContacts(consultancyId, query = {}) {
      return commit(store(), (state) => {
        if (!state.consultancies.some((row) => row.id === consultancyId)) {
          return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        }
        let rows = state.contacts.filter((row) => row.consultancyId === consultancyId);
        if (query.status) rows = rows.filter((row) => row.status === query.status);
        rows = [...rows].sort((a, b) => asText(a.name).localeCompare(asText(b.name)));
        return { write: false, state, response: slicePage(rows.map(contactDto), query) };
      });
    },
    createContact(consultancyId, body = {}) {
      return commit(store(), (state) => {
        if (!state.consultancies.some((row) => row.id === consultancyId)) {
          return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        }
        let name;
        let phone = null;
        try {
          name = text(body.name, 'Name', 2, 200);
          if (body.phone) phone = normalizeIndianMobile(body.phone);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        const email = String(body.email || '').trim();
        if (!phone && !email) {
          return { write: false, state, response: fail(400, 'A contact needs a mobile number or an email address.', 'invalid_body') };
        }
        if (phone && state.contacts.some((row) => row.consultancyId === consultancyId && row.status === 'active' && row.phone === phone)) {
          return { write: false, state, response: fail(409, 'This consultancy already has an active contact with that mobile number.', 'duplicate_contact') };
        }
        const now = new Date().toISOString();
        const row = { id: nextId(state, 'ct'), consultancyId, name, phone, email, role: String(body.role || '').trim().slice(0, 80), status: 'active', deactivatedAt: null, createdAt: now, updatedAt: now };
        state.contacts.push(row);
        addAudit(state, { action: 'contact.created', entityType: 'contact', entityId: row.id, after: { consultancyId, name, status: 'active' } });
        return { write: true, state, response: ok(201, 'Contact created.', { contact: contactDto(row) }) };
      });
    },
    updateContact(consultancyId, contactId, body = {}) {
      return commit(store(), (state) => {
        const row = state.contacts.find((item) => item.id === contactId && item.consultancyId === consultancyId);
        if (!row) return { write: false, state, response: fail(404, 'Contact not found for this consultancy.', 'not_found') };
        const before = { name: row.name, status: row.status, phone: row.phone };
        try {
          if (Object.prototype.hasOwnProperty.call(body, 'name')) row.name = text(body.name, 'Name', 2, 200);
          if (Object.prototype.hasOwnProperty.call(body, 'phone')) row.phone = body.phone ? normalizeIndianMobile(body.phone) : null;
          if (Object.prototype.hasOwnProperty.call(body, 'email')) row.email = String(body.email || '').trim();
          if (Object.prototype.hasOwnProperty.call(body, 'role')) row.role = String(body.role || '').trim().slice(0, 80);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        if (Object.prototype.hasOwnProperty.call(body, 'status')) {
          row.status = body.status === 'inactive' ? 'inactive' : 'active';
          row.deactivatedAt = row.status === 'inactive' ? (row.deactivatedAt || new Date().toISOString()) : null;
        }
        if (!row.phone && !row.email) {
          return { write: false, state, response: fail(400, 'A contact needs a mobile number or an email address.', 'invalid_body') };
        }
        if (row.status === 'active' && row.phone && state.contacts.some((item) => item.id !== row.id && item.consultancyId === consultancyId && item.status === 'active' && item.phone === row.phone)) {
          return { write: false, state, response: fail(409, 'This consultancy already has an active contact with that mobile number.', 'duplicate_contact') };
        }
        row.updatedAt = new Date().toISOString();
        addAudit(state, {
          action: row.status === 'inactive' && before.status === 'active' ? 'contact.deactivated' : 'contact.updated',
          entityType: 'contact',
          entityId: row.id,
          before,
          after: { name: row.name, status: row.status },
        });
        return { write: true, state, response: ok(200, 'Contact updated.', { contact: contactDto(row) }) };
      });
    },
    deactivateContact(consultancyId, contactId) {
      return commit(store(), (state) => {
        const row = state.contacts.find((item) => item.id === contactId && item.consultancyId === consultancyId);
        if (!row) return { write: false, state, response: fail(404, 'Contact not found for this consultancy.', 'not_found') };
        if (row.status === 'inactive') {
          return { write: false, state, response: ok(200, 'Contact is already inactive.', { contact: contactDto(row) }) };
        }
        return { write: false, state, response: null };
      }) || this.updateContact(consultancyId, contactId, { status: 'inactive' });
    },
    listStudents(query = {}) {
      return commit(store(), (state) => {
        const q = String(query.q || '').trim().toLowerCase();
        const digits = q.replace(/\D/g, '');
        const rows = state.students
          .filter((row) => {
            if (query.admissionStatus && (ADMISSION_STATUSES.includes(row.admissionStatus) ? row.admissionStatus : 'Not started') !== query.admissionStatus) return false;
            if (query.consultancyId && !state.referrals.some((item) => item.crmStudentId === row.id && item.consultancyId === query.consultancyId)) return false;
            if (!q) return true;
            const name = asText(row.fullName).toLowerCase();
            const phone = asText(row.phone);
            if (name.includes(q)) return true;
            if (digits && phone.includes(digits)) return true;
            return phone.includes(q);
          })
          .sort((a, b) => asText(a.fullName).localeCompare(asText(b.fullName)));
        return { write: false, state, response: slicePage(rows.map(studentDto), query) };
      });
    },
    createStudent(body = {}) {
      return commit(store(), (state) => {
        let fullName;
        let phone;
        try {
          fullName = text(body.fullName, 'Name', 2, 160);
          phone = normalizeIndianMobile(body.phone);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        const existing = state.students.find((row) => row.phone === phone);
        if (existing) {
          return {
            write: false,
            state,
            response: fail(409, 'A student with this mobile number already exists. No duplicate was created.', 'duplicate_student', { student: studentDto(existing) }),
          };
        }
        if (!body.consultancyId) {
          return { write: false, state, response: fail(400, 'Choose an active consultancy. A student cannot be saved without a referral.', 'consultancy_required') };
        }
        const consultancy = state.consultancies.find((row) => row.id === body.consultancyId);
        if (!consultancy) return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        if (consultancy.status !== 'active') {
          return { write: false, state, response: fail(409, 'Referrals can only be recorded for an active consultancy.', 'consultancy_not_eligible') };
        }
        let admissionStatus;
        try {
          admissionStatus = admissionStatusOf(body.admissionStatus);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        let contact = null;
        if (body.consultancyContactId) {
          contact = state.contacts.find((row) => row.id === body.consultancyContactId && row.consultancyId === consultancy.id && row.status === 'active');
          if (!contact) return { write: false, state, response: fail(404, 'Contact not found for this consultancy.', 'not_found') };
        }
        const now = new Date().toISOString();
        const row = {
          id: nextId(state, 'st'),
          fullName,
          phone,
          email: String(body.email || '').trim(),
          city: String(body.city || '').trim().slice(0, 80),
          notes: String(body.notes || '').trim().slice(0, 2000),
          admissionStatus,
          createdAt: now,
          updatedAt: now,
        };
        const referral = {
          id: nextId(state, 'ref'),
          crmStudentId: row.id,
          studentName: row.fullName,
          consultancyId: consultancy.id,
          consultancyName: consultancy.name,
          consultancyContactId: contact ? contact.id : null,
          contactName: contact ? contact.name : '',
          originalConsultancyId: consultancy.id,
          originalConsultancyName: consultancy.name,
          createdAt: now,
          updatedAt: now,
          sourceCorrectedAt: null,
          sourceCorrectedBy: null,
        };
        state.students.push(row);
        state.referrals.push(referral);
        addAudit(state, { action: 'student.created', entityType: 'student', entityId: row.id, after: { fullName, phone, admissionStatus } });
        addAudit(state, {
          action: 'referral.created',
          entityType: 'referral',
          entityId: referral.id,
          after: { consultancyId: consultancy.id, consultancyName: consultancy.name, originalConsultancyId: consultancy.id, crmStudentId: row.id },
        });
        return { write: true, state, response: ok(201, 'Student created.', { student: studentDto(row), referral: referralDto(referral) }) };
      });
    },
    getStudent(id) {
      return commit(store(), (state) => {
        const row = state.students.find((item) => item.id === id);
        if (!row) return { write: false, state, response: fail(404, 'Student not found.', 'not_found') };
        return { write: false, state, response: ok(200, '', { student: studentDto(row) }) };
      });
    },
    updateStudent(id, body = {}) {
      return commit(store(), (state) => {
        const row = state.students.find((item) => item.id === id);
        if (!row) return { write: false, state, response: fail(404, 'Student not found.', 'not_found') };
        const before = { fullName: row.fullName, phone: row.phone, city: row.city, admissionStatus: row.admissionStatus || 'Not started' };
        const allowed = ['fullName', 'phone', 'email', 'city', 'notes', 'admissionStatus'];
        if (!allowed.some((key) => Object.prototype.hasOwnProperty.call(body, key))) {
          return { write: false, state, response: fail(400, 'No updatable fields were provided.', 'empty_update') };
        }
        try {
          if (Object.prototype.hasOwnProperty.call(body, 'fullName')) row.fullName = text(body.fullName, 'Name', 2, 160);
          if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
            const phone = normalizeIndianMobile(body.phone);
            const other = state.students.find((item) => item.phone === phone && item.id !== row.id);
            if (other) {
              return { write: false, state, response: fail(409, 'A student with this mobile number already exists. No duplicate was created.', 'duplicate_student', { student: studentDto(other) }) };
            }
            row.phone = phone;
          }
          if (Object.prototype.hasOwnProperty.call(body, 'email')) row.email = String(body.email || '').trim();
          if (Object.prototype.hasOwnProperty.call(body, 'city')) row.city = String(body.city || '').trim().slice(0, 80);
          if (Object.prototype.hasOwnProperty.call(body, 'notes')) row.notes = String(body.notes || '').trim().slice(0, 2000);
          if (Object.prototype.hasOwnProperty.call(body, 'admissionStatus')) row.admissionStatus = admissionStatusOf(body.admissionStatus);
        } catch (error) {
          return { write: false, state, response: fail(400, error.message, error.code || 'invalid_body') };
        }
        const referral = state.referrals.find((item) => item.crmStudentId === row.id);
        if (referral) referral.studentName = row.fullName;
        row.updatedAt = new Date().toISOString();
        addAudit(state, { action: 'student.updated', entityType: 'student', entityId: row.id, before, after: { fullName: row.fullName, phone: row.phone, city: row.city, admissionStatus: row.admissionStatus } });
        return { write: true, state, response: ok(200, 'Student updated.', { student: studentDto(row) }) };
      });
    },
    getStudentReferral(studentId) {
      return commit(store(), (state) => {
        if (!state.students.some((row) => row.id === studentId)) {
          return { write: false, state, response: fail(404, 'Student not found.', 'not_found') };
        }
        const referral = state.referrals.find((row) => row.crmStudentId === studentId) || null;
        return { write: false, state, response: ok(200, '', { referral: referral ? referralDto(referral) : null }) };
      });
    },
    listReferrals(query = {}) {
      return commit(store(), (state) => {
        let rows = state.referrals;
        if (query.consultancyId) rows = rows.filter((row) => row.consultancyId === query.consultancyId);
        if (query.studentId) rows = rows.filter((row) => row.crmStudentId === query.studentId);
        rows = [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return { write: false, state, response: slicePage(rows.map(referralDto), query) };
      });
    },
    createReferral(body = {}) {
      return commit(store(), (state) => {
        const student = state.students.find((row) => row.id === body.crmStudentId);
        if (!student) return { write: false, state, response: fail(404, 'Student not found.', 'not_found') };
        const consultancy = state.consultancies.find((row) => row.id === body.consultancyId);
        if (!consultancy) return { write: false, state, response: fail(404, 'Consultancy not found.', 'not_found') };
        if (consultancy.status !== 'active') {
          return { write: false, state, response: fail(409, 'Referrals can only be recorded for an active consultancy.', 'consultancy_not_eligible') };
        }
        const existing = state.referrals.find((row) => row.crmStudentId === student.id);
        if (existing) {
          return {
            write: false,
            state,
            response: fail(409, 'This student already has an original consultancy attribution. The source was not changed.', 'referral_exists', { referral: referralDto(existing) }),
          };
        }
        let contact = null;
        if (body.consultancyContactId) {
          contact = state.contacts.find((row) => row.id === body.consultancyContactId && row.consultancyId === consultancy.id && row.status === 'active');
          if (!contact) return { write: false, state, response: fail(404, 'Contact not found for this consultancy.', 'not_found') };
        }
        const now = new Date().toISOString();
        const row = {
          id: nextId(state, 'ref'),
          crmStudentId: student.id,
          studentName: student.fullName,
          consultancyId: consultancy.id,
          consultancyName: consultancy.name,
          consultancyContactId: contact ? contact.id : null,
          contactName: contact ? contact.name : '',
          originalConsultancyId: consultancy.id,
          originalConsultancyName: consultancy.name,
          createdAt: now,
          updatedAt: now,
          sourceCorrectedAt: null,
          sourceCorrectedBy: null,
        };
        state.referrals.push(row);
        addAudit(state, {
          action: 'referral.created',
          entityType: 'referral',
          entityId: row.id,
          after: { consultancyId: consultancy.id, consultancyName: consultancy.name, originalConsultancyId: consultancy.id },
        });
        return { write: true, state, response: ok(201, 'Referral recorded.', { referral: referralDto(row) }) };
      });
    },
    correctReferralSource(referralId, body = {}) {
      return commit(store(), (state) => {
        if (!state.demoManager) {
          return {
            write: false,
            state,
            response: fail(403, 'Demo manager mode is off. Turning it on only simulates a manager in this browser. It is not authorization.', 'demo_manager_required'),
          };
        }
        const reason = String(body.reason || '').trim();
        if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
          return { write: false, state, response: fail(400, `A reason of ${REASON_MIN}–${REASON_MAX} characters is required.`, 'reason_required') };
        }
        const referral = state.referrals.find((row) => row.id === referralId);
        if (!referral) return { write: false, state, response: fail(404, 'Referral not found.', 'not_found') };
        const consultancy = state.consultancies.find((row) => row.id === body.consultancyId);
        if (!consultancy || consultancy.status !== 'active') {
          return { write: false, state, response: fail(409, 'Choose an active consultancy.', 'consultancy_not_eligible') };
        }
        if (referral.consultancyId === consultancy.id) {
          return { write: false, state, response: fail(400, 'The referral already uses this consultancy. The source was not changed.', 'source_unchanged') };
        }
        let contact = null;
        if (body.consultancyContactId) {
          contact = state.contacts.find((row) => row.id === body.consultancyContactId && row.consultancyId === consultancy.id && row.status === 'active');
          if (!contact) return { write: false, state, response: fail(404, 'Contact not found for this consultancy.', 'not_found') };
        }
        const before = {
          consultancyId: referral.consultancyId,
          consultancyName: referral.consultancyName,
          originalConsultancyId: referral.originalConsultancyId,
          originalConsultancyName: referral.originalConsultancyName,
        };
        const now = new Date().toISOString();
        referral.consultancyId = consultancy.id;
        referral.consultancyName = consultancy.name;
        referral.consultancyContactId = contact ? contact.id : null;
        referral.contactName = contact ? contact.name : '';
        referral.sourceCorrectedAt = now;
        referral.sourceCorrectedBy = 'Demo manager';
        referral.updatedAt = now;
        addAudit(state, {
          action: 'referral.source_corrected',
          entityType: 'referral',
          entityId: referral.id,
          actorLabel: 'Demo manager',
          reason,
          before,
          after: {
            consultancyId: referral.consultancyId,
            consultancyName: referral.consultancyName,
            originalConsultancyId: referral.originalConsultancyId,
            originalConsultancyName: referral.originalConsultancyName,
          },
        });
        return { write: true, state, response: ok(200, 'Referral source corrected in this browser only.', { referral: referralDto(referral) }) };
      });
    },
    listAudits(query = {}) {
      return commit(store(), (state) => {
        const rows = [...state.audits].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return { write: false, state, response: slicePage(rows, query) };
      });
    },
    setDemoManager(enabled) {
      return commit(store(), (state) => {
        const before = state.demoManager;
        const after = enabled === true;
        if (before === after) {
          return { write: false, state, response: ok(200, after ? 'Demo manager mode is already on.' : 'Demo manager mode is already off.', { demoManager: after }) };
        }
        state.demoManager = after;
        addAudit(state, {
          action: 'demo_manager.simulated',
          entityType: 'settings',
          entityId: 'demo-manager',
          actorLabel: 'Demo settings',
          before: { demoManager: before },
          after: { demoManager: after },
          reason: 'Simulated in this browser. This does not grant server access.',
        });
        return { write: true, state, response: ok(200, after ? 'Demo manager mode is on for this browser only.' : 'Demo manager mode is off.', { demoManager: after }) };
      });
    },
    resetDemoData() {
      const state = createSeedState();
      const written = writeState(store(), state);
      if (written.error) return written.error;
      return ok(200, 'Demo data was reset to the fictional starter set.', { counts: counts(state) });
    },
  };
}

export function createMemoryStorage(initial) {
  const data = new Map();
  if (initial) {
    Object.entries(initial).forEach(([key, value]) => data.set(key, value));
  }
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    keys() {
      return [...data.keys()];
    },
  };
}

export const browserCrmDemo = createCrmDemoRepository();
