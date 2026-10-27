import test from 'node:test';
import assert from 'node:assert/strict';
import {
  admissionChartRows,
  filterStaffDirectory,
  formatActionLabel,
  formatCompactTime,
  formatDuration,
  staff360EmptyMessage,
  staff360FocusDate,
  staff360FollowUpIntel,
  staff360HeaderCards,
  staff360Query,
  STAFF360_TABS,
} from './crmStaff360.js';

test('staff360Query keeps timezone explicit and omits empty filters', () => {
  const query = staff360Query({
    date: '2026-03-10',
    timeZone: 'Asia/Kolkata',
    studentQ: 'ravi',
    admissionStatus: '',
  });
  assert.equal(query.timeZone, 'Asia/Kolkata');
  assert.equal(query.date, '2026-03-10');
  assert.equal(query.studentQ, 'ravi');
  assert.equal(Object.prototype.hasOwnProperty.call(query, 'admissionStatus'), false);
});

test('filterStaffDirectory searches name/email and applies presence', () => {
  const rows = [
    { id: '1', fullName: 'Ada Admin', email: 'ada@example.com', role: 'crm_administrator', status: 'active', presence: { state: 'online' } },
    { id: '2', fullName: 'Mira Manager', email: 'mira@example.com', role: 'crm_manager', status: 'active', presence: { state: 'offline' } },
    { id: '3', fullName: 'Idle Invited', email: 'inv@example.com', role: 'crm_viewer', status: 'invited', presence: { state: 'offline' } },
  ];
  assert.equal(filterStaffDirectory(rows, { q: 'mira' }).length, 1);
  assert.equal(filterStaffDirectory(rows, { presence: 'online' })[0].id, '1');
  assert.equal(filterStaffDirectory(rows, { role: 'crm_viewer' }).length, 1);
  assert.equal(filterStaffDirectory(rows, { presence: 'invited' })[0].id, '3');
});

test('formatDuration and header cards stay honest about session evidence', () => {
  assert.equal(formatDuration(null), 'Not available');
  assert.equal(formatDuration(90 * 60 * 1000), '1h 30m');
  assert.match(formatCompactTime('2026-03-10T04:19:00.000+05:30', 'Asia/Kolkata'), /\d/);
  const cards = staff360HeaderCards({
    profile: { id: '1' },
    day: {
      date: '2026-03-10',
      firstLoginAt: '2026-03-10T04:00:00.000Z',
      lastLoginAt: '2026-03-10T08:00:00.000Z',
      loginCount: 2,
      sessions: { totalObservedMs: 3600000, totalObservedLabel: 'Merged observed session spans.' },
    },
    summary: {
      assignedConsultancies: 2,
      assignedStudents: 5,
      openFollowUps: 3,
      overdueFollowUps: 1,
      businessEvents: 9,
      meaning: { assignedConsultancies: 'Current active assignment rows.' },
    },
  });
  assert.equal(cards.length, 8);
  assert.equal(cards.find((row) => row.id === 'session').value, '1h 0m');
  assert.match(cards.find((row) => row.id === 'session').hint, /Not working time|Merged|verified working/);
  assert.equal(cards.find((row) => row.id === 'open-followups').value, 3);
  assert.equal(cards.find((row) => row.id === 'business').value, 9);
  assert.equal(cards.find((row) => row.id === 'houses').scope, 'current');
  assert.equal(cards.find((row) => row.id === 'business').scope, 'period');
  assert.equal(cards.find((row) => row.id === 'first-login').scope, 'day');
  assert.ok(cards.every((row) => row.icon));
  assert.ok(STAFF360_TABS.some((tab) => tab.id === 'day-end'));
  assert.equal(staff360FocusDate({ from: '2026-03-10', to: '2026-03-10' }), '2026-03-10');
  assert.equal(staff360FocusDate({ from: '2026-03-01', to: '2026-03-10' }), '2026-03-10');
});

test('follow-up intel and empty copy stay honest', () => {
  assert.equal(staff360EmptyMessage('overview'), 'No associated students yet');
  assert.equal(staff360EmptyMessage('business'), 'No recorded business activity in this period');
  assert.equal(staff360EmptyMessage('consultancies'), 'No consultancy assignments');
  assert.equal(formatActionLabel('crm_student.created'), 'student created');
  const intel = staff360FollowUpIntel({
    summary: {
      openFollowUps: 2,
      overdueFollowUps: 1,
      dueTodayFollowUps: 3,
      upcomingFollowUps: 4,
      assignedConsultancies: 1,
    },
  });
  assert.equal(intel.dueToday, 3);
  assert.equal(intel.completedPeriod, null);
  assert.equal(staff360FollowUpIntel(null).open, null);
});

test('admissionChartRows drops empty statuses', () => {
  assert.deepEqual(
    admissionChartRows([
      { status: 'Not started', count: 2 },
      { status: 'Offer Accepted', count: 0 },
    ]),
    [{ status: 'Not started', count: 2 }]
  );
});
