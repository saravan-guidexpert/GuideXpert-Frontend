function unsupported(feature) {
  return Promise.resolve(fail(409, `${feature} is not stored for signed-in CRM records yet. Nothing was saved.`, 'not_stored'));
}

function ok(status, message, data) {
  return { success: true, status, code: null, message, data };
}

function fail(status, message, code, data = null) {
  return { success: false, status, code, message, data };
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

function emptyCache() {
  return { ready: false, error: null, consultancies: [], contacts: [], students: [], referrals: [], audits: [] };
}

async function readPages(request, path, params) {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= 50) {
    const result = await request('GET', path, { ...(params || {}), page, limit: 100 });
    if (!result || result.success !== true) return result || fail(0, 'Cannot reach the server.', 'network');
    const batch = Array.isArray(result.data?.items) ? result.data.items : [];
    total = Number(result.data?.total);
    if (!Number.isFinite(total)) total = batch.length;
    items.push(...batch);
    if (batch.length === 0) break;
    page += 1;
  }
  return ok(200, '', { items });
}

function presentConsultancy(row, contacts, referrals) {
  const related = contacts.filter((item) => item.consultancyId === row.id);
  const contact = related.find((item) => item.status === 'active') || related[0] || null;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    notes: row.notes || '',
    primaryContact: contact ? { id: contact.id, name: contact.name, phone: contact.phone || '', email: contact.email || '' } : null,
    studentCount: referrals.filter((item) => item.consultancyId === row.id).length,
    originalStudentCount: referrals.filter((item) => item.originalConsultancyId === row.id).length,
    createdById: row.createdBy || null,
    createdByName: '',
    ownerId: null,
    ownerName: '',
    followUpStatus: '',
    callingStatus: '',
    pipelineStored: false,
    lastContactAt: null,
    nextFollowUpAt: null,
    latestRemark: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function presentAudit(row, user) {
  let actorLabel = 'CRM user';
  if (row.actorCrmUserId && user && row.actorCrmUserId === user.id) actorLabel = user.fullName || 'CRM user';
  else if (row.actorAdminId) actorLabel = 'Platform admin';
  return { ...row, actorLabel };
}

export function createCrmApiRepository({ request, user = null, canCorrectReferral = false } = {}) {
  if (typeof request !== 'function') throw new Error('CRM API client requires a request function.');
  let cache = emptyCache();
  let actor = user;
  let allowCorrection = Boolean(canCorrectReferral);

  function consultancies() {
    return cache.consultancies.map((row) => presentConsultancy(row, cache.contacts, cache.referrals));
  }

  function requireReady() {
    if (cache.ready) return null;
    return fail(503, cache.error || 'CRM records are still loading.', cache.error ? 'load_failed' : 'loading');
  }

  async function mutate(path, method, body) {
    const result = await request(method, path, null, body);
    if (!result || result.success !== true) return result || fail(0, 'Cannot reach the server.', 'network');
    await reload();
    return result;
  }

  async function reload() {
    const [consultanciesResult, studentsResult, referralsResult, auditsResult] = await Promise.all([
      readPages(request, '/consultancies'),
      readPages(request, '/students'),
      readPages(request, '/referrals'),
      readPages(request, '/audits'),
    ]);
    const failed = [consultanciesResult, studentsResult, referralsResult, auditsResult].find((item) => !item || item.success !== true);
    if (failed) {
      cache = { ...emptyCache(), error: failed.message || 'CRM records could not be loaded.' };
      return fail(failed.status || 503, cache.error, failed.code || 'load_failed');
    }
    const contactLists = await Promise.all(consultanciesResult.data.items.map((row) => readPages(request, `/consultancies/${row.id}/contacts`)));
    const contactError = contactLists.find((item) => !item || item.success !== true);
    if (contactError) {
      cache = { ...emptyCache(), error: contactError.message || 'Consultancy contacts could not be loaded.' };
      return fail(contactError.status || 503, cache.error, contactError.code || 'load_failed');
    }
    cache = {
      ready: true,
      error: null,
      consultancies: consultanciesResult.data.items,
      students: studentsResult.data.items,
      referrals: referralsResult.data.items,
      audits: auditsResult.data.items.map((row) => presentAudit(row, actor)),
      contacts: contactLists.flatMap((item) => item.data.items),
    };
    return ok(200, '', { counts: counts() });
  }

  function counts() {
    const rows = consultancies();
    return {
      consultancies: rows.length,
      activeConsultancies: rows.filter((row) => row.status === 'active').length,
      students: cache.students.length,
      referrals: cache.referrals.length,
    };
  }

  return {
    storageKey: null,
    mode: 'api',
    setActor(next, options = {}) {
      actor = next || null;
      allowCorrection = Boolean(options.canCorrectReferral);
    },
    capabilities() {
      return {
        followUps: false,
        remarks: false,
        pipeline: false,
        calling: false,
        owner: false,
        demoTools: false,
        sourceCorrection: allowCorrection,
      };
    },
    reload,
    inspect() {
      const pending = requireReady();
      if (pending) return pending;
      return ok(200, '', { demoManager: false, demoRole: 'staff', counts: counts(), seeded: false, mode: 'api' });
    },
    overview() {
      const pending = requireReady();
      if (pending) return pending;
      return ok(200, '', { ...counts(), demoManager: false, demoRole: 'staff', recent: cache.audits.slice(0, 6) });
    },
    listConsultancies(query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      const q = String(query.q || '').trim().toLowerCase();
      let rows = consultancies();
      if (q) rows = rows.filter((row) => row.name.toLowerCase().includes(q));
      if (query.status) rows = rows.filter((row) => row.status === query.status);
      rows.sort((a, b) => a.name.localeCompare(b.name));
      return slicePage(rows, query);
    },
    async createConsultancy(body = {}) {
      const result = await mutate('/consultancies', 'POST', {
        name: body.name,
        status: body.status,
        notes: body.notes,
      });
      if (!result || result.success !== true) return result;
      return {
        ...result,
        message: 'Consultancy created. Pipeline status, calling status, remarks, follow-ups, and owner were not stored.',
      };
    },
    getConsultancy(id) {
      const pending = requireReady();
      if (pending) return pending;
      const row = consultancies().find((item) => item.id === id);
      if (!row) return fail(404, 'Consultancy not found.', 'not_found');
      return ok(200, '', { consultancy: row });
    },
    async updateConsultancy(id, body = {}) {
      const result = await mutate(`/consultancies/${id}`, 'PATCH', {
        name: body.name,
        status: body.status,
        notes: body.notes,
      });
      if (!result || result.success !== true) return result;
      const dropped = body.followUpStatus || body.callingStatus || body.ownerId || body.pipelineStage;
      return {
        ...result,
        message: dropped
          ? 'Name, record status, and notes were saved. Pipeline status, calling status, and owner were not stored.'
          : result.message,
      };
    },
    listContacts(consultancyId, query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      let rows = cache.contacts.filter((row) => row.consultancyId === consultancyId);
      if (query.status) rows = rows.filter((row) => row.status === query.status);
      return slicePage(rows, query);
    },
    createContact(consultancyId, body) {
      return mutate(`/consultancies/${consultancyId}/contacts`, 'POST', body);
    },
    updateContact(consultancyId, contactId, body) {
      return mutate(`/consultancies/${consultancyId}/contacts/${contactId}`, 'PATCH', body);
    },
    deactivateContact(consultancyId, contactId) {
      return mutate(`/consultancies/${consultancyId}/contacts/${contactId}`, 'DELETE', {});
    },
    listStudents(query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      const q = String(query.q || '').trim().toLowerCase();
      const rows = cache.students.filter((row) => !q || `${row.fullName} ${row.phone}`.toLowerCase().includes(q));
      return slicePage(rows, query);
    },
    createStudent(body) {
      return mutate('/students', 'POST', body);
    },
    getStudent(id) {
      const pending = requireReady();
      if (pending) return pending;
      const row = cache.students.find((item) => item.id === id);
      if (!row) return fail(404, 'Student not found.', 'not_found');
      return ok(200, '', { student: row });
    },
    updateStudent(id, body) {
      return mutate(`/students/${id}`, 'PATCH', body);
    },
    getStudentReferral(studentId) {
      const pending = requireReady();
      if (pending) return pending;
      const referral = cache.referrals.find((row) => row.crmStudentId === studentId) || null;
      return ok(200, '', { referral });
    },
    listReferrals(query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      let rows = cache.referrals;
      if (query.consultancyId) rows = rows.filter((row) => row.consultancyId === query.consultancyId);
      if (query.studentId) rows = rows.filter((row) => row.crmStudentId === query.studentId);
      return slicePage(rows, query);
    },
    createReferral(body) {
      return mutate('/referrals', 'POST', body);
    },
    correctReferralSource(referralId, body) {
      return mutate(`/referrals/${referralId}/source-correction`, 'POST', body);
    },
    listAudits(query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      return slicePage(cache.audits, query);
    },
    listFollowUps(_consultancyId, query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      return slicePage([], query);
    },
    listRemarks(_consultancyId, query = {}) {
      const pending = requireReady();
      if (pending) return pending;
      return slicePage([], query);
    },
    setFollowUp() {
      return unsupported('Follow-ups, calling status, and consultancy pipeline');
    },
    addRemark() {
      return unsupported('Remarks');
    },
    editRemark() {
      return unsupported('Remarks');
    },
    cancelFollowUp() {
      return unsupported('Follow-ups');
    },
    reassignOwner() {
      return unsupported('Consultancy owner');
    },
    setDemoRole() {
      return Promise.resolve(fail(403, 'Signed-in access comes from the CRM account. The browser role switch does not change it.', 'not_stored'));
    },
    setDemoManager() {
      return Promise.resolve(fail(403, 'Source correction follows the CRM account permission. The browser manager switch does not change it.', 'not_stored'));
    },
    resetDemoData() {
      return Promise.resolve(fail(403, 'Resetting the browser demo does not change signed-in CRM records.', 'not_stored'));
    },
    loadVolumeData() {
      return Promise.resolve(fail(403, 'Sample demo records stay in this browser. They were not copied to the server.', 'not_stored'));
    },
  };
}
