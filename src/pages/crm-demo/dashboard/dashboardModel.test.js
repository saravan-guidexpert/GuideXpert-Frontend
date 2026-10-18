import test from 'node:test';
import assert from 'node:assert/strict';
import { eachDayKey } from '../../../utils/crmAnalytics.js';
import { currentConsultancyName } from '../crmFormat.js';
import {
  attentionItems,
  buildChart,
  countBetween,
  currentSource,
  kpiHints,
  loadAll,
  localDayStamp,
  referralSources,
  sortActivity,
} from './dashboardModel.js';

const now = new Date(2026, 9, 18, 14, 0, 0);

test('monthly buckets count real createdAt values and leave other months at zero', () => {
  const students = [{ id: 'st_1', createdAt: '2026-04-02T09:30:00.000Z' }];
  const referrals = [
    { id: 'ref_1', createdAt: '2026-04-02T09:30:00.000Z' },
    { id: 'ref_2', createdAt: '2026-04-15T09:30:00.000Z' },
  ];
  const chart = buildChart('year', students, referrals, now);
  assert.equal(chart.points.length, 12);
  const april = chart.points.find((point) => point.key === '2026-04');
  const october = chart.points.find((point) => point.key === '2026-10');
  assert.equal(april.students, 1);
  assert.equal(april.referrals, 2);
  assert.equal(october.students, 0);
  assert.equal(october.referrals, 0);
  assert.equal(chart.students, 1);
  assert.equal(chart.referrals, 2);
  assert.equal(chart.best, 'April 2026');
  assert.equal(chart.change, 'No records in the previous period');
  const compared = buildChart('year', [
    { id: 'st_old', createdAt: '2025-06-01T09:30:00.000Z' },
    { id: 'st_new', createdAt: '2026-04-02T09:30:00.000Z' },
  ], referrals, now);
  assert.equal(compared.change, 'same students, 2 more referrals');
});

test('all-time omits a previous-period comparison and an empty range has no buckets', () => {
  const chart = buildChart('all', [], [], now);
  assert.deepEqual(chart.points, []);
  assert.equal(chart.change, null);
  assert.equal(chart.best, null);
  assert.equal(chart.hasActivity, false);
});

test('a period with no records hides the comparison when the previous window is also empty', () => {
  const chart = buildChart('30', [{ id: 'st_1', createdAt: '2026-04-02T09:30:00.000Z' }], [], now);
  assert.equal(chart.students, 0);
  assert.equal(chart.change, null);
  assert.equal(chart.best, null);
});

test('referral shares use consultancy ids and the corrected current source', () => {
  const referrals = [
    { id: 'r1', consultancyId: 'con_1', consultancyName: 'Horizon', originalConsultancyId: 'con_1', originalConsultancyName: 'Horizon', sourceCorrectedAt: null },
    { id: 'r2', consultancyId: 'con_1', consultancyName: 'Horizon Study Circle', originalConsultancyId: 'con_1', originalConsultancyName: 'Horizon Study Circle', sourceCorrectedAt: null },
    { id: 'r3', consultancyId: 'con_2', consultancyName: 'North Star', originalConsultancyId: 'con_1', originalConsultancyName: 'Horizon', sourceCorrectedAt: '2026-05-01T00:00:00.000Z' },
  ];
  const sources = referralSources(referrals, [{ id: 'con_1', name: 'Horizon Study Circle' }, { id: 'con_2', name: 'North Star' }]);
  assert.deepEqual(sources.map((row) => [row.id, row.count, row.shareLabel]), [
    ['con_1', 2, '67%'],
    ['con_2', 1, '33%'],
  ]);
  assert.equal(currentSource(referrals[2]).id, 'con_2');
  assert.equal(sources[0].name, 'Horizon Study Circle');
  assert.equal(referralSources([]).length, 0);
  const drifted = {
    consultancyId: 'con_2',
    consultancyName: 'Old snapshot',
    originalConsultancyId: 'con_1',
    originalConsultancyName: 'Horizon',
    sourceCorrectedAt: null,
  };
  assert.equal(currentSource(drifted).id, 'con_2');
  assert.equal(referralSources([drifted], [{ id: 'con_2', name: 'North Star Guidance' }])[0].name, 'North Star Guidance');
  assert.equal(currentConsultancyName(drifted, [{ id: 'con_2', name: 'North Star Guidance' }]), 'North Star Guidance');
  assert.equal(currentConsultancyName({ consultancyId: 'missing', consultancyName: 'Snapshot' }, []), 'Snapshot');
});

test('attention counts come from referral links and consultancy status', () => {
  const students = [{ id: 'st_1', fullName: 'Asha' }, { id: 'st_2', fullName: 'Meera' }];
  const consultancies = [{ id: 'con_1', name: 'Horizon', status: 'active' }, { id: 'con_3', name: 'South Gate', status: 'inactive' }];
  const referrals = [{ id: 'ref_1', crmStudentId: 'st_1', consultancyId: 'con_3', studentName: 'Asha' }];
  const items = attentionItems({ students, consultancies, referrals });
  assert.deepEqual(items.map((item) => [item.id, item.count, item.href]), [
    ['unreferred', 1, '/crm/students?tab=open'],
    ['untouched', 1, '/crm/students?tab=referred&admission=Not%20started'],
    ['inactive', 1, '/crm/consultancies?status=inactive'],
    ['inactive-source', 1, '/crm/consultancies?status=inactive'],
  ]);
});

test('kpi hints use coverage and active share without inventing a trend', () => {
  const hints = kpiHints({ studentCount: 4, consultancyCount: 3, activeCount: 2, referredStudentCount: 3, inactiveCount: 1 });
  assert.equal(hints.students, '3 of 4 have a source');
  assert.equal(hints.referrals, '75% of students have a source');
  assert.equal(hints.active, '67% of consultancies');
  assert.equal(hints.consultancies, '1 inactive');
  assert.equal(kpiHints({ studentCount: 0, consultancyCount: 0, activeCount: 0, referredStudentCount: 0, inactiveCount: 0 }).referrals, 'No students on file');
});

test('activity sorts by timestamp and paging stops when the total is loaded', () => {
  const sorted = sortActivity([
    { id: 'a', createdAt: '2026-04-02T09:30:00.000Z' },
    { id: 'c', createdAt: '2026-10-01T09:30:00.000Z' },
    { id: 'b', createdAt: 'not-a-date' },
  ]);
  assert.deepEqual(sorted.map((row) => row.id), ['c', 'a', 'b']);
  const loaded = loadAll((page) => (
    page === 1
      ? { success: true, data: { items: [{ id: '1' }], total: 2 } }
      : { success: true, data: { items: [{ id: '2' }], total: 2 } }
  ));
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.items.map((row) => row.id), ['1', '2']);
  const failed = loadAll((page) => (
    page === 1
      ? { success: true, data: { items: [{ id: '1' }], total: 3 } }
      : { success: false, message: 'Page failed.' }
  ));
  assert.equal(failed.ok, false);
  assert.equal(failed.message, 'Page failed.');
  assert.deepEqual(failed.items.map((row) => row.id), ['1']);
  let calls = 0;
  const capped = loadAll((page) => {
    calls += 1;
    assert.ok(page <= 50);
    return { success: true, data: { items: [{ id: String(page) }], total: 80 } };
  });
  assert.equal(calls, 50);
  assert.equal(capped.ok, false);
  assert.equal(capped.items.length, 50);
  assert.equal(capped.message, 'Some records could not be loaded.');
  assert.equal(countBetween([{ createdAt: '2026-04-02T00:00:00.000Z' }], new Date(2026, 3, 1), new Date(2026, 3, 30, 23, 59, 59, 999)), 1);
});

test('a 90 day bar is seven local days and a daily bar is one day', () => {
  const weekly = buildChart('90', [], [], now).points.at(-1);
  const from = localDayStamp(weekly.start);
  const to = localDayStamp(weekly.end);
  assert.equal(eachDayKey(from, to).length, 7);
  const daily = buildChart('30', [], [], now).points.at(-1);
  assert.equal(localDayStamp(daily.start), localDayStamp(daily.end));
  assert.match(buildChart('year', [], [], now).points[3].key, /^\d{4}-\d{2}$/);
});
