import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, 'ActivityPage.jsx'), 'utf8');

test('activity page investigates real server data with named actors and diffs', () => {
  assert.match(page, /Activity &amp; Audit Intelligence|Activity & Audit Intelligence/);
  assert.match(page, /getPortalActivitySummary/);
  assert.match(page, /listPortalActivity/);
  assert.match(page, /getPortalActivity\(/);
  assert.match(page, /fetchPortalDirectory/);
  assert.match(page, /timelineStory\(/);
  assert.match(page, /formatChangeValue\(/);
  assert.match(page, /beforeMissing/);
  assert.match(page, /pending confirmation/);
  assert.match(page, /not a productivity score|not working time|Not a productivity|Event counts are recorded audits/);
  assert.match(page, /No events match these filters/);
  assert.doesNotMatch(page, /Page 1 of 1/);
  assert.doesNotMatch(page, /Export/);
  assert.doesNotMatch(page, /hours worked/i);
});

test('staff focus and presence labels stay distinct', () => {
  assert.match(page, /Last seen/);
  assert.match(page, /heartbeat/);
  assert.match(page, /No events|No recorded activity/);
  assert.match(page, /View this staff timeline/);
  assert.match(page, /openStaff\(/);
});

test('timeline has local filters and an iOS-style overflow scrollbar', () => {
  assert.match(page, /act-timeline-filters/);
  assert.match(page, /Filter timeline/);
  assert.match(page, /act-ios-scroll/);
  assert.match(page, /useIosScrollActive/);
  const css = readFileSync(join(root, 'superAdminActivity.css'), 'utf8');
  assert.match(css, /\.act-ios-scroll/);
  assert.match(css, /::-webkit-scrollbar-thumb/);
  assert.match(css, /\.act-timeline-filters/);
});

test('activity board uses calendar left, users right, and detail below', () => {
  assert.match(page, /act-board/);
  assert.match(page, /act-calendar-panel/);
  assert.match(page, /act-users-panel/);
  assert.match(page, /selectCalendarDay/);
  assert.match(page, /buildActivityCalendarDays/);
  assert.match(page, />Users</);
  assert.match(page, /Staff360Detail/);
  assert.match(page, /act-board-below/);
  const css = readFileSync(join(root, 'superAdminActivity.css'), 'utf8');
  assert.match(css, /\.act-board-top/);
  assert.match(css, /\.act-cal-grid/);
});

test('Staff 360 detail uses compact KPIs, scoped labels, and overview cards', () => {
  const detail = readFileSync(join(root, 'Staff360Detail.jsx'), 'utf8');
  const css = readFileSync(join(root, 'superAdminActivity.css'), 'utf8');
  assert.match(detail, /s360-metric-scope/);
  assert.match(detail, /staff360FollowUpIntel/);
  assert.match(detail, /Follow-up intelligence/);
  assert.match(detail, /No associated students yet|staff360EmptyMessage\('overview'\)/);
  assert.match(detail, /View full timeline/);
  assert.match(detail, /s360-overview/);
  assert.match(css, /\.s360-metric-scope/);
  assert.match(css, /\.s360-fu-grid/);
  assert.match(css, /\.s360-assign-list/);
  assert.match(css, /\.s360-empty\.is-compact/);
});
