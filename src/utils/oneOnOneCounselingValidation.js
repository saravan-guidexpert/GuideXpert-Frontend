import { INDIAN_MOBILE_REGEX } from '../constants/oneOnOneCounselingForm';

export function validateName(value, label = 'Name') {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return `${label} is required`;
  if (t.length < 2) return `${label} must be at least 2 characters`;
  if (t.length > 100) return `${label} must be at most 100 characters`;
  return '';
}

export function validateIndianMobile(value, label = 'Mobile number') {
  const d = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!d) return `${label} is required`;
  if (!INDIAN_MOBILE_REGEX.test(d)) return `Enter a valid 10-digit Indian ${label.toLowerCase()}`;
  return '';
}

export function validateRequiredSelect(value, label) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return `Please select ${label}`;
  return '';
}

export function validateOneOnOneForm(form) {
  return {
    studentName: validateName(form.studentName, 'Student name'),
    mobileNumber: validateIndianMobile(form.mobileNumber, 'Student mobile'),
    currentClass: validateRequiredSelect(form.currentClass, 'current class'),
    sessionAttendee: validateRequiredSelect(form.sessionAttendee, 'who will attend'),
    interestedBranch: validateRequiredSelect(form.interestedBranch, 'branch'),
    collegeBudget: validateRequiredSelect(form.collegeBudget, 'college budget'),
    preferredLanguage: validateRequiredSelect(form.preferredLanguage, 'language'),
    preferredTimeSlot: validateRequiredSelect(form.preferredTimeSlot, 'session slot'),
  };
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}

export const ONE_ON_ONE_STEP_CONFIG = {
  1: ['studentName', 'mobileNumber'],
  2: [
    'currentClass',
    'sessionAttendee',
    'interestedBranch',
    'collegeBudget',
    'preferredLanguage',
    'preferredTimeSlot',
  ],
};

export function validateOneOnOneFormStep(form, step) {
  const all = validateOneOnOneForm(form);
  const keys = ONE_ON_ONE_STEP_CONFIG[step] || [];
  return Object.fromEntries(keys.map((k) => [k, all[k] || '']));
}
