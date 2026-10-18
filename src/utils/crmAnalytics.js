const KNOWN_STATUSES = ['Not started', 'Contacted', 'Counselling', 'Applied', 'Admitted', 'Enrolled', 'Not proceeding'];

export const ACTIVE_STATUSES = ['Contacted', 'Counselling', 'Applied'];

export function statusOf(student) {
  return KNOWN_STATUSES.includes(student?.admissionStatus) ? student.admissionStatus : 'Not started';
}

export function parseIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDayKey(value) {
  const date = parseIso(value);
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function shiftDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function resolveRange(period, now, custom = {}) {
  const end = endOfLocalDay(now);
  if (period === '7' || period === '30' || period === '90') {
    const days = Number(period);
    return { id: period, start: startOfLocalDay(shiftDays(now, -(days - 1))), end, label: `Last ${days} days`, invalid: false };
  }
  if (period === 'month') {
    return { id: period, start: new Date(now.getFullYear(), now.getMonth(), 1), end, label: 'This month', invalid: false };
  }
  if (period === 'year') {
    return { id: period, start: new Date(now.getFullYear(), 0, 1), end, label: 'This year', invalid: false };
  }
  if (period === 'custom') {
    const from = custom.from ? startOfLocalDay(new Date(`${custom.from}T00:00:00`)) : null;
    const to = custom.to ? endOfLocalDay(new Date(`${custom.to}T00:00:00`)) : null;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return { id: 'custom', start: null, end: null, label: 'Custom range', invalid: true };
    }
    return { id: 'custom', start: from, end: to, label: 'Custom range', invalid: false };
  }
  return { id: 'all', start: null, end: null, label: 'All time', invalid: false };
}

export function within(value, range) {
  const date = parseIso(value);
  if (!date) return false;
  if (range?.invalid) return false;
  if (!range?.start || !range?.end) return true;
  return date >= range.start && date <= range.end;
}

export function ratio(part, whole) {
  if (!whole) return { part, whole, rate: null };
  return { part, whole, rate: part / whole };
}

export function formatRate(result) {
  if (!result || result.rate == null) return 'No base';
  return `${Math.round(result.rate * 100)}%`;
}

export function daysSinceReferral(value, now) {
  const key = localDayKey(value);
  const today = localDayKey(now.toISOString());
  if (!key || !today) return null;
  const [year, month, day] = key.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  return Math.round((Date.UTC(todayYear, todayMonth - 1, todayDay) - Date.UTC(year, month - 1, day)) / 86400000);
}

export function previousRange(range) {
  if (!range?.start || !range?.end) return null;
  const length = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  return { start: new Date(end.getTime() - length), end, label: 'Previous period', invalid: false };
}

function reached(status, stage) {
  if (stage === 'application') return status === 'Applied' || status === 'Admitted' || status === 'Enrolled';
  if (stage === 'admission') return status === 'Admitted' || status === 'Enrolled';
  return status === 'Enrolled';
}

export function conversionFor(rows) {
  const whole = rows.length;
  const applied = rows.filter((row) => reached(row.status, 'application')).length;
  const admitted = rows.filter((row) => reached(row.status, 'admission')).length;
  const enrolled = rows.filter((row) => reached(row.status, 'enrollment')).length;
  return {
    referralToApplication: ratio(applied, whole),
    applicationToAdmission: ratio(admitted, applied),
    admissionToEnrollment: ratio(enrolled, admitted),
  };
}

export function latestActivity(audits, referral) {
  const ids = new Set([referral?.id, referral?.crmStudentId].filter(Boolean));
  const match = (audits || [])
    .filter((row) => ids.has(row.entityId) && parseIso(row.createdAt))
    .sort((a, b) => parseIso(b.createdAt) - parseIso(a.createdAt))[0];
  return match || null;
}

export function joinReferrals(referrals, students, audits, now) {
  const byId = new Map((students || []).map((row) => [row.id, row]));
  return (referrals || []).filter((row) => parseIso(row.createdAt)).map((referral) => {
    const student = byId.get(referral.crmStudentId) || null;
    return {
      referral,
      student,
      status: statusOf(student),
      days: daysSinceReferral(referral.createdAt, now),
      lastActivity: latestActivity(audits, referral),
    };
  });
}

export function summarizeConsultancy({ consultancy, students, referrals, audits, range, now }) {
  const linked = joinReferrals((referrals || []).filter((row) => row.consultancyId === consultancy.id), students, audits, now);
  const inPeriod = range?.invalid ? [] : linked.filter((row) => within(row.referral.createdAt, range));
  const last = linked.map((row) => parseIso(row.referral.createdAt)).sort((a, b) => b - a)[0] || null;
  return {
    total: linked.length,
    active: linked.filter((row) => ACTIVE_STATUSES.includes(row.status)).length,
    admitted: linked.filter((row) => row.status === 'Admitted').length,
    enrolled: linked.filter((row) => row.status === 'Enrolled').length,
    untouched: linked.filter((row) => row.status === 'Not started').length,
    periodReferrals: range?.invalid ? null : inPeriod.length,
    conversion: range?.invalid ? null : conversionFor(inPeriod),
    lastReferralAt: last ? last.toISOString() : null,
    rows: linked,
  };
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function volumeSeries(referrals, range) {
  const dated = (referrals || []).filter((row) => parseIso(row.createdAt));
  if (range?.invalid) return [];
  if (!range?.start || !range?.end) {
    if (dated.length === 0) return [];
    const times = dated.map((row) => parseIso(row.createdAt));
    const first = new Date(Math.min(...times));
    const last = new Date(Math.max(...times));
    const points = [];
    for (let cursor = new Date(first.getFullYear(), first.getMonth(), 1); cursor <= last; cursor = addMonths(cursor, 1)) {
      const key = monthKey(cursor);
      points.push({
        key,
        label: cursor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        count: dated.filter((row) => monthKey(parseIso(row.createdAt)) === key).length,
      });
    }
    return points;
  }
  const span = range.end.getTime() - range.start.getTime();
  const daily = span <= 31 * 86400000;
  if (daily) {
    const points = [];
    for (let cursor = startOfLocalDay(range.start); cursor <= range.end; cursor = shiftDays(cursor, 1)) {
      const key = localDayKey(cursor.toISOString());
      points.push({
        key,
        label: cursor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count: dated.filter((row) => localDayKey(row.createdAt) === key).length,
      });
    }
    return points;
  }
  const points = [];
  for (let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1); cursor <= range.end; cursor = addMonths(cursor, 1)) {
    const key = monthKey(cursor);
    points.push({
      key,
      label: cursor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      count: dated.filter((row) => within(row.createdAt, range) && monthKey(parseIso(row.createdAt)) === key).length,
    });
  }
  return points;
}

export function statusDistribution(rows) {
  return KNOWN_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }));
}

export function rankConsultancies(consultancies, referrals, students, range) {
  const joined = joinReferrals(referrals, students, [], new Date());
  return (consultancies || []).map((consultancy) => {
    const rows = joined.filter((row) => row.referral.consultancyId === consultancy.id && within(row.referral.createdAt, range));
    return {
      id: consultancy.id,
      name: consultancy.name,
      status: consultancy.status,
      referrals: rows.length,
      admitted: rows.filter((row) => row.status === 'Admitted' || row.status === 'Enrolled').length,
      enrolled: rows.filter((row) => row.status === 'Enrolled').length,
    };
  }).sort((a, b) => b.enrolled - a.enrolled || b.admitted - a.admitted || b.referrals - a.referrals || a.name.localeCompare(b.name));
}

export function monthCells(year, monthIndex) {
  const lead = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dayKeyFromParts(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function referralsOnDay(referrals, dayKey) {
  return (referrals || []).filter((row) => localDayKey(row.createdAt) === dayKey);
}

export function calendarQueryForBucket(key) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return { day: key };
  if (/^\d{4}-\d{2}$/.test(key || '')) return { month: key };
  return null;
}

export function shiftDayKey(key, days) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return dayKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate());
}

export function eachDayKey(fromKey, toKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey || '') || !/^\d{4}-\d{2}-\d{2}$/.test(toKey || '') || fromKey > toKey) return [];
  const keys = [];
  let cursor = fromKey;
  while (cursor && cursor <= toKey && keys.length < 370) {
    keys.push(cursor);
    const next = shiftDayKey(cursor, 1);
    if (!next || next === cursor) break;
    cursor = next;
  }
  return keys;
}
