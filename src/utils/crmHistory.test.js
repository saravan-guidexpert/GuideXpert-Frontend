import assert from 'node:assert/strict';
import test from 'node:test';
import {
  admissionStatusDistribution,
  assignmentDuration,
  assignmentSummary,
  countActiveHistoryFilters,
  dailyActionBreakdown,
  dailyTrendRows,
  defaultHistoryFilters,
  filterAdmissionItems,
  historyActionLabel,
  historyFilterChips,
  historyMetricCards,
  reportingPeriodLabel,
  resolveHistoryPeriod,
} from './crmHistory.js';

test('history period presets keep Asia/Kolkata day boundaries', () => {
  const range = resolveHistoryPeriod('7', null, new Date('2026-04-02T18:30:00.000Z'), 'Asia/Kolkata');
  assert.equal(range.to, '2026-04-03');
  assert.equal(range.from, '2026-03-28');
  const custom = resolveHistoryPeriod('custom', { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(custom.from, '2026-01-01');
  assert.equal(custom.to, '2026-01-31');
});

test('default filters start on the last 30 calendar days', () => {
  const filters = defaultHistoryFilters(new Date('2026-04-02T18:30:00.000Z'));
  assert.equal(filters.period, '30');
  assert.equal(filters.to, '2026-04-03');
  assert.equal(filters.kind, '');
});

test('metric cards distinguish server totals from page-scoped counts', () => {
  const cards = historyMetricCards({
    admissions: {
      total: 40,
      items: [
        { kind: 'initial', nextStatus: 'Contacted' },
        { kind: 'transition', previousStatus: 'Contacted', nextStatus: 'Counselling' },
      ],
    },
    assignments: {
      total: 4,
      range: { start: '2026-04-01T00:00:00.000Z', end: '2026-04-30T23:59:59.999Z' },
      items: [
        { state: 'active', openedAt: '2026-04-10T10:00:00.000Z', revokedAt: null },
        { state: 'revoked', openedAt: '2026-03-01T10:00:00.000Z', revokedAt: '2026-04-12T10:00:00.000Z' },
      ],
    },
    daily: {
      total: 8,
      items: [
        { day: '2026-04-10', action: 'student.created', source: 'business', count: 2 },
        { day: '2026-04-11', action: 'crm_assignment.created', source: 'security', count: 1 },
      ],
    },
    rangeLabel: '2026-04-01 → 2026-04-30 · Asia/Kolkata',
    filters: { kind: '' },
  });

  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  assert.equal(byKey.admissions.text, '40');
  assert.equal(byKey.admissions.unavailable, false);
  assert.equal(byKey.initial.pageScoped, true);
  assert.equal(byKey.initial.text, '1');
  assert.equal(byKey.transitions.text, '1');
  assert.equal(byKey.assignments.text, '4');
  assert.equal(byKey.opened.text, '1');
  assert.equal(byKey.revoked.text, '1');
  assert.equal(byKey.activity.text, '8');
  assert.equal(byKey.recorded.text, '3');
  assert.equal(byKey.recorded.pageScoped, true);
});

test('when the admission page is complete, initial and transition counts are exact', () => {
  const cards = historyMetricCards({
    admissions: {
      total: 2,
      items: [
        { kind: 'initial', nextStatus: 'Not started' },
        { kind: 'transition', previousStatus: 'Not started', nextStatus: 'Contacted' },
      ],
    },
    assignments: null,
    daily: null,
    filters: { kind: '' },
  });
  const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
  assert.equal(byKey.initial.pageScoped, false);
  assert.equal(byKey.transitions.pageScoped, false);
  assert.equal(byKey.initial.text, '1');
  assert.equal(byKey.transitions.text, '1');
});

test('kind filter uses the server total for that slice', () => {
  const cards = historyMetricCards({
    admissions: {
      total: 12,
      items: [{ kind: 'transition', previousStatus: 'Contacted', nextStatus: 'Applied' }],
    },
    assignments: null,
    daily: null,
    filters: { kind: 'transition' },
  });
  const transitions = cards.find((card) => card.key === 'transitions');
  assert.equal(transitions.text, '12');
  assert.equal(transitions.pageScoped, false);
});

test('assignment duration labels elapsed versus stored intervals', () => {
  const active = assignmentDuration({
    openedAt: '2026-04-01T00:00:00.000Z',
    revokedAt: null,
  }, new Date('2026-04-03T12:00:00.000Z'));
  assert.equal(active.elapsed, true);
  assert.match(active.detail, /Elapsed/);
  assert.match(active.text, /d|h|m/);

  const revoked = assignmentDuration({
    openedAt: '2026-04-01T00:00:00.000Z',
    revokedAt: '2026-04-02T00:00:00.000Z',
  });
  assert.equal(revoked.elapsed, false);
  assert.equal(revoked.text, '1d 0h');

  const missing = assignmentDuration({ openedAt: null });
  assert.equal(missing.text, 'Unavailable');
});

test('assignment summary and admission distribution stay honest about page scope', () => {
  const summary = assignmentSummary({
    total: 10,
    range: { start: '2026-04-01T00:00:00.000Z', end: '2026-04-30T23:59:59.999Z' },
    items: [
      { state: 'active', openedAt: '2026-04-05T00:00:00.000Z', revokedAt: null },
      { state: 'revoked', openedAt: '2026-03-01T00:00:00.000Z', revokedAt: '2026-04-08T00:00:00.000Z' },
    ],
  });
  assert.equal(summary.total, 10);
  assert.equal(summary.active, 1);
  assert.equal(summary.opened, 1);
  assert.equal(summary.revokedInPeriod, 1);
  assert.equal(summary.pageScoped, true);

  const dist = admissionStatusDistribution([
    { kind: 'initial', nextStatus: 'Contacted' },
    { kind: 'transition', nextStatus: 'Counselling' },
    { kind: 'transition', nextStatus: 'Counselling' },
    { kind: 'transition', nextStatus: 'Applied' },
  ]);
  assert.equal(dist[0].status, 'Counselling');
  assert.equal(dist[0].count, 2);
  assert.equal(dist.length, 2);
});

test('daily trend omits zero-filled missing days and labels actions', () => {
  const trend = dailyTrendRows([
    { day: '2026-04-11', action: 'student.created', source: 'business', count: 2 },
    { day: '2026-04-10', action: 'crm_assignment.created', source: 'security', count: 3 },
    { day: '2026-04-11', action: 'student.updated', source: 'business', count: 1 },
  ]);
  assert.deepEqual(trend.map((row) => row.day), ['2026-04-10', '2026-04-11']);
  assert.equal(trend[0].security, 3);
  assert.equal(trend[1].business, 3);
  assert.equal(trend[1].total, 3);

  const breakdown = dailyActionBreakdown([
    { action: 'student.created', source: 'business', count: 2 },
    { action: 'student.created', source: 'business', count: 1 },
    { action: 'crm_assignment.revoked', source: 'security', count: 4 },
  ]);
  assert.equal(breakdown[0].action, 'crm_assignment.revoked');
  assert.equal(breakdown[0].count, 4);
  assert.equal(historyActionLabel('student.created'), 'Student created');
  assert.match(historyActionLabel('custom.thing'), /custom thing/);
});

test('search filters loaded rows without inventing API parameters', () => {
  const rows = filterAdmissionItems([
    { studentName: 'Venkatesh K', nextStatus: 'Counselling', actor: { name: 'CRM Test User', type: 'crm-user' } },
    { studentName: 'Other', nextStatus: 'Applied', actor: null },
  ], 'venkat');
  assert.equal(rows.length, 1);
  assert.equal(countActiveHistoryFilters({ search: 'venkat', kind: 'initial' }), 2);
  const chips = historyFilterChips({ kind: 'transition', toStatus: 'Applied', search: 'abc' });
  assert.equal(chips.some((chip) => chip.key === 'kind'), true);
  assert.equal(chips.some((chip) => chip.key === 'toStatus'), true);
  assert.equal(reportingPeriodLabel('2026-04-01', '2026-04-01'), '2026-04-01 · Asia/Kolkata');
});
