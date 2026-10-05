import { INDIAN_MOBILE_REGEX } from '../constants/oneOnOneCounselingForm';

export function validateMockTestName(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'Name is required';
  if (text.length < 2) return 'Name must be at least 2 characters';
  if (text.length > 100) return 'Name must be at most 100 characters';
  return '';
}

export function validateMockTestMobile(value, label) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return `${label} is required`;
  if (!INDIAN_MOBILE_REGEX.test(digits)) return `Enter a valid 10-digit Indian ${label.toLowerCase()}`;
  return '';
}

export function validateMockTestText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

export function validateMockTestRemarks(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > 2000) return 'Remarks must be at most 2000 characters';
  return '';
}

export function hasMockTestValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}

export function validateMockTestStep(form, step) {
  if (step === 1) {
    return {
      name: validateMockTestName(form.name),
      contactNumber: validateMockTestMobile(form.contactNumber, 'contact number'),
    };
  }
  return {
    whatsappNumber: validateMockTestMobile(form.whatsappNumber, 'WhatsApp / alternate number'),
    collegeName: validateMockTestText(form.collegeName, 'College name', 150),
    address: validateMockTestText(form.address, 'Address', 160),
    remarks: validateMockTestRemarks(form.remarks),
  };
}
