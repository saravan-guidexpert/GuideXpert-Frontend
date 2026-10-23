import { INDIAN_MOBILE_REGEX } from '../constants/oneOnOneCounselingForm';
import { CURRENT_STUDYING_OPTIONS } from '../constants/jeeMainMockTestForm';

export function validateStudentName(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'Student name is required';
  if (text.length < 2) return 'Student name must be at least 2 characters';
  if (text.length > 100) return 'Student name must be at most 100 characters';
  return '';
}

export function validateIndianMobile(value, label) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return `${label} is required`;
  if (!INDIAN_MOBILE_REGEX.test(digits)) return `Enter a valid 10-digit Indian ${label.toLowerCase()}`;
  return '';
}

export function validateCurrentStudying(value) {
  if (!value) return 'Current studying is required';
  if (!CURRENT_STUDYING_OPTIONS.includes(value)) return 'Select a current studying option';
  return '';
}

export function validateRequiredText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

export function validateRemarks(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > 2000) return 'Remarks must be at most 2000 characters';
  return '';
}

export function hasJeeMainMockTestErrors(errors) {
  return Object.values(errors).some(Boolean);
}

export function validateJeeMainMockTestStep(form, step) {
  if (step === 1) {
    return {
      studentName: validateStudentName(form.studentName),
      mobileNumber: validateIndianMobile(form.mobileNumber, 'Mobile number'),
    };
  }
  return {
    whatsappNumber: validateIndianMobile(form.whatsappNumber, 'WhatsApp number'),
    currentStudying: validateCurrentStudying(form.currentStudying),
    collegeName: validateRequiredText(form.collegeName, 'College name', 150),
    location: validateRequiredText(form.location, 'Location', 120),
    remarks: validateRemarks(form.remarks),
  };
}
