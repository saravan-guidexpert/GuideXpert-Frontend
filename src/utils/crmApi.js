import { getStoredToken } from './adminApi';
import { notifyAdminUnauthorized } from './authSession';
import { getApiBaseUrl } from './apiBaseUrl';

async function crmRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}/admin/crm${path}`, {
      ...options,
      headers,
    });
  } catch {
    return {
      success: false,
      status: 0,
      code: 'network',
      message: 'Cannot reach the server.',
      data: null,
    };
  }

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status === 401) {
    notifyAdminUnauthorized({ endpoint: path, status: 401 });
  }
  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      code: body.code || null,
      message: body.message || 'Request failed',
      data: body.data ?? null,
    };
  }
  return {
    success: true,
    status: response.status,
    code: body.code || null,
    message: body.message || '',
    data: body.data ?? null,
  };
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  return search.toString();
}

export function listConsultancies(params) {
  return crmRequest(`/consultancies?${queryString(params)}`);
}

export function createConsultancy(body) {
  return crmRequest('/consultancies', { method: 'POST', body: JSON.stringify(body) });
}

export function getConsultancy(id) {
  return crmRequest(`/consultancies/${id}`);
}

export function updateConsultancy(id, body) {
  return crmRequest(`/consultancies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function listContacts(consultancyId, params) {
  return crmRequest(`/consultancies/${consultancyId}/contacts?${queryString(params)}`);
}

export function createContact(consultancyId, body) {
  return crmRequest(`/consultancies/${consultancyId}/contacts`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateContact(consultancyId, contactId, body) {
  return crmRequest(`/consultancies/${consultancyId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deactivateContact(consultancyId, contactId) {
  return crmRequest(`/consultancies/${consultancyId}/contacts/${contactId}`, { method: 'DELETE' });
}

export function listStudents(params) {
  return crmRequest(`/students?${queryString(params)}`);
}

export function createStudent(body) {
  return crmRequest('/students', { method: 'POST', body: JSON.stringify(body) });
}

export function getStudent(id) {
  return crmRequest(`/students/${id}`);
}

export function updateStudent(id, body) {
  return crmRequest(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function getStudentReferral(id) {
  return crmRequest(`/students/${id}/referral`);
}

export function listReferrals(params) {
  return crmRequest(`/referrals?${queryString(params)}`);
}

export function getCrmAnalytics(params) {
  return crmRequest(`/analytics?${queryString(params)}`);
}

export function getCrmCalendar(params) {
  return crmRequest(`/calendar?${queryString(params)}`);
}

export function createReferral(body) {
  return crmRequest('/referrals', { method: 'POST', body: JSON.stringify(body) });
}

export function correctReferralSource(referralId, body) {
  return crmRequest(`/referrals/${referralId}/source-correction`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getCrmOperations(params) {
  return crmRequest(`/operations?${queryString(params)}`);
}

export function getConsultancyOverview(params) {
  return crmRequest(`/consultancies/overview?${queryString(params)}`);
}

export function listCrmActivity(params) {
  return crmRequest(`/activity?${queryString(params)}`);
}

export function getCrmActivity(source, id) {
  return crmRequest(`/activity/${source}/${id}`);
}

export function getCrmActivitySummary(params) {
  return crmRequest(`/activity/summary?${queryString(params)}`);
}
