import test from 'node:test';
import assert from 'node:assert/strict';
import { localDayKey } from '../../../utils/crmAnalytics.js';
import { buildActivityFeed, isRemarkEcho, previousRemarkVersions } from './remarksModel.js';

const at = '2026-06-02T08:00:00.000Z';
const earlier = '2026-01-02T08:00:00.000Z';

function remark(overrides = {}) {
  return {
    id: 'rm_1',
    text: 'First note',
    authorName: 'Demo staff',
    authorId: 'staff_me',
    createdAt: at,
    updatedAt: at,
    previousText: null,
    history: [],
    ...overrides,
  };
}

test('all activity keeps the remark once and drops the matching audit echo', () => {
  const feed = buildActivityFeed({
    remarks: [remark()],
    audits: [
      { id: 'a1', action: 'consultancy.remark_added', actorLabel: 'Demo staff', createdAt: at, after: { remarkId: 'rm_1' } },
      { id: 'a2', action: 'consultancy.remark_edited', actorLabel: 'Demo staff', createdAt: at, after: { remarkId: 'rm_1' } },
      { id: 'a3', action: 'student.created', actorLabel: 'Demo seed', createdAt: earlier, after: { fullName: 'Asha Rao' } },
      { id: 'a4', action: 'consultancy.follow_up', actorLabel: 'Demo staff', createdAt: at, after: { followUpStatus: 'Interested' } },
    ],
  });
  assert.deepEqual(feed.entries.map((row) => row.id), ['audit:a4', 'remark:rm_1', 'audit:a3']);
  assert.equal(feed.entries.filter((row) => row.kind === 'remark').length, 1);
  assert.equal(feed.entries.some((row) => row.audit?.action === 'consultancy.remark_added'), false);
  assert.equal(feed.entries.find((row) => row.id === 'audit:a3').view.detail, 'Asha Rao');
  assert.equal(feed.entries.find((row) => row.id === 'audit:a4').view.title, 'Consultancy status updated');
});

test('filters switch the records and do not invent a second copy', () => {
  const source = {
    remarks: [remark()],
    audits: [
      { id: 'a1', action: 'consultancy.remark_added', actorLabel: 'Demo staff', createdAt: at, after: { remarkId: 'rm_1' } },
      { id: 'a3', action: 'referral.created', actorLabel: 'Demo seed', createdAt: earlier, after: {} },
    ],
  };
  const remarksOnly = buildActivityFeed({ ...source, mode: 'remarks' });
  const eventsOnly = buildActivityFeed({ ...source, mode: 'events' });
  assert.deepEqual(remarksOnly.entries.map((row) => row.kind), ['remark']);
  assert.deepEqual(eventsOnly.entries.map((row) => row.id), ['audit:a1', 'audit:a3']);
  assert.equal(isRemarkEcho(source.audits[0], new Set(['rm_1'])), true);
  assert.equal(isRemarkEcho({ action: 'consultancy.remark_added', after: {} }, new Set(['rm_1'])), false);
  assert.equal(isRemarkEcho({ action: 'consultancy.remark_added', after: { remarkId: 'missing' } }, new Set(['rm_1'])), false);
});

test('search matches remark text, authors, and event titles', () => {
  const source = {
    remarks: [remark({ text: 'Call the Hyderabad desk' })],
    audits: [
      { id: 'a1', action: 'consultancy.remark_added', actorLabel: 'Demo staff', createdAt: at, after: { remarkId: 'rm_1' } },
      { id: 'a3', action: 'student.created', actorLabel: 'Demo seed', createdAt: earlier, after: { fullName: 'Asha Rao' } },
    ],
  };
  assert.equal(buildActivityFeed({ ...source, query: 'hyderabad' }).entries[0].kind, 'remark');
  assert.equal(buildActivityFeed({ ...source, query: 'ASHA' }).entries[0].id, 'audit:a3');
  assert.equal(buildActivityFeed({ ...source, query: 'demo seed' }).entries[0].id, 'audit:a3');
  assert.equal(buildActivityFeed({ ...source, mode: 'all', query: 'remark added' }).entries.length, 0);
  assert.equal(buildActivityFeed({ ...source, mode: 'events', query: 'remark added' }).entries[0].id, 'audit:a1');
  assert.equal(buildActivityFeed({ ...source, query: '   ' }).entries.length, 2);
});

test('date range is inclusive and an inverted range is rejected', () => {
  const inside = new Date(2026, 5, 15, 12, 0, 0).toISOString();
  const outside = new Date(2026, 5, 10, 12, 0, 0).toISOString();
  const day = localDayKey(inside);
  const feed = buildActivityFeed({
    remarks: [],
    audits: [
      { id: 'in', action: 'student.created', actorLabel: 'Demo seed', createdAt: inside, after: { fullName: 'In range' } },
      { id: 'out', action: 'student.created', actorLabel: 'Demo seed', createdAt: outside, after: { fullName: 'Out of range' } },
    ],
    from: day,
    to: day,
  });
  assert.deepEqual(feed.entries.map((row) => row.id), ['audit:in']);
  const invalid = buildActivityFeed({ remarks: [remark()], audits: [], from: '2026-08-01', to: '2026-01-01' });
  assert.equal(invalid.entries.length, 0);
  assert.match(invalid.rangeError, /Start date/);
});

test('previous wording stays attached to the remark and is newest first', () => {
  const versions = previousRemarkVersions(remark({
    previousText: 'Second note',
    history: [
      { text: 'First note', updatedAt: earlier },
      { text: 'Second note', updatedAt: at },
    ],
  }));
  assert.deepEqual(versions.map((item) => item.text), ['Second note', 'First note']);
  assert.deepEqual(previousRemarkVersions(remark()), []);
});
