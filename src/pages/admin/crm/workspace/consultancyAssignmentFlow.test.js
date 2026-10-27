import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, 'ConsultanciesPage.jsx'), 'utf8');
const dialog = readFileSync(join(root, 'workspaceUi.jsx'), 'utf8');
const sheet = readFileSync(join(root, 'consultancyUi.jsx'), 'utf8');

test('assignment revoke waits for confirmation and reassignment adds before it revokes', () => {
  assert.match(page, /setConfirm\(\{ userId: person\.id/);
  assert.match(page, /onConfirm=\{revoke\}/);
  assert.match(page, /onClose=\{\(\) => \{ if \(!busy\) \{ setConfirm\(null\); restoreFocus\(\); \} \}\}/);
  assert.match(page, /title="Revoke this assignment\?"/);
  assert.match(page, /will lose \$\{confirm\.consultancy\} on the next request/);
  assert.match(page, /confirmLabel="Revoke assignment"/);
  assert.doesNotMatch(page, /onClick=\{revoke\}/);
  assert.match(page, /onClick=\{assign\}/);
  const assignBody = page.slice(page.indexOf('async function assign()'), page.indexOf('async function revoke()'));
  assert.ok(assignBody.indexOf('assignPortalConsultancy') < assignBody.indexOf("askRevoke(previous, 'replace')"));
  assert.equal(assignBody.includes('revokePortalConsultancy'), false);
  assert.match(page, /if \(!candidate \|\| busy \|\| inFlight\.current\) return;/);
  assert.match(page, /if \(!confirm \|\| busy \|\| inFlight\.current\) return;/);
  assert.match(page, /if \(busy \|\| inFlight\.current\) return;/);

  const dialogBody = dialog.slice(dialog.indexOf('export function ConfirmDialog'), dialog.indexOf('const PERIODS'));
  assert.match(dialogBody, /if \(event\.key === 'Escape'\) onClose\(\)/);
  assert.match(dialogBody, /onClick=\{onClose\}>Cancel/);
  assert.match(dialogBody, /onClick=\{onConfirm\}/);
  assert.match(dialogBody, /className="gx-modal" onClick=\{onClose\}/);
  assert.equal(dialogBody.includes('revokePortalConsultancy'), false);
});

test('directory data, history, and activity come from scoped server queries', () => {
  assert.match(page, /getPortalConsultancyOverview\(query\)/);
  assert.match(page, /consultancyListQuery\(filters\)/);
  assert.match(page, /getPortalConsultancyOverview\(\{ page: 1, limit: 1, consultancyId: target\.id \}\)/);
  assert.match(page, /getPortalAssignmentHistory\(\{ consultancyId: target\.id, \.\.\.window10y/);
  assert.match(page, /listPortalActivity\(\{ consultancyId: target\.id, page: 1, limit: 20 \}\)/);
  assert.doesNotMatch(page, /\.filter\(\(row\) => row\.name/);
  assert.doesNotMatch(page, /limit: (100|500|1000)/);
  assert.doesNotMatch(page, /Page 1 of 1/);
  assert.match(page, /No consultancies match these filters/);
  assert.match(page, /Reset filters/);
  assert.match(page, /<SummaryCards summary=\{summary\}/);
});

test('create flow uses the real endpoint and discloses the automatic creator assignment', () => {
  assert.match(page, /createPortalConsultancy\(checked\.body\)/);
  assert.match(page, /result\.code === 'duplicate_consultancy'/);
  assert.match(page, /assignmentOutcome\(results\)/);
  assert.match(page, /You will be assigned to this consultancy automatically/);
  assert.doesNotMatch(page, /Export/);
});

test('sheets trap focus, restore it, and handle Escape on the panel itself', () => {
  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /aria-modal="true"/);
  assert.match(sheet, /event\.key === 'Escape'/);
  assert.match(sheet, /event\.key !== 'Tab'/);
  assert.match(sheet, /opener\.focus\(\)/);
  assert.doesNotMatch(sheet, /window\.addEventListener\('keydown'/);
  assert.match(sheet, /role="combobox"/);
  assert.match(sheet, /aria-activedescendant/);
  assert.match(sheet, /<table className="cs-sr-only">/);
});
