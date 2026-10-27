import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSULTANCY_FILTERS,
  activityStory,
  assignedByMap,
  assignmentOutcome,
  assignmentState,
  consultancyListQuery,
  hasActiveFilters,
  historyWindow,
  initials,
  markAssigned,
  resultSummary,
  shareRows,
  staffRows,
  summaryCards,
  validateConsultancyForm,
} from './crmConsultancies.js';

test('list query sends only server-supported filters and omits defaults', () => {
  assert.deepEqual(consultancyListQuery(CONSULTANCY_FILTERS), { page: 1, limit: 20 });
  assert.deepEqual(
    consultancyListQuery({ page: 3, limit: 20, q: '  Alpha  ', status: 'active', assignment: 'unassigned', userId: 'u1', sort: 'updated' }),
    { page: 3, limit: 20, q: 'Alpha', status: 'active', assignment: 'unassigned', userId: 'u1', sort: 'updated' }
  );
  assert.equal(consultancyListQuery({ ...CONSULTANCY_FILTERS, q: 'x'.repeat(150) }).q.length, 100);
  assert.equal(hasActiveFilters(CONSULTANCY_FILTERS), false);
  assert.equal(hasActiveFilters({ ...CONSULTANCY_FILTERS, sort: 'updated' }), false);
  assert.equal(hasActiveFilters({ ...CONSULTANCY_FILTERS, q: '   ' }), false);
  assert.equal(hasActiveFilters({ ...CONSULTANCY_FILTERS, userId: 'u1' }), true);
});

test('assignment state and initials', () => {
  assert.equal(assignmentState({ activeAssignees: 0 }).id, 'unassigned');
  assert.equal(assignmentState({ activeAssignees: 1 }).label, 'Assigned');
  assert.equal(assignmentState({ activeAssignees: 3 }).label, 'Multiple (3)');
  assert.equal(initials('Alpha House Partners'), 'AP');
  assert.equal(initials('Zeta'), 'ZE');
  assert.equal(initials(''), '?');
});

test('summary cards never turn a restricted value into zero', () => {
  const restricted = summaryCards(null);
  assert.equal(restricted.length, 5);
  restricted.forEach((card) => {
    assert.equal(card.unavailable, true);
    assert.equal(card.text, 'Restricted');
    assert.notEqual(card.text, '0');
  });
  const cards = summaryCards({ total: 0, active: 0, assigned: 0, unassigned: 0, staffAssigned: null });
  assert.equal(cards[0].text, '0');
  assert.equal(cards[0].unavailable, false);
  assert.equal(cards[4].text, 'Restricted');
});

test('distribution rows come only from real totals', () => {
  assert.equal(shareRows(null), null);
  assert.equal(shareRows({ total: 0 }), null);
  const rows = shareRows({ total: 4, assigned: 3, unassigned: 1, active: 2, inactive: 2 });
  assert.deepEqual(rows[0].parts.map((part) => part.percent), [75, 25]);
  assert.deepEqual(rows[1].parts.map((part) => part.value), [2, 2]);
  assert.deepEqual(staffRows({ staff: [{ userId: 'a', fullName: 'Mira Rao', consultancies: 2, status: 'active' }] }), [
    { id: 'a', name: 'Mira Rao', short: 'Mira', consultancies: 2, status: 'active' },
  ]);
  assert.deepEqual(staffRows(null), []);
});

test('result summary hides the pager for empty and single-page results', () => {
  assert.deepEqual(resultSummary(1, 20, 0), { label: 'No results', pages: 0, showPager: false });
  assert.equal(resultSummary(1, 20, 1).label, 'Showing 1–1 of 1 consultancy');
  assert.equal(resultSummary(1, 20, 12).showPager, false);
  const many = resultSummary(2, 20, 45);
  assert.equal(many.label, 'Showing 21–40 of 45 consultancies');
  assert.equal(many.pages, 3);
  assert.equal(many.showPager, true);
});

test('history window stays inside the server limit', () => {
  const window = historyWindow(new Date('2026-10-26T10:00:00Z'));
  assert.equal(window.to, '2026-10-27');
  const span = (Date.parse(window.to) - Date.parse(window.from)) / 86400000;
  assert.equal(span, 3650);
  assert.ok(span <= 3660);
});

test('create form validation mirrors server limits', () => {
  assert.equal(validateConsultancyForm({ name: ' A ' }).errors.name, 'Enter at least 2 characters.');
  assert.ok(validateConsultancyForm({ name: 'x'.repeat(201) }).errors.name);
  assert.ok(validateConsultancyForm({ name: 'Valid', notes: 'n'.repeat(2001) }).errors.notes);
  const ok = validateConsultancyForm({ name: '  Alpha   House ', status: 'inactive', notes: '  ' });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.body, { name: 'Alpha House', status: 'inactive' });
  assert.equal(validateConsultancyForm({ name: 'Beta', status: 'bogus' }).body.status, 'active');
});

test('initial assignment outcome reports partial failure', () => {
  assert.equal(assignmentOutcome([]), null);
  assert.equal(assignmentOutcome([{ ok: true, name: 'A' }]).tone, 'success');
  const partial = assignmentOutcome([
    { ok: true, name: 'A' },
    { ok: false, name: 'B', message: 'Only an active CRM user can hold a consultancy assignment.' },
  ]);
  assert.equal(partial.tone, 'warning');
  assert.match(partial.message, /1 of 2 assignments were saved/);
  assert.match(partial.message, /B: Only an active CRM user/);
  const none = assignmentOutcome([{ ok: false, name: 'B', message: 'Denied.' }]);
  assert.equal(none.tone, 'error');
  assert.match(none.message, /was created, but no staff were assigned/);
});

test('picker marks current assignees and history supplies who assigned them', () => {
  const marked = markAssigned([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }]);
  assert.deepEqual(marked.map((row) => row.alreadyAssigned), [false, true]);
  const map = assignedByMap([
    { userId: 'a', state: 'revoked', openedBy: { name: 'Old' } },
    { userId: 'a', state: 'active', openedBy: { type: 'admin', name: 'Super' } },
  ]);
  assert.equal(map.get('a').name, 'Super');
});

test('activity stories name who did what', () => {
  const assigned = activityStory({
    action: 'crm_assignment.created',
    actor: { type: 'crm-user', id: 'u1', name: 'Venkatesh Rao' },
    targetUserName: 'Mira Kapoor',
  });
  assert.equal(assigned.title, 'Venkatesh Rao assigned Mira Kapoor');
  assert.equal(assigned.tone, 'ok');
  const revoked = activityStory({
    action: 'crm_assignment.revoked',
    actor: { type: 'admin', id: 'a1', name: '' },
    targetUserName: 'Arjun Mehta',
  });
  assert.equal(revoked.title, 'Platform admin revoked Arjun Mehta');
  assert.equal(revoked.tone, 'warn');
  const created = activityStory({
    action: 'consultancy.created',
    actor: { type: 'crm-user', id: 'u1', name: 'Venkatesh Rao' },
    after: { name: 'example consultancy' },
  });
  assert.equal(created.title, 'Venkatesh Rao created this consultancy');
  assert.match(created.detail, /example consultancy/);
});
