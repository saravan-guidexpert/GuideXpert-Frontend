/** Shared WhatsApp ops product + template taxonomy (Overview, Recovery, Audit). */

export const OPS_PRODUCT_GUIDEXPERT = 'guidexpert';
export const OPS_PRODUCT_IIT = 'iit_counselling';
export const OPS_PRODUCT_ONE_ON_ONE = 'one_on_one_counseling';
export const OPS_PRODUCT_GUIDANCE_BOOKING = 'guidance_booking';
export const OPS_PRODUCT_JEE_MOCK_TEST = 'jee_mock_test';

export const FALLBACK_TEMPLATE_KINDS = [
  { id: 'slot_booked', label: 'Slot booked', description: 'Immediate confirmation after slot booking', opsProducts: ['guidexpert', 'iit_counselling'] },
  { id: 'one_on_one_submit', label: 'Form submit confirmation', description: 'Immediate confirmation after 1-on-1 session form submit', opsProducts: ['one_on_one_counseling'] },
  { id: 'guidance_booking_submit', label: 'Booking confirmation', description: 'Immediate confirmation after guidance booking book-slot', opsProducts: ['guidance_booking'] },
  { id: 'guidance_pre30min', label: '30 min before session', description: 'Guidance session reminder 30 minutes before slot start', opsProducts: ['guidance_booking'] },
  { id: 'guidance_counsellor_booking_notify', label: 'Counsellor booking notify', description: 'Immediate WhatsApp to assigned counsellor when student books a guidance slot', opsProducts: ['guidance_booking'] },
  { id: 'jee_mock_test_submit', label: 'Mock test registration', description: 'Immediate WhatsApp after JEE mock test registration from influencer links (name + image)', opsProducts: ['jee_mock_test'] },
  { id: 'pre4hr', label: '4hr reminder', description: 'Reminder sent around 4 hours before slot', opsProducts: ['guidexpert'] },
  { id: 'meet', label: 'Meet link (~1hr)', description: 'Meeting link reminder sent around 1 hour before slot', opsProducts: ['guidexpert'] },
  { id: '30min', label: '30 min reminder', description: 'Final reminder sent around 30 minutes before slot', opsProducts: ['guidexpert'] },
  { id: 'iit_pre2hr', label: '2 hours before', description: 'IIT demo reminder (Telugu/Hindi, Wed/Sat vs Sun)', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre45min', label: '45 min before', description: 'IIT demo reminder 45 minutes before slot', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre15min', label: '15 min before', description: 'IIT demo reminder 15 minutes before slot', opsProducts: ['iit_counselling'] },
];

export const IIT_GENERIC_REMINDER_IDS = new Set(['iit_pre2hr', 'iit_pre45min', 'iit_pre15min']);

/** IIT Counselling: one chip per reminder stage × language (replaces generic iit_pre* chips). */
export const IIT_REMINDER_LANGUAGE_CHIPS = [
  { id: 'iit_pre2hr', preferredLanguage: 'Telugu', label: '2 hours before · Telugu', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre2hr', preferredLanguage: 'Hindi', label: '2 hours before · Hindi', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre45min', preferredLanguage: 'Telugu', label: '45 min before · Telugu', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre45min', preferredLanguage: 'Hindi', label: '45 min before · Hindi', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre15min', preferredLanguage: 'Telugu', label: '15 min before · Telugu', opsProducts: ['iit_counselling'] },
  { id: 'iit_pre15min', preferredLanguage: 'Hindi', label: '15 min before · Hindi', opsProducts: ['iit_counselling'] },
];

/** GuideXpert recovery/audit template dropdown options. */
export const GX_TEMPLATE_OPTIONS = [
  { value: '', label: 'All templates' },
  { value: 'slot_booked', label: 'slot_booked · transactional' },
  { value: 'pre4hr', label: 'pre4hr · 4 hour reminder' },
  { value: 'meet', label: 'meet · meeting link' },
  { value: '30min', label: '30min · 30 min reminder' },
];

/** 1-on-1 Counseling recovery/audit template dropdown options. */
export const ONE_ON_ONE_TEMPLATE_OPTIONS = [
  { value: '', label: 'All templates' },
  { value: 'one_on_one_submit', label: 'one_on_one_submit · form confirmation' },
];

/** JEE mock test recovery/audit template dropdown options. */
export const JEE_MOCK_TEST_TEMPLATE_OPTIONS = [
  { value: '', label: 'All templates' },
  { value: 'jee_mock_test_submit', label: 'jee_mock_test_submit · mock test registration' },
];

/** Guidance Booking recovery/audit template dropdown options. */
export const GUIDANCE_BOOKING_TEMPLATE_OPTIONS = [
  { value: '', label: 'All templates' },
  { value: 'guidance_booking_submit', label: 'guidance_booking_submit · booking confirmation' },
  { value: 'guidance_pre30min', label: 'guidance_pre30min · 30 min before session' },
  { value: 'guidance_counsellor_booking_notify', label: 'guidance_counsellor_booking_notify · counsellor booking notify' },
];

/** IIT recovery/audit: slot_booked + language chips use IIT_REMINDER_LANGUAGE_CHIPS. */
export const IIT_SLOT_BOOKED_OPTION = {
  value: 'slot_booked',
  label: 'slot_booked · IIT confirmation',
};

export function templateChipKey(kind) {
  if (!kind?.id) return 'all';
  return kind.preferredLanguage ? `${kind.id}:${kind.preferredLanguage}` : kind.id;
}

export function templateKindAppliesToProduct(kind, opsProduct) {
  if (!kind?.opsProducts || !Array.isArray(kind.opsProducts)) return true;
  return kind.opsProducts.includes(opsProduct);
}

/** @param {URLSearchParams} searchParams */
export function parseOpsProductFromSearch(searchParams) {
  const raw = (searchParams.get('opsProduct') || searchParams.get('tenant') || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (raw === 'iit_counselling' || raw === 'iitcounselling') return OPS_PRODUCT_IIT;
  if (
    raw === 'one_on_one_counseling' ||
    raw === 'one_on_one' ||
    raw === 'oneonone' ||
    raw === 'one_on_one_session'
  ) {
    return OPS_PRODUCT_ONE_ON_ONE;
  }
  if (
    raw === 'guidance_booking' ||
    raw === 'guidance_booking_confirmation' ||
    raw === 'guidancebooking'
  ) {
    return OPS_PRODUCT_GUIDANCE_BOOKING;
  }
  if (raw === 'jee_mock_test' || raw === 'jeemocktest' || raw === 'mock_test' || raw === 'mocktest') {
    return OPS_PRODUCT_JEE_MOCK_TEST;
  }
  return OPS_PRODUCT_GUIDEXPERT;
}

export function parsePreferredLanguageFromSearch(searchParams) {
  const pl = searchParams.get('preferredLanguage');
  return pl === 'Telugu' || pl === 'Hindi' ? pl : null;
}

/** Merge API meta with local fallback so newly added chips appear before backend deploy catches up. */
function mergeTemplateKindLists(primary, fallback) {
  const base = Array.isArray(primary) && primary.length ? [...primary] : [];
  for (const fb of fallback || []) {
    const exists = base.some(
      (k) => k.id === fb.id && (k.preferredLanguage || null) === (fb.preferredLanguage || null)
    );
    if (!exists) base.push(fb);
  }
  return base.length ? base : [...(fallback || [])];
}

/** Visible template chips for a product (meta kinds or fallback). */
export function visibleTemplateKindsForProduct(templateKinds, opsProduct) {
  const list = mergeTemplateKindLists(templateKinds, FALLBACK_TEMPLATE_KINDS);
  const isIit = opsProduct === OPS_PRODUCT_IIT;
  const isOneOnOne = opsProduct === OPS_PRODUCT_ONE_ON_ONE;
  const isGuidanceBooking = opsProduct === OPS_PRODUCT_GUIDANCE_BOOKING;
  const isJeeMockTest = opsProduct === OPS_PRODUCT_JEE_MOCK_TEST;
  const fromMeta = list.filter((k) => templateKindAppliesToProduct(k, opsProduct));
  if (isOneOnOne) {
    return fromMeta.filter((k) => k.id === 'one_on_one_submit' && !k.preferredLanguage);
  }
  if (isJeeMockTest) {
    return fromMeta.filter((k) => k.id === 'jee_mock_test_submit' && !k.preferredLanguage);
  }
  if (isGuidanceBooking) {
    return fromMeta.filter(
      (k) =>
        (k.id === 'guidance_booking_submit' ||
          k.id === 'guidance_pre30min' ||
          k.id === 'guidance_counsellor_booking_notify') &&
        !k.preferredLanguage
    );
  }
  if (isIit) {
    const slot = fromMeta.find((k) => k.id === 'slot_booked' && !k.preferredLanguage);
    const langChips = IIT_REMINDER_LANGUAGE_CHIPS;
    return slot ? [slot, ...langChips] : langChips;
  }
  return fromMeta.filter((k) => !IIT_GENERIC_REMINDER_IDS.has(k.id) || !k.preferredLanguage);
}

/** Build API query fragment for ops + optional IIT language chip selection. */
export function buildOpsProductQueryParams(opsProduct, messageKind, preferredLanguage) {
  const params = {};
  if (opsProduct === OPS_PRODUCT_IIT) params.opsProduct = OPS_PRODUCT_IIT;
  if (opsProduct === OPS_PRODUCT_ONE_ON_ONE) params.opsProduct = OPS_PRODUCT_ONE_ON_ONE;
  if (opsProduct === OPS_PRODUCT_GUIDANCE_BOOKING) params.opsProduct = OPS_PRODUCT_GUIDANCE_BOOKING;
  if (opsProduct === OPS_PRODUCT_JEE_MOCK_TEST) params.opsProduct = OPS_PRODUCT_JEE_MOCK_TEST;
  if (messageKind) params.messageKind = messageKind;
  if (preferredLanguage && IIT_GENERIC_REMINDER_IDS.has(messageKind)) {
    params.preferredLanguage = preferredLanguage;
  }
  return params;
}
