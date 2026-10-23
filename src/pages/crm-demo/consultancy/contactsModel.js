import { normalizeIndianMobile } from '../../../utils/crmDemoStore.js';

const NAME_MESSAGE = 'Name must be 2–200 characters.';
const CONTACT_MESSAGE = 'A contact needs a mobile number or an email address.';

export function contactInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function contactStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return status ? String(status) : 'Unknown';
}

export function formatContactPhone(phone) {
  const raw = phone == null ? '' : String(phone);
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return raw;
}

export function filterContacts(contacts, { query = '', status = 'all', kind = 'all', primaryId = '' } = {}) {
  const source = Array.isArray(contacts) ? contacts : [];
  const needle = String(query || '').trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  return source.filter((row) => {
    const primary = Boolean(primaryId) && row?.id === primaryId;
    if (status === 'active' && row?.status !== 'active') return false;
    if (status === 'inactive' && row?.status !== 'inactive') return false;
    if (kind === 'primary' && !primary) return false;
    if (kind === 'other' && primary) return false;
    if (!needle) return true;
    const name = String(row?.name || '').toLowerCase();
    const email = String(row?.email || '').toLowerCase();
    const phone = String(row?.phone || '');
    if (name.includes(needle) || email.includes(needle)) return true;
    if (digits && phone.includes(digits)) return true;
    return phone.toLowerCase().includes(needle);
  });
}

export function orderContacts(contacts, primaryId) {
  const source = Array.isArray(contacts) ? contacts : [];
  if (!primaryId) return [...source];
  const primary = [];
  const rest = [];
  source.forEach((row) => {
    if (row?.id === primaryId) primary.push(row);
    else rest.push(row);
  });
  return [...primary, ...rest];
}

export function visibleContacts(contacts, filters = {}) {
  return orderContacts(filterContacts(contacts, filters), filters.primaryId || '');
}

export function validateContactDraft(draft = {}) {
  const errors = {};
  const name = String(draft.name ?? '').trim().replace(/\s+/g, ' ');
  const email = String(draft.email ?? '').trim();
  const role = String(draft.role ?? '').trim().slice(0, 80);
  let phone = String(draft.phone ?? '').trim();
  if (name.length < 2 || name.length > 200) errors.name = NAME_MESSAGE;
  if (phone) {
    try {
      phone = normalizeIndianMobile(phone);
    } catch (error) {
      errors.phone = error.message;
    }
  }
  if (!phone && !email) errors.contact = CONTACT_MESSAGE;
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, phone: errors.phone ? String(draft.phone ?? '').trim() : phone, email, role },
  };
}
