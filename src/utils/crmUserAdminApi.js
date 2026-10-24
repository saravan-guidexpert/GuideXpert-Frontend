import { getStoredToken } from './adminApi';
import { notifyAdminUnauthorized } from './authSession';
import { getApiBaseUrl } from './apiBaseUrl';

async function adminCrmUsers(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}/admin/crm-users${path}`, {
      ...options,
      headers,
    });
  } catch {
    return { success: false, status: 0, code: 'network', message: 'Cannot reach the server.', data: null };
  }
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status === 401) notifyAdminUnauthorized({ endpoint: path, status: 401 });
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
    code: null,
    message: body.message || '',
    data: body.data ?? null,
  };
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function fetchCrmUserSummary() {
  return adminCrmUsers('/summary');
}

export function fetchCrmUsers(params) {
  return adminCrmUsers(`/${queryString(params)}`);
}

export function fetchCrmUser(id) {
  return adminCrmUsers(`/${id}`);
}

export function fetchCrmUserAudit(id, params) {
  return adminCrmUsers(`/${id}/audit${queryString(params)}`);
}

export function createCrmUser(body) {
  return adminCrmUsers('', { method: 'POST', body: JSON.stringify(body) });
}

export function updateCrmUser(id, body) {
  return adminCrmUsers(`/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function activateCrmUser(id, reason) {
  return adminCrmUsers(`/${id}/activate`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export function deactivateCrmUser(id, reason) {
  return adminCrmUsers(`/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export function resetCrmUserPassword(id, body) {
  return adminCrmUsers(`/${id}/reset-password`, { method: 'POST', body: JSON.stringify(body) });
}
