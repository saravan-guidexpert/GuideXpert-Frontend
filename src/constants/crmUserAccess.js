export const CRM_ACCESS_SECTION = 'crm-access-management';

export const CRM_PERMISSIONS = [
  'crm.dashboard.read',
  'crm.students.read',
  'crm.students.create',
  'crm.students.update',
  'crm.consultancies.read',
  'crm.consultancies.create',
  'crm.consultancies.update',
  'crm.referrals.read',
  'crm.referrals.create',
  'crm.referrals.correct_source',
  'crm.analytics.read',
  'crm.calendar.read',
  'crm.audit.read',
  'crm.users.read',
  'crm.users.create',
  'crm.users.update',
  'crm.users.deactivate',
  'crm.roles.manage',
];

export const CRM_ROLES = {
  crm_administrator: {
    label: 'CRM Administrator',
    permissions: CRM_PERMISSIONS,
  },
  crm_manager: {
    label: 'CRM Manager',
    permissions: [
      'crm.dashboard.read',
      'crm.students.read',
      'crm.students.create',
      'crm.students.update',
      'crm.consultancies.read',
      'crm.consultancies.create',
      'crm.consultancies.update',
      'crm.referrals.read',
      'crm.referrals.create',
      'crm.referrals.correct_source',
      'crm.analytics.read',
      'crm.calendar.read',
      'crm.audit.read',
    ],
  },
  crm_viewer: {
    label: 'CRM Viewer',
    permissions: CRM_PERMISSIONS.filter((key) => key.endsWith('.read')),
  },
};

export const CRM_ROLE_OPTIONS = Object.entries(CRM_ROLES).map(([id, role]) => ({ id, label: role.label }));

const PERMISSION_LABELS = {
  'crm.dashboard.read': 'Dashboard',
  'crm.students.read': 'View students',
  'crm.students.create': 'Create students',
  'crm.students.update': 'Update students',
  'crm.consultancies.read': 'View consultancies',
  'crm.consultancies.create': 'Create consultancies',
  'crm.consultancies.update': 'Update consultancies',
  'crm.referrals.read': 'View referrals',
  'crm.referrals.create': 'Create referrals',
  'crm.referrals.correct_source': 'Correct referral source',
  'crm.analytics.read': 'Analytics',
  'crm.calendar.read': 'Calendar',
  'crm.audit.read': 'Activity',
  'crm.users.read': 'View CRM users',
  'crm.users.create': 'Create CRM users',
  'crm.users.update': 'Update CRM users',
  'crm.users.deactivate': 'Deactivate CRM users',
  'crm.roles.manage': 'Manage roles',
};

export function permissionLabel(key) {
  return PERMISSION_LABELS[key] || key;
}

export function permissionsForRole(role) {
  return CRM_ROLES[role] ? [...CRM_ROLES[role].permissions] : [];
}

export function adminCanManageCrmUsers(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  return Array.isArray(user.sectionAccess) && user.sectionAccess.includes(CRM_ACCESS_SECTION);
}

export function crmCan(user, permission) {
  return Boolean(user && Array.isArray(user.permissions) && user.permissions.includes(permission));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCrmAccountForm(form, mode) {
  const errors = {};
  const name = String(form.fullName || '').trim();
  const email = String(form.email || '').trim();
  const password = String(form.password || '');
  if (name.length < 2 || name.length > 120) errors.fullName = 'Enter the full name.';
  if (!EMAIL_PATTERN.test(email) || email.length > 200) errors.email = 'Enter a valid email.';
  if (form.username && !/^[a-z0-9._@+-]{3,120}$/i.test(String(form.username).trim())) {
    errors.username = 'Use 3–120 letters, numbers, or . _ @ + -.';
  }
  if (!CRM_ROLES[form.role]) errors.role = 'Choose a role.';
  if (!Array.isArray(form.permissions) || form.permissions.length === 0) {
    errors.permissions = 'Select at least one permission.';
  } else if (CRM_ROLES[form.role]) {
    const allowed = new Set(CRM_ROLES[form.role].permissions);
    if (form.permissions.some((key) => !allowed.has(key))) errors.permissions = 'Permissions must belong to the selected role.';
  }
  if (mode === 'create' && !form.invite) {
    if (password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'Use 10–128 characters with a letter and a number.';
    }
  }
  return errors;
}

export function userListQuery({ q = '', role = '', status = '', page = 1, limit = 20 } = {}) {
  return {
    q: String(q).trim(),
    role: role || '',
    status: status || '',
    page: Math.max(1, Number(page) || 1),
    limit,
  };
}

export function clampPage(page, limit, total) {
  const pages = Math.max(1, Math.ceil(Number(total) / Number(limit || 1)));
  return Math.min(pages, Math.max(1, Number(page) || 1));
}
