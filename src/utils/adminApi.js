import { notifyAdminUnauthorized } from './authSession';
import { getApiBaseUrl } from './apiBaseUrl';

const ADMIN_TOKEN_KEY = 'guidexpert_admin_token';

/** Base URL used for admin API (e.g. to show on login page in dev). */
export function getAdminApiBaseUrl() {
  return getApiBaseUrl();
}

export function getStoredToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminRequest(endpoint, options = {}, token = getStoredToken()) {
  const url = `${getApiBaseUrl()}/admin${endpoint}`;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = { ...options, headers };

  try {
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Invalid response' };
    }
    if (!response.ok) {
      if (response.status === 401) {
        notifyAdminUnauthorized({ endpoint, status: 401 });
      }
      const fallbackMessage =
        response.status === 405
          ? 'API route blocked (405). Redeploy the frontend with /api proxy rules or set VITE_API_URL to the backend /api URL.'
          : 'Request failed';
      return {
        success: false,
        message: data.message || fallbackMessage,
        status: response.status,
        data,
      };
    }
    return { success: true, data, status: response.status };
  } catch (error) {
    const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';
    const message = isNetworkError
      ? `Cannot reach server. Check API URL (${getApiBaseUrl()}) and network connectivity.`
      : (error.message || 'Network error');
    return {
      success: false,
      message,
      status: 0,
      error,
    };
  }
}


export const adminLoginWithPhone = async (phone, token = getStoredToken()) => {
  return adminRequest('/login-with-phone', {
    method: 'POST',
    body: JSON.stringify({ phone: String(phone ?? '').replace(/\D/g, '').slice(-10) }),
  }, null);
};

export const adminLogin = async (username, password) => {
  return adminRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, null);
};

/** GET /admin/admins — list admins (super admin only). Returns { success, data: admins[] }. */
export const listAdmins = async (token = getStoredToken()) => {
  return adminRequest('/admins', { method: 'GET' }, token);
};

/** POST /admin/admins — create admin (super admin only). Payload: { username, password, name?, isSuperAdmin?, sectionAccess? }. */
export const createAdmin = async (payload, token = getStoredToken()) => {
  return adminRequest('/admins', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
};

/** PATCH /admin/admins/:id — update role and section access (super admin only). */
export const updateAdmin = async (id, payload, token = getStoredToken()) => {
  return adminRequest(`/admins/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
};

/** DELETE /admin/admins/:id — remove admin (super admin only). Cannot delete self. */
export const deleteAdmin = async (id, token = getStoredToken()) => {
  return adminRequest(`/admins/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

/** PATCH /admin/admins/:id/password — reset another admin's password (super admin only). Payload: { newPassword }. */
export const resetAdminPassword = async (id, payload, token = getStoredToken()) => {
  return adminRequest(`/admins/${encodeURIComponent(id)}/password`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
};

/** PATCH /admin/me/password — change own password. Payload: { currentPassword, newPassword }. */
export const changeMyPassword = async (payload, token = getStoredToken()) => {
  return adminRequest('/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
};

export const getAdminLeads = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.firstJoinedFrom) search.set('firstJoinedFrom', params.firstJoinedFrom);
  else if (params.from) search.set('from', params.from);
  if (params.firstJoinedTo) search.set('firstJoinedTo', params.firstJoinedTo);
  else if (params.to) search.set('to', params.to);
  if (params.applicationStatus) search.set('applicationStatus', params.applicationStatus);
  if (params.otpVerified !== undefined && params.otpVerified !== '') search.set('otpVerified', String(params.otpVerified));
  if (params.slotBooked !== undefined && params.slotBooked !== '') search.set('slotBooked', String(params.slotBooked));
  if (params.demoAttended !== undefined && params.demoAttended !== '') search.set('demoAttended', String(params.demoAttended));
  if (params.trainingFormFilled !== undefined && params.trainingFormFilled !== '') {
    search.set('trainingFormFilled', String(params.trainingFormFilled));
  }
  if (params.assessmentWritten === true || params.assessmentWritten === 'true') search.set('assessmentWritten', 'true');
  if (params.activationCompleted === true || params.activationCompleted === 'true') search.set('activationCompleted', 'true');
  if (params.selectedSlot) search.set('selectedSlot', params.selectedSlot);
  if (params.slotDate && typeof params.slotDate === 'string' && params.slotDate.trim()) search.set('slotDate', params.slotDate);
  if (params.q) search.set('q', params.q);
  if (params.utm_content) search.set('utm_content', params.utm_content);
  if (params.activityType) search.set('activityType', params.activityType);
  search.set('_t', String(Date.now()));
  const query = search.toString();
  return adminRequest(`/leads?${query}`, { method: 'GET' }, token);
};

export const getAdminStats = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return adminRequest(`/stats${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getCertifiedCounsellors = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.q && String(params.q).trim()) search.set('q', String(params.q).trim());
  const query = search.toString();
  return adminRequest(`/certified-counsellors${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getCertifiedCounsellorDetail = async (id, token = getStoredToken()) => {
  return adminRequest(`/certified-counsellors/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

export const getLead = async (id, token = getStoredToken()) => {
  return adminRequest(`/leads/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/**
 * IIT counselling list. Only sends `page`, `limit`, `q` — many deployments error or return non-JSON
 * for extra query keys (date/slot/demo filters). Filter those client-side in the admin UI instead.
 */
export const getIitCounsellingSubmissions = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.q && String(params.q).trim()) search.set('q', String(params.q).trim());
  const query = search.toString();
  return adminRequest(`/iit-counselling${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getAllIitCounsellingSubmissionsPaginated = async (params = {}, token = getStoredToken()) => {
  const limit = params.limit != null ? Number(params.limit) : 200;
  let page = 1;
  let totalPages = 1;
  const allRows = [];
  /** Guard against bad pagination metadata hanging the admin UI. */
  const maxIterations = Math.min(1000, Math.max(1, Number(params.maxPages) || 1000));
  let iterations = 0;

  while (page <= totalPages) {
    iterations += 1;
    if (iterations > maxIterations) {
      return {
        success: false,
        message: `Stopped loading IIT submissions after ${maxIterations} pages (pagination may be inconsistent). Try narrowing search.`,
        data: { data: allRows, pagination: { total: allRows.length, page: 1, totalPages: 1, limit } },
      };
    }
    const res = await getIitCounsellingSubmissions({ ...params, page, limit }, token);
    if (!res.success) return res;
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    allRows.push(...rows);
    totalPages = Number(res.data?.pagination?.totalPages) || 1;
    page += 1;
  }

  return {
    success: true,
    data: {
      data: allRows,
      pagination: {
        total: allRows.length,
        page: 1,
        totalPages: 1,
        limit,
      },
    },
  };
};

export const getIitCounsellingSubmission = async (id, token = getStoredToken()) => {
  return adminRequest(`/iit-counselling/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

export const getIitCounsellingVisitAnalytics = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.fromDate && String(params.fromDate).trim()) search.set('fromDate', String(params.fromDate).trim());
  if (params.toDate && String(params.toDate).trim()) search.set('toDate', String(params.toDate).trim());
  if (params.fromTime && String(params.fromTime).trim()) search.set('fromTime', String(params.fromTime).trim());
  if (params.toTime && String(params.toTime).trim()) search.set('toTime', String(params.toTime).trim());
  if (params.granularity && String(params.granularity).trim()) search.set('granularity', String(params.granularity).trim());
  if (params.linkTarget && String(params.linkTarget).trim()) search.set('linkTarget', String(params.linkTarget).trim());
  const query = search.toString();
  return adminRequest(`/iit-counselling/visits${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitCounsellingUtmAnalytics = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.fromDate && String(params.fromDate).trim()) search.set('fromDate', String(params.fromDate).trim());
  if (params.toDate && String(params.toDate).trim()) search.set('toDate', String(params.toDate).trim());
  if (params.fromTime && String(params.fromTime).trim()) search.set('fromTime', String(params.fromTime).trim());
  if (params.toTime && String(params.toTime).trim()) search.set('toTime', String(params.toTime).trim());
  if (params.linkTarget && String(params.linkTarget).trim()) search.set('linkTarget', String(params.linkTarget).trim());
  const query = search.toString();
  return adminRequest(`/iit-counselling/utm-analytics${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** Saved IIT counselling UTM links (separate DB collection from influencer /register links). */
const IIT_SAVED_UTM_BASE = '/iit-counselling/saved-utm-links';

export const getIitCounsellingSavedUtmLinks = async (token = getStoredToken(), params = {}) => {
  const search = new URLSearchParams();
  if (params.linkTarget) search.set('linkTarget', params.linkTarget);
  const query = search.toString();
  const path = query ? `${IIT_SAVED_UTM_BASE}?${query}` : IIT_SAVED_UTM_BASE;
  return adminRequest(path, { method: 'GET' }, token);
};

export const createIitCounsellingSavedUtmLink = async (payload, token = getStoredToken()) => {
  return adminRequest(`${IIT_SAVED_UTM_BASE}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
};

export const deleteIitCounsellingSavedUtmLink = async (id, token = getStoredToken()) => {
  return adminRequest(`${IIT_SAVED_UTM_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

/** Saved registration UTM links from Admin → Analytics only (separate Mongo collection from influencer tracking). */
const SALES_ANALYTICS_SAVED_UTM_BASE = '/sales-analytics-saved-utm-links';

export const getSalesAnalyticsSavedUtmLinks = async (token = getStoredToken()) => {
  return adminRequest(SALES_ANALYTICS_SAVED_UTM_BASE, { method: 'GET' }, token);
};

export const createSalesAnalyticsSavedUtmLink = async (payload, token = getStoredToken()) => {
  return adminRequest(SALES_ANALYTICS_SAVED_UTM_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
};

export const deleteSalesAnalyticsSavedUtmLink = async (id, token = getStoredToken()) => {
  return adminRequest(`${SALES_ANALYTICS_SAVED_UTM_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

export const updateLeadNotes = async (id, adminNotes, token = getStoredToken()) => {
  return adminRequest(`/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ adminNotes: adminNotes ?? '' }),
  }, token);
};

/**
 * Partial update for a lead. Payload may include adminNotes, leadStatus, leadDescription.
 */
export const updateLead = async (id, payload, token = getStoredToken()) => {
  const body = {};
  if (payload.adminNotes !== undefined) body.adminNotes = payload.adminNotes ?? '';
  if (payload.leadStatus !== undefined) body.leadStatus = payload.leadStatus ?? '';
  if (payload.leadDescription !== undefined) body.leadDescription = payload.leadDescription ?? '';
  return adminRequest(`/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, token);
};

/** PATCH /admin/leads/:id/slot — body: { slotDate: "YYYY-MM-DD", selectedSlot: "MONDAY_7PM" } */
export const updateLeadSlotBooking = async (id, payload, token = getStoredToken()) => {
  return adminRequest(`/leads/${encodeURIComponent(id)}/slot`, {
    method: 'PATCH',
    body: JSON.stringify({
      slotDate: payload?.slotDate,
      selectedSlot: payload?.selectedSlot,
    }),
  }, token);
};

export const getSlotConfigs = async (token = getStoredToken()) => {
  return adminRequest('/slots', { method: 'GET' }, token);
};

/** GET /admin/demo-meet-schedule — global IST windows for /meet join gate. */
export const getDemoMeetSchedule = async (token = getStoredToken()) => {
  return adminRequest('/demo-meet-schedule', { method: 'GET' }, token);
};

/** PUT /admin/demo-meet-schedule — body: { recurringWindows, joinEarlyMinutes } */
export const putDemoMeetSchedule = async (payload, token = getStoredToken()) => {
  return adminRequest('/demo-meet-schedule', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
};

/** GET /admin/slots/for-date?date=YYYY-MM-DD — slots available on that date. Returns data.slots or []. */
export const getSlotsForDate = async (date, token = getStoredToken()) => {
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return [];
  }
  const res = await adminRequest(`/slots/for-date?date=${encodeURIComponent(date.trim())}`, { method: 'GET' }, token);
  const slots = res?.data?.data?.slots || res?.data?.slots;
  if (!res.success || !Array.isArray(slots)) return [];
  return slots;
};

export const updateSlotConfig = async (slotId, enabled, token = getStoredToken()) => {
  return adminRequest(`/slots/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  }, token);
};

export const getIitSlotConfigs = async (token = getStoredToken()) => {
  return adminRequest('/iit-slots', { method: 'GET' }, token);
};

export const updateIitSlotConfig = async (slotId, enabled, token = getStoredToken()) => {
  return adminRequest(`/iit-slots/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  }, token);
};

/** GET /admin/iit-slots/overrides?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const getIitSlotOverrides = async (from, to, token = getStoredToken()) => {
  const params = new URLSearchParams({ from, to });
  return adminRequest(`/iit-slots/overrides?${params}`, { method: 'GET' }, token);
};

/** PUT /admin/iit-slots/overrides — body: { date, slotId, enabled } */
export const setIitSlotOverride = async (date, slotId, enabled, token = getStoredToken()) => {
  return adminRequest('/iit-slots/overrides', {
    method: 'PUT',
    body: JSON.stringify({ date, slotId, enabled }),
  }, token);
};

/** GET /admin/iit-slots/booking-counts?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const getIitSlotBookingCounts = async (from, to, token = getStoredToken()) => {
  const params = new URLSearchParams({ from, to });
  return adminRequest(`/iit-slots/booking-counts?${params}`, { method: 'GET' }, token);
};

/** GET /admin/slots/overrides?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const getSlotOverrides = async (from, to, token = getStoredToken()) => {
  const params = new URLSearchParams({ from, to });
  return adminRequest(`/slots/overrides?${params}`, { method: 'GET' }, token);
};

/** PUT /admin/slots/overrides — body: { date, slotId, enabled } */
export const setSlotOverride = async (date, slotId, enabled, token = getStoredToken()) => {
  return adminRequest('/slots/overrides', {
    method: 'PUT',
    body: JSON.stringify({ date, slotId, enabled }),
  }, token);
};

/** GET /admin/slots/booking-counts?from=YYYY-MM-DD&to=YYYY-MM-DD — per-date counts */
export const getSlotBookingCounts = async (from, to, token = getStoredToken()) => {
  const params = new URLSearchParams({ from, to });
  return adminRequest(`/slots/booking-counts?${params}`, { method: 'GET' }, token);
};

export const getMeetingAttendance = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  if (params.meetType === 'demo' || params.meetType === 'orientation') {
    search.set('meetType', params.meetType);
  }
  const query = search.toString();
  return adminRequest(`/meeting-attendance${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitMeetAttendance = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/iit-meet-attendance${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitMeetHindiAttendance = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/iit-meet-hindi-attendance${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitFirstFormSubmissions = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/iit-first-form-submissions${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitSecondFormSubmissions = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/iit-second-form-submissions${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getCollegeDostFormSubmissions = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return adminRequest(`/college-dost-form-submissions${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getCollegeDostMeetAttendance = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/college-dost-meet-attendance${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getTrainingAttendance = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.uniqueByMobile !== undefined) search.set('uniqueByMobile', String(params.uniqueByMobile));
  if (params.dedupeMode) search.set('dedupeMode', params.dedupeMode);
  const query = search.toString();
  return adminRequest(`/training-attendance${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getTrainingFeedback = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.gender) search.set('gender', params.gender);
  if (params.occupation) search.set('occupation', params.occupation);
  const query = search.toString();
  return adminRequest(`/training-feedback${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getTrainingFormResponses = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.sessionRating != null) search.set('sessionRating', params.sessionRating);
  const query = search.toString();
  return adminRequest(`/training-form-responses${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getIitainSessionFeedbackSubmissions = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.counselorName) search.set('counselorName', params.counselorName);
  if (params.registeredForNat) search.set('registeredForNat', params.registeredForNat);
  const query = search.toString();
  return adminRequest(`/iitain-session-feedback${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getOneOnOneCounselingLeads = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  if (params.leadStatus) search.set('leadStatus', params.leadStatus);
  if (params.currentClass) search.set('currentClass', params.currentClass);
  if (params.interestedBranch) search.set('interestedBranch', params.interestedBranch);
  if (params.collegeBudget) search.set('collegeBudget', params.collegeBudget);
  if (params.biggestConcern) search.set('biggestConcern', params.biggestConcern);
  if (params.preferredLanguage) search.set('preferredLanguage', params.preferredLanguage);
  if (params.preferredTimeSlotDate) search.set('preferredTimeSlotDate', params.preferredTimeSlotDate);
  if (params.sessionAttendee) search.set('sessionAttendee', params.sessionAttendee);
  if (params.utm_source) search.set('utm_source', params.utm_source);
  if (params.utm_medium) search.set('utm_medium', params.utm_medium);
  if (params.utm_campaign) search.set('utm_campaign', params.utm_campaign);
  if (params.utm_content) search.set('utm_content', params.utm_content);
  if (params.bookingFilter) search.set('bookingFilter', params.bookingFilter);
  if (params.bookingStatus) search.set('bookingStatus', params.bookingStatus);
  if (params.selectedSlotId) search.set('selectedSlotId', params.selectedSlotId);
  if (params.oneOnOneCounselorId) search.set('oneOnOneCounselorId', params.oneOnOneCounselorId);
  if (params.slotDate) search.set('slotDate', params.slotDate);
  if (params.parentAttendanceConfirmed === true) search.set('parentAttendanceConfirmed', 'true');
  if (params.whatsappConsent === true) search.set('whatsappConsent', 'true');
  if (params.leadRelevance) search.set('leadRelevance', params.leadRelevance);
  const query = search.toString();
  return adminRequest(`/one-on-one-counseling-leads${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getOneOnOneCounselingFunnelStats = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return adminRequest(
    `/one-on-one-counseling-leads/funnel-stats${query ? `?${query}` : ''}`,
    { method: 'GET' },
    token
  );
};

export const patchOneOnOneCounselingLeadStatus = async (id, leadStatus, token = getStoredToken()) => {
  return adminRequest(`/one-on-one-counseling-leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ leadStatus }),
  }, token);
};

export const getOneOnOneCounselors = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.activeOnly) search.set('activeOnly', 'true');
  const query = search.toString();
  return adminRequest(`/one-on-one-counselors${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const createOneOnOneCounselor = async (body, token = getStoredToken()) =>
  adminRequest('/one-on-one-counselors', { method: 'POST', body: JSON.stringify(body) }, token);

export const updateOneOnOneCounselor = async (id, body, token = getStoredToken()) =>
  adminRequest(`/one-on-one-counselors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);

export const patchOneOnOneCounselorStatus = async (id, isActive, token = getStoredToken()) =>
  adminRequest(`/one-on-one-counselors/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }, token);

export const deleteOneOnOneCounselor = async (id, token = getStoredToken()) =>
  adminRequest(`/one-on-one-counselors/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);

export const getGuidanceSlots = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.counselorId) search.set('counselorId', params.counselorId);
  if (params.slotDate) search.set('slotDate', params.slotDate);
  if (params.isActive) search.set('isActive', params.isActive);
  if (params.q) search.set('q', params.q);
  if (params.availability) search.set('availability', params.availability);
  const query = search.toString();
  return adminRequest(`/guidance-slots${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const createGuidanceSlot = async (body, token = getStoredToken()) =>
  adminRequest('/guidance-slots', { method: 'POST', body: JSON.stringify(body) }, token);

export const updateGuidanceSlot = async (id, body, token = getStoredToken()) =>
  adminRequest(`/guidance-slots/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);

export const toggleGuidanceSlot = async (id, token = getStoredToken()) =>
  adminRequest(`/guidance-slots/${encodeURIComponent(id)}/toggle`, { method: 'PATCH' }, token);

export const deleteGuidanceSlot = async (id, token = getStoredToken()) =>
  adminRequest(`/guidance-slots/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);

export const getGuidanceBookings = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const query = search.toString();
  return adminRequest(`/guidance-bookings${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const cancelGuidanceBooking = async (id, token = getStoredToken()) =>
  adminRequest(`/guidance-bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' }, token);

export const getGuidanceReminderStatus = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.slotDate) search.set('slotDate', params.slotDate);
  if (params.messageKind) search.set('messageKind', params.messageKind);
  const query = search.toString();
  return adminRequest(`/guidance-reminder-status${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getGuidanceNatFollowUps = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const query = search.toString();
  return adminRequest(`/guidance-nat-follow-ups${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const patchGuidanceNatFollowUp = async (id, body, token = getStoredToken()) =>
  adminRequest(`/guidance-nat-follow-ups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, token);

export const getCounsellorSupportRequests = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return adminRequest(`/counsellor-support-requests${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/assessment-submissions — list with pagination. Returns { submissions, total }. options: { from, to, q }. */
export const getAssessmentSubmissions = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/assessment-submissions?${params}`, { method: 'GET' }, actualToken);
};

/** GET /admin/assessment-2-submissions — list with pagination. Returns { submissions, total }. options: { from, to, q }. */
export const getAssessment2Submissions = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/assessment-2-submissions?${params}`, { method: 'GET' }, actualToken);
};

/** GET /admin/assessment-submissions/:id — single submission with questionResults. */
export const getAssessmentSubmissionById = async (id, token = getStoredToken()) => {
  return adminRequest(`/assessment-submissions/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** GET /admin/assessment-2-submissions/:id — single submission with questionResults. */
export const getAssessment2SubmissionById = async (id, token = getStoredToken()) => {
  return adminRequest(`/assessment-2-submissions/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** GET /admin/assessment-3-submissions — list with pagination. Returns { submissions, total }. options: { from, to, q }. */
export const getAssessment3Submissions = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/assessment-3-submissions?${params}`, { method: 'GET' }, actualToken);
};

/** GET /admin/assessment-3-submissions/:id — single submission with questionResults. */
export const getAssessment3SubmissionById = async (id, token = getStoredToken()) => {
  return adminRequest(`/assessment-3-submissions/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** GET /admin/assessment-4-submissions — list with pagination. options: { from, to, q }. */
export const getAssessment4Submissions = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/assessment-4-submissions?${params}`, { method: 'GET' }, actualToken);
};

/** GET /admin/assessment-4-submissions/:id — single submission with questionResults. */
export const getAssessment4SubmissionById = async (id, token = getStoredToken()) => {
  return adminRequest(`/assessment-4-submissions/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** GET /admin/assessment-5-submissions — list with pagination. options: { from, to, q }. */
export const getAssessment5Submissions = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/assessment-5-submissions?${params}`, { method: 'GET' }, actualToken);
};

/** GET /admin/assessment-5-submissions/:id — single submission with questionResults. */
export const getAssessment5SubmissionById = async (id, token = getStoredToken()) => {
  return adminRequest(`/assessment-5-submissions/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** GET /admin/missing-leads — list with pagination. Leads in Assessment 3 not in activation form. options: { from, to, q }. */
export const getMissingLeads = async (page = 1, limit = 50, optionsOrToken = {}, token = getStoredToken()) => {
  const options = typeof optionsOrToken === 'string' ? {} : optionsOrToken;
  const actualToken = typeof optionsOrToken === 'string' ? optionsOrToken : token;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.from != null) params.set('from', options.from);
  if (options.to != null) params.set('to', options.to);
  if (options.q != null && String(options.q).trim() !== '') params.set('q', String(options.q).trim());
  return adminRequest(`/missing-leads?${params}`, { method: 'GET' }, actualToken);
};

// —— Announcements ——
export const getAnnouncements = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return adminRequest(`/announcements${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getAnnouncementById = async (id, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

export const getAnnouncementAnalytics = async (id, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}/analytics`, { method: 'GET' }, token);
};

export const createAnnouncement = async (payload, token = getStoredToken()) => {
  return adminRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
};

export const updateAnnouncement = async (id, payload, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
};

export const deleteAnnouncement = async (id, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

export const publishAnnouncement = async (id, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}/publish`, { method: 'POST' }, token);
};

export const unpublishAnnouncement = async (id, token = getStoredToken()) => {
  return adminRequest(`/announcements/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }, token);
};

/** Request to /api/influencer-links and /api/influencer-analytics (admin auth, no /admin prefix). */
async function influencerRequest(path, options = {}, token = getStoredToken()) {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(url, { ...options, headers });
    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Invalid response' };
    }
    if (!response.ok) {
      if (response.status === 401) {
        notifyAdminUnauthorized({ endpoint: path, status: 401 });
      }
      return { success: false, message: data.message || 'Request failed', status: response.status, data };
    }
    return { success: true, data, status: response.status };
  } catch (error) {
    const message = error.message === 'Failed to fetch' ? 'Cannot reach server.' : (error.message || 'Network error');
    return { success: false, message, status: 0, error };
  }
}

export const createInfluencerLink = async (payload, save = false, token = getStoredToken()) => {
  return influencerRequest('/influencer-links', {
    method: 'POST',
    body: JSON.stringify({ ...payload, save: Boolean(save) }),
  }, token);
};

export const getInfluencerLinks = async (token = getStoredToken(), params = {}) => {
  const search = new URLSearchParams();
  if (params.linkTarget) search.set('linkTarget', params.linkTarget);
  const query = search.toString();
  return influencerRequest(`/influencer-links${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const deleteInfluencerLink = async (id, token = getStoredToken()) => {
  return influencerRequest(`/influencer-links/${id}`, { method: 'DELETE' }, token);
};

export const updateInfluencerLink = async (id, payload, token = getStoredToken()) => {
  return influencerRequest(`/influencer-links/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
};

export const getInfluencerAnalytics = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.sort) search.set('sort', params.sort);
  const query = search.toString();
  return influencerRequest(`/influencer-analytics${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getInfluencerAnalyticsTrend = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return influencerRequest(`/influencer-analytics/trend${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

// ——— Webinar Progress (Admin) ———

function appendWebinarProgressFilterParams(search, params) {
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  if (params.search) search.set('search', params.search);
  if (params.sort) search.set('sort', params.sort);
  if (params.filterMode) search.set('filterMode', params.filterMode);
  if (params.firstJoinedFrom) search.set('firstJoinedFrom', params.firstJoinedFrom);
  else if (params.from) search.set('from', params.from);
  if (params.firstJoinedTo) search.set('firstJoinedTo', params.firstJoinedTo);
  else if (params.to) search.set('to', params.to);
  if (params.activeOn) search.set('activeOn', params.activeOn);
  if (params.modulesMin != null && params.modulesMin !== '') search.set('modulesMin', String(params.modulesMin));
  if (params.modulesMax != null && params.modulesMax !== '') search.set('modulesMax', String(params.modulesMax));
  if (params.modulesBucket) search.set('modulesBucket', params.modulesBucket);
  if (params.progressMin != null && params.progressMin !== '') search.set('progressMin', String(params.progressMin));
  if (params.progressMax != null && params.progressMax !== '') search.set('progressMax', String(params.progressMax));
  if (params.lastActiveModule) search.set('lastActiveModule', params.lastActiveModule);
  if (params.activity) search.set('activity', params.activity);
  if (params.status) {
    const s = Array.isArray(params.status) ? params.status.join(',') : params.status;
    if (s) search.set('status', s);
  }
}

export const getWebinarProgressList = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  appendWebinarProgressFilterParams(search, params);
  const query = search.toString();
  return adminRequest(`/webinar-progress${query ? `?${query}` : ''}`, { method: 'GET', cache: 'no-store' }, token);
};

export const getWebinarProgressStats = async (paramsOrToken = {}, token = getStoredToken()) => {
  const params = typeof paramsOrToken === 'string' ? {} : (paramsOrToken || {});
  const actualToken = typeof paramsOrToken === 'string' ? paramsOrToken : token;
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return adminRequest(`/webinar-progress/stats${query ? `?${query}` : ''}`, { method: 'GET', cache: 'no-store' }, actualToken);
};

export const getWebinarProgressDetail = async (phone, token = getStoredToken()) => {
  return adminRequest(`/webinar-progress/${encodeURIComponent(phone)}`, { method: 'GET', cache: 'no-store' }, token);
};

export const getWebinarUserAssessments = async (phone, token = getStoredToken()) => {
  return adminRequest(`/webinar-progress/${encodeURIComponent(phone)}/assessments`, { method: 'GET', cache: 'no-store' }, token);
};

export const adminUpdateWebinarProgress = async (phone, payload, token = getStoredToken()) => {
  return adminRequest(`/webinar-progress/${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    cache: 'no-store',
  }, token);
};

export const bulkWebinarProgress = async (payload, token = getStoredToken()) => {
  return adminRequest('/webinar-progress/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
    cache: 'no-store',
  }, token);
};

/**
 * POST /api/admin/certificates/bulk-download — ZIP with PNG, PDF per found cert + manifest.csv
 * @param {{ mobileNumbers?: string[], mobileNumbersText?: string }} payload
 */
export const bulkDownloadCertificates = async (payload = {}, token = getStoredToken()) => {
  const url = `${getApiBaseUrl()}/admin/certificates/bulk-download`;
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    if (response.status === 401) {
      notifyAdminUnauthorized({ endpoint: '/admin/certificates/bulk-download', status: 401 });
    }
    let message = 'Bulk certificate download failed';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = response.statusText || message;
    }
    return { success: false, message, status: response.status };
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename = `certificates-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
  if (disposition) {
    const match = /filename="?([^"]+)"?/.exec(disposition);
    if (match) filename = match[1];
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return { success: true };
};

export const getWebinarProgressExport = async (paramsOrToken = {}, token = getStoredToken()) => {
  const params = typeof paramsOrToken === 'string' || paramsOrToken == null ? {} : paramsOrToken;
  const actualToken = typeof paramsOrToken === 'string' ? paramsOrToken : token;
  const search = new URLSearchParams();
  appendWebinarProgressFilterParams(search, params);
  const query = search.toString();
  const url = `${getApiBaseUrl()}/admin/webinar-progress/export${query ? `?${query}` : ''}`;
  const headers = {};
  if (actualToken) headers.Authorization = `Bearer ${actualToken}`;
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    if (response.status === 401) {
      notifyAdminUnauthorized({ endpoint: '/admin/webinar-progress/export', status: 401 });
    }
    let message = 'Export failed';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = response.statusText || message;
    }
    return { success: false, message, status: response.status };
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename = `webinar-progress-${new Date().toISOString().slice(0, 10)}.csv`;
  if (disposition) {
    const match = /filename="?([^"]+)"?/.exec(disposition);
    if (match) filename = match[1];
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return { success: true };
};

export async function getAdminLeadsExport(params = {}, token = getStoredToken()) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.selectedSlot) search.set('selectedSlot', params.selectedSlot);
  if (params.slotDate && String(params.slotDate).trim()) search.set('slotDate', String(params.slotDate).trim());
  if (params.utm_content) search.set('utm_content', params.utm_content);
  const query = search.toString();
  const url = `${getApiBaseUrl()}/admin/leads/export${query ? `?${query}` : ''}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    if (response.status === 401) {
      notifyAdminUnauthorized({ endpoint: '/admin/leads/export', status: 401 });
    }
    let message = 'Export failed';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = response.statusText || message;
    }
    return { success: false, message, status: response.status };
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename = `guidexpert-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  if (disposition) {
    const match = /filename="?([^"]+)"?/.exec(disposition);
    if (match) filename = match[1];
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return { success: true };
}

/** POST /admin/blogs — create blog (admin). */
export const adminCreateBlog = async (payload, token = getStoredToken()) => {
  return adminRequest(
    '/blogs',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
};

/** PUT /admin/blogs/:id — update blog (admin). */
export const adminUpdateBlog = async (id, payload, token = getStoredToken()) => {
  return adminRequest(
    `/blogs/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token
  );
};

/** DELETE /admin/blogs/:id — delete blog (admin). */
export const adminDeleteBlog = async (id, token = getStoredToken()) => {
  return adminRequest(`/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

/** GET /admin/app-settings/sidebar — get admin sidebar organization config. */
export const getSidebarConfig = async (token = getStoredToken()) => {
  return adminRequest('/app-settings/sidebar', { method: 'GET' }, token);
};

/**
 * PATCH /admin/app-settings/sidebar — update sidebar organization (super-admin only).
 * @param {{ sectionsEnabled?: { counsellors?: boolean, students?: boolean }, overrides?: Record<string, string> }} config
 */
export const setSidebarConfig = async (config, token = getStoredToken()) => {
  return adminRequest('/app-settings/sidebar', {
    method: 'PATCH',
    body: JSON.stringify(config && typeof config === 'object' ? config : {}),
  }, token);
};

/** GET /admin/app-settings/osvi — get OSVI toggle state. */
export const getOsviSetting = async (token = getStoredToken()) => {
  return adminRequest('/app-settings/osvi', { method: 'GET' }, token);
};

/**
 * PATCH /admin/app-settings/osvi — update OSVI settings (super-admin only).
 * @param {boolean|{enabled?: boolean, osviAbandonedDelayMs?: number}} input
 */
export const setOsviSetting = async (input, token = getStoredToken()) => {
  const body =
    typeof input === 'boolean'
      ? { enabled: input }
      : (input && typeof input === 'object' ? input : {});
  return adminRequest('/app-settings/osvi', { method: 'PATCH', body: JSON.stringify(body) }, token);
};

/** GET /admin/system-prompt — Flow V3 chatbot system prompt. */
export const getSystemPrompt = async (token = getStoredToken()) => {
  return adminRequest('/system-prompt', { method: 'GET' }, token);
};

/**
 * PUT /admin/system-prompt — update Flow V3 system prompt (super-admin only).
 * @param {string} text
 */
export const setSystemPrompt = async (text, token = getStoredToken()) => {
  return adminRequest('/system-prompt', {
    method: 'PUT',
    body: JSON.stringify({ text: typeof text === 'string' ? text : '' }),
  }, token);
};

/**
 * POST /admin/chatbot/clear-profile — clear WhatsApp bot profile for one phone (super-admin).
 * @param {string} phone
 */
export const clearChatbotProfile = async (phone, token = getStoredToken()) => {
  return adminRequest(
    '/chatbot/clear-profile',
    {
      method: 'POST',
      body: JSON.stringify({ phone: String(phone ?? '') }),
    },
    token
  );
};

/** GET /osvi/call-sessions — list CRM-stored OSVI call sessions (admin auth, no /admin prefix). */
export const getOsviCallSessionsData = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', params.page);
  if (params.limit != null) search.set('limit', params.limit);
  const query = search.toString();
  const url = `${getApiBaseUrl()}/osvi/call-sessions${query ? `?${query}` : ''}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, { method: 'GET', headers });
    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Invalid response' };
    }
    if (!response.ok) {
      if (response.status === 401) {
        notifyAdminUnauthorized({ endpoint: '/osvi/call-sessions', status: 401 });
      }
      return {
        success: false,
        message: data.message || 'Request failed',
        status: response.status,
        data,
      };
    }
    return { success: true, data, status: response.status };
  } catch (error) {
    const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';
    const message = isNetworkError
      ? `Cannot reach server. Check API URL (${getApiBaseUrl()}) and network connectivity.`
      : (error.message || 'Network error');
    return {
      success: false,
      message,
      status: 0,
      error,
    };
  }
};

/** GET /admin/poster-downloads — paginated poster download events. Pass includeStats: true to also get chart aggregates (one round trip). */
export const getPosterDownloads = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.posterKey) search.set('posterKey', params.posterKey);
  if (params.q) search.set('q', params.q);
  if (params.counsellorId) search.set('counsellorId', params.counsellorId);
  if (params.includeStats === true) search.set('includeStats', '1');
  const query = search.toString();
  return adminRequest(`/poster-downloads${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/poster-downloads/stats — aggregates by poster and day. */
export const getPosterDownloadStats = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return adminRequest(`/poster-downloads/stats${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/college-comparisons — saved college comparison searches. */
export const getCollegeComparisons = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.phone) search.set('phone', params.phone);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return adminRequest(`/college-comparisons${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/posters — list poster templates. */
export const listPosterTemplates = async (token = getStoredToken()) => {
  return adminRequest('/posters', { method: 'GET' }, token);
};

/** GET /admin/posters/:id */
export const getPosterTemplate = async (id, token = getStoredToken()) => {
  return adminRequest(`/posters/${encodeURIComponent(id)}`, { method: 'GET' }, token);
};

/** POST /admin/posters — body: { name, route, svgTemplate, elements } */
export const createPosterTemplate = async (payload, token = getStoredToken()) => {
  return adminRequest('/posters', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
};

/** PUT /admin/posters/:id */
export const updatePosterTemplate = async (id, payload, token = getStoredToken()) => {
  return adminRequest(`/posters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
};

/** DELETE /admin/posters/:id */
export const deletePosterTemplate = async (id, token = getStoredToken()) => {
  return adminRequest(`/posters/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
};

/** POST /admin/posters/:id/publish */
export const publishPosterTemplate = async (id, token = getStoredToken()) => {
  return adminRequest(`/posters/${encodeURIComponent(id)}/publish`, { method: 'POST' }, token);
};

/** POST /admin/posters/:id/unpublish */
export const unpublishPosterTemplate = async (id, token = getStoredToken()) => {
  return adminRequest(`/posters/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }, token);
};

/** POST /admin/posters/:id/marketing-featured — body: { featured: boolean } */
export const setPosterMarketingFeatured = async (id, featured, token = getStoredToken()) => {
  return adminRequest(
    `/posters/${encodeURIComponent(id)}/marketing-featured`,
    {
      method: 'POST',
      body: JSON.stringify({ featured: !!featured }),
    },
    token
  );
};

function buildAnalyticsQuery(params = {}) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.fromDate) search.set('fromDate', params.fromDate);
  if (params.toDate) search.set('toDate', params.toDate);
  if (params.productLine) search.set('productLine', params.productLine);
  if (params.preset) search.set('preset', params.preset);
  if (params.sinceDays != null) search.set('sinceDays', String(params.sinceDays));
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** GET /admin/analytics/lifecycle/funnel */
export const getLifecycleFunnel = async (params = {}, token = getStoredToken()) => {
  return adminRequest(`/analytics/lifecycle/funnel${buildAnalyticsQuery(params)}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/executive/summary */
export const getExecutiveSummary = async (params = {}, token = getStoredToken()) => {
  return adminRequest(`/analytics/executive/summary${buildAnalyticsQuery(params)}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/lifecycle/validation */
export const getLifecycleValidation = async (params = {}, token = getStoredToken()) => {
  return adminRequest(`/analytics/lifecycle/validation${buildAnalyticsQuery(params)}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/alerts */
export const getAnalyticsAlerts = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.severity) search.set('severity', params.severity);
  if (params.productLine) search.set('productLine', params.productLine);
  if (params.type) search.set('type', params.type);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return adminRequest(`/analytics/alerts${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** POST /admin/analytics/alerts/:id/acknowledge */
export const acknowledgeAnalyticsAlert = async (id, token = getStoredToken()) => {
  return adminRequest(`/analytics/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }, token);
};

/** POST /admin/analytics/alerts/:id/resolve */
export const resolveAnalyticsAlert = async (id, token = getStoredToken()) => {
  return adminRequest(`/analytics/alerts/${encodeURIComponent(id)}/resolve`, { method: 'POST' }, token);
};

/** GET /admin/analytics/followup-effectiveness */
export const getFollowupEffectiveness = async (params = {}, token = getStoredToken()) => {
  return adminRequest(`/analytics/followup-effectiveness${buildAnalyticsQuery(params)}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/counsellor-performance */
export const getCounsellorPerformance = async (params = {}, token = getStoredToken()) => {
  return adminRequest(`/analytics/counsellor-performance${buildAnalyticsQuery(params)}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/reports/latest */
export const getLatestExecutiveReport = async (token = getStoredToken()) => {
  return adminRequest('/analytics/reports/latest', { method: 'GET' }, token);
};

/** GET /admin/analytics/reports/history */
export const getExecutiveReportHistory = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return adminRequest(`/analytics/reports/history${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/reports/:date */
export const getExecutiveReportByDate = async (date, token = getStoredToken()) => {
  return adminRequest(`/analytics/reports/${encodeURIComponent(date)}`, { method: 'GET' }, token);
};

/** POST /admin/analytics/reports/generate */
export const generateExecutiveReport = async (params = {}, token = getStoredToken()) => {
  return adminRequest(
    '/analytics/reports/generate',
    {
      method: 'POST',
      body: JSON.stringify({
        reportDate: params.reportDate,
        force: params.force === true,
      }),
    },
    token
  );
};

/** GET /admin/analytics/demand/summary */
export const getDemandIntelligenceSummary = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.window != null) search.set('window', String(params.window));
  if (params.days != null) search.set('days', String(params.days));
  const query = search.toString();
  return adminRequest(`/analytics/demand/summary${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** GET /admin/analytics/predictions/:phone */
export const getLeadPrediction = async (phone, params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.force) search.set('force', 'true');
  const query = search.toString();
  return adminRequest(
    `/analytics/predictions/${encodeURIComponent(phone)}${query ? `?${query}` : ''}`,
    { method: 'GET' },
    token
  );
};

/** GET /admin/analytics/predictions/portfolio */
export const getPredictionPortfolio = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.stage) search.set('stage', params.stage);
  if (params.minScore != null && params.minScore !== '') search.set('minScore', String(params.minScore));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sinceDays) search.set('sinceDays', String(params.sinceDays));
  const query = search.toString();
  return adminRequest(`/analytics/predictions/portfolio${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

/** POST /admin/analytics/predictions/recompute */
export const recomputePredictions = async (body = {}, token = getStoredToken()) => {
  return adminRequest(
    '/analytics/predictions/recompute',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    token
  );
};

/** Student workspace education updates (admin) */
export const getStudentWorkspaceUpdates = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return adminRequest(`/student-workspace-updates${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const getStudentWorkspaceUpdateById = async (id, token = getStoredToken()) =>
  adminRequest(`/student-workspace-updates/${encodeURIComponent(id)}`, { method: 'GET' }, token);

export const createStudentWorkspaceUpdate = async (body, token = getStoredToken()) =>
  adminRequest('/student-workspace-updates', { method: 'POST', body: JSON.stringify(body) }, token);

export const updateStudentWorkspaceUpdate = async (id, body, token = getStoredToken()) =>
  adminRequest(`/student-workspace-updates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, token);

export const deleteStudentWorkspaceUpdate = async (id, token = getStoredToken()) =>
  adminRequest(`/student-workspace-updates/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);

export const publishStudentWorkspaceUpdate = async (id, token = getStoredToken()) =>
  adminRequest(`/student-workspace-updates/${encodeURIComponent(id)}/publish`, { method: 'POST' }, token);

export const unpublishStudentWorkspaceUpdate = async (id, token = getStoredToken()) =>
  adminRequest(`/student-workspace-updates/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }, token);

/** Student testimonials (admin) */
export const getStudentTestimonials = async (params = {}, token = getStoredToken()) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return adminRequest(`/student-testimonials${query ? `?${query}` : ''}`, { method: 'GET' }, token);
};

export const createStudentTestimonial = async (body, token = getStoredToken()) =>
  adminRequest('/student-testimonials', { method: 'POST', body: JSON.stringify(body) }, token);

export const updateStudentTestimonial = async (id, body, token = getStoredToken()) =>
  adminRequest(`/student-testimonials/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, token);

export const deleteStudentTestimonial = async (id, token = getStoredToken()) =>
  adminRequest(`/student-testimonials/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);

export const publishStudentTestimonial = async (id, token = getStoredToken()) =>
  adminRequest(`/student-testimonials/${encodeURIComponent(id)}/publish`, { method: 'POST' }, token);

export const unpublishStudentTestimonial = async (id, token = getStoredToken()) =>
  adminRequest(`/student-testimonials/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }, token);
