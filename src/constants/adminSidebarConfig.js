/** Admin sidebar placement: Counsellors vs Students toggle groups. */

export const SIDEBAR_MODES = ['counsellors', 'students'];
export const SIDEBAR_PLACEMENTS = ['counsellors', 'students', 'both'];
export const SIDEBAR_MODE_STORAGE_KEY = 'admin-sidebar-mode';
export const SIDEBAR_CONFIG_UPDATED_EVENT = 'admin-sidebar-config-updated';

export const DEFAULT_SECTIONS_ENABLED = {
  counsellors: true,
  students: true,
};

/** Default route → placement (sidebar-visible items only). */
export const DEFAULT_ROUTE_PLACEMENTS = {
  '/admin/dashboard': 'counsellors',
  '/admin/funnel-analytics': 'counsellors',
  '/admin/certified-counsellors': 'counsellors',
  '/admin/leads': 'counsellors',
  '/admin/analytics': 'counsellors',
  '/admin/meeting-attendance': 'counsellors',
  '/admin/export': 'counsellors',
  '/admin/slots': 'counsellors',
  '/admin/demo-meet-schedule': 'counsellors',
  '/admin/training-form-responses': 'counsellors',
  '/admin/nurturing': 'counsellors',
  '/admin/training-feedback': 'counsellors',
  '/admin/counsellor-support-requests': 'counsellors',
  '/admin/influencer-tracking': 'counsellors',
  '/admin/poster-downloads': 'counsellors',
  '/admin/college-comparisons': 'students',
  '/admin/posters': 'counsellors',
  '/admin/assessment-results': 'counsellors',
  '/admin/webinar-progress': 'counsellors',
  '/admin/blogs': 'counsellors',
  '/admin/iit-counselling': 'students',
  '/admin/iit-counselling-utm': 'students',
  '/admin/organic-rank-leads': 'students',
  '/admin/student-workspace-leads': 'students',
  '/admin/iit-meet-attendance': 'students',
  '/admin/nat-campaign': 'students',
  '/admin/calling-team/bdas': 'students',
  '/admin/one-on-one-counseling': 'students',
  '/admin/guidance-slot-bookings': 'students',
  '/admin/one-on-one-counselors': 'students',
  '/admin/ai-calls': 'students',
  '/admin/iit-ai-calls-summary': 'students',
  '/admin/whatsapp-ops': 'students',
  '/admin/lead-intelligence': 'students',
  '/admin/student-panel': 'students',
  '/admin/resources': 'students',
  '/admin/system-prompt': 'students',
};

/** Labels for settings UI (sidebar-visible routes). */
export const SIDEBAR_SETTINGS_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/funnel-analytics', label: 'Funnel Analytics' },
  { to: '/admin/certified-counsellors', label: 'Certified Counsellors' },
  { to: '/admin/leads', label: 'Lead Funnel' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/meeting-attendance', label: 'User Productivity' },
  { to: '/admin/export', label: 'Export Data' },
  { to: '/admin/slots', label: 'Slots' },
  { to: '/admin/demo-meet-schedule', label: 'Demo meet schedule' },
  { to: '/admin/training-form-responses', label: 'Training Form' },
  { to: '/admin/nurturing', label: 'Nurturing' },
  { to: '/admin/training-feedback', label: 'Activation Form' },
  { to: '/admin/counsellor-support-requests', label: 'Counsellor Support' },
  { to: '/admin/influencer-tracking', label: 'Influencer / UTM Tracking' },
  { to: '/admin/poster-downloads', label: 'Poster downloads' },
  { to: '/admin/college-comparisons', label: 'College comparisons' },
  { to: '/admin/posters', label: 'Poster automation' },
  { to: '/admin/assessment-results', label: 'Custom Reports' },
  { to: '/admin/webinar-progress', label: 'Webinar Progress' },
  { to: '/admin/blogs', label: 'Blog Management' },
  { to: '/admin/iit-counselling', label: 'IIT Counselling' },
  { to: '/admin/iit-counselling-utm', label: 'IIT Counselling UTM' },
  { to: '/admin/organic-rank-leads', label: 'Organic rank leads' },
  { to: '/admin/student-workspace-leads', label: 'Student workspace leads' },
  { to: '/admin/iit-meet-attendance', label: 'IIT Meet Attendance' },
  { to: '/admin/nat-campaign', label: 'One on One IIT Session' },
  { to: '/admin/calling-team/bdas', label: 'BDA Management' },
  { to: '/admin/one-on-one-counseling', label: '1-on-1 Counseling' },
  { to: '/admin/guidance-slot-bookings', label: 'Guidance Slot Bookings' },
  { to: '/admin/one-on-one-counselors', label: 'One-on-One Counselors' },
  { to: '/admin/ai-calls', label: 'AI Calls' },
  { to: '/admin/iit-ai-calls-summary', label: 'IITian AI Calls Summary' },
  { to: '/admin/whatsapp-ops', label: 'WhatsApp ops' },
  { to: '/admin/lead-intelligence', label: 'Chatbot Lead Intelligence' },
  { to: '/admin/student-panel', label: 'Student panel' },
  { to: '/admin/resources', label: 'Resources' },
  { to: '/admin/system-prompt', label: 'System Prompt' },
];

export function getDefaultSidebarConfig() {
  return {
    sectionsEnabled: { ...DEFAULT_SECTIONS_ENABLED },
    overrides: {},
  };
}

export function mergeSidebarConfig(saved) {
  const defaults = getDefaultSidebarConfig();
  if (!saved || typeof saved !== 'object') return defaults;

  const sectionsEnabled = {
    counsellors:
      saved.sectionsEnabled && typeof saved.sectionsEnabled.counsellors === 'boolean'
        ? saved.sectionsEnabled.counsellors
        : defaults.sectionsEnabled.counsellors,
    students:
      saved.sectionsEnabled && typeof saved.sectionsEnabled.students === 'boolean'
        ? saved.sectionsEnabled.students
        : defaults.sectionsEnabled.students,
  };

  const overrides = {};
  if (saved.overrides && typeof saved.overrides === 'object') {
    for (const [route, placement] of Object.entries(saved.overrides)) {
      if (SIDEBAR_PLACEMENTS.includes(placement)) {
        overrides[route] = placement;
      }
    }
  }

  return { sectionsEnabled, overrides };
}

export function getItemPlacement(item, config) {
  const route = item.to;
  if (config?.overrides?.[route] && SIDEBAR_PLACEMENTS.includes(config.overrides[route])) {
    return config.overrides[route];
  }
  if (item.sidebarPlacement && SIDEBAR_PLACEMENTS.includes(item.sidebarPlacement)) {
    return item.sidebarPlacement;
  }
  return DEFAULT_ROUTE_PLACEMENTS[route] || 'students';
}

export function itemVisibleInMode(item, mode, config) {
  const placement = getItemPlacement(item, config);
  if (placement === 'both') return true;
  return placement === mode;
}

export function getDefaultPlacementForRoute(route) {
  return DEFAULT_ROUTE_PLACEMENTS[route] || 'students';
}

export function readSidebarMode() {
  try {
    const stored = localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
    if (stored === 'counsellors' || stored === 'students') return stored;
  } catch {
    // ignore
  }
  return 'counsellors';
}

export function writeSidebarMode(mode) {
  try {
    if (mode === 'counsellors' || mode === 'students') {
      localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // ignore
  }
}

export function resolveActiveSidebarMode(storedMode, sectionsEnabled) {
  const counsellorsOn = sectionsEnabled?.counsellors !== false;
  const studentsOn = sectionsEnabled?.students !== false;
  if (counsellorsOn && !studentsOn) return 'counsellors';
  if (studentsOn && !counsellorsOn) return 'students';
  if (storedMode === 'students' && studentsOn) return 'students';
  if (storedMode === 'counsellors' && counsellorsOn) return 'counsellors';
  if (counsellorsOn) return 'counsellors';
  if (studentsOn) return 'students';
  return 'counsellors';
}
