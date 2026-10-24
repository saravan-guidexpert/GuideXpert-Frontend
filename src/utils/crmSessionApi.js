import { getApiBaseUrl } from './apiBaseUrl';

const CSRF_COOKIE = 'gx_crm_csrf';
let memoryCsrf = '';

export function rememberCrmCsrf(token) {
  memoryCsrf = token || '';
}

export function readCrmCsrfCookie() {
  if (typeof document === 'undefined' || !document.cookie) return '';
  const row = document.cookie.split('; ').find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  if (!row) return '';
  try {
    return decodeURIComponent(row.slice(CSRF_COOKIE.length + 1));
  } catch {
    return '';
  }
}

export function currentCrmCsrf() {
  return memoryCsrf || readCrmCsrfCookie();
}

async function crmFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers || {}),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = currentCrmCsrf();
    if (csrf) headers['x-crm-csrf'] = csrf;
  }
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
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
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function crmLogin(body) {
  return crmFetch('/crm-auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export function crmLogout() {
  return crmFetch('/crm-auth/logout', { method: 'POST', body: '{}' });
}

export function crmMe() {
  return crmFetch('/crm-auth/me');
}

export function crmResetPassword(body) {
  return crmFetch('/crm-auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
}

export function crmPortalGet(path, params) {
  return crmFetch(`/crm${path}${queryString(params)}`);
}

export function crmPortalSend(path, method, body) {
  return crmFetch(`/crm${path}`, { method, body: JSON.stringify(body || {}) });
}
