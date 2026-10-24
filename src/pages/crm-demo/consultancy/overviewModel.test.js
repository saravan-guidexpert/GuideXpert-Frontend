import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionStateLabel,
  activityPresentation,
  attentionItems,
  bottleneckStatus,
  pipelineShare,
  referralPeriodHint,
  selectNextAction,
} from './overviewModel.js';

const now = new Date(2026, 9, 21, 12, 0, 0);

test('next action prefers the earliest overdue follow-up and can fall back to the consultancy date', () => {
  const chosen = selectNextAction([
    { id: 'soon', status: 'Follow-up Required', scheduledAt: '2026-10-25T08:00:00.000Z', actorName: 'Demo staff' },
    { id: 'late', status: 'Meeting Scheduled', scheduledAt: '2026-10-19T08:00:00.000Z', actorName: 'Demo staff' },
    { id: 'done', status: 'Meeting Completed', scheduledAt: '2026-10-01T08:00:00.000Z', completedAt: '2026-10-02T08:00:00.000Z', actorName: 'Demo staff' },
    { id: 'stopped', status: 'Meeting Scheduled', scheduledAt: '2026-10-18T08:00:00.000Z', cancelledAt: '2026-10-18T09:00:00.000Z' },
  ], { ownerName: 'Demo staff', followUpStatus: 'Meeting Scheduled', nextFollowUpAt: '2026-10-19T08:00:00.000Z' }, now);
  assert.equal(chosen.id, 'late');
  assert.equal(chosen.state, 'overdue');
  assert.equal(chosen.canComplete, true);
  assert.equal(actionStateLabel(chosen.state), 'Overdue');

  const laterToday = selectNextAction([
    { id: 'today', status: 'Meeting Scheduled', scheduledAt: new Date(2026, 9, 21, 18, 0, 0).toISOString(), actorName: 'Demo staff' },
  ], { ownerName: 'Demo staff' }, now);
  assert.equal(laterToday.state, 'due');

  const fallback = selectNextAction([], {
    ownerName: 'Demo staff',
    followUpStatus: 'Meeting Scheduled',
    nextFollowUpAt: '2026-10-25T08:00:00.000Z',
  }, now);
  assert.equal(fallback.id, null);
  assert.equal(fallback.canComplete, false);
  assert.equal(fallback.state, 'scheduled');
  assert.equal(fallback.type, 'Meeting Scheduled');
  assert.equal(selectNextAction([], { followUpStatus: 'Fresh Lead', nextFollowUpAt: null }, now), null);
});

test('attention items stay in urgency order and skip empty issues', () => {
  const items = attentionItems({
    buckets: {
      overdue: [{ id: 'a' }],
      dueToday: [],
      dueSoon: [{ id: 'b' }, { id: 'c' }],
    },
    consultancy: { lastContactAt: null, primaryContact: null },
    unreferredCount: 2,
  });
  assert.deepEqual(items.map((item) => item.id), ['overdue', 'soon', 'contact', 'primary', 'unreferred']);
  const quiet = attentionItems({
    buckets: { overdue: [], dueToday: [], dueSoon: [] },
    consultancy: { lastContactAt: '2026-10-01T00:00:00.000Z', primaryContact: { id: 'ct' } },
    unreferredCount: 0,
  });
  assert.deepEqual(quiet, []);
  const hiddenFollowUps = attentionItems({
    buckets: { overdue: [{ id: 'a' }], dueToday: [], dueSoon: [] },
    consultancy: { lastContactAt: '2026-10-01T00:00:00.000Z', primaryContact: { id: 'ct' } },
    unreferredCount: 0,
    followUpsAvailable: false,
  });
  assert.deepEqual(hiddenFollowUps, []);
});

test('pipeline share and bottleneck use the linked-student denominator', () => {
  assert.equal(pipelineShare(1, 0), null);
  assert.equal(pipelineShare(1, 4), 25);
  assert.equal(bottleneckStatus([
    { status: 'Not started', count: 2 },
    { status: 'Contacted', count: 2 },
    { status: 'Applied', count: 1 },
  ]), null);
  assert.equal(bottleneckStatus([
    { status: 'Not started', count: 0 },
    { status: 'Applied', count: 3 },
  ]), 'Applied');
  assert.equal(bottleneckStatus([{ status: 'Enrolled', count: 0 }]), null);
});

test('period hint and activity titles only use recorded values', () => {
  assert.equal(referralPeriodHint(null, { start: new Date(), invalid: false }), 'First source is this consultancy');
  assert.equal(referralPeriodHint({ current: 1, previous: 0, absolute: 1 }, { start: new Date(), invalid: false }), '1 in this range');
  assert.equal(referralPeriodHint({ current: 4, previous: 2, absolute: 2 }, { start: new Date(), invalid: false }), '4 in this range · +2 vs previous');
  const scheduled = activityPresentation({
    action: 'consultancy.follow_up',
    actorLabel: 'Demo staff',
    createdAt: '2026-10-21T10:00:00.000Z',
    after: { followUpStatus: 'Meeting Scheduled' },
  }, now);
  assert.equal(scheduled.title, 'Call scheduled');
  assert.equal(scheduled.context, 'Meeting Scheduled');
  const owner = activityPresentation({
    action: 'consultancy.owner_reassigned',
    actorLabel: 'Demo staff',
    createdAt: '2026-10-21T10:00:00.000Z',
    after: { ownerName: 'Demo seed' },
  }, now);
  assert.equal(owner.title, 'Ownership changed');
  assert.equal(owner.context, 'Demo seed');
});
