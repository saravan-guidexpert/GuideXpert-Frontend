import { captureUtmFirstTouch, getStoredUtm, parseUtmFromUrl } from './utm';

/** Current URL UTMs override stored first-touch (same session attribution). */
export function resolveUtmAttribution() {
  captureUtmFirstTouch();
  const fromUrl = parseUtmFromUrl();
  const stored = getStoredUtm() || {};
  return { ...stored, ...fromUrl };
}

async function trackLandingPageVisit(apiBase, pageKey, utmOverrides = {}) {
  if (typeof window === 'undefined' || !apiBase) return '';
  const queryParams = new URLSearchParams(window.location.search);
  const payload = {
    pageKey,
    path: window.location.pathname,
    query: window.location.search,
    referrer: document.referrer || '',
    utm_source: utmOverrides.utm_source ?? queryParams.get('utm_source') ?? '',
    utm_medium: utmOverrides.utm_medium ?? queryParams.get('utm_medium') ?? '',
    utm_campaign: utmOverrides.utm_campaign ?? queryParams.get('utm_campaign') ?? '',
    utm_content: utmOverrides.utm_content ?? queryParams.get('utm_content') ?? '',
  };

  try {
    const response = await fetch(`${apiBase}/iit-counselling/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    const fingerprint = result?.data?.visitorFingerprint;
    return response.ok && typeof fingerprint === 'string' ? fingerprint : '';
  } catch {
    return '';
  }
}

/**
 * Record a 1-on-1 landing page visit (pageKey oneOnOneSession).
 * @returns {Promise<string>} visitorFingerprint or empty string
 */
export async function trackOneOnOneSessionVisit(apiBase, utmOverrides = {}) {
  return trackLandingPageVisit(apiBase, 'oneOnOneSession', utmOverrides);
}

/**
 * Record a guidance booking confirmation page visit.
 * @returns {Promise<string>} visitorFingerprint or empty string
 */
export async function trackGuidanceBookingConfirmationVisit(apiBase, utmOverrides = {}) {
  return trackLandingPageVisit(apiBase, 'guidanceBookingConfirmation', utmOverrides);
}

/**
 * Record a main page (/) visit so JEE mock test registrations can be tied to a UTM link.
 * @returns {Promise<string>} visitorFingerprint or empty string
 */
export async function trackMainPageVisit(apiBase, utmOverrides = {}) {
  return trackLandingPageVisit(apiBase, 'mainPage', utmOverrides);
}
