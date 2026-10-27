import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionOptions,
  activityCountsByDay,
  activityDistribution,
  activityMetricCards,
  activityResultSummary,
  activityTrendRows,
  buildActivityCalendarDays,
  calendarMonthLabel,
  defaultActivityFilters,
  formatChangeValue,
  hasActivityFilters,
  mergeStaffPresence,
  resolveActivityPeriod,
  shiftCalendarMonth,
  timelineStory,
} from './crmActivity.js';
import { activityActionOptions, activityListQuery } from './crmWorkspace.js';

test('activity action options include contact, account, and permission events', () => {
  const actions = activityActionOptions();
  assert.ok(actions.includes('contact.created'));
  assert.ok(actions.includes('crm_user.created'));
  assert.ok(actions.includes('crm_permission.updated'));
  assert.ok(actions.includes('consultancy.remark_edited'));
  const labeled = actionOptions();
  assert.equal(labeled.find((row) => row.id === 'crm_permission.updated')?.label, 'Permissions updated');
});

test('activity list query passes actor, entity, and consultancy selectors', () => {
  const built = activityListQuery({
    page: 2,
    limit: 20,
    source: 'business',
    action: 'consultancy.remark_edited',
    actorType: 'crm-user',
    actorId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    entityType: 'consultancy',
    entityId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    consultancyId: 'cccccccccccccccccccccccc',
    from: '2026-01-01',
    to: '2026-01-31',
    q: 'remark',
    timeZone: 'Asia/Kolkata',
  });
  assert.equal(built.error, undefined);
  assert.equal(built.query.actorType, 'crm-user');
  assert.equal(built.query.actorId, 'aaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(built.query.entityType, 'consultancy');
  assert.equal(built.query.entityId, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal(built.query.consultancyId, 'cccccccccccccccccccccccc');
  assert.equal(built.query.action, 'consultancy.remark_edited');
});

test('timeline story prefers resolved display and entity labels without inventing values', () => {
  const story = timelineStory({
    action: 'consultancy.remark_edited',
    actor: { type: 'crm-user', id: '1', name: '', displayName: 'Unknown actor' },
    entityLabel: 'Remark House',
    consultancyName: 'Remark House',
    source: 'business',
    category: 'business',
  });
  assert.match(story.title, /Unknown actor|Remark/);
  assert.equal(story.entityName, 'Remark House');
  assert.equal(hasActivityFilters(defaultActivityFilters()), false);
  assert.equal(hasActivityFilters({ ...defaultActivityFilters(), entityId: 'aaaaaaaaaaaaaaaaaaaaaaaa' }), true);
});

test('period presets resolve Asia/Kolkata calendar days', () => {
  const now = new Date('2026-10-27T04:30:00Z');
  assert.deepEqual(resolveActivityPeriod('today', null, now), { from: '2026-10-27', to: '2026-10-27' });
  assert.deepEqual(resolveActivityPeriod('7', null, now), { from: '2026-10-21', to: '2026-10-27' });
});

test('metric cards never invent zeros for restricted security counts', () => {
  const cards = activityMetricCards({
    business: { total: 12, byAction: [] },
    security: { total: 4, signInFailed: null, byAction: [] },
    insights: { activeCrmUsers: 3, consultanciesTouched: 2, recordsCreated: 5, recordsUpdated: 7, meaning: {} },
  });
  assert.equal(cards.find((card) => card.key === 'failed').text, 'Restricted');
  assert.equal(cards.find((card) => card.key === 'business').text, '12');
});

test('trend, distribution, pager, and presence merge stay factual', () => {
  const summary = {
    series: {
      business: [{ key: '2026-10-26', label: '26 Oct', count: 2 }],
      security: [{ key: '2026-10-26', label: '26 Oct', count: 1 }],
    },
    business: { byAction: [{ action: 'student.created', count: 2 }] },
    security: { byAction: [{ action: 'crm_user.login_failed', count: 1 }] },
  };
  assert.equal(activityTrendRows(summary)[0].total, 3);
  assert.equal(activityDistribution(summary)[0].label, 'Student created');
  assert.equal(activityResultSummary(1, 20, 0).showPager, false);
  assert.equal(formatChangeValue(null, true), 'Not recorded');
  const rows = mergeStaffPresence(
    [{ id: 'u1', fullName: 'Ada', presence: { state: 'online' } }],
    [{ userId: 'u1', businessEvents: 2, lastBusinessAt: '2026-10-26T10:00:00Z' }]
  );
  assert.equal(rows[0].hasRecordedBusiness, true);
});

test('activity calendar builds a Monday-first month and marks the selected day', () => {
  const next = shiftCalendarMonth(2026, 9, 1);
  assert.deepEqual(next, { year: 2026, monthIndex: 10 });
  assert.match(calendarMonthLabel(2026, 9), /October/);
  const counts = activityCountsByDay([
    { key: '2026-10-27', total: 5 },
    { key: '2026-10-28', business: 1, security: 1 },
  ]);
  assert.equal(counts['2026-10-27'], 5);
  assert.equal(counts['2026-10-28'], 2);
  const days = buildActivityCalendarDays(2026, 9, counts, '2026-10-27', '2026-10-27');
  const selected = days.find((cell) => cell.iso === '2026-10-27');
  assert.equal(selected.isSingle, true);
  assert.equal(selected.intensity, 2);
  assert.equal(days.filter((cell) => !cell.blank).length, 31);
});
