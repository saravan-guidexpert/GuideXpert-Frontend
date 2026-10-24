import { statusOf } from '../../../utils/crmAnalytics.js';

export const PERIODS = [
  { id: '30', label: '30d', full: 'Last 30 days' },
  { id: '90', label: '90d', full: 'Last 90 days' },
  { id: '12', label: '12mo', full: 'Last 12 months' },
  { id: 'year', label: 'Year', full: 'This year' },
  { id: 'all', label: 'All', full: 'All time' },
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function localDayStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayKey(date) {
  return localDayStamp(date);
}

function monthStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function countBetween(rows, start, end) {
  const from = start.getTime();
  const to = end.getTime();
  return rows.filter((row) => {
    const time = new Date(row.createdAt).getTime();
    return !Number.isNaN(time) && time >= from && time <= to;
  }).length;
}

function delta(change, noun) {
  if (change === 0) return `same ${noun}s`;
  const word = Math.abs(change) === 1 ? noun : `${noun}s`;
  return change > 0 ? `${change} more ${word}` : `${Math.abs(change)} fewer ${word}`;
}

function dailyBuckets(now, days) {
  const end = startOfDay(now);
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(end, index - (days - 1));
    return {
      key: dayKey(day),
      label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      fullLabel: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      start: startOfDay(day),
      end: endOfDay(day),
    };
  });
}

function weeklyBuckets(now, weeks) {
  const end = startOfDay(now);
  return Array.from({ length: weeks }, (_, index) => {
    const stop = addDays(end, -((weeks - 1 - index) * 7));
    const start = addDays(stop, -6);
    const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const stopLabel = stop.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return {
      key: dayKey(start),
      label: startLabel,
      fullLabel: `${startLabel} – ${stopLabel} ${stop.getFullYear()}`,
      start: startOfDay(start),
      end: endOfDay(stop),
    };
  });
}

function monthBuckets(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: monthStamp(date),
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      fullLabel: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  });
}

function previousRange(period, now) {
  if (period === '30') {
    const currentStart = startOfDay(addDays(now, -29));
    return { start: startOfDay(addDays(currentStart, -30)), end: endOfDay(addDays(currentStart, -1)) };
  }
  if (period === '90') {
    const currentStart = startOfDay(addDays(now, -89));
    return { start: startOfDay(addDays(currentStart, -90)), end: endOfDay(addDays(currentStart, -1)) };
  }
  if (period === '12') {
    const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return {
      start: new Date(currentStart.getFullYear(), currentStart.getMonth() - 12, 1),
      end: new Date(currentStart.getFullYear(), currentStart.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    };
  }
  return null;
}

function bucketsFor(period, students, referrals, now) {
  if (period === '30') return dailyBuckets(now, 30);
  if (period === '90') return weeklyBuckets(now, 13);
  if (period === '12') return monthBuckets(new Date(now.getFullYear(), now.getMonth() - 11, 1), 12);
  if (period === 'year') return monthBuckets(new Date(now.getFullYear(), 0, 1), 12);
  const stamps = [...students, ...referrals]
    .map((row) => new Date(row.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (stamps.length === 0) return [];
  const earliest = new Date(Math.min(...stamps.map((date) => date.getTime())));
  const latest = new Date(Math.max(...stamps.map((date) => date.getTime()), now.getTime()));
  const count = (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth()) + 1;
  return monthBuckets(new Date(earliest.getFullYear(), earliest.getMonth(), 1), Math.min(count, 36));
}

export function chartSubtitle(period) {
  if (period === '30') return 'Daily registrations and referrals in this range.';
  if (period === '90') return 'Weekly registrations and referrals in this range.';
  return 'Monthly registrations and referrals in this range.';
}

export function dayGreeting(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function axisMax(points) {
  const peak = points.reduce((max, point) => Math.max(max, point.students, point.referrals), 0);
  if (peak <= 4) return 4;
  const step = peak > 20 ? 5 : 2;
  return Math.ceil((peak * 1.15) / step) * step;
}

export function buildChart(period, students, referrals, now) {
  const buckets = bucketsFor(period, students, referrals, now);
  const points = buckets.map((bucket) => ({
    ...bucket,
    students: countBetween(students, bucket.start, bucket.end),
    referrals: countBetween(referrals, bucket.start, bucket.end),
  }));
  const best = points.reduce((winner, point) => {
    const score = point.students + point.referrals;
    if (!winner || score > winner.students + winner.referrals) return point;
    return winner;
  }, null);
  const previous = previousRange(period, now);
  const currentStudents = points.reduce((sum, point) => sum + point.students, 0);
  const currentReferrals = points.reduce((sum, point) => sum + point.referrals, 0);
  const priorStudents = previous ? countBetween(students, previous.start, previous.end) : null;
  const priorReferrals = previous ? countBetween(referrals, previous.start, previous.end) : null;
  let change = null;
  if (previous) {
    if (priorStudents === 0 && priorReferrals === 0 && currentStudents === 0 && currentReferrals === 0) change = null;
    else if (priorStudents === 0 && priorReferrals === 0) change = 'No records in the previous period';
    else change = `${delta(currentStudents - priorStudents, 'student')}, ${delta(currentReferrals - priorReferrals, 'referral')}`;
  }
  return {
    points,
    students: currentStudents,
    referrals: currentReferrals,
    best: best && best.students + best.referrals > 0 ? best.fullLabel : null,
    change,
    hasActivity: points.some((point) => point.students + point.referrals > 0),
  };
}

export function recordSpan(students, referrals) {
  const stamps = [...students, ...referrals]
    .map((row) => new Date(row.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (stamps.length === 0) return '';
  const format = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = new Date(Math.min(...stamps.map((date) => date.getTime())));
  const end = new Date(Math.max(...stamps.map((date) => date.getTime())));
  return `${format(start)} – ${format(end)}`;
}

function shareLabel(count, total) {
  if (!total || !count) return '0%';
  const pct = (count / total) * 100;
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}

export function currentSource(referral) {
  return {
    id: referral?.consultancyId || '',
    name: referral?.consultancyName || '',
  };
}

export function referralSources(referrals, consultancies = []) {
  const names = new Map(consultancies.map((row) => [row.id, row.name]));
  const grouped = new Map();
  referrals.forEach((referral) => {
    const source = currentSource(referral);
    if (!source.id) return;
    const name = names.get(source.id) || source.name || 'Unknown consultancy';
    const current = grouped.get(source.id) || { id: source.id, name, count: 0 };
    current.count += 1;
    if (name && current.name === 'Unknown consultancy') current.name = name;
    grouped.set(source.id, current);
  });
  const total = referrals.length;
  return [...grouped.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((row) => ({
      ...row,
      shareWidth: total ? (row.count / total) * 100 : 0,
      shareLabel: shareLabel(row.count, total),
    }));
}

export function attentionItems({ students, consultancies, referrals }) {
  const items = [];
  const referred = new Set(referrals.map((row) => row.crmStudentId));
  const unreferred = students.filter((student) => !referred.has(student.id));
  if (unreferred.length > 0) {
    items.push({
      id: 'unreferred',
      title: 'Students without a referral source',
      detail: unreferred.map((student) => student.fullName).filter(Boolean).join(', ') || 'No consultancy is recorded as the referral source.',
      count: unreferred.length,
      href: '/crm/demo/students?tab=open',
    });
  }
  const untouched = students.filter((student) => referred.has(student.id) && statusOf(student) === 'Not started');
  if (untouched.length > 0) {
    items.push({
      id: 'untouched',
      title: 'Referrals without a status update',
      detail: untouched.length === 1
        ? `${untouched[0].fullName} was referred and is still Not started.`
        : 'These referred students are still Not started.',
      count: untouched.length,
      href: '/crm/demo/students?tab=referred&admission=Not%20started',
    });
  }
  const inactive = consultancies.filter((row) => row.status === 'inactive');
  if (inactive.length > 0) {
    items.push({
      id: 'inactive',
      title: 'Inactive consultancies',
      detail: inactive.map((row) => row.name).filter(Boolean).join(', ') || 'Marked inactive.',
      count: inactive.length,
      href: '/crm/demo/consultancies?status=inactive',
    });
  }
  const inactiveIds = new Set(inactive.map((row) => row.id));
  const tied = referrals.filter((row) => inactiveIds.has(row.consultancyId));
  if (tied.length > 0) {
    items.push({
      id: 'inactive-source',
      title: 'Current source is inactive',
      detail: tied.length === 1
        ? `${tied[0].studentName || 'One student'} is still tied to an inactive consultancy.`
        : 'These referrals still point at an inactive consultancy.',
      count: tied.length,
      href: '/crm/demo/consultancies?status=inactive',
    });
  }
  return items;
}

export function kpiHints({ studentCount, consultancyCount, activeCount, referredStudentCount, inactiveCount }) {
  const coverage = studentCount > 0 ? Math.round((referredStudentCount / studentCount) * 100) : null;
  const activePct = consultancyCount > 0 ? Math.round((activeCount / consultancyCount) * 100) : null;
  return {
    students: studentCount === 0 ? 'No profiles on file' : `${referredStudentCount} of ${studentCount} have a source`,
    consultancies: consultancyCount === 0 ? 'No profiles on file' : inactiveCount > 0 ? `${inactiveCount} inactive` : 'All profiles are active',
    referrals: coverage == null ? 'No students on file' : `${coverage}% of students have a source`,
    active: activePct == null ? 'No consultancies on file' : `${activePct}% of consultancies`,
  };
}

export function referredStudentCount(students, referrals) {
  const referred = new Set(referrals.map((row) => row.crmStudentId));
  return students.filter((student) => referred.has(student.id)).length;
}

export function sampleEntityIds(audits) {
  const ids = new Set();
  (audits || []).forEach((row) => {
    if (row.actorLabel === 'Demo seed' && row.entityId) ids.add(row.entityId);
  });
  return ids;
}

export function includesSample(students, referrals, sampleIds) {
  return [...students, ...referrals].some((row) => sampleIds.has(row.id));
}

export function uniqueRecent(rows) {
  const seen = new Set();
  return rows.filter((entry) => {
    const fingerprint = `${entry.action}|${entry.entityType}|${entry.entityId}|${entry.createdAt}`;
    if (seen.has(entry.id) || seen.has(fingerprint)) return false;
    seen.add(entry.id);
    seen.add(fingerprint);
    return true;
  });
}

export function sortActivity(rows) {
  return [...rows].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    const aOk = !Number.isNaN(at);
    const bOk = !Number.isNaN(bt);
    if (aOk && bOk && at !== bt) return bt - at;
    if (aOk !== bOk) return aOk ? -1 : 1;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function relatedLabel(entry, students, consultancies, referrals) {
  const after = entry.after || {};
  const before = entry.before || {};
  const named = after.fullName || before.fullName || after.consultancyName || before.consultancyName || after.name || before.name;
  if (named) return named;
  if (String(entry.action).startsWith('demo_manager')) return 'Settings';
  if (entry.entityType === 'student') return students.find((row) => row.id === entry.entityId)?.fullName || 'Student';
  if (entry.entityType === 'consultancy') return consultancies.find((row) => row.id === entry.entityId)?.name || 'Consultancy';
  if (entry.entityType === 'referral') {
    const referral = referrals.find((row) => row.id === entry.entityId);
    return referral?.studentName || referral?.consultancyName || 'Referral';
  }
  return 'Record';
}

export function loadAll(loadPage) {
  const first = loadPage(1);
  if (!first || first.success !== true) {
    return { ok: false, items: [], message: first?.message || 'Could not load records.' };
  }
  const items = Array.isArray(first.data?.items) ? [...first.data.items] : [];
  const total = Number(first.data?.total);
  if (!Number.isFinite(total) || items.length >= total) return { ok: true, items, message: '' };
  let page = 2;
  while (items.length < total && page <= 50) {
    const next = loadPage(page);
    if (!next || next.success !== true) {
      return { ok: false, items, message: next?.message || 'Could not load every record.' };
    }
    const batch = Array.isArray(next.data?.items) ? next.data.items : [];
    if (batch.length === 0) break;
    items.push(...batch);
    page += 1;
  }
  if (items.length < total) return { ok: false, items, message: 'Some records could not be loaded.' };
  return { ok: true, items, message: '' };
}
