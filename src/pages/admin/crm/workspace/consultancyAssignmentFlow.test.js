import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, 'ConsultanciesPage.jsx'), 'utf8');
const dialog = readFileSync(join(root, 'workspaceUi.jsx'), 'utf8');

test('assignment revoke waits for confirmation and history uses the scoped security query', () => {
  assert.match(page, /setConfirm\(\{ userId: person\.id/);
  assert.match(page, /onConfirm=\{revoke\}/);
  assert.match(page, /onClose=\{\(\) => \{ if \(!busy\) setConfirm\(null\); \}\}/);
  assert.match(page, /title="Revoke this assignment\?"/);
  assert.match(page, /will lose \$\{confirm\.consultancy\} on the next request/);
  assert.match(page, /confirmLabel="Revoke assignment"/);
  assert.doesNotMatch(page, /onClick=\{revoke\}/);
  assert.match(page, /onClick=\{assign\}/);
  assert.match(page, /source: 'security', consultancyId: target\.id, page: 1, limit: 20/);
  assert.match(page, /metricText\(overview\.data\?\.unassignedConsultancies, HIDDEN_METRIC\)/);

  const dialogBody = dialog.slice(dialog.indexOf('export function ConfirmDialog'), dialog.indexOf('const PERIODS'));
  assert.match(dialogBody, /if \(event\.key === 'Escape'\) onClose\(\)/);
  assert.match(dialogBody, /onClick=\{onClose\}>Cancel/);
  assert.match(dialogBody, /onClick=\{onConfirm\}/);
  assert.match(dialogBody, /className="gx-modal" onClick=\{onClose\}/);
  assert.equal(dialogBody.includes('revokePortalConsultancy'), false);
});
