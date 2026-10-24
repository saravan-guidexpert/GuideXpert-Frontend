import test from 'node:test';
import assert from 'node:assert/strict';
import { localDayKey } from '../../../utils/crmAnalytics.js';
import {
  buildMonthGrid,
  buildWeekGrid,
  dateFromKey,
  eventsByDay,
  filterFollowUps,
  followUpInputValue,
  groupedFollowUps,
  monthTitle,
  pickedTitle,
  scheduleInputValue,
  shiftDayKey,
  shiftMonth,
  splitEvents,
  weekTitle,
} from './followUpCalendarModel.js';

function weekdayOf(cell) {
  return dateFromKey(cell.key).getDay();
}

test('October 2026 renders as five rows of seven columns with dates on their weekdays', () => {
  const cells = buildMonthGrid(2026, 9);
  assert.equal(cells.length, 35);
  assert.equal(cells.length % 7, 0);
  assert.equal(monthTitle(2026, 9), 'October 2026');
  cells.forEach((cell, index) => {
    assert.equal(weekdayOf(cell), index % 7);
  });
  assert.equal(cells[0].key, '2026-09-27');
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[4].key, '2026-10-01');
  assert.equal(cells[4].day, 1);
  assert.equal(cells[4].inMonth, true);
  assert.equal(cells[26].key, '2026-10-23');
  assert.equal(cells[26].day, 23);
  assert.equal(weekdayOf(cells[26]), 5);
  assert.equal(cells.at(-1).key, '2026-10-31');
  assert.equal(cells.at(-1).inMonth, true);
  const inMonth = cells.filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 31);
  assert.deepEqual(inMonth.map((cell) => cell.day), Array.from({ length: 31 }, (_, index) => index + 1));
  assert.notEqual(cells.length, 31);
});

test('February, leap years, Sunday starts and six-row months keep weekday alignment', () => {
  const february = buildMonthGrid(2026, 1);
  assert.equal(february.length, 28);
  assert.ok(february.every((cell) => cell.inMonth));
  assert.equal(february[0].key, '2026-02-01');
  assert.equal(weekdayOf(february[0]), 0);
  assert.equal(february.at(-1).key, '2026-02-28');

  const leap = buildMonthGrid(2024, 1);
  const leapDays = leap.filter((cell) => cell.inMonth);
  assert.equal(leapDays.length, 29);
  assert.equal(leapDays.at(-1).key, '2024-02-29');
  leap.forEach((cell, index) => assert.equal(weekdayOf(cell), index % 7));

  const may = buildMonthGrid(2026, 4);
  assert.equal(may.length, 42);
  assert.equal(may.filter((cell) => cell.inMonth).length, 31);
  assert.equal(may.find((cell) => cell.inMonth).key, '2026-05-01');
  may.forEach((cell, index) => assert.equal(weekdayOf(cell), index % 7));

  const august = buildMonthGrid(2026, 7);
  assert.equal(august.length, 42);
  assert.equal(august.filter((cell) => cell.inMonth).length, 31);
});

test('month and week navigation cross year boundaries without shifting weekdays', () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, monthIndex: 0 });
  assert.deepEqual(shiftMonth(2027, 0, -1), { year: 2026, monthIndex: 11 });
  assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDayKey('2026-01-01', -1), '2025-12-31');

  const january = buildMonthGrid(2027, 0);
  assert.equal(january[0].key, '2026-12-27');
  assert.equal(january[0].inMonth, false);
  assert.equal(january.find((cell) => cell.inMonth).key, '2027-01-01');
  january.forEach((cell, index) => assert.equal(weekdayOf(cell), index % 7));

  const week = buildWeekGrid('2027-01-01');
  assert.equal(week.length, 7);
  assert.deepEqual(week.map((cell) => cell.key), [
    '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
  ]);
  week.forEach((cell, index) => assert.equal(weekdayOf(cell), index));
  assert.equal(weekTitle(buildWeekGrid('2026-10-23')), '18–24 Oct 2026');
  assert.equal(weekTitle(week), '27 Dec – 2 Jan 2027');
  assert.equal(pickedTitle('2026-10-23', '2026-10-23'), 'Today · 23 Oct');
  assert.equal(monthTitle(2027, 0), 'January 2027');
});

test('follow-ups land on the local day, filters and counts use real records, and full cells collapse', () => {
  const now = new Date(2026, 9, 23, 12, 0, 0);
  const items = [
    { id: 'today', status: 'Meeting Scheduled', type: 'call', scheduledAt: new Date(2026, 9, 23, 15).toISOString(), actorName: 'Demo staff' },
    { id: 'late', status: 'Follow-up Required', type: 'follow_up', scheduledAt: new Date(2026, 9, 20, 9).toISOString(), actorName: 'Demo staff', nextAction: 'Call again' },
    { id: 'soon', status: 'Follow-up Required', type: 'follow_up', scheduledAt: new Date(2026, 9, 28, 11).toISOString(), actorName: 'Other' },
    { id: 'done', status: 'Meeting Completed', type: 'call', scheduledAt: new Date(2026, 9, 1, 9).toISOString(), completedAt: new Date(2026, 9, 1, 10).toISOString(), actorName: 'Other' },
    { id: 'stopped', status: 'Meeting Scheduled', type: 'call', scheduledAt: new Date(2026, 9, 23, 8).toISOString(), cancelledAt: new Date(2026, 9, 22).toISOString(), actorName: 'Demo staff' },
    { id: 'blank', status: 'Follow-up Required', type: 'follow_up', actorName: 'Demo staff' },
  ];
  const visible = filterFollowUps(items, { status: 'all', owner: 'all', type: 'all' });
  assert.equal(visible.length, 5);
  assert.equal(filterFollowUps(items, { status: 'Meeting Scheduled', owner: 'all', type: 'call' }).map((row) => row.id).join(), 'today');
  assert.deepEqual(filterFollowUps(items, { owner: 'Other' }).map((row) => row.id), ['soon', 'done']);
  assert.deepEqual(filterFollowUps(items, { type: 'follow_up' }).map((row) => row.id), ['late', 'soon', 'blank']);

  const iso = '2026-10-23T00:30:00.000Z';
  const zoned = eventsByDay([{ id: 'z', status: 'Meeting Scheduled', scheduledAt: iso }]);
  assert.deepEqual([...zoned.keys()], [localDayKey(iso)]);

  const placed = eventsByDay(visible);
  assert.equal(placed.get('2026-10-23').map((row) => row.id).join(), 'today');
  assert.equal(placed.has('2026-10-23') && placed.get('2026-10-23').some((row) => row.id === 'stopped'), false);
  assert.equal(placed.has(undefined), false);

  const groups = groupedFollowUps(visible, now);
  assert.deepEqual(groups.overdue.map((row) => row.id), ['late']);
  assert.deepEqual(groups.dueToday.map((row) => row.id), ['today']);
  assert.deepEqual(groups.upcoming.map((row) => row.id), ['soon']);
  assert.deepEqual(groups.completed.map((row) => row.id), ['done']);

  const packed = splitEvents([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], 2);
  assert.deepEqual(packed.shown.map((row) => row.id), ['a', 'b']);
  assert.equal(packed.hidden, 2);
  assert.equal(splitEvents(placed.get('2026-10-23'), 2).hidden, 0);
});

test('schedule and follow-up inputs stay on the selected local day and refuse a past call', () => {
  const morning = new Date(2026, 9, 23, 8, 0, 0);
  const evening = new Date(2026, 9, 23, 18, 30, 0);
  assert.equal(scheduleInputValue('2026-10-23', morning), '2026-10-23T10:00');
  assert.equal(scheduleInputValue('2026-10-23', evening), '2026-10-23T19:00');
  assert.equal(scheduleInputValue('2026-10-20', evening), '');
  assert.equal(scheduleInputValue('2026-10-23', new Date(2026, 9, 23, 23, 10, 0)), '');
  assert.equal(followUpInputValue('2026-10-20'), '2026-10-20T10:00');
  assert.equal(followUpInputValue(''), '');
  assert.equal(scheduleInputValue('nope', morning), '');
});
