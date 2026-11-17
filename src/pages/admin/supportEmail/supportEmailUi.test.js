import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORT_EMAIL_LAYOUT,
  supportEmailQuery,
  EMPTY_COPY,
  ERROR_COPY
} from './supportEmailFormat.js';

test('support email filters omit empty values and keep a custom range', () => {
  const query = supportEmailQuery({
    preset: 'custom',
    from: '2026-11-01',
    to: '2026-11-17',
    q: 'receipt',
    status: '',
    page: 1
  });
  assert.equal(query, '?preset=custom&from=2026-11-01&to=2026-11-17&q=receipt&page=1');
});

test('dashboard layout stays compact on small screens and tabular on desktop', () => {
  assert.match(SUPPORT_EMAIL_LAYOUT.page, /px-3/);
  assert.match(SUPPORT_EMAIL_LAYOUT.page, /sm:px-4/);
  assert.match(SUPPORT_EMAIL_LAYOUT.page, /md:px-6/);
  assert.match(SUPPORT_EMAIL_LAYOUT.stats, /grid-cols-2/);
  assert.match(SUPPORT_EMAIL_LAYOUT.stats, /lg:grid-cols-4/);
  assert.match(SUPPORT_EMAIL_LAYOUT.table, /hidden/);
  assert.match(SUPPORT_EMAIL_LAYOUT.table, /md:block/);
  assert.match(SUPPORT_EMAIL_LAYOUT.cards, /md:hidden/);
  assert.equal(EMPTY_COPY.length > 0, true);
  assert.equal(ERROR_COPY.length > 0, true);
});
