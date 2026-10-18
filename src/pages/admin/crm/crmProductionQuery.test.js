import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyticsParams, calendarParams } from './crmProductionQuery.js';

test('admin analytics queries reject a reversed custom range before calling the API', () => {
  const reversed = analyticsParams({ period: 'custom', from: '2026-04-10', to: '2026-04-01', timeZone: 'UTC' });
  assert.equal(reversed.query, undefined);
  assert.match(reversed.error, /start date/);
  const ready = analyticsParams({ period: 'custom', from: '2026-04-01', to: '2026-04-02', timeZone: 'Asia/Kolkata' });
  assert.deepEqual(ready.query, {
    period: 'custom',
    from: '2026-04-01',
    to: '2026-04-02',
    timeZone: 'Asia/Kolkata',
  });
  assert.deepEqual(analyticsParams({ period: '30', timeZone: 'UTC' }).query, { period: '30', timeZone: 'UTC' });
});

test('admin calendar queries send one date mode', () => {
  assert.equal(calendarParams({ mode: 'day', day: '2026-04-02', page: 2, timeZone: 'UTC' }).query.day, '2026-04-02');
  assert.equal(calendarParams({ mode: 'month', month: '2026-04', timeZone: 'UTC' }).query.month, '2026-04');
  const range = calendarParams({ mode: 'range', from: '2026-04-10', to: '2026-04-01', timeZone: 'UTC' });
  assert.equal(range.query, undefined);
});

test('public /crm stays on the demo client and admin analytics is a separate route', () => {
  const root = path.join(import.meta.dirname, '../../..');
  const app = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8');
  const dataSource = fs.readFileSync(path.join(root, 'utils/crmDataSource.js'), 'utf8');
  const demoLayout = fs.readFileSync(path.join(root, 'pages/crm-demo/CrmDemoLayout.jsx'), 'utf8');
  assert.match(app, /path="\/crm"/);
  assert.match(app, /CrmDemoAnalyticsPage/);
  assert.match(app, /path="crm\/analytics"/);
  assert.match(app, /path="crm\/calendar"/);
  assert.match(dataSource, /return clients\.demo/);
  assert.match(demoLayout, /selectCrmClient\('demo'/);
  assert.equal(dataSource.includes('guidexpert_crm_demo_v1'), false);
});
