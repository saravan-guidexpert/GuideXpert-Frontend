import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OVERVIEW_PERIODS,
  activityLabel,
  activityVisual,
  admissionBars,
  formatCount,
  overviewOperationsQuery,
  periodName,
  periodPhrase,
  referralComparison,
  formatStamp,
  relativeTime,
  teamFilter,
  teamQueries,
  teamRows,
  teamTotals,
  updateSubject,
  volumeStats,
} from './crmOverview.js';
import { reduceCrmLoad } from './crmWorkspace.js';

const page = readFileSync(new URL('../pages/admin/crm/workspace/OverviewPage.jsx', import.meta.url), 'utf8');

test('the period selector only offers periods the operations API accepts', () => {
  assert.deepEqual(OVERVIEW_PERIODS.map((item) => item.id), ['7', '30', '90', 'custom']);
  assert.deepEqual(overviewOperationsQuery({ period: '7', timeZone: 'Asia/Kolkata' }).query, {
    period: '7',
    timeZone: 'Asia/Kolkata',
    page: 1,
    limit: 8,
  });
  assert.match(overviewOperationsQuery({ period: 'custom', from: '', to: '', timeZone: 'Asia/Kolkata' }).error, /start date/);
  assert.match(overviewOperationsQuery({ period: 'custom', from: '2026-10-10', to: '2026-10-01', timeZone: 'Asia/Kolkata' }).error, /start date/);
  assert.deepEqual(overviewOperationsQuery({ period: 'custom', from: '2026-10-01', to: '2026-10-10', timeZone: 'Asia/Kolkata' }).query, {
    period: 'custom',
    from: '2026-10-01',
    to: '2026-10-10',
    timeZone: 'Asia/Kolkata',
    page: 1,
    limit: 8,
  });
  assert.equal(periodName('30', { label: 'Last 30 days' }), 'Last 30 days');
  assert.equal(periodName('90', null), 'Last 90 days');
  assert.equal(periodPhrase('30', { id: '30', label: 'Last 30 days' }), 'the last 30 days');
  const custom = { id: 'custom', label: 'Custom range', from: '2026-10-12', to: '2026-10-21' };
  assert.equal(periodName('custom', custom), '12 Oct – 21 Oct');
  assert.equal(periodPhrase('custom', custom), '12 Oct – 21 Oct');
  assert.equal(periodName('custom', { id: 'custom', label: 'Custom range', from: '2026-10-12', to: '2026-10-12' }), '12 Oct');
  assert.equal(periodName('custom', { id: 'custom', label: 'Custom range' }), 'Custom range');
});

test('team activity only asks existing endpoints for filters they accept', () => {
  const queries = teamQueries();
  assert.deepEqual(queries.directory, { page: 1, limit: 100 });
  assert.deepEqual(queries.users, { page: 1, limit: 100 });
  assert.deepEqual(queries.updates, { page: 1, limit: 100, source: 'business', actorType: 'crm-user' });
});

const NOW = new Date('2026-10-26T12:00:00.000Z');
const directory = {
  total: 4,
  items: [
    { id: 'a', fullName: 'Asha Rao', roleLabel: 'Counsellor', presence: { state: 'offline', lastSeenAt: '2026-10-25T08:00:00.000Z', activeSessions: 0 }, assignmentCount: 2 },
    { id: 'b', fullName: 'Bala Iyer', presence: { state: 'online', lastSeenAt: '2026-10-26T11:59:00.000Z', activeSessions: 2 }, assignmentCount: 1 },
    { id: 'c', fullName: 'Chitra', status: 'inactive', presence: { state: 'inactive', lastSeenAt: null, activeSessions: 0 }, assignmentCount: 0 },
    { id: 'd', fullName: 'Dev Kumar', presence: { state: 'idle', lastSeenAt: '2026-10-26T11:30:00.000Z', activeSessions: 1 }, assignmentCount: 3 },
  ],
};
const users = { items: [
  { id: 'a', lastLoginAt: '2026-10-25T07:00:00.000Z' },
  { id: 'b', lastLoginAt: '2026-10-26T04:00:00.000Z' },
  { id: 'd', lastLoginAt: null },
] };
const updates = { total: 3, items: [
  { id: 'e3', actorType: 'crm-user', actorCrmUserId: 'b', createdAt: '2026-10-26T11:00:00.000Z', summary: 'Referral recorded.', entityType: 'referral', category: 'business', after: { fullName: 'Priya S' } },
  { id: 'e2', actorType: 'crm-user', actorCrmUserId: 'b', createdAt: '2026-10-26T09:00:00.000Z', summary: 'Student updated.' },
  { id: 'e1', actorType: 'crm-user', actorCrmUserId: 'a', createdAt: '2026-10-20T09:00:00.000Z', summary: 'Student created.' },
] };

test('team rows join presence, sign-in, and the newest change per person', () => {
  const rows = teamRows({ directory, users, updates });
  assert.deepEqual(rows.map((row) => row.id), ['b', 'd', 'a', 'c']);
  const bala = rows[0];
  assert.equal(bala.initials, 'BI');
  assert.equal(bala.sessions, 2);
  assert.equal(bala.lastLogin.at, '2026-10-26T04:00:00.000Z');
  assert.equal(bala.lastUpdate.event.id, 'e3');
  assert.equal(updateSubject(bala.lastUpdate.event), 'Priya S');
  const dev = rows[1];
  assert.deepEqual(dev.lastLogin, { known: true, at: null });
  assert.deepEqual(dev.lastUpdate, { known: true, event: null, complete: true });
  const chitra = rows[3];
  assert.equal(chitra.lastLogin.known, false);
});

test('a refused sign-in or change request stays hidden, not never', () => {
  const rows = teamRows({ directory, users: null, updates: null });
  assert.equal(rows.every((row) => row.lastLogin.known === false && row.lastUpdate.known === false), true);
  const totals = teamTotals(rows, 'Asia/Kolkata', NOW);
  assert.equal(totals.signedInToday, null);
  assert.equal(totals.updatedToday, null);
  const partial = teamRows({ directory, users, updates: { total: 500, items: updates.items } });
  assert.equal(partial.find((row) => row.id === 'd').lastUpdate.complete, false);
});

test('team totals and filters count real rows only', () => {
  const rows = teamRows({ directory, users: { items: [...users.items, { id: 'c', lastLoginAt: null }] }, updates });
  const totals = teamTotals(rows, 'Asia/Kolkata', NOW);
  assert.deepEqual(
    { all: totals.all, online: totals.online, idle: totals.idle, offline: totals.offline, closed: totals.closed },
    { all: 4, online: 1, idle: 1, offline: 1, closed: 1 }
  );
  assert.equal(totals.signedInToday, 1);
  assert.equal(totals.updatedToday, 1);
  assert.deepEqual(teamFilter(rows, 'closed').map((row) => row.id), ['c']);
  assert.equal(teamFilter(rows, 'all').length, 4);
});

test('relative times read naturally in the reporting zone', () => {
  const zone = 'Asia/Kolkata';
  assert.equal(relativeTime(null, zone, NOW), null);
  assert.equal(relativeTime('2026-10-26T11:59:40.000Z', zone, NOW), 'Just now');
  assert.equal(relativeTime('2026-10-26T11:15:00.000Z', zone, NOW), '45 min ago');
  assert.equal(relativeTime('2026-10-26T04:00:00.000Z', zone, NOW), '8 h ago');
  assert.equal(relativeTime('2026-10-25T08:00:00.000Z', zone, NOW), 'Yesterday');
  assert.equal(relativeTime('2026-10-22T08:00:00.000Z', zone, NOW), '4 days ago');
  assert.equal(relativeTime('2026-09-01T08:00:00.000Z', zone, NOW), '1 Sept');
  assert.match(formatStamp('2026-10-26T04:00:00.000Z', zone, NOW), /^9:30\s?am$/i);
  assert.match(formatStamp('2026-10-23T04:00:00.000Z', zone, NOW), /^23 Oct/);
});

test('referral comparison needs both counts and never invents a change', () => {
  assert.equal(referralComparison(null, 4), null);
  assert.equal(referralComparison(4, null), null);
  assert.deepEqual(referralComparison(9, 4), { diff: 5, direction: 'up', text: '+5 vs the previous period' });
  assert.equal(referralComparison(2, 6).direction, 'down');
  assert.equal(referralComparison(2, 6).text, '−4 vs the previous period');
  assert.equal(referralComparison(3, 3).direction, 'flat');
});

test('admission bars keep the server order and current counts only', () => {
  const bars = admissionBars({
    population: 'all_non_deleted_students',
    history: [{ status: 'Applied', count: 99 }],
    rows: [
      { status: 'Not started', count: 6 },
      { status: 'Contacted', count: 2 },
      { status: 'Admitted', count: 2 },
      { status: 'Not proceeding', count: 0 },
    ],
  });
  assert.deepEqual(bars.rows.map((row) => row.status), ['Not started', 'Contacted', 'Admitted', 'Not proceeding']);
  assert.equal(bars.total, 10);
  assert.equal(bars.rows[0].share, 60);
  assert.equal(bars.rows[0].width, 100);
  assert.equal(bars.rows[3].width, 0);
  assert.equal(bars.rows[2].tone, 'won');
  assert.equal(admissionBars(null).rows.length, 0);
  assert.equal(admissionBars({ rows: [{ status: 'Applied', count: 0 }] }).rows[0].share, 0);
});

test('volume stats report the real total and peak, and flag an all-zero window', () => {
  assert.deepEqual(volumeStats([]), { total: 0, peak: null, empty: true });
  const zero = volumeStats([{ label: '1 Oct', count: 0 }, { label: '2 Oct', count: 0 }]);
  assert.equal(zero.empty, true);
  assert.equal(zero.peak, null);
  const filled = volumeStats([{ label: '1 Oct', count: 1 }, { label: '2 Oct', count: 4 }, { label: '3 Oct', count: 4 }]);
  assert.equal(filled.total, 9);
  assert.equal(filled.peak.label, '2 Oct');
});

test('activity rows use returned fields only', () => {
  assert.deepEqual(activityVisual({ category: 'authentication', action: 'crm_user.login_failed' }), { kind: 'signin', tone: 'danger' });
  assert.equal(activityVisual({ category: 'business', entityType: 'referral' }).kind, 'referral');
  assert.equal(activityVisual({ category: 'business', entityType: 'unknown' }).kind, 'record');
  assert.equal(activityLabel({ summary: 'Sign-in succeeded.' }), 'Sign-in succeeded');
  assert.equal(activityLabel({ action: 'custom.action' }), 'custom.action');
});

test('formatting keeps hidden values distinct from zero', () => {
  assert.equal(formatCount(null), '—');
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(123456), '1,23,456');
});

test('a refresh can keep the shown data while the next request runs', () => {
  const shown = { loading: false, data: { ok: 1 }, notice: null, requestId: 'a' };
  assert.equal(reduceCrmLoad(shown, { type: 'start', requestId: 'b' }).data, null);
  const kept = reduceCrmLoad(shown, { type: 'start', requestId: 'b', keep: true });
  assert.equal(kept.loading, true);
  assert.deepEqual(kept.data, { ok: 1 });
  assert.equal(reduceCrmLoad(null, { type: 'start', requestId: 'b', keep: true }).data, null);
});

test('the overview page reads real responses and keeps hidden counts explicit', () => {
  assert.match(page, /getPortalOperations\(built\.query\)/);
  assert.match(page, /fetchPortalDirectory\(team\.directory\)/);
  assert.match(page, /fetchPortalUsers\(team\.users\)/);
  assert.match(page, /listPortalActivity\(team\.updates\)/);
  assert.match(page, /workspaceRouteDecision\(user, 'overview'\)/);
  assert.match(page, /metricText\(value, whenNull\)/);
  assert.match(page, /Number\(data\.consultancies\?\.unassigned\) > 0/);
  assert.match(page, /<Comparison current=\{data\.period\?\.newReferrals\} previous=\{data\.period\?\.previousNewReferrals\} \/>/);
  assert.match(page, /Sign-in times are hidden for this account\./);
  assert.match(page, /analyticsParams\(\{ period: 'custom'/);
  assert.doesNotMatch(page, /Math\.random|mockData|sampleData|faker/);
  assert.doesNotMatch(page, /conversion rate[^s]/i);
});
