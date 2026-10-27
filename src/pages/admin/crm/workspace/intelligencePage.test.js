import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, 'IntelligencePage.jsx'), 'utf8');
const css = readFileSync(join(root, 'superAdminIntelligence.css'), 'utf8');

test('page answers the admin questions in order', () => {
  const order = [
    'Follow-up overview',
    'Day-end report',
    'Staff workload',
    'How metrics are calculated',
  ].map((title) => page.indexOf(`title="${title}"`) >= 0 ? page.indexOf(`title="${title}"`) : page.indexOf(`>${title}<`));
  assert.ok(order.every((index) => index > 0), 'every section exists');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections appear in the intended order');
  assert.match(page, /Monitor follow-ups, review daily CRM activity, and understand staff workload\./);
});

test('header shows range, timezone confirmation, and refresh without long disclaimers', () => {
  assert.match(page, /Pending confirmation/);
  assert.match(page, /timeZoneConfirmed/);
  assert.match(page, /aria-label="Refresh intelligence"/);
  assert.doesNotMatch(page, /This is not working time, a productivity score, or a conversion rate\. Staff are listed/);
});

test('filters keep one reporting-day control and collapse advanced options', () => {
  assert.equal((page.match(/value=\{filters\.date\}/g) || []).length, 1);
  assert.match(page, /useState\(false\);\s*\n\s*const \[defsOpen/);
  assert.match(page, /Advanced filters/);
  assert.match(page, /Reset/);
  assert.match(page, /Active<\/span>/);
});

test('follow-up cards are limited to four primary metrics with working filters', () => {
  assert.match(page, /overview\.cards\.map/);
  assert.match(page, /overview\.unscheduled/);
  assert.match(page, /Not enough scheduled follow-ups|overview\.completion\.text/);
  assert.match(page, /onClick=\{\(\) => card\.filter && update\(card\.filter\)\}/);
});

test('day-end report separates recorded, reconstructed, and unavailable facts', () => {
  assert.match(page, /dayEndGroups\(dayEnd\.data\)/);
  assert.match(page, /View audit details/);
  assert.match(page, /dayEndScheduleNote/);
  assert.match(css, /\.intel-tag\.is-reconstructed/);
  assert.match(css, /\.intel-tag\.is-recorded/);
});

test('workload reuses Staff 360 and never ranks or invents a route', () => {
  assert.match(page, /import Staff360Detail from '\.\/Staff360Detail'/);
  assert.match(page, /staffId=\{selectedStaff\.id\}/);
  assert.match(page, /completionRateText\(row\.completion\)/);
  assert.match(page, /not ranked by volume/);
  assert.match(page, /not working time/);
  assert.doesNotMatch(page, /sort\(\(left, right\) => right\./);
  assert.doesNotMatch(page, /<Route/);
});

test('ordinary empty states are compact, never large dashed boxes', () => {
  assert.doesNotMatch(page, /is-dashed/);
  assert.doesNotMatch(css, /border-style:\s*dashed/);
  assert.match(css, /\.intel-empty\s*\{[^}]*padding:\s*12px 14px/);
});

test('panel padding survives the global section reset', () => {
  assert.match(css, /\.intel-page section\.intel-section/);
  assert.match(css, /\.intel-page section\.intel-filters/);
});

test('definitions cover the six required areas with technical names in code', () => {
  [
    'Follow-up classification',
    'Completion-rate calculation',
    'Day-end reconstruction',
    'Staff workload attribution',
    'Admission-event interpretation',
    'Timezone and reporting limitations',
  ].forEach((title) => assert.ok(page.includes(title), title));
  assert.match(page, /<code>completedAt<\/code>/);
  assert.match(page, /pending business-owner confirmation/);
});
