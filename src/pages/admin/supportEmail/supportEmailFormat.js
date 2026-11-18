export const SUPPORT_EMAIL_LAYOUT = {
  page: 'mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-4 md:px-6',
  stats: 'grid grid-cols-2 gap-3 lg:grid-cols-4',
  table: 'hidden md:block overflow-x-auto',
  cards: 'space-y-3 md:hidden',
  panel: 'rounded-lg border border-slate-200 bg-white'
};

export function supportEmailQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const EMPTY_COPY = 'Nothing matches these filters.';
export const ERROR_COPY = 'The support dashboard could not be loaded.';
export const LOADING_COPY = 'Loading support email data';

export function formatWhen(value, fallback = 'Not recorded') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
}

/** Verified is true, false, or 'unknown'. Unknown is never shown as healthy. */
export function verificationLabel(verified) {
  if (verified === true) return 'Verified';
  if (verified === false) return 'Not verified';
  return 'Unknown';
}

export function verificationTone(verified) {
  if (verified === true) return 'bg-green-50 text-green-800 border-green-200';
  if (verified === false) return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

const SINGLE_TEST_ERRORS = {
  MAILBOX_SCOPE_UNVERIFIED: 'Exchange mailbox scope is not verified. A Microsoft 365 administrator must confirm it first.',
  duplicate_test_request: 'This message was already processed by the single email test.',
  test_in_progress: 'Another single email test is running. Wait for it to finish.',
  invalid_message_id: 'That is not a valid Graph message id.',
  historical_message: 'This message arrived before the activation time, so it is not processed.',
  message_unavailable: 'Graph could not return that message.',
  mailbox_list_forbidden: 'The request was blocked because it would read more than the selected message.',
  graph_token_failed: 'Graph authentication failed. Run the Graph token test.',
  policy_missing: 'No ingestion policy exists for the approved mailbox.',
  policy_disabled: 'The ingestion policy is disabled.',
  activation_missing: 'Missing activation timestamp. Choose a time and approve it.',
  activation_invalid: 'Invalid activation timestamp. Enter a real date and time and approve it.',
  wrong_mailbox: 'The policy is not for the approved mailbox.',
  global_processing_enabled: 'Global processing is enabled. Set SUPPORT_EMAIL_PROCESSING_ENABLED to 0. The single-email test can still run.',
  bulk_processing_enabled: 'Global processing is enabled. Set SUPPORT_EMAIL_PROCESSING_ENABLED to 0. The single-email test can still run.',
  policy_exists: 'A policy for this mailbox already exists. Update it instead of creating another.',
  activation_not_approved: 'Approve the activation time before saving the policy.',
  enabled_required: 'Choose whether the policy is enabled. It is not enabled automatically.',
  invalid_mailbox: 'The policy mailbox must be support@niatindia.com.',
  boundary_change_not_confirmed: 'Confirm the activation boundary change before saving a different time.',
  attachment_stream_unavailable: 'Attachment download is unavailable.',
  download_failed: 'An attachment could not be downloaded.'
};

export function singleTestErrorCopy(code) {
  return SINGLE_TEST_ERRORS[code] || `The test failed (${code || 'unknown_error'}).`;
}

const NOT_ANALYSED_TYPES = /^image\//i;

/** True when the attachment content was never read as text (images, scanned PDFs). */
export function attachmentNotAnalysed(file) {
  if (!file) return false;
  if (NOT_ANALYSED_TYPES.test(file.contentType || '')) return true;
  if (/pdf/i.test(file.contentType || '') && !file.textAvailable) return true;
  return file.extractStatus === 'unsupported';
}

export const NO_OCR_NOTICE = 'Not analysed: images and scanned PDFs are not read because OCR is not available.';
