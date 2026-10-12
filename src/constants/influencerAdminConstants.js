export const PLATFORMS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Twitter', label: 'Twitter' },
  { value: 'X', label: 'X' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Telegram', label: 'Telegram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'LinkedIn', label: 'LinkedIn' },
];

/** Same mapping as backend influencer UTM builder (`utm_source`). */
export const PLATFORM_TO_UTM_SOURCE = {
  Instagram: 'instagram',
  YouTube: 'youtube',
  Twitter: 'twitter',
  X: 'x',
  WhatsApp: 'whatsapp',
  Telegram: 'telegram',
  Facebook: 'facebook',
  LinkedIn: 'linkedin',
};

export const DEFAULT_CAMPAIGN = 'guide_xperts';

export const DEFAULT_REGISTRATION_PAGE_URL = (
  import.meta.env.VITE_REGISTRATION_BASE_URL || 'https://www.guidexpert.co.in/become-counsellor'
).trim();

/**
 * Ensures a UTM link is a valid absolute URL pointing to the registration/counsellor landing page.
 * Fixes links generated with page titles or relative paths so they open the page directly.
 */
export function ensureAbsoluteUtmUrl(rawUrl, defaultBase = DEFAULT_REGISTRATION_PAGE_URL) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  const baseClean = (defaultBase || 'https://www.guidexpert.co.in/become-counsellor').replace(/\/+$/, '');

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/register(\?|$)/, '/become-counsellor$1');
  }

  if (trimmed.startsWith('?')) {
    return `${baseClean}${trimmed}`;
  }

  const queryIndex = trimmed.indexOf('?');
  if (queryIndex !== -1) {
    const query = trimmed.slice(queryIndex);
    return `${baseClean}${query}`;
  }

  return baseClean;
}

/** Landing pages for Admin → IIT Counselling UTM (not registration influencer tracking). */
export const IIT_COUNSELLING_UTM_LINK_TARGETS = [
  { value: 'iitCounselling', label: 'IIT counselling (/iit-counselling)', tabLabel: 'IIT counselling' },
  { value: 'oneOnOneSession', label: '1-on-1 session (/one-on-one-session)', tabLabel: '1-on-1 session' },
  {
    value: 'guidanceBookingConfirmation',
    label: 'Guidance booking confirmation (/guidance-booking-confirmation)',
    tabLabel: 'Guidance booking',
  },
  {
    value: 'becomeCounsellor',
    label: 'Become a counsellor (/become-counsellor)',
    tabLabel: 'Become counsellor',
  },
];

export const IIT_UTM_SAVED_LINKS_ONLY_TARGETS = new Set(['oneOnOneSession', 'guidanceBookingConfirmation', 'becomeCounsellor']);

export function isIitUtmSavedLinksOnlyTarget(linkTarget) {
  return IIT_UTM_SAVED_LINKS_ONLY_TARGETS.has(linkTarget);
}

export function getIitUtmPagePath(linkTarget) {
  if (linkTarget === 'oneOnOneSession') return '/one-on-one-session';
  if (linkTarget === 'guidanceBookingConfirmation') return '/guidance-booking-confirmation';
  if (linkTarget === 'becomeCounsellor') return '/become-counsellor';
  return '/iit-counselling';
}

export function getIitUtmTabLabel(linkTarget) {
  const found = IIT_COUNSELLING_UTM_LINK_TARGETS.find((o) => o.value === linkTarget);
  return found?.tabLabel || found?.label || 'IIT counselling';
}

/** Normalize ?linkTarget= query on IIT Counselling UTM page. */
export function normalizeIitUtmLinkTargetFromQuery(raw) {
  if (!raw) return 'iitCounselling';
  const s = String(raw).trim().toLowerCase().replace(/-/g, '_');
  if (s === 'oneononesession' || s === 'one_on_one_session') return 'oneOnOneSession';
  if (s === 'guidancebookingconfirmation' || s === 'guidance_booking_confirmation') {
    return 'guidanceBookingConfirmation';
  }
  return 'iitCounselling';
}

/** Normalize @handle, URL, or plain username for Instagram quick-add. */
export function normalizeInstagramHandle(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('@')) s = s.slice(1);
  const urlMatch = s.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/\s+/g, '');
  return s.slice(0, 120);
}

export const LINKS_SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date created (newest first)' },
  { value: 'date-asc', label: 'Date created (oldest first)' },
  { value: 'name-asc', label: 'Influencer name A–Z' },
  { value: 'name-desc', label: 'Influencer name Z–A' },
  { value: 'platform', label: 'Platform' },
];

export const LINKS_COPY_FIELDS = [
  { key: 'influencerName', label: 'Influencer' },
  { key: 'platform', label: 'Platform' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'utmLink', label: 'UTM Link' },
  { key: 'createdAt', label: 'Date created' },
  { key: 'leadCount', label: 'Leads' },
  { key: 'cost', label: 'Cost' },
  { key: 'costPerLead', label: 'Cost per lead' },
  { key: 'latestLeadAt', label: 'Latest lead' },
];
