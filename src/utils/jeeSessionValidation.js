import { INDIAN_MOBILE_REGEX } from '../constants/oneOnOneCounselingForm';

export function validateJeeName(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > 100) return `${label} must be at most 100 characters`;
  return '';
}

export function validateJeeMobile(value, label) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return `${label} is required`;
  if (!INDIAN_MOBILE_REGEX.test(digits)) return `Enter a valid 10-digit Indian ${label.toLowerCase()}`;
  return '';
}

export function validateJeeText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

export function validateJeeRemark(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > 2000) return 'Remark must be at most 2000 characters';
  return '';
}

export function hasJeeValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}

export function validateJeeSessionStep(form, step) {
  if (step === 1) {
    return {
      name: validateJeeName(form.name, 'Name'),
      fatherName: validateJeeName(form.fatherName, "Father's name"),
      contactNumber: validateJeeMobile(form.contactNumber, 'contact number'),
    };
  }
  return {
    whatsappNumber: validateJeeMobile(form.whatsappNumber, 'WhatsApp / alternate number'),
    currentStudying: validateJeeText(form.currentStudying, 'Current studying', 120),
    collegeName: validateJeeText(form.collegeName, 'College name', 150),
    address: validateJeeText(form.address, 'Address', 160),
    remark: validateJeeRemark(form.remark),
  };
}
