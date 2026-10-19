export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

export function avatarColor(name) {
  const colors = ['#f0b7ae', '#f3d48a', '#b7d7c8', '#c5c0ee', '#9ec0e6', '#f3c4d4'];
  let total = 0;
  const value = String(name || '');
  for (let index = 0; index < value.length; index += 1) total += value.charCodeAt(index);
  return colors[total % colors.length];
}

export function shortDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  if (!key) return 'Any date';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const ACTIVITY_TITLES = {
  'student.created': 'Student created',
  'student.updated': 'Student updated',
  'consultancy.created': 'Consultancy created',
  'consultancy.updated': 'Consultancy updated',
  'contact.created': 'Contact added',
  'contact.updated': 'Contact updated',
  'contact.deactivated': 'Contact deactivated',
  'referral.created': 'Referral recorded',
  'referral.source_corrected': 'Referral source corrected',
  'demo_manager.simulated': 'Demo manager changed',
  'demo_role.previewed': 'Demo role preview',
  'consultancy.follow_up': 'Follow-up updated',
  'consultancy.follow_up_cancelled': 'Follow-up cancelled',
  'consultancy.remark_added': 'Remark added',
  'consultancy.remark_edited': 'Remark edited',
  'consultancy.owner_reassigned': 'Owner reassigned',
};

export function activityTitle(action) {
  if (ACTIVITY_TITLES[action]) return ACTIVITY_TITLES[action];
  const text = String(action || 'Activity').replace(/[._]/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function itemsOf(result) {
  return result && result.success && result.data && Array.isArray(result.data.items) ? result.data.items : [];
}

export function currentConsultancyName(referral, consultancies = []) {
  if (!referral) return '—';
  const live = consultancies.find((row) => row.id === referral.consultancyId);
  return live?.name || referral.consultancyName || '—';
}

export function inMonthRange(iso, from, to) {
  const key = monthKey(iso);
  if (!key) return !from && !to;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}
