import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { getStoredToken } from '../utils/adminApi';
import { notifyAdminUnauthorized } from '../utils/authSession';
import { buildLeadInsightsQuery, normalizeLeadInsightsResponse } from './leadInsightsApiUtils';

export { buildLeadInsightsQuery, normalizeLeadInsightsResponse };

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function leadInsightsRequest(path, options = {}, token = getStoredToken()) {
  const url = `${getApiBaseUrl()}/admin/lead-insights${path}`;
  const headers = { ...(options.headers || {}) };
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json; charset=utf-8';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    return { success: false, message: err?.message || 'Network error', status: 0, data: {} };
  }

  const body = await parseJsonSafe(res);
  if (!res.ok) {
    if (res.status === 401) notifyAdminUnauthorized({ endpoint: path, status: 401 });
    return {
      success: false,
      message: body.message || 'Request failed',
      status: res.status,
      data: body,
    };
  }

  return {
    success: true,
    data: body.data ?? body,
    status: res.status,
  };
}

export const getLeadStats = () => leadInsightsRequest('/stats');

export const getLeadActivity = ({ year, month } = {}) => {
  const query = buildLeadInsightsQuery({ year, month });
  return leadInsightsRequest(`/activity${query}`);
};

export const getHotLeads = () => leadInsightsRequest('/hot');

export const listLeads = (params = {}) =>
  leadInsightsRequest(buildLeadInsightsQuery(params));

export const getLeadDetails = (phone) =>
  leadInsightsRequest(`/${encodeURIComponent(String(phone || '').trim())}`);

export const getLeadTranscript = (phone, params = {}) => {
  const query = buildLeadInsightsQuery(params);
  return leadInsightsRequest(
    `/${encodeURIComponent(String(phone || '').trim())}/transcript${query}`
  );
};
