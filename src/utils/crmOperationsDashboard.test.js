import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  consultancyBarRows,
  displayMetricValue,
  filterConsultancyItems,
  operationsAdmission,
  operationsKpis,
  operationsScopeNote,
  operationsVolumeRows,
  operationsVolumeStats,
  pagerLabel,
  referralDelta,
  volumeBucketRange,
} from './crmOperationsDashboard.js';
import { HIDDEN_METRIC, RANGE_METRIC } from './crmWorkspace.js';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, '../pages/admin/crm/workspace/AnalyticsPage.jsx'), 'utf8');

const sample = {
  aggregateScope: 'module',
  scopeBasis: 'organization_permission',
  range: { label: 'Last 30 days', from: '2026-09-27', to: '2026-10-26' },
  period: {
    meaning: 'referrals whose referredAt falls in the selected window',
    newReferrals: 12,
    previousNewReferrals: 8,
    volume: {
      grain: 'day',
      points: [
        { key: '2026-10-01', label: '1 Oct', count: 2 },
        { key: '2026-10-02', label: '2 Oct', count: 5 },
        { key: '2026-10-03', label: '3 Oct', count: 0 },
      ],
    },
  },
  current: {
    consultancies: { active: 4, total: 5, inactive: 1 },
    students: { total: 20, withCurrentReferral: 18, withoutReferral: 2 },
    admissionStatus: {
      population: 'all_non_deleted_students',
      rows: [
        { status: 'Not started', count: 4 },
        { status: 'Contacted', count: 3 },
        { status: 'Counselling', count: 2 },
        { status: 'Applied', count: 5 },
        { status: 'Admitted', count: 3 },
        { status: 'Enrolled', count: 2 },
        { status: 'Not proceeding', count: 1 },
      ],
    },
  },
  consultancies: {
    unassigned: 1,
    items: [
      { id: '1', name: 'Orbit', status: 'active', students: 4, newReferrals: 3, previousNewReferrals: 1, activeAssignees: 2 },
      { id: '2', name: 'Beacon', status: 'active', students: 9, newReferrals: 1, previousNewReferrals: 4, activeAssignees: 1 },
      { id: '3', name: 'Hidden House', status: 'inactive', students: 0, newReferrals: 0, previousNewReferrals: null, activeAssignees: 0 },
    ],
  },
};

test('KPI cards keep restricted and unavailable values explicit', () => {
  const kpis = operationsKpis(sample);
  assert.equal(kpis.find((row) => row.id === 'referrals').value, 12);
  assert.ok(kpis.find((row) => row.id === 'referrals').comparison);
  assert.equal(displayMetricValue(null, HIDDEN_METRIC).text, 'Restricted');
  assert.equal(displayMetricValue(null, RANGE_METRIC).text, 'Unavailable');
  assert.equal(displayMetricValue(12, HIDDEN_METRIC).text, '12');
  const restricted = operationsKpis({
    ...sample,
    current: { ...sample.current, students: { total: null } },
    consultancies: { ...sample.consultancies, unassigned: null },
    period: { ...sample.period, previousNewReferrals: null },
  });
  assert.equal(displayMetricValue(restricted.find((row) => row.id === 'students').value, HIDDEN_METRIC).text, 'Restricted');
  assert.equal(displayMetricValue(restricted.find((row) => row.id === 'previous').value, RANGE_METRIC).text, 'Unavailable');
});

test('volume helpers peak, empty, and bucket drill ranges', () => {
  const rows = operationsVolumeRows(sample.period.volume);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].key, '2026-10-01');
  const stats = operationsVolumeStats(rows);
  assert.equal(stats.total, 7);
  assert.equal(stats.peak.key, '2026-10-02');
  assert.equal(stats.empty, false);
  assert.deepEqual(volumeBucketRange(rows[0], 'day'), { period: 'custom', from: '2026-10-01', to: '2026-10-01' });
  assert.deepEqual(
    volumeBucketRange({ key: '2026-02', label: 'Feb' }, 'month'),
    { period: 'custom', from: '2026-02-01', to: '2026-02-28' }
  );
  assert.equal(operationsVolumeStats([]).empty, true);
});

test('admission snapshot preserves status order and population note', () => {
  const admission = operationsAdmission(sample);
  assert.equal(admission.rows[0].status, 'Not started');
  assert.equal(admission.rows[6].status, 'Not proceeding');
  assert.equal(admission.total, 20);
  assert.match(admission.note, /non-deleted student/i);
});

test('consultancy search, sort, bars, and deltas stay factual', () => {
  const sorted = filterConsultancyItems(sample.consultancies.items, { sort: 'students' });
  assert.equal(sorted[0].name, 'Beacon');
  const found = filterConsultancyItems(sample.consultancies.items, { q: 'orbit', sort: 'name' });
  assert.equal(found.length, 1);
  const bars = consultancyBarRows(sample.consultancies.items, 2);
  assert.equal(bars.length, 2);
  assert.equal(bars[0].name, 'Orbit');
  assert.equal(referralDelta(3, 1).direction, 'up');
  assert.equal(referralDelta(1, 4).direction, 'down');
  assert.equal(referralDelta(2, null).direction, 'none');
  assert.match(pagerLabel(1, 20, 45), /1–20 of 45/);
});

test('scope note distinguishes organization and assigned views', () => {
  assert.match(operationsScopeNote(sample), /Organization-wide/);
  assert.match(operationsScopeNote({ aggregateScope: 'assigned', recordScope: 'assigned' }), /assigned/);
});

test('operations page wires real API, periods, and honest null copy', () => {
  assert.match(page, /getPortalOperations\(built\.query\)/);
  assert.match(page, /operationsQuery\(\{ \.\.\.filters, timeZone \}\)/);
  assert.match(page, /Operations &amp; Intelligence/);
  assert.match(page, /PHASE_A_TIME_ZONE/);
  assert.match(page, /pending/);
  assert.match(page, /displayMetricValue/);
  assert.match(page, /volumeBucketRange/);
  assert.match(page, /Current status snapshot, not historical funnel/);
  assert.match(page, /ops-limits/);
  assert.doesNotMatch(page, /Math\.random|mockData|sampleData|faker|conversion rate/i);
});
