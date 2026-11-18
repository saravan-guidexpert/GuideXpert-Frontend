import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatActivationLocal, parseActivationInput } from './activationTime.js';

test('Asia/Kolkata wall time is stored as UTC and shown in IST', () => {
  const date = parseActivationInput('2026-11-18T10:00');
  assert.equal(date.toISOString(), '2026-11-18T04:30:00.000Z');
  assert.equal(formatActivationLocal(date), '2026-11-18 10:00 IST');
});

test('an absolute UTC value is not shifted and an empty value is not the current time', () => {
  assert.equal(parseActivationInput('2026-11-18T00:00:00.000Z').toISOString(), '2026-11-18T00:00:00.000Z');
  assert.equal(parseActivationInput(''), null);
  assert.equal(parseActivationInput('2026-11-18'), null);
  assert.equal(parseActivationInput('2026-11-18T10:00', 'America/New_York'), null);
});
