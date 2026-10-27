import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayEndAccuracy,
  dayEndQuery,
  dayEndScheduleNote,
  historyAdmissionScopeNote,
  historyDailyScopeNote,
  intelligenceScopeNote,
} from './crmWorkspace.js';

test('day-end rows say when a reconstructed value is approximate or its schedule is unknown', () => {
  assert.equal(dayEndAccuracy({ kind: 'follow_up.completed' }), 'Recorded');
  assert.equal(dayEndAccuracy({ exact: false }), 'Approximate');
  assert.equal(dayEndAccuracy({ exact: false, rescheduledLater: true, scheduleKnown: true }), 'Approximate · rescheduled later');
  assert.equal(dayEndAccuracy({ exact: false, rescheduledLater: true, scheduleKnown: false }), 'Approximate · schedule at day end unknown');
});

test('the day-end note names the open statuses and counts unknown schedules', () => {
  const plain = dayEndScheduleNote({ overdue: { count: 2, exact: false, rescheduledLater: 0, scheduleUnknown: 0 } });
  assert.match(plain, /Meeting Scheduled or Follow-up Required/);
  assert.doesNotMatch(plain, /rescheduled/);
  const mixed = dayEndScheduleNote({ overdue: { count: 2, exact: false, rescheduledLater: 3, scheduleUnknown: 1 } });
  assert.match(mixed, /3 outstanding rows were rescheduled/);
  assert.match(mixed, /1 row has no stored earlier time/);
});

test('day-end query keeps assigned staff and recorded actor filters separate', () => {
  const built = dayEndQuery({
    date: '2026-03-10',
    timeZone: 'Asia/Kolkata',
    userId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    actorId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    event: 'exception',
  });
  assert.equal(built.error, undefined);
  assert.equal(built.query.userId, 'aaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(built.query.actorId, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal(built.query.event, 'exception');
  assert.equal(dayEndQuery({ date: '2026-03-10', actorId: 'not-an-id' }).query.actorId, undefined);
});

test('scope notes say when organization-wide read access widened the lists', () => {
  const org = { scope: 'module', aggregateScope: 'module', scopeBasis: 'organization_permission' };
  assert.match(intelligenceScopeNote(org), /every consultancy in the organization/);
  assert.match(historyAdmissionScopeNote(org), /every consultancy in the organization/);
  assert.match(historyDailyScopeNote(org), /lists above are organization-wide/);
  const assigned = { scope: 'assigned', aggregateScope: 'assigned', scopeBasis: 'assignment' };
  assert.match(intelligenceScopeNote(assigned), /assigned to this account/);
  assert.match(historyAdmissionScopeNote(assigned), /not the whole organization/);
});
