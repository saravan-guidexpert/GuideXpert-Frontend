import { activityTitle } from '../crmFormat.js';
import { localDayKey, parseIso } from '../../../utils/crmAnalytics.js';

export function followTone(status) {
  if (status === 'Interested' || status === 'Meeting Completed' || status === 'On - Boarded') return 'on';
  if (status === 'Not Interested' || status === 'Discontinued') return 'off';
  if (status === 'Meeting Scheduled' || status === 'Follow-up Required' || status === 'Onboarding in Progress') return 'warn';
  if (status === 'On Hold') return 'hold';
  return 'pending';
}

export function callTone(status) {
  if (status === 'Connected' || status === 'WhatsApp Call Connected' || status === 'Interested') return 'on';
  if (status === 'Not Interested' || status === 'Invalid Number' || status === 'Switched Off') return 'off';
  if (status === 'Call Back Requested' || status === 'Meeting Scheduled' || status === 'Follow-up Required' || status === 'Busy') return 'warn';
  if (status === 'Not Answered') return 'hold';
  return 'pending';
}

export function exactDateTime(iso) {
  const date = parseIso(iso);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(iso, now) {
  const date = parseIso(iso);
  if (!date) return '';
  const delta = now.getTime() - date.getTime();
  if (delta < 0) return '';
  const minute = 60000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return 'Just now';
  if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  if (delta < 14 * day) return `${Math.floor(delta / day)}d ago`;
  return '';
}

function actionState(when, now) {
  if (when.getTime() < now.getTime()) return 'overdue';
  if (localDayKey(when) === localDayKey(now)) return 'due';
  return 'scheduled';
}

function calendarBucket(when, now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (when.getTime() < start) return 'overdue';
  if (localDayKey(when) === localDayKey(now)) return 'dueToday';
  return 'upcoming';
}

export function selectNextAction(followUps, consultancy, now) {
  const open = (followUps || []).filter((row) => !row.cancelledAt && !row.completedAt && row.scheduledAt && parseIso(row.scheduledAt));
  const byTime = (left, right) => parseIso(left.scheduledAt) - parseIso(right.scheduledAt);
  const overdue = open.filter((row) => parseIso(row.scheduledAt).getTime() < now.getTime()).sort(byTime);
  const upcoming = open.filter((row) => parseIso(row.scheduledAt).getTime() >= now.getTime()).sort(byTime);
  const chosen = overdue[0] || upcoming[0];
  if (chosen) {
    const when = parseIso(chosen.scheduledAt);
    return {
      id: chosen.id,
      type: chosen.status || consultancy?.followUpStatus || 'Follow-up',
      scheduledAt: chosen.scheduledAt,
      owner: chosen.actorName || consultancy?.ownerName || 'Unassigned',
      state: actionState(when, now),
      bucket: calendarBucket(when, now),
      canComplete: true,
      followUp: chosen,
    };
  }
  const fallback = consultancy?.nextFollowUpAt ? parseIso(consultancy.nextFollowUpAt) : null;
  if (!fallback) return null;
  return {
    id: null,
    type: consultancy.followUpStatus || 'Follow-up',
    scheduledAt: consultancy.nextFollowUpAt,
    owner: consultancy.ownerName || 'Unassigned',
    state: actionState(fallback, now),
    bucket: calendarBucket(fallback, now),
    canComplete: false,
    followUp: null,
  };
}

export function attentionItems({ buckets, consultancy, unreferredCount, followUpsAvailable = true }) {
  const items = [];
  if (followUpsAvailable && buckets) {
    if (buckets.overdue.length) {
      items.push({
        id: 'overdue',
        severity: 'high',
        severityLabel: 'Overdue',
        count: buckets.overdue.length,
        label: buckets.overdue.length === 1 ? 'overdue follow-up' : 'overdue follow-ups',
        detail: 'Open follow-ups already past their date',
        action: 'calendar',
        bucket: 'overdue',
        cta: 'Review',
      });
    }
    if (buckets.dueToday.length) {
      items.push({
        id: 'today',
        severity: 'high',
        severityLabel: 'Today',
        count: buckets.dueToday.length,
        label: buckets.dueToday.length === 1 ? 'follow-up due today' : 'follow-ups due today',
        detail: 'Scheduled for today',
        action: 'calendar',
        bucket: 'dueToday',
        cta: 'Open',
      });
    }
    if (buckets.dueSoon.length) {
      items.push({
        id: 'soon',
        severity: 'medium',
        severityLabel: 'Due soon',
        count: buckets.dueSoon.length,
        label: buckets.dueSoon.length === 1 ? 'follow-up due within 7 days' : 'follow-ups due within 7 days',
        detail: 'Coming up after today',
        action: 'calendar',
        bucket: 'upcoming',
        cta: 'Open',
      });
    }
  }
  if (consultancy && !consultancy.lastContactAt) {
    items.push({
      id: 'contact',
      severity: 'missing',
      severityLabel: 'Missing',
      count: null,
      label: 'No recorded contact',
      detail: 'There is no last-contact time on this consultancy',
      action: 'schedule',
      bucket: '',
      cta: 'Schedule call',
    });
  }
  if (consultancy && !consultancy.primaryContact) {
    items.push({
      id: 'primary',
      severity: 'missing',
      severityLabel: 'Missing',
      count: null,
      label: 'Missing primary contact',
      detail: 'Add a contact before the next call',
      action: 'contacts',
      bucket: '',
      cta: 'Add contact',
    });
  }
  if (unreferredCount) {
    items.push({
      id: 'unreferred',
      severity: 'low',
      severityLabel: 'Review',
      count: unreferredCount,
      label: unreferredCount === 1 ? 'student has no referral' : 'students have no referral',
      detail: 'Student profiles that are not tied to any consultancy',
      action: 'students',
      bucket: '',
      cta: 'Open students',
    });
  }
  return items;
}

export function bottleneckStatus(rows) {
  let best = null;
  let tied = false;
  (rows || []).forEach((row) => {
    if (!row.count) return;
    if (!best || row.count > best.count) {
      best = row;
      tied = false;
    } else if (row.count === best.count) {
      tied = true;
    }
  });
  return best && !tied ? best.status : null;
}

export function pipelineShare(count, total) {
  if (!total) return null;
  return Math.round((count / total) * 100);
}

export function referralPeriodHint(comparison, range) {
  if (!range?.start || range.invalid || !comparison) return 'First source is this consultancy';
  const base = `${comparison.current} in this range`;
  if (!comparison.previous) return base;
  const sign = comparison.absolute > 0 ? '+' : '';
  return `${base} · ${sign}${comparison.absolute} vs previous`;
}

export function activityPresentation(row, now) {
  const after = row?.after || {};
  let title = activityTitle(row?.action);
  let context = '';
  let kind = row?.action || 'activity';
  if (row?.action === 'consultancy.follow_up') {
    if (after.followUpStatus === 'Meeting Scheduled') {
      title = 'Call scheduled';
      kind = 'call';
    } else if (after.followUpStatus === 'Meeting Completed' || after.followUpStatus === 'Contacted') {
      title = 'Follow-up completed';
      kind = 'done';
    } else {
      title = 'Consultancy status updated';
      kind = 'status';
    }
    context = after.followUpStatus || '';
  } else if (row?.action === 'consultancy.owner_reassigned') {
    title = 'Ownership changed';
    context = after.ownerName || '';
    kind = 'owner';
  } else if (row?.action === 'consultancy.remark_added' || row?.action === 'consultancy.remark_edited') {
    kind = 'remark';
  } else if (row?.action === 'student.created') {
    kind = 'student';
  } else if (row?.action === 'referral.created') {
    kind = 'referral';
  } else if (row?.action === 'consultancy.calling_status') {
    kind = 'call';
    context = after.callingStatus || '';
  } else if (row?.action === 'consultancy.follow_up_cancelled') {
    kind = 'cancelled';
  }
  return {
    title,
    context,
    kind,
    actor: row?.actorLabel || 'Demo',
    relative: relativeTime(row?.createdAt, now),
    exact: exactDateTime(row?.createdAt),
    createdAt: row?.createdAt || '',
  };
}

export function actionStateLabel(state) {
  if (state === 'overdue') return 'Overdue';
  if (state === 'due') return 'Due today';
  return 'Scheduled';
}
