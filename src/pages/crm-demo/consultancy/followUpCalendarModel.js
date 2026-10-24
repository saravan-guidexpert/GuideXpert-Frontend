import { followUpBuckets } from '../../../utils/crmConsultancyInsight.js';
import { dayKeyFromParts, localDayKey, parseIso, shiftDayKey } from '../../../utils/crmAnalytics.js';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_CHIP_LIMIT = 2;
export const WEEK_CHIP_LIMIT = 4;

export function dateFromKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shiftMonth(year, monthIndex, delta) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

function cellFromDate(date, monthIndex, year) {
  return {
    key: dayKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
    day: date.getDate(),
    inMonth: date.getMonth() === monthIndex && date.getFullYear() === year,
  };
}

export function buildMonthGrid(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const start = new Date(year, monthIndex, 1 - firstWeekday);
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return cellFromDate(date, monthIndex, year);
  });
}

export function buildWeekGrid(anchorKey) {
  const anchor = dateFromKey(anchorKey);
  if (!anchor) return [];
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      ...cellFromDate(date, date.getMonth(), date.getFullYear()),
      inMonth: true,
    };
  });
}

export function monthTitle(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function dayTitle(key) {
  const date = dateFromKey(key);
  if (!date) return '';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function pickedTitle(key, todayKey) {
  const date = dateFromKey(key);
  if (!date) return 'Selected date';
  const short = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (key === todayKey) return `Today · ${short}`;
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
  return `${weekday} · ${short}`;
}

export function weekTitle(cells) {
  if (!cells || cells.length < 7) return '';
  const start = dateFromKey(cells[0].key);
  const end = dateFromKey(cells[6].key);
  if (!start || !end) return '';
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const label = end.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    return `${start.getDate()}–${end.getDate()} ${label}`;
  }
  const left = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const right = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${left} – ${right}`;
}

export function followUpType(row) {
  if (row?.type === 'call' || row?.type === 'follow_up') return row.type;
  if (row?.status === 'Meeting Scheduled' || row?.status === 'Meeting Completed' || row?.status === 'Contacted') return 'call';
  return 'follow_up';
}

export function typeLabel(type) {
  return type === 'call' ? 'Call' : 'Follow-up';
}

export function followUpTone(row, now) {
  if (row?.cancelledAt) return 'cancelled';
  if (row?.completedAt) return 'completed';
  const when = parseIso(row?.scheduledAt);
  if (!when) return 'upcoming';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const time = when.getTime();
  if (time < start) return 'overdue';
  if (time <= end) return 'due';
  return 'upcoming';
}

export function eventTime(row) {
  const date = parseIso(row?.scheduledAt || row?.completedAt);
  if (!date) return '';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function eventLabel(row) {
  const time = eventTime(row);
  const name = row?.status || typeLabel(followUpType(row));
  return time ? `${time} ${name}` : name;
}

export function filterFollowUps(items, filters = {}) {
  const status = filters.status || 'all';
  const owner = filters.owner || 'all';
  const type = filters.type || 'all';
  return (items || []).filter((row) => {
    if (row.cancelledAt) return false;
    if (status !== 'all' && row.status !== status) return false;
    if (owner !== 'all' && (row.actorName || 'Unassigned') !== owner) return false;
    if (type !== 'all' && followUpType(row) !== type) return false;
    return true;
  });
}

export function filterOptions(items) {
  const rows = (items || []).filter((row) => !row.cancelledAt);
  const statuses = [...new Set(rows.map((row) => row.status).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const owners = [...new Set(rows.map((row) => row.actorName || 'Unassigned'))].sort((a, b) => a.localeCompare(b));
  const types = [...new Set(rows.map((row) => followUpType(row)))];
  const typeOrder = ['call', 'follow_up'];
  types.sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));
  return { statuses, owners, types };
}

function byTime(left, right) {
  const leftTime = parseIso(left.scheduledAt || left.completedAt)?.getTime() || 0;
  const rightTime = parseIso(right.scheduledAt || right.completedAt)?.getTime() || 0;
  return leftTime - rightTime;
}

export function eventsByDay(items) {
  const map = new Map();
  (items || []).forEach((row) => {
    if (row.cancelledAt) return;
    const key = localDayKey(row.scheduledAt || row.completedAt);
    if (!key) return;
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  });
  map.forEach((list) => list.sort(byTime));
  return map;
}

export function undatedFollowUps(items) {
  return (items || []).filter((row) => !row.cancelledAt && !localDayKey(row.scheduledAt || row.completedAt));
}

export function splitEvents(events, limit) {
  const list = events || [];
  const shown = list.slice(0, limit);
  return { shown, hidden: Math.max(0, list.length - shown.length) };
}

function byScheduled(left, right) {
  return (parseIso(left.scheduledAt)?.getTime() || 0) - (parseIso(right.scheduledAt)?.getTime() || 0);
}

function byCompleted(left, right) {
  return (parseIso(right.completedAt)?.getTime() || 0) - (parseIso(left.completedAt)?.getTime() || 0);
}

export function groupedFollowUps(items, now) {
  const buckets = followUpBuckets(items, now);
  return {
    overdue: [...buckets.overdue].sort(byScheduled),
    dueToday: [...buckets.dueToday].sort(byScheduled),
    upcoming: [...buckets.upcoming].sort(byScheduled),
    completed: [...buckets.completed].sort(byCompleted),
  };
}

function dateTimeInputValue(key, hours, minutes) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  const [year, month, day] = key.split('-');
  return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function followUpInputValue(key) {
  return dateTimeInputValue(key, 10, 0);
}

export function scheduleInputValue(key, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  const [year, month, day] = key.split('-').map(Number);
  const atTen = new Date(year, month - 1, day, 10, 0, 0, 0);
  if (atTen.getTime() > now.getTime()) return dateTimeInputValue(key, 10, 0);
  const todayKey = dayKeyFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  if (key !== todayKey) return '';
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  if (dayKeyFromParts(next.getFullYear(), next.getMonth(), next.getDate()) !== key) return '';
  return dateTimeInputValue(key, next.getHours(), 0);
}

export { shiftDayKey };
