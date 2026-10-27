import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bucketPillLabel,
  countActiveIntelFilters,
  dayEndGroups,
  dayEndHeadline,
  dayEndSourceLabel,
  followUpChartState,
  followUpOverview,
  intelDayLabel,
  intelFiltersChanged,
  intelRangeLabel,
  intelScopeBadge,
  workloadScopeLine,
  workloadSummaryCards,
  dayEndCategoryBreakdown,
  dayEndMetricCards,
  defaultIntelFilters,
  followUpDistribution,
  followUpMetricCards,
  resolveIntelPeriod,
  workloadAggregateCards,
  workloadChartRows,
} from './crmIntelligence.js';

test('intelligence period presets keep Asia/Kolkata day boundaries', () => {
  const range = resolveIntelPeriod('7', null, new Date('2026-04-02T18:30:00.000Z'), 'Asia/Kolkata');
  assert.equal(range.to, '2026-04-03');
  assert.equal(range.from, '2026-03-28');
});

test('default filters include a reporting day aligned to the range end', () => {
  const filters = defaultIntelFilters(new Date('2026-04-02T18:30:00.000Z'));
  assert.equal(filters.period, '30');
  assert.equal(filters.date, filters.to);
  assert.equal(filters.bucket, '');
});

test('follow-up metric cards keep completion rate unavailable without a denominator', () => {
  const cards = followUpMetricCards({
    current: {
      overdue: 2,
      dueToday: 1,
      upcoming: 3,
      unscheduled: 4,
      completedInRange: 5,
      cancelledInRange: 1,
      completion: { denominator: 0, numerator: 0, rate: null },
    },
  });
  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  assert.equal(byKey.overdue.text, '2');
  assert.equal(byKey.rate.text, '—');
  assert.equal(byKey.rate.unavailable, true);
  assert.equal(byKey.completed.filter.bucket, 'completed');
});

test('follow-up distribution exposes bucket filters without inventing categories', () => {
  const rows = followUpDistribution({
    current: {
      overdue: 2,
      dueToday: 0,
      upcoming: 1,
      unscheduled: 0,
      completedInRange: 4,
      cancelledInRange: 0,
    },
  });
  assert.equal(rows.find((row) => row.id === 'completed').count, 4);
  assert.equal(rows.find((row) => row.id === 'overdue').filter, 'overdue');
  assert.equal(countActiveIntelFilters({ bucket: 'overdue', event: 'admission' }), 2);
});

test('day-end cards preserve null as unavailable rather than zero', () => {
  const cards = dayEndMetricCards({
    summary: {
      studentsCreated: null,
      admissionChanges: 2,
      assignmentsOpened: 1,
      assignmentsRevoked: 0,
      followUpsCompleted: 3,
      outstanding: { count: null },
      overdue: { count: 2 },
    },
  });
  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  assert.equal(byKey.students.unavailable, true);
  assert.equal(byKey.students.text, '—');
  assert.equal(byKey.admissions.text, '2');
  assert.equal(byKey.outstanding.unavailable, true);
  assert.equal(byKey.overdue.text, '2');
  assert.equal(byKey.overdue.approximate, true);
});

test('day-end breakdown groups loaded events without inventing missing kinds', () => {
  const rows = dayEndCategoryBreakdown([
    { kind: 'student.created' },
    { kind: 'admission.changed' },
    { kind: 'assignment.opened' },
    { kind: 'follow_up.completed' },
    { kind: 'follow_up.overdue_approximate' },
  ]);
  assert.equal(rows.find((row) => row.id === 'admission').count, 2);
  assert.equal(rows.find((row) => row.id === 'follow_up').count, 2);
});

test('workload aggregates stay page-scoped and chart rows stay name-ordered', () => {
  const cards = workloadAggregateCards({
    total: 5,
    items: [
      {
        userId: 'b',
        name: 'Beta',
        assignedConsultancies: 1,
        openFollowUps: 2,
        overdueFollowUps: 1,
        admissionsRecorded: 0,
        followUpsCompleted: 3,
      },
      {
        userId: 'a',
        name: 'Alpha',
        assignedConsultancies: 2,
        openFollowUps: 4,
        overdueFollowUps: 0,
        admissionsRecorded: 1,
        followUpsCompleted: 1,
      },
    ],
  });
  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  assert.equal(byKey.staff.text, '5');
  assert.equal(byKey.open.text, '6');
  assert.equal(byKey.open.pageScoped, true);

  const chart = workloadChartRows([
    { userId: 'b', name: 'Beta', openFollowUps: 2 },
    { userId: 'a', name: 'Alpha', openFollowUps: 9 },
  ], 'openFollowUps');
  assert.deepEqual(chart.map((row) => row.name), ['Alpha', 'Beta']);
  assert.equal(chart[0].value, 9);
});

test('follow-up overview keeps zero, unavailable, and not-enough-data distinct', () => {
  const ready = followUpOverview({
    current: {
      overdue: 0,
      dueToday: 2,
      upcoming: 3,
      unscheduled: 4,
      completedInRange: 5,
      completion: { denominator: 0, numerator: 0, rate: null },
    },
    comparison: { completions: 1, completion: { denominator: 2, numerator: 1, rate: 0.5 } },
  });
  assert.deepEqual(ready.cards.map((card) => card.key), ['overdue', 'due_today', 'upcoming', 'completed']);
  assert.equal(ready.cards[0].text, '0');
  assert.equal(ready.cards[0].unavailable, false);
  assert.equal(ready.cards[0].attention, false);
  assert.equal(ready.cards[1].filter.bucket, 'due_today');
  assert.equal(ready.unscheduled.text, '4');
  assert.equal(ready.completion.available, false);
  assert.equal(ready.completion.text, 'Not enough scheduled follow-ups');
  assert.match(ready.previous, /50%/);

  const attention = followUpOverview({ current: { overdue: 3, dueToday: 0, upcoming: 0, unscheduled: 0, completedInRange: 0 } });
  assert.equal(attention.cards[0].attention, true);

  const missing = followUpOverview({ current: { dueToday: 1 } });
  assert.equal(missing.cards[0].text, 'Unavailable');
  assert.equal(missing.cards[0].unavailable, true);
  assert.equal(missing.cards[0].filter, null);

  const none = followUpOverview(null);
  assert.equal(none.cards[3].text, 'Unavailable');
  assert.equal(none.completion.text, 'Unavailable');
});

test('follow-up chart renders only when counts support a meaningful chart', () => {
  assert.equal(followUpChartState(null).state, 'unavailable');
  assert.equal(followUpChartState({ current: { overdue: 0, dueToday: 0, upcoming: 0, unscheduled: 0, completedInRange: 0 } }).state, 'empty');
  assert.equal(followUpChartState({ current: { overdue: 1, dueToday: 0, upcoming: 0, unscheduled: 0 } }).state, 'unavailable');
  const ready = followUpChartState({
    current: { overdue: 2, dueToday: 1, upcoming: 0, unscheduled: 0, completedInRange: 4, cancelledInRange: 9 },
  });
  assert.equal(ready.state, 'ready');
  assert.equal(ready.total, 7);
  assert.deepEqual(ready.rows.map((row) => row.id), ['overdue', 'due_today', 'upcoming', 'unscheduled', 'completed']);
  assert.equal(ready.rows.find((row) => row.id === 'completed').percent, 100);
});

test('day-end groups separate recorded, reconstructed, and unavailable values', () => {
  const groups = dayEndGroups({
    exactSnapshot: false,
    summary: {
      studentsCreated: null,
      admissionChanges: 0,
      assignmentsOpened: 2,
      assignmentsRevoked: 0,
      followUpsCompleted: 1,
      outstanding: { count: 3 },
      overdue: { count: null },
    },
  });
  assert.deepEqual(groups.map((group) => group.title), ['Student activity', 'Assignment activity', 'Follow-up activity']);
  const flat = Object.fromEntries(groups.flatMap((group) => group.metrics).map((metric) => [metric.key, metric]));
  assert.equal(flat.students.kind, 'unavailable');
  assert.equal(flat.students.text, 'Unavailable');
  assert.equal(flat.admissions.kind, 'recorded');
  assert.equal(flat.admissions.text, '0');
  assert.equal(flat.outstanding.kind, 'reconstructed');
  assert.equal(flat.overdue.kind, 'unavailable');
  assert.equal(groups[2].metrics.length, 3);
});

test('day-end headline never reports a missing figure as zero', () => {
  assert.equal(dayEndHeadline(null).summary, '');
  const active = dayEndHeadline({ exactSnapshot: false, summary: { studentsCreated: 1, admissionChanges: 0, assignmentsOpened: 2, assignmentsRevoked: 0, followUpsCompleted: 0 } });
  assert.match(active.summary, /1 new student, 2 assignments opened/);
  assert.match(active.note, /reconstructed/);
  const gap = dayEndHeadline({ summary: { studentsCreated: null, admissionChanges: null, assignmentsOpened: 0, assignmentsRevoked: 0, followUpsCompleted: 0 } });
  assert.match(gap.summary, /2 figures are unavailable/);
  assert.doesNotMatch(gap.summary, /No student, assignment/);
  assert.equal(gap.note, '');
});

test('workload summary shows three metrics with attribution caveats', () => {
  const cards = workloadSummaryCards({
    total: 4,
    items: [{ assignedConsultancies: 2, openFollowUps: 3 }, { assignedConsultancies: 1, openFollowUps: 1 }],
  });
  assert.deepEqual(cards.map((card) => card.key), ['staff', 'assigned', 'open']);
  assert.equal(cards[0].text, '4');
  assert.equal(cards[1].text, '3');
  assert.match(cards[2].detail, /once for each assignee/);
  assert.match(cards[2].detail, /Among the 2 staff on this page/);
  assert.equal(workloadSummaryCards(null)[0].text, 'Unavailable');
  assert.equal(workloadScopeLine({ total: 4, items: [{}, {}] }), '2 of 4 staff on this page');
  assert.equal(workloadScopeLine({ total: 1, items: [{}] }), '1 staff member');
});

test('labels and scope badges stay short and honest', () => {
  assert.equal(intelDayLabel('2026-10-27'), '27 Oct 2026');
  assert.equal(intelDayLabel('nope'), '');
  assert.equal(intelRangeLabel('2026-09-28', '2026-10-27'), '28 Sep – 27 Oct 2026');
  assert.equal(intelRangeLabel('2025-12-20', '2026-01-02'), '20 Dec 2025 – 2 Jan 2026');
  assert.equal(intelRangeLabel('', '2026-01-02'), '');
  assert.equal(bucketPillLabel('unscheduled'), 'No due date');
  assert.equal(bucketPillLabel('', 'Follow-up Required'), 'Follow-up Required');
  assert.equal(dayEndSourceLabel('crmAuditLogs'), 'Audit log');
  assert.equal(dayEndSourceLabel(''), 'Source not stored');
  assert.equal(intelScopeBadge({ scopeBasis: 'organization_permission', scope: 'module' }).label, 'Organization-wide');
  assert.equal(intelScopeBadge(null), null);
  const base = defaultIntelFilters(new Date('2026-04-02T18:30:00.000Z'));
  assert.equal(intelFiltersChanged(base, { ...base }), false);
  assert.equal(intelFiltersChanged({ ...base, userId: 'x' }, base), true);
});
