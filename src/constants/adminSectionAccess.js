/** Canonical admin section keys — must match AdminLayout nav sectionKey and backend adminSectionKeys. */

export const ADMIN_SECTION_OPTIONS = [
  { sectionKey: 'dashboard', label: 'Dashboard' },
  { sectionKey: 'funnel-analytics', label: 'Funnel Analytics' },
  { sectionKey: 'certified-counsellors', label: 'Certified Counsellors' },
  { sectionKey: 'leads', label: 'Lead Funnel' },
  { sectionKey: 'iit-counselling', label: 'IIT Counselling' },
  { sectionKey: 'calling-team', label: 'Calling Team' },
  { sectionKey: 'calling-data', label: 'Calling Data' },
  { sectionKey: 'analytics', label: 'Analytics' },
  { sectionKey: 'meeting-attendance', label: 'User Productivity' },
  { sectionKey: 'iit-meet-attendance', label: 'IIT Meet Attendance' },
  { sectionKey: 'export', label: 'Export Data' },
  { sectionKey: 'slots', label: 'Slots' },
  { sectionKey: 'training-form-responses', label: 'Training Form' },
  { sectionKey: 'college-dost', label: 'CollegeDost' },
  { sectionKey: 'one-on-one-counseling', label: '1-on-1 Counseling' },
  { sectionKey: 'lead-intelligence', label: 'Chatbot Lead Intelligence' },
  { sectionKey: 'human-copilot', label: 'Human Copilot' },
  { sectionKey: 'guidance-slot-bookings', label: 'Guidance Slot Bookings' },
  { sectionKey: 'one-on-one-counselors-admin', label: 'One-on-One Counselors' },
  { sectionKey: 'training-feedback', label: 'Activation Form' },
  { sectionKey: 'influencer-tracking', label: 'Influencer / UTM Tracking' },
  { sectionKey: 'poster-downloads', label: 'Poster downloads' },
  { sectionKey: 'poster-automation', label: 'Poster automation' },
  { sectionKey: 'assessment-results', label: 'Custom Reports' },
  { sectionKey: 'webinar-progress', label: 'Webinar Progress' },
  { sectionKey: 'bulk-certificates', label: 'Bulk Certificates' },
  { sectionKey: 'blogs', label: 'Blog Management' },
  { sectionKey: 'osvi-calls', label: 'OSVI Calls' },
  { sectionKey: 'osvi-calls-data', label: 'OSVI calls Data' },
  { sectionKey: 'ai-calls', label: 'AI Calls' },
  { sectionKey: 'iit-ai-calls-summary', label: 'IITian AI Calls Summary' },
  { sectionKey: 'whatsapp-ops', label: 'WhatsApp ops' },
  { sectionKey: 'student-workspace', label: 'Student panel' },
  { sectionKey: 'resources', label: 'Resources' },
  // Legacy keys — still valid for existing admin grants; prefer student-workspace for new access
  { sectionKey: 'student-workspace-updates', label: 'Student panel (updates, legacy)' },
  { sectionKey: 'student-testimonials', label: 'Student panel (testimonials, legacy)' },
  { sectionKey: 'settings', label: 'Settings' },
  { sectionKey: 'system-prompt', label: 'System Prompt' },
];

export const ADMIN_SECTION_KEYS = ADMIN_SECTION_OPTIONS.map((o) => o.sectionKey);

export const ADMIN_SECTION_GROUPS = [
  {
    id: 'counsellors',
    label: 'GuideXpert Counsellors',
    sectionKeys: [
      'dashboard',
      'funnel-analytics',
      'certified-counsellors',
      'leads',
      'analytics',
      'meeting-attendance',
      'export',
      'slots',
      'training-form-responses',
      'college-dost',
      'training-feedback',
      'influencer-tracking',
      'poster-downloads',
      'poster-automation',
      'assessment-results',
      'webinar-progress',
      'blogs',
      'bulk-certificates',
      'osvi-calls',
      'osvi-calls-data',
    ],
  },
  {
    id: 'students',
    label: 'GuideXpert Students',
    sectionKeys: [
      'iit-counselling',
      'iit-meet-attendance',
      'calling-team',
      'calling-data',
      'one-on-one-counseling',
      'guidance-slot-bookings',
      'one-on-one-counselors-admin',
      'ai-calls',
      'iit-ai-calls-summary',
      'whatsapp-ops',
      'lead-intelligence',
      'human-copilot',
      'student-workspace',
      'resources',
      'system-prompt',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    sectionKeys: ['settings'],
  },
];

/** Keys shown in Manage Admins UI (hide legacy aliases). */
export const ADMIN_SECTION_OPTIONS_FOR_UI = ADMIN_SECTION_OPTIONS.filter(
  (o) => o.sectionKey !== 'student-workspace-updates' && o.sectionKey !== 'student-testimonials'
);

const labelByKey = Object.fromEntries(ADMIN_SECTION_OPTIONS.map((o) => [o.sectionKey, o.label]));

export function getSectionLabel(sectionKey) {
  return labelByKey[sectionKey] || sectionKey;
}

export function getSectionLabels(keys) {
  if (!Array.isArray(keys)) return [];
  return keys.map((k) => getSectionLabel(k)).filter(Boolean);
}

export const ALL_SECTION_KEYS = [...ADMIN_SECTION_KEYS];
