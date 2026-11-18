import test from 'node:test';
import assert from 'node:assert/strict';
import { canRunSingleEmailTest, singleEmailBlockers } from './singleEmailTest.js';

test('single-email execution stays disabled while readiness is blocked', () => {
  const blocked = { blockers: ['MAILBOX_SCOPE_UNVERIFIED'] };
  assert.deepEqual(singleEmailBlockers(blocked), ['MAILBOX_SCOPE_UNVERIFIED']);
  assert.equal(canRunSingleEmailTest(blocked, 'AAMkAGSingleEmailTest0001'), false);
  assert.equal(canRunSingleEmailTest({ blockers: [] }, 'short'), false);
  assert.equal(canRunSingleEmailTest({ blockers: [] }, 'AAMkAGSingleEmailTest0001'), true);
  assert.deepEqual(singleEmailBlockers(null), ['readiness_unavailable']);
});
