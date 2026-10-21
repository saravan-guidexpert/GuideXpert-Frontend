import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareCounts,
  completionRate,
  cumulativeSeries,
  followUpBuckets,
  formatRate,
  insightRange,
  monthlySeries,
  pipelineCounts,
  referralTrendSeries,
  trendHasEvents,
} from './crmConsultancyInsight.js';

const now = new Date(2026, 9, 19, 12, 0, 0);

test('monthly series and cumulative referrals follow recorded dates', () => {
  const referrals = [
    { id: 'a', createdAt: '2026-08-02T09:00:00.000Z' },
    { id: 'b', createdAt: '2026-08-20T09:00:00.000Z' },
    { id: 'c', createdAt: '2026-10-01T09:00:00.000Z' },
  ];
  const students = [
    { id: 's1', createdAt: '2026-08-03T09:00:00.000Z' },
    { id: 's2', createdAt: '2026-09-04T09:00:00.000Z' },
  ];
  const range = insightRange('all', now);
  const points = monthlySeries(referrals, students, range);
  const august = points.find((point) => point.key === '2026-08');
  const september = points.find((point) => point.key === '2026-09');
  const october = points.find((point) => point.key === '2026-10');
  assert.equal(august.referrals, 2);
  assert.equal(august.registrations, 1);
  assert.equal(september.referrals, 0);
  assert.equal(september.registrations, 1);
  assert.equal(october.referrals, 1);
  const cumulative = cumulativeSeries(points);
  const totals = cumulative.map((point) => point.cumulative);
  assert.deepEqual(totals, totals.map((value, index) => totals.slice(0, index + 1).reduce((max, item) => Math.max(max, item), 0) ? value : value));
  for (let index = 1; index < totals.length; index += 1) assert.ok(totals[index] >= totals[index - 1]);
  assert.equal(cumulative.at(-1).cumulative, 3);
});

test('a selected range drops records outside it and a zero previous period stays unlabeled', () => {
  const referrals = [
    { createdAt: '2026-09-01T09:00:00.000Z' },
    { createdAt: '2026-10-10T09:00:00.000Z' },
  ];
  const range = insightRange('30', now);
  const points = monthlySeries(referrals, [], range);
  assert.equal(points.reduce((sum, point) => sum + point.referrals, 0), 1);
  const comparison = compareCounts(1, 0);
  assert.equal(comparison.percent, null);
  assert.equal(comparison.message, 'No records in previous period');
  assert.equal(compareCounts(4, 2).percent, 100);
  assert.equal(formatRate(completionRate([], range)), 'No base');
});

test('referral trend buckets follow the selected range and do not invent points', () => {
  const dayNow = new Date(2026, 9, 19, 12, 0, 0);
  const week = referralTrendSeries([], [], insightRange('7', dayNow));
  assert.equal(week.length, 7);
  assert.equal(week[0].interval, 'day');
  assert.equal(week[0].key, '2026-10-13');
  assert.equal(week.at(-1).key, '2026-10-19');
  assert.equal(trendHasEvents(week), false);

  const month = referralTrendSeries(
    [{ createdAt: '2026-10-10T09:00:00.000Z' }, { createdAt: '2026-04-02T09:30:00.000Z' }],
    [{ createdAt: '2026-10-01T09:00:00.000Z' }],
    insightRange('30', dayNow),
  );
  assert.equal(month.length, 30);
  assert.equal(month.every((point) => point.interval === 'day'), true);
  assert.equal(month.reduce((sum, point) => sum + point.referrals, 0), 1);
  assert.equal(month.reduce((sum, point) => sum + point.registrations, 0), 1);
  assert.equal(month.find((point) => point.referrals === 1).key, '2026-10-10');

  const quarters = referralTrendSeries(
    [{ createdAt: '2026-09-01T09:00:00.000Z' }, { createdAt: '2026-10-10T09:00:00.000Z' }],
    [],
    insightRange('90', dayNow),
  );
  assert.equal(quarters[0].interval, 'week');
  assert.equal(quarters.reduce((sum, point) => sum + point.referrals, 0), 2);

  const year = referralTrendSeries(
    [{ createdAt: '2026-01-05T09:00:00.000Z' }, { createdAt: '2026-08-02T09:00:00.000Z' }],
    [{ createdAt: '2026-08-03T09:00:00.000Z' }],
    insightRange('year', dayNow),
  );
  assert.equal(year[0].interval, 'month');
  assert.equal(year.reduce((sum, point) => sum + point.referrals, 0), 2);
  assert.equal(year.find((point) => point.key === '2026-08').registrations, 1);
  assert.deepEqual(referralTrendSeries([{ createdAt: '2026-10-01T09:00:00.000Z' }], [], insightRange('custom', dayNow, {})), []);
  assert.deepEqual(referralTrendSeries([], [], insightRange('all', dayNow)), []);
});

test('pipeline keeps every admission status and follow-up buckets use saved dates', () => {
  const pipeline = pipelineCounts([
    { admissionStatus: 'Applied' },
    { admissionStatus: 'Bogus' },
  ]);
  assert.equal(pipeline.length, 7);
  assert.equal(pipeline.find((row) => row.status === 'Applied').count, 1);
  assert.equal(pipeline.find((row) => row.status === 'Not started').count, 1);
  assert.equal(pipeline.find((row) => row.status === 'Enrolled').count, 0);
  const buckets = followUpBuckets([
    { id: 'today', scheduledAt: '2026-10-19T08:00:00.000Z' },
    { id: 'late', scheduledAt: '2026-10-01T08:00:00.000Z' },
    { id: 'next', scheduledAt: '2026-10-25T08:00:00.000Z' },
    { id: 'done', scheduledAt: '2026-10-01T08:00:00.000Z', completedAt: '2026-10-02T08:00:00.000Z' },
    { id: 'stopped', scheduledAt: '2026-10-01T08:00:00.000Z', cancelledAt: '2026-10-03T08:00:00.000Z' },
  ], now);
  assert.deepEqual(buckets.dueToday.map((row) => row.id), ['today']);
  assert.deepEqual(buckets.overdue.map((row) => row.id), ['late']);
  assert.deepEqual(buckets.upcoming.map((row) => row.id), ['next']);
  assert.deepEqual(buckets.completed.map((row) => row.id), ['done']);
  assert.equal(buckets.dueSoon.some((row) => row.id === 'stopped'), false);
});
