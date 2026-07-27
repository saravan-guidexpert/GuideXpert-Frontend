import { getStoredUtm } from './utm';
import { notifyWebinarUnauthorized } from './authSession';
import { getApiBaseUrl } from './apiBaseUrl';
import { getCounsellorToken } from './counsellorApi';
import { normalizeAutomatedPosterSlug } from './posterTrackRoute';

/**
 * Fire-and-forget poster download analytics. Does not block UI; failures are silent.
 * If posterKey is `interresults` and the API returns 400 (older backends without that key), retries once as `inter`.
 * @param {{ posterKey: string, format: 'png'|'pdf', displayName?: string, mobileNumber?: string, routeContext?: 'public'|'portal'|'admin', route?: string, posterRoute?: string }} payload
 */
export function trackPosterDownloadBeacon(payload) {
  if (!payload || typeof payload !== 'object') return;
  const { posterKey, format, displayName, mobileNumber, routeContext, route, posterRoute } = payload;
  if (!posterKey || !format) return;
  try {
    const url = `${getApiBaseUrl()}/counsellor/poster-downloads/track`;
    const bodyObj = {
      posterKey,
      format,
      displayName: displayName != null ? String(displayName) : '',
      mobileNumber:
        mobileNumber != null ? String(mobileNumber).replace(/\D/g, '').slice(0, 10) : '',
    };
    const pathRaw = posterRoute ?? route;
    const routeStr = pathRaw != null && String(pathRaw).trim() ? String(pathRaw).trim() : '';
    if (posterKey === 'automated') {
      if (routeStr) {
        bodyObj.posterRoute = routeStr;
      }
      const slug = normalizeAutomatedPosterSlug(pathRaw);
      if (slug) {
        /** Explicit slug so the API can persist even if path parsing differs on the server. */
        bodyObj.automatedRouteSlug = slug;
      }
    } else if (routeStr) {
      bodyObj.posterRoute = routeStr;
    }
    if (routeContext === 'public' || routeContext === 'portal' || routeContext === 'admin') {
      bodyObj.routeContext = routeContext;
    }
    const headers = { 'Content-Type': 'application/json' };
    const token = getCounsellorToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    /** keepalive: false — some environments drop or truncate JSON bodies on keepalive POSTs. */
    const reqInit = { method: 'POST', headers, keepalive: false };
    void fetch(url, { ...reqInit, body: JSON.stringify(bodyObj) })
      .then(async (res) => {
        if (res.ok || posterKey !== 'interresults') return;
        let data = {};
        try {
          data = await res.json();
        } catch {
          return;
        }
        const msg = String(data.message || '');
        if (res.status !== 400 || !msg.includes('Invalid posterKey')) return;
        void fetch(url, {
          ...reqInit,
          body: JSON.stringify({ ...bodyObj, posterKey: 'inter' }),
        }).catch(() => {});
      })
      .catch(() => {});
  } catch {
    /* silent */
  }
}

/** GET /posters/by-route?route=... — public dynamic poster template. */
export async function getPosterByRoute(route) {
  const q = encodeURIComponent(String(route ?? '/'));
  return apiRequest(`/posters/by-route?route=${q}`, { method: 'GET' });
}

/** GET /posters/marketing-featured — published template highlighted for counsellor Marketing (or null). */
export async function getMarketingFeaturedPoster() {
  return apiRequest('/posters/marketing-featured', { method: 'GET' });
}

/** GET /posters/marketing — all published dynamic poster templates for counsellor Marketing. */
export async function getMarketingPosters() {
  const res = await apiRequest('/posters/marketing', { method: 'GET' });
  if (res.success || res.status !== 404) return res;
  const fallback = await getMarketingFeaturedPoster();
  if (!fallback.success) return fallback;
  const posters = Array.isArray(fallback.data?.posters)
    ? fallback.data.posters
    : fallback.data?.poster
      ? [fallback.data.poster]
      : [];
  return {
    ...fallback,
    data: {
      ...fallback.data,
      posters,
    },
  };
}

/** POST /posters/verify-activation — published route + mobile → TrainingFeedback name/mobile. */
export async function verifyPosterActivation(route, mobile) {
  return apiRequest('/posters/verify-activation', {
    method: 'POST',
    body: JSON.stringify({
      route: String(route ?? ''),
      mobile: String(mobile ?? ''),
    }),
  });
}

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const config = { ...options, headers };

  // Log request in development
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`, {
      url,
      body: options.body ? JSON.parse(options.body) : undefined,
    });
  }

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error('[API] Non-JSON response:', text);
      return {
        success: false,
        message: 'Invalid response from server',
        status: response.status,
        data: { raw: text },
      };
    }

    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${endpoint}`, {
        status: response.status,
        ok: response.ok,
        data,
      });
    }

    if (!response.ok) {
      const authHeader = options?.headers?.Authorization || options?.headers?.authorization;
      const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
      const isWebinarEndpoint =
        endpoint.startsWith('/webinar-progress') || endpoint.startsWith('/webinar-assessment');
      if (response.status === 401 && hasBearer && isWebinarEndpoint) {
        notifyWebinarUnauthorized({
          endpoint,
          status: 401,
          code: data && typeof data === 'object' ? data.code : undefined,
        });
      }
      const fromBody =
        data && typeof data === 'object'
          ? data.message || data.error || (typeof data.detail === 'string' ? data.detail : null)
          : null;
      const byStatus =
        response.status === 502 || response.status === 503 || response.status === 504
          ? import.meta.env.DEV
            ? 'Service unavailable. Start the backend: cd backend && npm run dev (port 5000), then retry.'
            : 'Service temporarily unavailable. Please try again in a moment.'
          : response.status === 500 && import.meta.env.DEV
            ? 'Server error (500). If you are running locally, start the backend: cd backend && npm run dev — the Vite proxy targets http://127.0.0.1:5000.'
            : response.status === 404
              ? 'API endpoint not found. Check VITE_API_URL or the /api proxy.'
              : null;
      return {
        success: false,
        message: fromBody || byStatus || `Request failed (${response.status})`,
        status: response.status,
        data: data,
      };
    }

    return {
      success: true,
      data: data,
      status: response.status,
    };
  } catch (error) {
    console.error('[API Request Error]', endpoint, error);
    return {
      success: false,
      message: error.message || 'Network error. Please check your connection.',
      status: 0,
      error: error,
    };
  }
}

/**
 * Send OTP to WhatsApp number
 * @param {string} fullName - User's full name
 * @param {string} whatsappNumber - WhatsApp phone number
 * @param {string} occupation - User's occupation
 * @param {{ scheduleOsviForAbandonment?: boolean }} [options]
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const sendOtp = async (fullName, whatsappNumber, occupation, options = {}) => {
  const phoneStr = String(whatsappNumber ?? '').replace(/\D/g, '').slice(-10);
  const body = {
    fullName,
    phone: phoneStr,
    whatsappNumber: phoneStr,
    occupation,
  };
  if (options.scheduleOsviForAbandonment === true) {
    body.scheduleOsviForAbandonment = true;
  }
  return apiRequest('/send-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Verify OTP code. Same method as registration form; for counsellor login pass { counsellorLogin: true }, for webinar pass { webinarLogin: true } to get token in response.
 * @param {string} phone - Phone number
 * @param {string} otp - 6-digit OTP code
 * @param {{ counsellorLogin?: boolean, webinarLogin?: boolean }} [options] - counsellorLogin or webinarLogin: true for token + user on success
 * @returns {Promise<{success: boolean, message?: string, data?: { verified?: boolean, allowedAccess?: boolean, token?: string, user?: object }, status?: number}>}
 */
export const verifyOtp = async (phone, otp, options = {}) => {
  const phoneStr = String(phone ?? '');
  const body = {
    phone: phoneStr,
    whatsappNumber: phoneStr,
    otp: String(otp ?? ''),
  };
  if (options.counsellorLogin === true) {
    body.counsellorLogin = true;
  }
  if (options.webinarLogin === true) {
    body.webinarLogin = true;
  }
  return apiRequest('/verify-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Save Step 1 data to MongoDB
 * @param {string} fullName - User's full name
 * @param {string} whatsappNumber - WhatsApp phone number
 * @param {string} occupation - User's occupation
 * @param {{ utm_source?: string, utm_medium?: string, utm_campaign?: string, utm_content?: string }} [utm] - Optional first-touch UTM data
 * @param {{ rankPredictorLead?: { examId: string, score: number, difficulty?: string }, studentProfile?: { age?: number, currentlyStudying?: string, city?: string } }} [options]
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const saveStep1 = async (fullName, whatsappNumber, occupation, utm, options = {}) => {
  const payload = {
    fullName,
    whatsappNumber,
    occupation,
    phone: whatsappNumber,
  };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) payload.utm_source = utm.utm_source;
    if (utm.utm_medium != null) payload.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) payload.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) payload.utm_content = utm.utm_content;
  }
  if (options.rankPredictorLead && typeof options.rankPredictorLead === 'object') {
    payload.rankPredictorLead = options.rankPredictorLead;
  }
  if (options.studentProfile && typeof options.studentProfile === 'object') {
    payload.studentProfile = options.studentProfile;
  }
  if (options.loginOnly === true) {
    payload.loginOnly = true;
  }
  return apiRequest('/save-step1', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Fetch available demo slots (dynamic by day/time in IST)
 * @returns {Promise<{success: boolean, data?: {slots: Array<{id: string, label: string, date: string}>}, status?: number}>}
 */
export const getDemoSlots = async () => {
  return apiRequest('/demo-slots', {
    method: 'GET',
  });
};

/**
 * Fetch enabled IIT counselling group session slots.
 * @returns {Promise<{success: boolean, data?: {enabledSlotBookings: string[]}, status?: number}>}
 */
export const getIitCounsellingSlots = async () => {
  return apiRequest('/iit-counselling/slots', {
    method: 'GET',
  });
};

/**
 * Save Step 2 data to MongoDB (OTP verification)
 * @param {string} phone - Phone number
 * @param {{ utm_source?: string, utm_medium?: string, utm_campaign?: string, utm_content?: string }} [utm] - Optional first-touch UTM data
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const saveStep2 = async (phone, utm) => {
  const payload = { phone };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) payload.utm_source = utm.utm_source;
    if (utm.utm_medium != null) payload.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) payload.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) payload.utm_content = utm.utm_content;
  }
  return apiRequest('/save-step2', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Persist rank predictor model output on the lead (organic student flow). POST /save-rank-predictor-prediction
 * @param {string} phone - 10-digit normalized phone
 * @param {{ examId: string, predictedValue?: number|string, range?: { low?: number, high?: number }|string, metricLabel?: string, message?: string }} payload
 */
export const saveRankPredictorPrediction = async (phone, payload) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const p = digits.length >= 10 ? digits.slice(-10) : digits;
  const rangeOut =
    payload.range !== undefined && payload.range !== null && payload.range !== ''
      ? typeof payload.range === 'object' && !Array.isArray(payload.range)
        ? payload.range
        : String(payload.range)
      : undefined;
  const body = {
    phone: p,
    examId: payload.examId,
    ...(payload.predictedValue !== undefined && payload.predictedValue !== null
      ? { predictedValue: payload.predictedValue }
      : {}),
    ...(rangeOut !== undefined ? { range: rangeOut } : {}),
    ...(payload.metricLabel ? { metricLabel: payload.metricLabel } : {}),
    ...(payload.message ? { message: payload.message } : {}),
  };
  return apiRequest('/save-rank-predictor-prediction', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Persist student workspace tool activity for admin lead tracking.
 * POST /save-student-activity
 * @param {string} phone
 * @param {{ type: string, tool?: string, title: string, summary?: string, examId?: string, payload?: object }} activity
 * @param {{ age?: number, currentlyStudying?: string, city?: string }} [studentProfile]
 */
export const saveStudentActivity = async (phone, activity, studentProfile) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const p = digits.length >= 10 ? digits.slice(-10) : digits;
  const body = {
    phone: p,
    activity: {
      type: activity.type,
      tool: activity.tool,
      title: activity.title,
      summary: activity.summary,
      examId: activity.examId,
      payload: activity.payload,
    },
  };
  if (studentProfile && typeof studentProfile === 'object') {
    body.studentProfile = studentProfile;
  }
  return apiRequest('/save-student-activity', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Save Step 3 data to MongoDB (Slot booking)
 * @param {string} phone - Phone number
 * @param {string} selectedSlot - 'SATURDAY_7PM' or 'SUNDAY_3PM'
 * @param {string|Date} slotDate - ISO date string or Date object for the slot
 * @param {{ utm_source?: string, utm_medium?: string, utm_campaign?: string, utm_content?: string }} [utm] - Optional first-touch UTM data
 * @returns {Promise<{success: boolean, message?: string, data?: {selectedSlot: string, slotDate: Date}, status?: number}>}
 */
export const saveStep3 = async (phone, selectedSlot, slotDate, utm) => {
  const payload = {
    phone,
    selectedSlot,
    slotDate: slotDate instanceof Date ? slotDate.toISOString() : slotDate,
  };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) payload.utm_source = utm.utm_source;
    if (utm.utm_medium != null) payload.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) payload.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) payload.utm_content = utm.utm_content;
  }
  return apiRequest('/save-step3', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check registration status by phone number
 * @param {string} phone - Phone number
 * @returns {Promise<{success: boolean, isRegistered?: boolean, registeredAt?: Date, slotInfo?: Object, status?: number}>}
 */
export const checkRegistrationStatus = async (phone) => {
  return apiRequest(`/check-registration/${phone}`, {
    method: 'GET',
  });
};

/**
 * Save post-registration data (interest level and email)
 * @param {string} phone - Phone number
 * @param {number} interestLevel - Interest level from 1 to 5
 * @param {string} email - User's email address
 * @param {{ utm_source?: string, utm_medium?: string, utm_campaign?: string, utm_content?: string }} [utm] - Optional first-touch UTM data
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const savePostRegistrationData = async (phone, interestLevel, email, utm) => {
  const payload = { phone, interestLevel, email };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) payload.utm_source = utm.utm_source;
    if (utm.utm_medium != null) payload.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) payload.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) payload.utm_content = utm.utm_content;
  }
  return apiRequest('/save-post-registration', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Submit application form
 * @param {Object} formData - Application form data (may include utm_source, utm_medium, utm_campaign, utm_content)
 * @param {string} formData.fullName - User's full name
 * @param {string} formData.whatsappNumber - WhatsApp phone number
 * @param {string} formData.occupation - User's occupation
 * @param {string} formData.demoInterest - 'YES_SOON' or 'MAYBE_LATER'
 * @param {string} formData.selectedSlot - 'SATURDAY_7PM' or 'SUNDAY_3PM' (optional if MAYBE_LATER)
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const submitApplication = async (formData) => {
  const payload = { ...formData };
  const utm = getStoredUtm();
  if (utm) {
    if (payload.utm_source == null) payload.utm_source = utm.utm_source;
    if (payload.utm_medium == null) payload.utm_medium = utm.utm_medium;
    if (payload.utm_campaign == null) payload.utm_campaign = utm.utm_campaign;
    if (payload.utm_content == null) payload.utm_content = utm.utm_content;
  }
  return apiRequest('/submit-application', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check demo meet join eligibility (booked slot window: 5 min before start until slot end).
 * @param {string} mobileNumber - 10-digit (or normalizable) mobile
 * @returns {Promise<{success: boolean, message?: string, data?: { status?: string, message?: string, joinOpensAtLabel?: string, slotStartLabel?: string }, status?: number}>}
 */
export const checkMeetingDemoEligibility = async (mobileNumber) => {
  return apiRequest('/meeting/demo-eligibility', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber }),
  });
};

/**
 * Register for meeting (saves name and mobile, then redirect to Meet link on success)
 * @param {string} name - User's full name
 * @param {string} mobileNumber - 10-digit mobile number
 * @returns {Promise<{success: boolean, message?: string, data?: Object, status?: number}>}
 */
export const registerForMeeting = async (name, mobileNumber) => {
  return apiRequest('/meeting/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Orientation meet: eligibility is activation (TrainingFeedback) only — no demo slot / live window.
 * @param {string} mobileNumber
 */
export const checkOrientationMeetEligibility = async (mobileNumber) => {
  return apiRequest('/meeting/orientation-eligibility', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber }),
  });
};

/**
 * Register orientation meet attendance (after OTP + eligibility).
 */
export const registerForOrientationMeeting = async (name, mobileNumber) => {
  return apiRequest('/meeting/orientation-register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Register for the /iitcounsellingmeet attendance flow.
 * Has NO booking / time-window check on the server: the IIT counselling meet
 * is open to anyone who can verify their phone via OTP.
 * @param {string} name - 2-100 char name
 * @param {string} mobileNumber - 10-digit mobile number
 * @returns {Promise<{success: boolean, message?: string, data?: Object, status?: number}>}
 */
export const registerForIitMeet = async (name, mobileNumber) => {
  return apiRequest('/iit-meet/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Register for the /iitcounsellingmeethindi attendance flow (separate collection on server).
 * @param {string} name - 2-100 char name
 * @param {string} mobileNumber - 10-digit mobile number
 */
export const registerForIitMeetHindi = async (name, mobileNumber) => {
  return apiRequest('/iit-meet-hindi/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Register for /cdgxmeet after OTP verification; client then redirects to Google Meet.
 * @param {string} name - 2-100 char name
 * @param {string} mobileNumber - 10-digit mobile number
 */
export const registerForCollegeDostMeet = async (name, mobileNumber) => {
  return apiRequest('/college-dost-meet/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Check if a mobile number already joined CollegeDost meet (/cdgxmeet).
 * Used by /collegedost to skip OTP for returning meet attendees.
 * @param {string} mobileNumber - 10-digit mobile number
 */
export const checkCollegeDostMeetStatus = async (mobileNumber) => {
  const digits = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
  const result = await apiRequest(`/college-dost-meet/status?mobileNumber=${encodeURIComponent(digits)}`, {
    method: 'GET',
  });
  if (!result.success) {
    return {
      success: false,
      exists: false,
      message: result.message,
      status: result.status,
    };
  }
  const body = result.data || {};
  return {
    success: true,
    exists: Boolean(body.exists),
    data: body.data,
  };
};

/**
 * IIT first form: after OTP on the client, submit name, mobile, and free-text AI question answer.
 * @param {string} name
 * @param {string} mobileNumber - 10 digits
 * @param {string} interestedInAiLearning - trimmed, 1–2000 chars
 */
export const submitIitFirstForm = async (name, mobileNumber, interestedInAiLearning) => {
  return apiRequest('/iit-first-form/submit', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber, interestedInAiLearning }),
  });
};

/**
 * IIT second form: after OTP, submit name, mobile, and career guidance support text.
 * @param {string} name
 * @param {string} mobileNumber - 10 digits
 * @param {string} careerGuidanceSupport - trimmed, 1–2000 chars
 */
export const submitIitSecondForm = async (name, mobileNumber, careerGuidanceSupport) => {
  return apiRequest('/iit-second-form/submit', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber, careerGuidanceSupport }),
  });
};

/**
 * CollegeDost form: after OTP, submit name, mobile, and yes/no interest in new colleges.
 * @param {string} name
 * @param {string} mobileNumber - 10 digits
 * @param {'yes'|'no'} interestedInNewColleges
 * @param {string[]|null} newAgeCollegePreferences
 * @param {string|null} newAgeCollegePreferenceOther
 */
export const submitCollegeDostForm = async (
  name,
  mobileNumber,
  interestedInNewColleges,
  newAgeCollegePreferences = null,
  newAgeCollegePreferenceOther = null
) => {
  return apiRequest('/college-dost-form/submit', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mobileNumber,
      interestedInNewColleges,
      newAgeCollegePreferences,
      newAgeCollegePreferenceOther,
    }),
  });
};

/**
 * NAT campaign form: after OTP, submit name, mobile, and college preferences.
 * @param {string} name
 * @param {string} mobileNumber - 10 digits
 * @param {string[]} collegePreferences
 * @param {string|null} collegePreferenceOther
 */
export const submitNatCampaignForm = async (
  name,
  mobileNumber,
  collegePreferences,
  collegePreferenceOther = null
) => {
  return apiRequest('/nat-campaign/submit', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mobileNumber,
      collegePreferences,
      collegePreferenceOther,
    }),
  });
};

/**
 * Register for training meeting (saves name and mobile to training attendance, then redirect to training Meet link)
 * @param {string} name - User's full name
 * @param {string} mobileNumber - 10-digit mobile number
 * @returns {Promise<{success: boolean, message?: string, data?: Object, status?: number}>}
 */
export const registerForTraining = async (name, mobileNumber) => {
  return apiRequest('/training/register', {
    method: 'POST',
    body: JSON.stringify({ name, mobileNumber }),
  });
};

/**
 * Submit training feedback form.
 * @param {Object} payload - { name, mobileNumber, whatsappNumber, email, addressOfCommunication, occupation, dateOfBirth, gender, educationQualification, yearsOfExperience }
 * @returns {Promise<{success: boolean, message?: string, data?: Object, status?: number}>}
 */
export const submitTrainingFeedback = async (payload) => {
  return apiRequest('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Submit training form (interest/feedback) — fullName, mobileNumber, email, occupation, sessionRating 1–5, suggestions optional.
 * @param {Object} payload - { fullName, mobileNumber, email, occupation, sessionRating, suggestions? }
 * @returns {Promise<{success: boolean, message?: string, data?: Object, status?: number}>}
 */
export const submitTrainingFormResponse = async (payload) => {
  return apiRequest('/training-form', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Submit 1-on-1 IITian career counseling session booking form (public).
 */
export const submitOneOnOneCounselingLead = async (payload) => {
  return apiRequest('/one-on-one-counseling', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Save 1-on-1 counseling form step 1 (student details).
 */
export const saveOneOnOneSection1 = async (payload) => {
  return apiRequest('/one-on-one-counseling/section1', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Save 1-on-1 counseling form step 2 (parent & preferences).
 */
export const saveOneOnOneSection2 = async (payload) => {
  return apiRequest('/one-on-one-counseling/section2', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Save 1-on-1 counseling form step 3 (session booking) and complete submission.
 */
export const saveOneOnOneSection3 = async (payload) => {
  return apiRequest('/one-on-one-counseling/section3', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check if this mobile already submitted the public training form (live or legacy DB row).
 * @param {string} phone - Phone string (digits normalized to 10)
 * @returns {Promise<{ success: boolean, submitted?: boolean, message?: string, status?: number }>}
 */
export const checkTrainingFormSubmitted = async (phone) => {
  const digits = String(phone ?? '')
    .replace(/\D/g, '')
    .slice(-10)
    .slice(0, 10);
  if (digits.length !== 10) {
    return { success: false, submitted: false, message: 'Valid 10-digit mobile required' };
  }
  const result = await apiRequest(`/training-form/check/${encodeURIComponent(digits)}`, {
    method: 'GET',
  });
  if (!result.success) {
    return {
      success: false,
      submitted: false,
      message: result.message,
      status: result.status,
    };
  }
  const body = result.data;
  const submitted = typeof body?.submitted === 'boolean' ? body.submitted : false;
  return { success: true, submitted };
};

/**
 * Submit progress check-in form after implementation videos.
 */
export const submitProgressCheckIn = async (payload) => {
  return apiRequest('/progress-check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check if this mobile already submitted the progress check-in form.
 */
export const checkProgressCheckInSubmitted = async (phone) => {
  const digits = String(phone ?? '')
    .replace(/\D/g, '')
    .slice(-10)
    .slice(0, 10);
  if (digits.length !== 10) {
    return { success: false, submitted: false, message: 'Valid 10-digit mobile required' };
  }
  const result = await apiRequest(`/progress-check-in/check/${encodeURIComponent(digits)}`, {
    method: 'GET',
  });
  if (!result.success) {
    return {
      success: false,
      submitted: false,
      message: result.message,
      status: result.status,
    };
  }
  const body = result.data;
  const submitted = typeof body?.submitted === 'boolean' ? body.submitted : false;
  return { success: true, submitted };
};

/**
 * Load counselor names for IITain session feedback form dropdown.
 */
export const getIitainSessionFeedbackCounselors = async () => {
  const result = await apiRequest('/iitain-session-feedback/counselors', { method: 'GET' });
  if (!result.success) return result;
  const data = Array.isArray(result.data?.data) ? result.data.data : result.data;
  return { success: true, data: Array.isArray(data) ? data : [] };
};

/**
 * Submit IITain session feedback form.
 */
export const submitIitainSessionFeedback = async (payload) => {
  return apiRequest('/iitain-session-feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Check if mobile number is eligible for poster download (exists in training feedbacks).
 * @param {string} mobileNumber - 10-digit mobile number
 * @returns {Promise<{success: boolean, eligible?: boolean, message?: string, data?: Object, status?: number}>}
 */
export const checkPosterEligibility = async (mobileNumber) => {
  return apiRequest('/counsellor/poster-eligibility', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber: String(mobileNumber || '').replace(/\D/g, '').slice(0, 10) }),
  });
};

/**
 * Check if mobile number exists in AssessmentSubmission3 (training completed).
 * @param {string} mobileNumber - 10-digit mobile number
 * @returns {Promise<{success: boolean, eligible?: boolean, data?: { exists?: boolean, phone?: string }, message?: string, status?: number}>}
 */
export const checkAssessment3Eligibility = async (mobileNumber) => {
  const phone = String(mobileNumber || '').replace(/\D/g, '').slice(0, 10);
  const result = await apiRequest(`/assessment-3/check?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
  });
  if (!result.success) return result;
  const payload = result.data?.data ?? result.data;
  return {
    ...result,
    eligible: Boolean(payload?.exists ?? result.data?.eligible ?? false),
  };
};

export const checkActivationEligibility = async (mobileNumber) => {
  const phone = String(mobileNumber || '').replace(/\D/g, '').slice(0, 10);
  const result = await apiRequest(`/assessment-3/check-activation?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
  });
  if (!result.success) return result;
  const payload = result.data?.data ?? result.data;
  return {
    ...result,
    eligible: Boolean(payload?.exists ?? result.data?.eligible ?? false),
  };
};

/**
 * Submit counsellor assessment (after OTP verification).
 * @param {string} name - User's full name
 * @param {string} phone - 10-digit phone number
 * @param {Object} answers - Map of question id to answer (e.g. { q1: "...", q11: "..." })
 * @returns {Promise<{success: boolean, message?: string, data?: { score, maxScore }, status?: number}>}
 */
export const submitAssessment = async (name, phone, answers) => {
  return apiRequest('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ name, phone, answers }),
  });
};

/**
 * Submit counsellor assessment 2 (after OTP verification).
 * @param {string} name - User's full name
 * @param {string} phone - 10-digit phone number
 * @param {Object} answers - Map of question id to answer (q1–q15)
 * @returns {Promise<{success: boolean, message?: string, data?: { score, maxScore }, status?: number}>}
 */
export const submitAssessment2 = async (name, phone, answers) => {
  return apiRequest('/assessment-2/submit', {
    method: 'POST',
    body: JSON.stringify({ name, phone, answers }),
  });
};

/**
 * Submit counsellor assessment 3 (after OTP verification).
 * @param {string} name - User's full name
 * @param {string} phone - 10-digit phone number
 * @param {Object} answers - Map of question id to answer (q1–q20)
 * @returns {Promise<{success: boolean, message?: string, data?: { score, maxScore }, status?: number}>}
 */
export const submitAssessment3 = async (name, phone, answers) => {
  return apiRequest('/assessment-3/submit', {
    method: 'POST',
    body: JSON.stringify({ name, phone, answers }),
  });
};

/**
 * Submit counsellor assessment 4 (after OTP verification).
 */
export const submitAssessment4 = async (name, phone, answers) => {
  return apiRequest('/assessment-4/submit', {
    method: 'POST',
    body: JSON.stringify({ name, phone, answers }),
  });
};

/**
 * Submit counsellor assessment 5 (after OTP verification).
 */
export const submitAssessment5 = async (name, phone, answers) => {
  return apiRequest('/assessment-5/submit', {
    method: 'POST',
    body: JSON.stringify({ name, phone, answers }),
  });
};

/**
 * Submit webinar in-panel assessment (a1–a5). Saves an attempt to DB.
 * @param {string} assessmentId - 'a1' | 'a2' | 'a3' | 'a4' | 'a5'
 * @param {{ score: number, total: number, results: Array<{ questionId, text?, correct, userAnswer, correctAnswer }>, answers: Object }} payload
 * @param {string} [webinarToken] - Optional webinar JWT (from useWebinarAuth) to associate submission with user
 * @returns {Promise<{ success: boolean, message?: string, data?: Object, status?: number }>}
 */
export const submitWebinarAssessment = async (assessmentId, payload, webinarToken) => {
  const headers = { 'Content-Type': 'application/json' };
  if (webinarToken && typeof webinarToken === 'string') {
    headers.Authorization = `Bearer ${webinarToken}`;
  }
  return apiRequest('/webinar-assessment/submit', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assessmentId,
      score: payload.score,
      total: payload.total,
      results: payload.results || [],
      answers: payload.answers || {},
    }),
  });
};

/**
 * Fetch webinar assessment attempt history (latest first).
 * @param {string} assessmentId - 'a1' | 'a2' | 'a3' | 'a4' | 'a5'
 * @param {string} [webinarToken] - Webinar JWT (required for user history)
 * @param {number} [limit=5]
 * @returns {Promise<{ success: boolean, message?: string, data?: { attempts: Array<{ score: number, total: number, submittedAt: string }> }, status?: number }>}
 */
export const getWebinarAssessmentHistory = async (assessmentId, webinarToken, limit = 5) => {
  const headers = { 'Content-Type': 'application/json' };
  if (webinarToken && typeof webinarToken === 'string') {
    headers.Authorization = `Bearer ${webinarToken}`;
  }
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  return apiRequest(
    `/webinar-assessment/history?assessmentId=${encodeURIComponent(assessmentId)}&limit=${safeLimit}`,
    {
      method: 'GET',
      headers,
    }
  );
};

const ASSESSMENT_UTM_KEY = 'guidexpert_assessment_utm';

/**
 * Store UTM for current assessment session (sessionStorage). Call on assessment page load.
 * @param {{ utm_source?: string, utm_medium?: string, utm_campaign?: string, utm_content?: string }} utm
 */
export const setAssessmentUtm = (utm) => {
  if (typeof sessionStorage === 'undefined' || !utm || typeof utm !== 'object') return;
  try {
    sessionStorage.setItem(ASSESSMENT_UTM_KEY, JSON.stringify(utm));
  } catch (e) {
    console.warn('[setAssessmentUtm]', e);
  }
};

/**
 * Get stored assessment UTM from session (for submit payload).
 */
export const getAssessmentUtm = () => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ASSESSMENT_UTM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Submit Career DNA assessment (after OTP). Sends name, phone, answers, UTM, and optional email/school/class.
 */
export const submitCareerDnaAssessment = async (name, phone, answers, utm = null, extra = {}) => {
  const body = { name, phone, answers, ...extra };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) body.utm_source = utm.utm_source;
    if (utm.utm_medium != null) body.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) body.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) body.utm_content = utm.utm_content;
  }
  return apiRequest('/assessment-career-dna/submit', { method: 'POST', body: JSON.stringify(body) });
};

/**
 * Submit Course Fit assessment (after OTP). Sends name, phone, answers, UTM, and optional email/school/class.
 */
export const submitCourseFitAssessment = async (name, phone, answers, utm = null, extra = {}) => {
  const body = { name, phone, answers, ...extra };
  if (utm && typeof utm === 'object') {
    if (utm.utm_source != null) body.utm_source = utm.utm_source;
    if (utm.utm_medium != null) body.utm_medium = utm.utm_medium;
    if (utm.utm_campaign != null) body.utm_campaign = utm.utm_campaign;
    if (utm.utm_content != null) body.utm_content = utm.utm_content;
  }
  return apiRequest('/assessment-course-fit/submit', { method: 'POST', body: JSON.stringify(body) });
};

/**
 * Create or update a webinar certificate record (for view-by-ID).
 * @param {{ certificateId?: string, fullName: string, dateIssued: string, mobileNumber?: string }} payload - Use mobileNumber for one ID per user; use certificateId for legacy upsert.
 * @returns {Promise<{success: boolean, data?: { certificateId, fullName, dateIssued } | { success: true, data: ... }, status?: number}>}
 */
export const createCertificateRecord = async (payload) => {
  return apiRequest('/certificate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Get or create a certificate for the current user (by mobile). Returns the same certificate ID for the same mobile.
 * @param {{ fullName: string, dateIssued: string, mobileNumber: string }} params
 * @returns {Promise<{success: boolean, data?: { certificateId, fullName, dateIssued }, status?: number}>}
 */
export const getOrCreateCertificateForUser = async ({ fullName, dateIssued, mobileNumber }) => {
  return apiRequest('/certificate', {
    method: 'POST',
    body: JSON.stringify({ fullName, dateIssued, mobileNumber: String(mobileNumber ?? '').trim() }),
  });
};

/**
 * Migrate existing certificate (by mobile) from legacy UUID to short GX id.
 * @param {string} mobileNumber - 10-digit mobile
 * @returns {Promise<{success: boolean, data?: { certificateId } }>}
 */
export const migrateCertificateToShortId = async (mobileNumber) => {
  return apiRequest('/certificate/migrate-short-id', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber: String(mobileNumber ?? '').trim() }),
  });
};

/**
 * Get certificate by ID (public).
 * @param {string} id - certificateId
 * @returns {Promise<{success: boolean, data?: { certificateId, fullName, dateIssued }, status?: number}>}
 */
export const getCertificateById = async (id) => {
  return apiRequest(`/certificate/${encodeURIComponent(id)}`, { method: 'GET' });
};

/**
 * Get predicted colleges from the public College Predictor API (no auth).
 * Same request/response shape as the counsellor endpoint for consistent UI handling.
 * @param {{ offset?: number, limit?: number, entrance_exam_name_enum: string, admission_category_name_enum: string, cutoff_from: number, cutoff_to: number, reservation_category_code: string, branch_codes?: string[], districts?: string[], sort_order?: string }} params
 * @returns {Promise<{ success: boolean, data?: { total_no_of_colleges: number, admission_category_name: string, colleges: object[], _demo?: boolean }, message?: string, status?: number }>}
 */
export const getPredictedCollegesPublic = async (params = {}) => {
  const { offset = 0, limit = 10, ...body } = params;
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  return apiRequest(`/college-predictor/colleges?${query.toString()}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const searchCollegeComparisonOptions = async (query, limit = 8, { useAi = false } = {}) => {
  const search = new URLSearchParams();
  if (query != null) search.set('q', String(query));
  search.set('limit', String(limit));
  if (useAi) search.set('ai', '1');
  return apiRequest(`/college-predictor/comparison/options?${search.toString()}`, {
    method: 'GET',
  });
};

export const compareCollegesPublic = async (payload) => {
  return apiRequest('/college-predictor/comparison', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
};

export const chatCollegeComparisonPublic = async ({ message, comparison, history = [] } = {}) => {
  return apiRequest('/college-predictor/comparison/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      comparison,
      history,
    }),
  });
};

const WEB_CHAT_SESSION_KEY = 'gx_web_chat_session_v1';

export const sendWebChatMessage = async ({
  sessionId = '',
  message = '',
  phone = '',
  fullName = '',
  isWelcome = false,
} = {}) => {
  let sid = sessionId;
  if (!sid) {
    try {
      sid = localStorage.getItem(WEB_CHAT_SESSION_KEY) || '';
    } catch {
      sid = '';
    }
  }
  return apiRequest('/web-chat/message', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: sid || undefined,
      message,
      phone,
      fullName,
      isWelcome: Boolean(isWelcome),
    }),
  });
};

export const resetWebChatSession = async (sessionId = '') => {
  return apiRequest('/web-chat/reset', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sessionId || undefined }),
  });
};

// ——— Webinar Progress ———

export const syncWebinarProgress = async (token, payload) => {
  return apiRequest('/webinar-progress/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
};

export const getWebinarProgress = async (token) => {
  return apiRequest('/webinar-progress', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
};

export const recordCertificateDownload = async (token) => {
  return apiRequest('/webinar-progress/certificate-downloaded', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
};

export const syncWebinarProgressBeacon = (token, payload) => {
  const url = `${getApiBaseUrl()}/webinar-progress/sync`;
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort on page unload
  }
};

/**
 * Predict rank/percentile from public rank predictor API.
 * @param {{ examId: string, score: number, options?: Record<string, unknown> }} payload
 * @returns {Promise<{ success: boolean, data?: object, message?: string, status?: number }>}
 */
export const predictRankPublic = async (payload) => {
  const result = await apiRequest('/rank-predictor/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!result.success) {
    const errorMessage = result?.data?.error?.message || result.message || 'Could not generate prediction.';
    return {
      ...result,
      message: errorMessage,
    };
  }

  return {
    ...result,
    // Backend returns: { success: true, data: {...prediction} }
    // apiRequest wraps that as result.data, so unwrap once here.
    data: result?.data?.data || result.data,
  };
};

/** Public student workspace education updates feed */
export const getStudentWorkspaceUpdatesFeed = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.placement) search.set('placement', params.placement);
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return apiRequest(`/student-workspace-updates${query ? `?${query}` : ''}`, { method: 'GET' });
};

/** Live social-proof feed for hero toasts (name + tool only) */
export const getStudentLiveActivityFeed = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.sinceHours) search.set('sinceHours', String(params.sinceHours));
  const query = search.toString();
  return apiRequest(`/student-live-activity${query ? `?${query}` : ''}`, { method: 'GET' });
};

/** Public student testimonials for home carousel */
export const getStudentTestimonialsFeed = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return apiRequest(`/student-testimonials${query ? `?${query}` : ''}`, { method: 'GET' });
};

/** Student's own 1-on-1 counselling bookings (by phone) */
export const getMyOneOnOneBookings = async (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const p = digits.length >= 10 ? digits.slice(-10) : digits;
  return apiRequest(`/one-on-one-counseling/my-bookings?phone=${encodeURIComponent(p)}`, {
    method: 'GET',
  });
};
