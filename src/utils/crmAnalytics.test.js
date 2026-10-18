import test from 'node:test';
import assert from 'node:assert/strict';
import {
  conversionFor,
  dayKeyFromParts,
  daysSinceReferral,
  formatRate,
  joinReferrals,
  localDayKey,
  calendarQueryForBucket,
  eachDayKey,
  monthCells,
  previousRange,
  rankConsultancies,
  ratio,
  referralsOnDay,
  resolveRange,
  shiftDayKey,
  statusDistribution,
  statusOf,
  summarizeConsultancy,
  volumeSeries,
  within,
} from './crmAnalytics.js';

const NOW = new Date(2026, 9, 18, 14, 0, 0);

function student(id, status) {
  return { id, admissionStatus: status };
}

function referral(id, studentId, consultancyId, createdAt) {
  return { id, crmStudentId: studentId, consultancyId, createdAt };
}

test('missing and unknown admission statuses count as Not started', () => {
  assert.equal(statusOf({ admissionStatus: 'Applied' }), 'Applied');
  assert.equal(statusOf({}), 'Not started');
  assert.equal(statusOf({ admissionStatus: 'Maybe' }), 'Not started');
});

test('a rate with no denominator is unavailable, and zero over a real base is zero', () => {
  assert.equal(ratio(0, 0).rate, null);
  assert.equal(ratio(0, 4).rate, 0);
  assert.equal(formatRate(ratio(0, 0)), 'No base');
  assert.equal(formatRate(ratio(0, 4)), '0%');
  assert.equal(formatRate(ratio(1, 4)), '25%');
});

test('conversion uses current status and refuses a later stage with no earlier base', () => {
  const rows = [
    { status: 'Not started' },
    { status: 'Applied' },
    { status: 'Admitted' },
    { status: 'Enrolled' },
  ];
  const rates = conversionFor(rows);
  assert.deepEqual(rates.referralToApplication, { part: 3, whole: 4, rate: 0.75 });
  assert.deepEqual(rates.applicationToAdmission, { part: 2, whole: 3, rate: 2 / 3 });
  assert.deepEqual(rates.admissionToEnrollment, { part: 1, whole: 2, rate: 0.5 });
  const empty = conversionFor([]);
  assert.equal(empty.referralToApplication.rate, null);
  assert.equal(empty.applicationToAdmission.rate, null);
  assert.equal(empty.admissionToEnrollment.rate, null);
});

test('date ranges are inclusive local days and reject an inverted custom range', () => {
  const week = resolveRange('7', NOW);
  assert.equal(localDayKey(week.start.toISOString()), '2026-10-12');
  assert.equal(localDayKey(week.end.toISOString()), '2026-10-18');
  assert.equal(within('2026-10-12T00:30:00', week), true);
  assert.equal(within('2026-10-11T22:00:00', week), false);
  const custom = resolveRange('custom', NOW, { from: '2026-10-20', to: '2026-10-01' });
  assert.equal(custom.invalid, true);
  assert.equal(within('2026-10-18T10:00:00', custom), false);
});

test('days since referral count local calendar days and do not invent a time', () => {
  const key = localDayKey(new Date(2026, 9, 16, 23, 30).toISOString());
  assert.equal(daysSinceReferral(new Date(2026, 9, 16, 23, 30).toISOString(), NOW), 2);
  assert.equal(key, '2026-10-16');
  assert.equal(daysSinceReferral('not-a-date', NOW), null);
});

test('consultancy totals follow the current referral source and keep original attribution separate', () => {
  const summary = summarizeConsultancy({
    consultancy: { id: 'con_1' },
    students: [student('st_1', 'Enrolled'), student('st_2', 'Not started'), student('st_3', 'Applied')],
    referrals: [
      referral('ref_1', 'st_1', 'con_1', '2026-10-02T09:30:00.000Z'),
      referral('ref_2', 'st_2', 'con_1', '2026-10-10T09:30:00.000Z'),
      referral('ref_3', 'st_3', 'con_2', '2026-10-10T09:30:00.000Z'),
    ],
    audits: [{ id: 'a1', entityId: 'st_2', createdAt: '2026-10-11T09:30:00.000Z', action: 'student_updated' }],
    range: resolveRange('30', NOW),
    now: NOW,
  });
  assert.equal(summary.total, 2);
  assert.equal(summary.enrolled, 1);
  assert.equal(summary.untouched, 1);
  assert.equal(summary.active, 0);
  assert.equal(summary.rows.find((row) => row.student.id === 'st_2').lastActivity.action, 'student_updated');
  assert.equal(summary.rows.some((row) => row.student.id === 'st_3'), false);
});

test('an empty selected period is zero activity, not missing history', () => {
  const summary = summarizeConsultancy({
    consultancy: { id: 'con_1' },
    students: [student('st_1', 'Applied')],
    referrals: [referral('ref_1', 'st_1', 'con_1', '2026-01-02T09:30:00.000Z')],
    audits: [],
    range: resolveRange('7', NOW),
    now: NOW,
  });
  assert.equal(summary.periodReferrals, 0);
  assert.equal(summary.conversion.referralToApplication.rate, null);
  assert.equal(summary.total, 1);
});

test('volume fills empty days inside a selected range and does not invent months outside recorded history', () => {
  const range = resolveRange('7', NOW);
  const series = volumeSeries([referral('ref_1', 'st_1', 'con_1', new Date(2026, 9, 18, 9).toISOString())], range);
  assert.equal(series.length, 7);
  assert.equal(series.at(-1).count, 1);
  assert.equal(series[0].count, 0);
  const allTime = volumeSeries([
    referral('ref_1', 'st_1', 'con_1', new Date(2026, 0, 15).toISOString()),
    referral('ref_2', 'st_2', 'con_1', new Date(2026, 2, 2).toISOString()),
  ], resolveRange('all', NOW));
  assert.deepEqual(allTime.map((point) => point.count), [1, 0, 1]);
  assert.deepEqual(volumeSeries([], resolveRange('all', NOW)), []);
});

test('status distribution and ranking use the same referral records', () => {
  const rows = joinReferrals([
    referral('ref_1', 'st_1', 'con_1', '2026-10-02T09:30:00.000Z'),
    referral('ref_2', 'st_2', 'con_2', '2026-10-03T09:30:00.000Z'),
  ], [student('st_1', 'Enrolled'), student('st_2', undefined)], [], NOW);
  const distribution = statusDistribution(rows);
  assert.equal(distribution.find((row) => row.status === 'Enrolled').count, 1);
  assert.equal(distribution.find((row) => row.status === 'Not started').count, 1);
  const ranked = rankConsultancies(
    [{ id: 'con_2', name: 'North', status: 'active' }, { id: 'con_1', name: 'Horizon', status: 'active' }],
    rows.map((row) => row.referral),
    [student('st_1', 'Enrolled'), student('st_2', undefined)],
    resolveRange('30', NOW),
  );
  assert.equal(ranked[0].id, 'con_1');
  assert.equal(ranked[0].enrolled, 1);
  assert.equal(ranked[1].referrals, 1);
});

test('calendar cells cover the month and group referrals by local day', () => {
  const cells = monthCells(2026, 9);
  assert.equal(cells.filter((day) => day != null).length, 31);
  assert.equal(cells[0], null);
  assert.equal(cells.at(-1), 31);
  const key = dayKeyFromParts(2026, 9, 18);
  const grouped = referralsOnDay([
    referral('ref_1', 'st_1', 'con_1', new Date(2026, 9, 18, 8).toISOString()),
    referral('ref_2', 'st_2', 'con_1', new Date(2026, 9, 19, 8).toISOString()),
  ], key);
  assert.equal(grouped.length, 1);
  assert.equal(referralsOnDay([referral('ref_3', 'st_3', 'con_1', 'nope')], key).length, 0);
});

test('the previous period has the same length and invalid timestamps match nothing', () => {
  const range = resolveRange('7', NOW);
  const prior = previousRange(range);
  assert.equal(prior.end.getTime() - prior.start.getTime(), range.end.getTime() - range.start.getTime());
  assert.equal(localDayKey(prior.start.toISOString()), '2026-10-05');
  assert.equal(localDayKey(prior.end.toISOString()), '2026-10-11');
  assert.equal(within('not-a-date', range), false);
  assert.equal(joinReferrals([{ id: 'ref_x', crmStudentId: 'st_x', consultancyId: 'con_1', createdAt: 'not-a-date' }], [], [], NOW).length, 0);
  assert.deepEqual(volumeSeries([{ id: 'ref_x', createdAt: 'not-a-date' }], range).map((point) => point.count), [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(volumeSeries([referral('ref_1', 'st_1', 'con_1', '2026-10-18T09:00:00.000Z')], resolveRange('custom', NOW, { from: '2026-10-20', to: '2026-10-01' })), []);
  assert.equal(previousRange(resolveRange('all', NOW)), null);
});

test('active is only contacted, counselling, or applied', () => {
  const referrals = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].map((id, index) => referral(`ref_${id}`, id, 'con_1', `2026-10-0${index + 1}T09:00:00.000Z`));
  const summary = summarizeConsultancy({
    consultancy: { id: 'con_1' },
    students: [
      student('s1', 'Contacted'),
      student('s2', 'Counselling'),
      student('s3', 'Applied'),
      student('s4', 'Admitted'),
      student('s5', 'Enrolled'),
      student('s6', 'Not proceeding'),
      student('s7', undefined),
    ],
    referrals,
    audits: [],
    range: resolveRange('all', NOW),
    now: NOW,
  });
  assert.equal(summary.active, 3);
  assert.equal(summary.admitted, 1);
  assert.equal(summary.enrolled, 1);
  assert.equal(summary.untouched, 1);
  const missing = summarizeConsultancy({
    consultancy: { id: 'con_1' },
    students: [],
    referrals: [referral('ref_missing', 'missing', 'con_1', '2026-10-02T09:00:00.000Z')],
    audits: [],
    range: resolveRange('30', NOW),
    now: NOW,
  });
  assert.equal(missing.total, 1);
  assert.equal(missing.rows[0].student, null);
  assert.equal(missing.untouched, 1);
});

test('equal enrolled totals break the tie by name', () => {
  const ranked = rankConsultancies(
    [{ id: 'b', name: 'Beta', status: 'active' }, { id: 'a', name: 'Alpha', status: 'active' }],
    [
      referral('r1', 's1', 'b', '2026-10-10T09:30:00.000Z'),
      referral('r2', 's2', 'a', '2026-10-10T09:30:00.000Z'),
    ],
    [student('s1', 'Enrolled'), student('s2', 'Enrolled')],
    resolveRange('30', NOW),
  );
  assert.deepEqual(ranked.map((row) => row.id), ['a', 'b']);
});

test('calendar periods stay inclusive and a bucket key opens that day or month', () => {
  assert.deepEqual(eachDayKey('2026-10-12', '2026-10-18'), [
    '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
  ]);
  assert.deepEqual(eachDayKey('2026-10-18', '2026-10-12'), []);
  assert.equal(shiftDayKey('2026-10-18', 1), '2026-10-19');
  assert.deepEqual(calendarQueryForBucket('2026-10-18'), { day: '2026-10-18' });
  assert.deepEqual(calendarQueryForBucket('2026-10'), { month: '2026-10' });
  assert.equal(calendarQueryForBucket('week'), null);
  const keys = eachDayKey('2026-10-12', '2026-10-18');
  const referrals = [referral('ref_1', 'st_1', 'con_1', new Date(2026, 9, 18, 9).toISOString())];
  const counted = keys.reduce((sum, key) => sum + referralsOnDay(referrals, key).length, 0);
  assert.equal(counted, 1);
  assert.equal(referralsOnDay(referrals, '2026-10-12').length, 0);
});
