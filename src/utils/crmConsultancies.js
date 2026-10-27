export const CONSULTANCY_FILTERS = Object.freeze({
  page: 1,
  limit: 20,
  q: '',
  status: '',
  assignment: '',
  userId: '',
  sort: 'name',
});

export const CONSULTANCY_SORTS = Object.freeze([
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'assignees', label: 'Most assigned staff' },
  { id: 'updated', label: 'Recently updated' },
]);

export const NAME_MIN = 2;
export const NAME_MAX = 200;
export const NOTES_MAX = 2000;
export const SEARCH_MAX = 100;

export function consultancyListQuery(filters) {
  const query = { page: filters.page || 1, limit: filters.limit || 20 };
  const q = String(filters.q || '').trim().slice(0, SEARCH_MAX);
  if (q) query.q = q;
  if (filters.status) query.status = filters.status;
  if (filters.assignment) query.assignment = filters.assignment;
  if (filters.userId) query.userId = filters.userId;
  if (filters.sort && filters.sort !== 'name') query.sort = filters.sort;
  return query;
}

export function hasActiveFilters(filters) {
  return Boolean(String(filters.q || '').trim() || filters.status || filters.assignment || filters.userId);
}

export function assignmentState(row) {
  const count = Number(row?.activeAssignees) || 0;
  if (count === 0) return { id: 'unassigned', label: 'Unassigned' };
  if (count === 1) return { id: 'assigned', label: 'Assigned' };
  return { id: 'multiple', label: `Multiple (${count})` };
}

export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`;
  return letters.toUpperCase();
}

const UNAVAILABLE = Object.freeze({
  text: 'Restricted',
  detail: 'Organization-wide totals need CRM Access Management.',
});

export function summaryCards(summary) {
  const rows = [
    { key: 'total', label: 'Total consultancies', subtitle: 'Every non-deleted consultancy' },
    { key: 'active', label: 'Active', subtitle: 'Status set to active' },
    { key: 'assigned', label: 'Assigned', subtitle: 'At least one active CRM assignee' },
    { key: 'unassigned', label: 'Unassigned', subtitle: 'No active CRM assignee' },
    { key: 'staffAssigned', label: 'CRM staff assigned', subtitle: 'Accounts holding an active assignment' },
  ];
  return rows.map((row) => {
    const value = summary ? summary[row.key] : null;
    if (value == null) return { ...row, text: UNAVAILABLE.text, detail: UNAVAILABLE.detail, unavailable: true };
    return { ...row, text: value.toLocaleString(), value, detail: row.subtitle, unavailable: false };
  });
}

export function shareRows(summary) {
  if (!summary || !summary.total) return null;
  const total = summary.total;
  const pct = (value) => Math.round((value / total) * 100);
  return [
    {
      id: 'assignment',
      label: 'Assignment coverage',
      parts: [
        { id: 'assigned', label: 'Assigned', value: summary.assigned, percent: pct(summary.assigned) },
        { id: 'unassigned', label: 'Unassigned', value: summary.unassigned, percent: pct(summary.unassigned) },
      ],
    },
    {
      id: 'status',
      label: 'Record status',
      parts: [
        { id: 'active', label: 'Active', value: summary.active, percent: pct(summary.active) },
        { id: 'inactive', label: 'Inactive', value: summary.inactive, percent: pct(summary.inactive) },
      ],
    },
  ];
}

export function staffRows(summary) {
  if (!summary || !Array.isArray(summary.staff)) return [];
  return summary.staff.map((row) => ({
    id: row.userId,
    name: row.fullName || 'Unnamed account',
    short: (row.fullName || 'Unnamed').split(/\s+/)[0],
    consultancies: row.consultancies,
    status: row.status,
  }));
}

export function resultSummary(page, limit, total) {
  if (!total) return { label: 'No results', pages: 0, showPager: false };
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const noun = total === 1 ? 'consultancy' : 'consultancies';
  return {
    label: `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} ${noun}`,
    pages,
    showPager: pages > 1,
  };
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export function historyWindow(now = new Date()) {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const from = new Date(to.getTime() - 3650 * 86400000);
  return { from: isoDay(from), to: isoDay(to) };
}

export function validateConsultancyForm(form) {
  const errors = {};
  const name = String(form.name || '').trim().replace(/\s+/g, ' ');
  const notes = String(form.notes || '').trim();
  if (name.length < NAME_MIN) errors.name = `Enter at least ${NAME_MIN} characters.`;
  else if (name.length > NAME_MAX) errors.name = `Use ${NAME_MAX} characters or fewer.`;
  if (notes.length > NOTES_MAX) errors.notes = `Use ${NOTES_MAX} characters or fewer.`;
  const status = form.status === 'inactive' ? 'inactive' : 'active';
  const body = { name, status };
  if (notes) body.notes = notes;
  return { ok: Object.keys(errors).length === 0, errors, body };
}

export function assignmentOutcome(results) {
  const saved = results.filter((row) => row.ok);
  const failed = results.filter((row) => !row.ok);
  if (!results.length) return null;
  if (!failed.length) {
    return { tone: 'success', message: `Assigned ${saved.length} staff member${saved.length === 1 ? '' : 's'}.` };
  }
  const names = failed.map((row) => `${row.name}: ${row.message}`).join(' ');
  if (!saved.length) {
    return { tone: 'error', message: `The consultancy was created, but no staff were assigned. ${names}` };
  }
  return {
    tone: 'warning',
    message: `The consultancy was created and ${saved.length} of ${results.length} assignments were saved. ${names}`,
  };
}

export function markAssigned(people, assignees) {
  const held = new Set((assignees || []).map((row) => row.id));
  return (people || []).map((person) => ({ ...person, alreadyAssigned: held.has(person.id) }));
}

export function assignedByMap(historyItems) {
  const map = new Map();
  (historyItems || []).forEach((row) => {
    if (row.state === 'active' && row.userId && !map.has(row.userId)) map.set(row.userId, row.openedBy || null);
  });
  return map;
}

export function actorName(actor) {
  if (!actor) return 'Someone';
  if (actor.displayName) return actor.displayName;
  if (actor.name) return actor.name;
  if (actor.type === 'admin') return 'Platform admin';
  if (actor.type === 'system') return 'System';
  return 'CRM user';
}

function snapshotSubject(event) {
  for (const snapshot of [event?.after, event?.before]) {
    if (!snapshot || typeof snapshot !== 'object') continue;
    const text = snapshot.fullName || snapshot.name;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  return '';
}

function actorKindLabel(actor) {
  if (!actor) return '';
  if (actor.type === 'admin') return 'Platform admin';
  if (actor.type === 'crm-user') return 'CRM staff';
  return '';
}

// Turns a raw activity event into a short who/what sentence for the drawer.
export function activityStory(event) {
  const who = actorName(event?.actor);
  const kind = actorKindLabel(event?.actor);
  const target = (event?.targetUserName || '').trim() || 'a staff member';
  const subject = snapshotSubject(event);
  const action = event?.action || '';

  let title = '';
  let detail = '';
  if (action === 'crm_assignment.created') {
    title = `${who} assigned ${target}`;
    detail = 'Gave this person access to the consultancy';
  } else if (action === 'crm_assignment.revoked') {
    title = `${who} revoked ${target}`;
    detail = 'Removed this person’s access';
  } else if (action === 'consultancy.created') {
    title = `${who} created this consultancy`;
    detail = subject ? `Named “${subject}”` : 'New consultancy record';
  } else if (action === 'consultancy.updated') {
    title = `${who} updated this consultancy`;
    detail = 'Changed consultancy details';
  } else if (action === 'student.created') {
    title = `${who} added a student`;
    detail = subject || 'New student linked here';
  } else if (action === 'student.updated') {
    title = `${who} updated a student`;
    detail = subject || 'Student record changed';
  } else if (action === 'referral.created') {
    title = `${who} recorded a referral`;
    detail = subject || 'New referral on this consultancy';
  } else if (action === 'referral.source_corrected') {
    title = `${who} corrected a referral source`;
    detail = subject || 'Referral moved to this consultancy';
  } else {
    const raw = String(event?.summary || action || 'Activity').replace(/\.$/, '');
    title = who === 'Someone' ? raw : `${who} · ${raw}`;
    detail = kind || 'Recorded in the activity log';
  }

  return {
    title,
    detail,
    who,
    when: event?.createdAt || null,
    tone: action === 'crm_assignment.revoked' ? 'warn'
      : (action === 'crm_assignment.created' || action === 'consultancy.created' ? 'ok' : 'neutral'),
  };
}
