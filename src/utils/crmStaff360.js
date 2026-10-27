import { PHASE_A_TIME_ZONE } from './crmWorkspace.js';

export const STAFF360_TABS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'consultancies', label: 'Consultancies' },
  { id: 'students', label: 'Students' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'day-end', label: 'Day-End Report' },
]);

export const PRESENCE_MEANINGS = Object.freeze({
  online: 'Valid session with a heartbeat in the last two minutes. Not proof of productive work.',
  idle: 'Valid session whose last heartbeat is older than two minutes. Not measured idle working time.',
  offline: 'No valid unexpired session.',
  invited: 'Account invited but not yet active.',
  inactive: 'Account deactivated.',
});

export function staff360Query({
  date,
  from,
  to,
  timeZone = PHASE_A_TIME_ZONE,
  consultancyPage = 1,
  consultancyLimit = 8,
  studentPage = 1,
  studentLimit = 8,
  studentQ = '',
  admissionStatus = '',
  consultancyId = '',
  followUpState = '',
} = {}) {
  const query = {
    date: date || '',
    from: from || date || '',
    to: to || date || '',
    timeZone,
    consultancyPage,
    consultancyLimit,
    studentPage,
    studentLimit,
  };
  if (studentQ) query.studentQ = studentQ;
  if (admissionStatus) query.admissionStatus = admissionStatus;
  if (consultancyId) query.consultancyId = consultancyId;
  if (followUpState) query.followUpState = followUpState;
  return query;
}

export function filterStaffDirectory(rows, { q = '', role = '', status = '', presence = '' } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  return (rows || []).filter((person) => {
    if (role && person.role !== role) return false;
    if (status && person.status !== status) return false;
    if (presence) {
      // Inactive / invited are account states, not heartbeat presence.
      if (presence === 'inactive' || presence === 'invited') {
        if (person.status !== presence) return false;
      } else if (person.presence?.state !== presence) {
        return false;
      }
    }
    if (!needle) return true;
    const hay = `${person.fullName || ''} ${person.email || ''} ${person.username || ''}`.toLowerCase();
    return hay.includes(needle);
  });
}

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return 'Not available';
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0 && minutes <= 0) return total > 0 ? `${total}s` : '0m';
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** Compact clock for same-day session metrics (full stamp stays in title/tooltip). */
export function formatCompactTime(value, timeZone = PHASE_A_TIME_ZONE) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export function staff360HeaderCards(data) {
  if (!data?.profile) return [];
  const day = data.day || {};
  const summary = data.summary || {};
  const sessions = day.sessions || {};
  const dayLabel = day.date ? `on ${day.date}` : 'on selected day';
  const sessionAvailable = sessions.totalObservedMs != null && !Number.isNaN(Number(sessions.totalObservedMs));
  return [
    {
      id: 'first-login',
      label: 'First login',
      value: day.firstLoginAt || null,
      kind: 'datetime',
      scope: 'day',
      icon: 'log-in',
      hint: `First crm_user.login_succeeded ${dayLabel}.`,
      tab: 'sessions',
    },
    {
      id: 'last-login',
      label: 'Latest login',
      value: day.lastLoginAt || null,
      kind: 'datetime',
      scope: 'day',
      icon: 'clock',
      hint: day.loginCount > 1
        ? `${day.loginCount} successful logins recorded ${dayLabel}.`
        : `Same as first login when only one success exists ${dayLabel}.`,
      tab: 'sessions',
    },
    {
      id: 'session',
      label: 'Observed session span',
      value: sessionAvailable ? formatDuration(sessions.totalObservedMs) : null,
      kind: 'text',
      scope: 'day',
      icon: 'activity',
      empty: '—',
      hint: sessions.totalObservedLabel || 'Merged observed elapsed time for the selected day. Not verified working hours.',
      tab: 'sessions',
    },
    {
      id: 'houses',
      label: 'Assigned consultancies',
      value: summary.assignedConsultancies ?? null,
      kind: 'number',
      scope: 'current',
      icon: 'briefcase',
      hint: summary.meaning?.assignedConsultancies || 'Current active assignments visible to you.',
      tab: 'consultancies',
    },
    {
      id: 'students',
      label: 'Assigned students',
      value: summary.assignedStudents ?? null,
      kind: 'number',
      scope: 'current',
      icon: 'users',
      hint: summary.meaning?.assignedStudents || 'Students via current referral → assigned consultancy.',
      tab: 'students',
    },
    {
      id: 'open-followups',
      label: 'Open follow-ups',
      value: summary.openFollowUps ?? null,
      kind: 'number',
      scope: 'current',
      icon: 'flag',
      hint: summary.meaning?.openFollowUps || 'Open follow-ups on currently assigned consultancies.',
      tab: 'students',
    },
    {
      id: 'overdue-followups',
      label: 'Overdue follow-ups',
      value: summary.overdueFollowUps ?? null,
      kind: 'number',
      scope: 'current',
      icon: 'alert',
      hint: summary.meaning?.overdueFollowUps || 'Open follow-ups with scheduledAt before now.',
      tab: 'students',
    },
    {
      id: 'business',
      label: 'Business actions',
      value: summary.businessEvents ?? null,
      kind: 'number',
      scope: 'period',
      icon: 'zap',
      hint: summary.meaning?.businessEvents || 'Attributed audits in the selected period. Not a productivity score.',
      tab: 'timeline',
    },
  ];
}

/** Current-snapshot follow-up intel for Overview. Completed-in-period is not on this API. */
export function staff360FollowUpIntel(data) {
  const summary = data?.summary;
  if (!summary) {
    return {
      open: null,
      overdue: null,
      dueToday: null,
      upcoming: null,
      completedPeriod: null,
      houses: null,
    };
  }
  return {
    open: summary.openFollowUps ?? null,
    overdue: summary.overdueFollowUps ?? null,
    dueToday: summary.dueTodayFollowUps ?? null,
    upcoming: summary.upcomingFollowUps ?? null,
    completedPeriod: null,
    houses: summary.assignedConsultancies ?? null,
  };
}

export function admissionChartRows(distribution) {
  return (distribution || [])
    .filter((row) => row.count > 0)
    .map((row) => ({ status: row.status, count: row.count }));
}

export function businessChartRows(byAction) {
  return (byAction || []).slice(0, 8).map((row) => ({
    action: String(row.action || '').replace(/^crm_/, '').replace(/\./g, ' '),
    count: row.count,
  }));
}

export function staff360EmptyMessage(section) {
  const messages = {
    consultancies: 'No consultancy assignments',
    students: 'No linked students',
    sessions: 'No sessions on this day',
    overview: 'No associated students yet',
    business: 'No recorded business activity in this period',
    'day-end': 'No recorded day-end events',
    followups: 'No open follow-ups on assigned consultancies',
    recent: 'No recent business events in range',
  };
  return messages[section] || 'Nothing to show';
}

export function formatActionLabel(action) {
  return String(action || '')
    .replace(/^crm_/, '')
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .trim() || 'Recorded action';
}

/** Focus day for Staff 360 day metrics — prefer a single selected day, else range end. */
export function staff360FocusDate({ from = '', to = '', fallback = '' } = {}) {
  if (from && to && from === to) return from;
  if (to) return to;
  if (from) return from;
  return fallback || '';
}
