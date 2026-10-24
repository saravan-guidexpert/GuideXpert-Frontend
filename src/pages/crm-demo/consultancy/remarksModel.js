import { localDayKey } from '../../../utils/crmAnalytics.js';
import { activityPresentation } from './overviewModel.js';

export const REMARK_LIMIT = 500;

const REMARK_ACTIONS = new Set(['consultancy.remark_added', 'consultancy.remark_edited']);

export function isRemarkEcho(audit, remarkIds) {
  if (!REMARK_ACTIONS.has(audit?.action)) return false;
  const remarkId = audit?.after?.remarkId;
  return Boolean(remarkId) && remarkIds.has(remarkId);
}

export function eventIconKey(kind, action) {
  if (kind === 'call' || kind === 'done' || kind === 'cancelled') return kind;
  if (kind === 'status' || kind === 'student' || kind === 'referral' || kind === 'owner' || kind === 'remark') return kind;
  if (String(action || '').startsWith('contact.')) return 'contact';
  if (action === 'consultancy.updated' || action === 'consultancy.created') return 'edit';
  return 'activity';
}

export function eventTypeLabel(kind, action) {
  if (action === 'consultancy.calling_status') return 'Calling';
  if (kind === 'call' || kind === 'done' || kind === 'cancelled') return 'Follow-up';
  if (kind === 'status') return 'Status';
  if (kind === 'student') return 'Student';
  if (kind === 'referral') return 'Referral';
  if (kind === 'owner') return 'Owner';
  if (kind === 'remark') return 'Remark';
  if (String(action || '').startsWith('contact.')) return 'Contact';
  return 'System';
}

export function previousRemarkVersions(remark) {
  const history = Array.isArray(remark?.history)
    ? remark.history.filter((item) => item && item.text)
    : [];
  if (history.length) return [...history].reverse();
  if (remark?.previousText) return [{ text: remark.previousText, updatedAt: remark.updatedAt || '' }];
  return [];
}

function eventDetail(audit, view) {
  if (view.context) return view.context;
  const after = audit?.after && typeof audit.after === 'object' ? audit.after : {};
  if (after.fullName) return after.fullName;
  if (after.studentName) return after.studentName;
  if (after.name) return after.name;
  return audit?.reason || '';
}

function presentAudit(audit) {
  const view = activityPresentation(audit, new Date(0));
  return {
    title: view.title,
    detail: eventDetail(audit, view),
    actor: view.actor,
    typeLabel: eventTypeLabel(view.kind, audit?.action),
    icon: eventIconKey(view.kind, audit?.action),
  };
}

function inDateRange(iso, from, to) {
  if (!from && !to) return true;
  const key = localDayKey(iso);
  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function haystack(entry) {
  if (entry.kind === 'remark') {
    const row = entry.remark || {};
    const older = previousRemarkVersions(row).map((item) => item.text);
    return ['remark', row.text, row.authorName, ...older].join(' ');
  }
  const view = entry.view || {};
  return [view.title, view.detail, view.actor, view.typeLabel, entry.audit?.action, entry.audit?.reason].join(' ');
}

function byNewest(left, right) {
  const time = String(right.at).localeCompare(String(left.at));
  if (time) return time;
  if (left.kind !== right.kind) return left.kind === 'event' ? -1 : 1;
  return String(left.id).localeCompare(String(right.id));
}

export function buildActivityFeed({ remarks = [], audits = [], mode = 'all', query = '', from = '', to = '' } = {}) {
  const remarkRows = Array.isArray(remarks) ? remarks : [];
  const auditRows = Array.isArray(audits) ? audits : [];
  const remarkIds = new Set(remarkRows.map((row) => row.id));
  const rangeError = from && to && from > to ? 'Start date must be on or before the end date.' : '';
  const needle = String(query || '').trim().toLowerCase();
  const selected = mode === 'remarks' || mode === 'events' ? mode : 'all';

  const remarkEntries = remarkRows.map((row, index) => ({
    id: `remark:${row.id || index}`,
    kind: 'remark',
    at: row.createdAt || '',
    remark: row,
  }));
  const eventEntries = auditRows.map((row, index) => ({
    id: `audit:${row.id || index}`,
    kind: 'event',
    at: row.createdAt || '',
    audit: row,
    echo: isRemarkEcho(row, remarkIds),
    view: presentAudit(row),
  }));

  let entries = remarkEntries;
  if (selected === 'events') entries = eventEntries;
  if (selected === 'all') entries = [...remarkEntries, ...eventEntries.filter((row) => !row.echo)];

  if (rangeError) return { entries: [], rangeError };
  entries = entries.filter((row) => inDateRange(row.at, from, to));
  if (needle) entries = entries.filter((row) => haystack(row).toLowerCase().includes(needle));
  entries.sort(byNewest);
  return { entries, rangeError: '' };
}
