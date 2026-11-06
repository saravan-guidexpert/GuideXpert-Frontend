import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANSWER_STUDIO_PROMPT_BODY_LIMIT,
  activeDatabasePrompt,
  applyActivation,
  applyCreatedDraft,
  applyDeactivation,
  applyNewVersion,
  buildCreatePromptPayload,
  buildVersionPayload,
  canActivatePrompt,
  canDeactivatePrompt,
  canManageAnswerStudioPrompts,
  conflictRefreshMessage,
  createAnswerStudioPromptSession,
  defaultPromptFor,
  formatPromptSize,
  loadAllPromptPages,
  logicalPromptKey,
  settleEditorSave,
  platformUsesDefault,
  promptActionMessage,
  readPromptDetail,
  readPromptList,
  shouldApplyPromptLoad,
  validatePromptDraft,
} from './answerStudioPrompts.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('only a super admin can manage Answer Studio prompts', () => {
  const layout = read('components/Admin/AdminLayout.jsx');
  const app = read('App.jsx');
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  assert.equal(canManageAnswerStudioPrompts({ isSuperAdmin: true, sectionAccess: [] }), true);
  assert.equal(canManageAnswerStudioPrompts({ isSuperAdmin: false, sectionAccess: ['answer-studio'] }), false);
  assert.equal(canManageAnswerStudioPrompts(null), false);
  assert.match(layout, /label: 'System Prompts'/);
  assert.match(layout, /to: '\/admin\/answer-studio\/prompts'/);
  assert.match(layout, /superAdminOnly: true/);
  assert.match(layout, /if \(item\.superAdminOnly\) return false/);
  assert.match(app, /path="answer-studio\/prompts" element=\{<AnswerStudioPrompts/);
  assert.match(app, /path="answer-studio" element=\{<AnswerStudio/);
  assert.match(page, /Only a super admin can manage Answer Studio prompts/);
  assert.match(page, /canManageAnswerStudioPrompts/);
});

test('prompt API calls use the admin client and the Phase 5A routes', () => {
  const api = read('utils/adminApi.js');
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  assert.match(api, /answer-studio\/prompts\$\{answerStudioPromptQuery/);
  assert.match(api, /answer-studio\/prompts\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(api, /answer-studio\/prompts\/\$\{encodeURIComponent\(id\)\}\/versions/);
  assert.match(api, /answer-studio\/prompts\/\$\{encodeURIComponent\(id\)\}\/activate/);
  assert.match(api, /answer-studio\/prompts\/\$\{encodeURIComponent\(id\)\}\/deactivate/);
  assert.match(page, /listAnswerStudioPrompts/);
  assert.match(page, /getAnswerStudioPrompt/);
  assert.match(page, /createAnswerStudioPromptVersion/);
  assert.doesNotMatch(page, /method:\s*'PATCH'|method:\s*'PUT'/);
});

test('Quora and Reddit loads stay on the requested platform and follow pagination', async () => {
  const calls = [];
  const quora = await loadAllPromptPages('quora', async (query) => {
    calls.push(query);
    if (query.page === 1) {
      return {
        success: true,
        data: {
          data: [{ id: 'q1', key: 'office.quora', platform: 'quora', version: 1, lifecycle: 'draft' }],
          pagination: { page: 1, limit: 100, total: 2, totalPages: 2 },
        },
      };
    }
    return {
      success: true,
      data: {
        data: [{ id: 'q2', key: 'office.quora', platform: 'quora', version: 2, lifecycle: 'active' }],
        pagination: { page: 2, limit: 100, total: 2, totalPages: 2 },
      },
    };
  });
  assert.deepEqual(calls.map((query) => query.platform), ['quora', 'quora']);
  assert.deepEqual(quora.prompts.map((row) => row.version), [2, 1]);

  const reddit = await loadAllPromptPages('reddit', async () => ({
    success: true,
    data: {
      data: [{ id: 'r1', key: 'office.reddit', platform: 'reddit', version: 1, lifecycle: 'draft' }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
  }));
  assert.equal(reddit.prompts[0].platform, 'reddit');
  assert.equal(reddit.prompts.some((row) => row.platform === 'quora'), false);
});

test('creating a prompt stores a draft and a new version leaves history unchanged', () => {
  const created = buildCreatePromptPayload({
    key: ' office.quora ',
    platform: 'quora',
    body: '  Answer with the office instructions.\n',
  });
  assert.equal(created.ok, true);
  assert.deepEqual(created.payload, {
    key: 'office.quora',
    platform: 'quora',
    body: 'Answer with the office instructions.',
  });
  assert.equal('active' in created.payload, false);

  const history = applyCreatedDraft([], {
    id: 'v1',
    key: 'office.quora',
    platform: 'quora',
    version: 1,
    lifecycle: 'draft',
    body: 'Answer with the office instructions.',
  });
  assert.equal(history[0].lifecycle, 'draft');
  assert.equal(canActivatePrompt(history[0]), true);
  assert.equal(canDeactivatePrompt(history[0]), false);

  const version = buildVersionPayload('  Newer instructions.  ');
  assert.deepEqual(version.payload, { body: 'Newer instructions.' });
  const next = applyNewVersion(history, {
    id: 'v2',
    key: 'office.quora',
    platform: 'quora',
    version: 2,
    lifecycle: 'draft',
    body: 'Newer instructions.',
  });
  assert.equal(next.find((row) => row.id === 'v1').body, 'Answer with the office instructions.');
  assert.equal(next.find((row) => row.id === 'v2').lifecycle, 'draft');
  assert.equal(canActivatePrompt(next.find((row) => row.id === 'v1')), true);
  assert.equal(canActivatePrompt(next.find((row) => row.lifecycle === 'inactive')), false);
});

test('historical prompt content is read-only and only drafts can be activated', () => {
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  assert.match(page, /readOnly/);
  assert.match(page, /This version is immutable/);
  assert.match(page, /canActivatePrompt\(prompt\)/);
  assert.match(page, /canDeactivatePrompt\(active\)/);
  assert.doesNotMatch(page, /Activate[\s\S]{0,80}lifecycle === 'inactive'/);

  const inactive = { id: 'old', lifecycle: 'inactive', body: 'Historical.' };
  const active = { id: 'current', lifecycle: 'active', body: 'Current.' };
  assert.equal(canActivatePrompt(inactive), false);
  assert.equal(canActivatePrompt({ lifecycle: 'draft' }), true);
  assert.equal(canDeactivatePrompt(active), true);
  assert.equal(canDeactivatePrompt(inactive), false);
  const detail = readPromptDetail({
    success: true,
    data: { data: { id: 'old', body: 'Historical.', lifecycle: 'inactive' } },
  });
  assert.equal(detail.prompt.body, 'Historical.');
});

test('activation and deactivation update the visible prompt state', () => {
  const prompts = [
    { id: 'v1', key: 'office.quora', platform: 'quora', version: 1, lifecycle: 'active', body: 'First.' },
    { id: 'v2', key: 'office.quora', platform: 'quora', version: 2, lifecycle: 'draft', body: 'Second.' },
  ];
  const activated = applyActivation(prompts, {
    id: 'v2',
    key: 'office.quora',
    platform: 'quora',
    version: 2,
    lifecycle: 'active',
    body: 'Second.',
  });
  assert.equal(activeDatabasePrompt(activated).id, 'v2');
  assert.equal(activated.find((row) => row.id === 'v1').lifecycle, 'inactive');
  assert.equal(activated.find((row) => row.id === 'v1').body, 'First.');
  assert.equal(platformUsesDefault(activated), false);

  const deactivated = applyDeactivation(activated, {
    id: 'v2',
    key: 'office.quora',
    platform: 'quora',
    version: 2,
    lifecycle: 'inactive',
    body: 'Second.',
  });
  assert.equal(platformUsesDefault(deactivated), true);
  assert.equal(defaultPromptFor('quora').key, 'quora-default-v1');
  assert.equal(defaultPromptFor('reddit').key, 'reddit-default-v1');
  assert.equal(deactivated.find((row) => row.id === 'v2').body, 'Second.');
});

test('conflict and index-required errors stay specific', () => {
  assert.match(promptActionMessage({ status: 409, data: { code: 'ACTIVE_PROMPT_CONFLICT', message: 'race' } }), /Another activation/);
  assert.match(promptActionMessage({ status: 503, data: { code: 'PROMPT_INDEX_REQUIRED', message: 'index' } }), /production index migration/);
  assert.match(promptActionMessage({ status: 409, data: { code: 'PROMPT_NOT_ACTIVE' } }), /no longer the active prompt/);
  assert.match(promptActionMessage({ status: 403, data: { message: 'Super admin access required.' } }), /super admin/);
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  const logic = read('utils/answerStudioPrompts.js');
  assert.match(logic, /ACTIVE_PROMPT_CONFLICT/);
  assert.match(logic, /PROMPT_NOT_ACTIVE/);
  assert.match(logic, /conflictRefreshMessage/);
  assert.match(page, /createAnswerStudioPromptSession/);
  assert.doesNotMatch(page, /requestId\.current/);
});

test('list parsing, validation, loading, empty, and failure states', async () => {
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  assert.match(page, /Loading prompts/);
  assert.match(page, /No database prompts/);
  assert.match(page, /Using the version-controlled default/);
  assert.match(page, /Retry/);

  const empty = readPromptList({ success: true, data: { data: [], pagination: { page: 1, total: 0, totalPages: 0 } } });
  assert.equal(empty.ok, true);
  assert.equal(empty.prompts.length, 0);
  assert.equal(platformUsesDefault([]), true);

  const failed = await loadAllPromptPages('quora', async () => ({
    success: false,
    status: 503,
    data: { code: 'PROMPT_INDEX_REQUIRED', message: 'missing index' },
  }));
  assert.equal(failed.ok, false);
  assert.match(failed.message, /production index migration/);

  const unexpected = readPromptList({ success: true, data: { data: { id: 'nope' } } });
  assert.equal(unexpected.ok, false);

  assert.equal(validatePromptDraft({ key: '', platform: 'quora', body: 'Hello' }).ok, false);
  assert.equal(validatePromptDraft({ key: 'office.quora', platform: 'facebook', body: 'Hello' }).errors.platform.length > 0, true);
  assert.equal(validatePromptDraft({ key: 'office.quora', platform: 'reddit', body: '   ' }).errors.body.length > 0, true);
  assert.equal(validatePromptDraft({
    key: 'office.quora',
    platform: 'quora',
    body: 'x'.repeat(ANSWER_STUDIO_PROMPT_BODY_LIMIT + 1),
  }).ok, false);
  assert.equal(shouldApplyPromptLoad(2, 2), true);
  assert.equal(shouldApplyPromptLoad(1, 2), false);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function draftRow(id, extra = {}) {
  return {
    id,
    key: 'office.quora',
    platform: 'quora',
    version: 1,
    lifecycle: 'draft',
    createdAt: '2026-11-06T01:00:00.000Z',
    ...extra,
  };
}

test('a successful create while the first list is pending settles on the server list', async () => {
  const first = deferred();
  const second = deferred();
  let lists = 0;
  const created = draftRow('created');
  const session = createAnswerStudioPromptSession({
    loadPlatform: () => {
      lists += 1;
      return lists === 1 ? first.promise : second.promise;
    },
    create: async () => ({ success: true, data: { data: created } }),
  });
  const initial = session.loadList('quora');
  const saving = session.create({ key: 'office.quora', platform: 'quora', body: 'Answer directly.' });
  await Promise.resolve();
  first.resolve({ ok: true, prompts: [draftRow('stale', { lifecycle: 'active' })] });
  await initial;
  assert.equal(session.getState().loading, true);
  assert.equal(session.getState().prompts.some((row) => row.id === 'stale'), false);
  second.resolve({ ok: true, prompts: [created] });
  await saving;
  assert.equal(session.getState().loading, false);
  assert.equal(session.getState().loadError, '');
  assert.deepEqual(session.getState().prompts, [created]);
  assert.equal(session.getState().notice.tone, 'success');
});

test('a successful version save while a list is pending does not keep the skeleton up', async () => {
  const first = deferred();
  const second = deferred();
  let lists = 0;
  const saved = draftRow('v2', { version: 2, body: 'Newer.' });
  const session = createAnswerStudioPromptSession({
    loadPlatform: () => {
      lists += 1;
      return lists === 1 ? first.promise : second.promise;
    },
    getPrompt: async () => ({ success: true, data: { data: { ...draftRow('v1'), body: 'Original.' } } }),
    createVersion: async () => ({ success: true, data: { data: saved } }),
  });
  const initial = session.loadList('quora');
  session.openDetail('version', draftRow('v1'));
  const saving = session.createVersion('Newer.');
  await Promise.resolve();
  first.resolve({ ok: true, prompts: [draftRow('stale')] });
  await initial;
  assert.equal(session.getState().loading, true);
  second.resolve({ ok: true, prompts: [saved, draftRow('v1', { body: 'Original.' })] });
  await saving;
  assert.equal(session.getState().loading, false);
  assert.equal(session.getState().prompts[0].id, 'v2');
  assert.equal(session.getState().prompts.find((row) => row.id === 'v1').body, 'Original.');
});

test('a stale Quora list cannot replace Reddit or leave loading stuck', async () => {
  const quora = deferred();
  const reddit = deferred();
  const calls = [];
  const session = createAnswerStudioPromptSession({
    loadPlatform: (platform) => {
      calls.push(platform);
      return platform === 'quora' ? quora.promise : reddit.promise;
    },
  });
  const first = session.loadList('quora');
  session.openCreate();
  assert.equal(session.getState().dialog.type, 'create');
  const second = session.switchPlatform('reddit');
  assert.equal(session.getState().dialog, null);
  quora.resolve({ ok: true, prompts: [draftRow('quora-row')] });
  await first;
  assert.equal(session.getState().platform, 'reddit');
  assert.equal(session.getState().loading, true);
  assert.equal(session.getState().prompts.some((row) => row.id === 'quora-row'), false);
  assert.equal(session.getState().dialog, null);
  reddit.resolve({ ok: true, prompts: [draftRow('reddit-row', { platform: 'reddit', key: 'office.reddit' })] });
  await second;
  assert.equal(session.getState().loading, false);
  assert.equal(session.getState().prompts[0].id, 'reddit-row');
  assert.deepEqual(calls, ['quora', 'reddit']);
});

test('a closed or replaced detail dialog ignores a late prompt body', async () => {
  const first = deferred();
  const second = deferred();
  const session = createAnswerStudioPromptSession({
    getPrompt: (id) => (id === 'old' ? first.promise : second.promise),
  });
  const closed = session.openDetail('view', draftRow('old'));
  session.closeDialog();
  first.resolve({ success: true, data: { data: { ...draftRow('old'), body: 'Should stay hidden.' } } });
  await closed;
  assert.equal(session.getState().dialog, null);

  const older = session.openDetail('view', draftRow('old'));
  const newer = session.openDetail('view', draftRow('new'));
  first.resolve({ success: true, data: { data: { ...draftRow('old'), body: 'Old body.' } } });
  await older;
  assert.equal(session.getState().dialog.prompt.id, 'new');
  assert.equal(session.getState().dialog.body, '');
  second.resolve({ success: true, data: { data: { ...draftRow('new'), body: 'New body.' } } });
  await newer;
  assert.equal(session.getState().dialog.body, 'New body.');
});

test('rapid activation and deactivation each send one request and then reload', async () => {
  let activateCalls = 0;
  let deactivateCalls = 0;
  let releaseActivate;
  const activateGate = new Promise((resolve) => {
    releaseActivate = resolve;
  });
  const serverAfterActivate = [
    draftRow('v1', { lifecycle: 'inactive', deactivatedAt: '2026-11-06T02:00:00.000Z' }),
    draftRow('v2', { version: 2, lifecycle: 'active', activatedAt: '2026-11-06T02:00:00.000Z' }),
  ];
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: serverAfterActivate }),
    activate: () => {
      activateCalls += 1;
      return activateGate;
    },
    deactivate: async () => {
      deactivateCalls += 1;
      return {
        success: true,
        data: { data: draftRow('v2', { version: 2, lifecycle: 'inactive' }) },
      };
    },
  });
  session.openConfirm('activate', draftRow('v2', { version: 2 }));
  const firstActivate = session.confirmPendingAction();
  const secondActivate = session.confirmPendingAction();
  assert.equal(activateCalls, 1);
  assert.equal((await secondActivate).ignored, true);
  releaseActivate({
    success: true,
    data: { data: serverAfterActivate[1] },
  });
  await firstActivate;
  assert.equal(session.getState().notice.tone, 'success');
  assert.equal(session.getState().prompts.find((row) => row.id === 'v1').deactivatedAt, '2026-11-06T02:00:00.000Z');
  assert.equal(session.getState().busy, false);

  let releaseDeactivate;
  const deactivateGate = new Promise((resolve) => {
    releaseDeactivate = resolve;
  });
  session.openConfirm('deactivate', draftRow('v2', { version: 2, lifecycle: 'active' }));
  const sessionTwo = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    deactivate: () => {
      deactivateCalls += 1;
      return deactivateGate;
    },
  });
  sessionTwo.openConfirm('deactivate', draftRow('v2', { version: 2, lifecycle: 'active' }));
  const firstDeactivate = sessionTwo.confirmPendingAction();
  const secondDeactivate = sessionTwo.confirmPendingAction();
  assert.equal(deactivateCalls, 1);
  assert.equal((await secondDeactivate).ignored, true);
  releaseDeactivate({
    success: true,
    data: { data: draftRow('v2', { version: 2, lifecycle: 'inactive' }) },
  });
  await firstDeactivate;
  assert.equal(sessionTwo.getState().loading, false);
  assert.equal(sessionTwo.getState().prompts.length, 0);
  assert.equal(sessionTwo.getState().notice.tone, 'success');
  assert.equal(session.getState().notice.tone, 'success');
});

test('a failed activation releases the guard and a retry can succeed', async () => {
  let calls = 0;
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [draftRow('v2', { version: 2, lifecycle: 'active' })] }),
    activate: async () => {
      calls += 1;
      if (calls === 1) return { success: false, status: 500, data: { message: 'Something went wrong.' } };
      return { success: true, data: { data: draftRow('v2', { version: 2, lifecycle: 'active' }) } };
    },
  });
  session.openConfirm('activate', draftRow('v2', { version: 2 }));
  await session.confirmPendingAction();
  assert.equal(session.getState().busy, false);
  assert.match(session.getState().notice.message, /Something went wrong/);
  session.openConfirm('activate', draftRow('v2', { version: 2 }));
  await session.confirmPendingAction();
  assert.equal(calls, 2);
  assert.equal(session.getState().prompts[0].lifecycle, 'active');
  assert.equal(session.getState().notice.tone, 'success');
});

test('refresh failure after a successful action reports both outcomes', async () => {
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: false, message: 'The prompt list returned an unexpected response.' }),
    activate: async () => ({
      success: true,
      data: { data: draftRow('v2', { version: 2, lifecycle: 'active' }) },
    }),
    deactivate: async () => ({
      success: true,
      data: { data: draftRow('v2', { version: 2, lifecycle: 'inactive' }) },
    }),
  });
  session.openConfirm('activate', draftRow('v2', { version: 2 }));
  await session.confirmPendingAction();
  assert.equal(session.getState().loading, false);
  assert.match(session.getState().notice.message, /now the active prompt/);
  assert.match(session.getState().notice.message, /could not be refreshed/);
  assert.equal(session.getState().notice.tone, 'error');

  const deactivate = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: false, message: 'down' }),
    deactivate: async () => ({
      success: true,
      data: { data: draftRow('v2', { version: 2, lifecycle: 'inactive' }) },
    }),
  });
  deactivate.openConfirm('deactivate', draftRow('v2', { version: 2, lifecycle: 'active' }));
  await deactivate.confirmPendingAction();
  assert.match(deactivate.getState().notice.message, /was deactivated/);
  assert.match(deactivate.getState().notice.message, /could not be refreshed/);
  assert.doesNotMatch(deactivate.getState().notice.message, /has been refreshed/);
});

test('activation and deactivation conflicts await refresh and do not invent success', async () => {
  const activateRefresh = deferred();
  const session = createAnswerStudioPromptSession({
    loadPlatform: () => activateRefresh.promise,
    activate: async () => ({ success: false, status: 409, data: { code: 'ACTIVE_PROMPT_CONFLICT' } }),
  });
  session.openConfirm('activate', draftRow('v2', { version: 2 }));
  const pending = session.confirmPendingAction();
  await Promise.resolve();
  assert.equal(session.getState().notice, null);
  activateRefresh.resolve({ ok: true, prompts: [draftRow('winner', { lifecycle: 'active' })] });
  await pending;
  assert.match(session.getState().notice.message, /Another activation/);
  assert.match(session.getState().notice.message, /has been refreshed/);
  assert.equal(session.getState().prompts[0].id, 'winner');
  assert.equal(session.getState().loading, false);

  const failed = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: false, message: 'down' }),
    deactivate: async () => ({ success: false, status: 409, data: { code: 'PROMPT_NOT_ACTIVE' } }),
  });
  failed.openConfirm('deactivate', draftRow('v2', { version: 2, lifecycle: 'active' }));
  await failed.confirmPendingAction();
  assert.match(failed.getState().notice.message, /no longer the active prompt/);
  assert.match(failed.getState().notice.message, /could not be refreshed/);
  assert.doesNotMatch(failed.getState().notice.message, /has been refreshed/);
  assert.equal(failed.getState().notice.tone, 'error');
  assert.equal(conflictRefreshMessage('ACTIVE_PROMPT_CONFLICT', { applied: false, ok: true }).includes('has been refreshed'), false);
});

test('the editor uses a stable key and keeps unsaved text when a save fails', async () => {
  const page = read('pages/admin/AnswerStudioPrompts.jsx');
  assert.match(page, /Save New Version/);
  assert.match(page, /Create First Prompt/);
  assert.match(page, /View Version/);
  assert.match(page, /min-h-\[28rem\]/);
  assert.doesNotMatch(page, /name="key"/);
  assert.equal(logicalPromptKey('quora'), 'quora-answer-system');
  assert.equal(logicalPromptKey('reddit'), 'reddit-answer-system');
  assert.equal(formatPromptSize('Hello').chars, 5);

  const editor = { text: 'Keep this draft', savedText: '', base: null, mode: 'edit', dirty: true };
  assert.equal(settleEditorSave(editor, { ok: false }).text, 'Keep this draft');
  const saved = settleEditorSave(editor, {
    ok: true,
    saved: { id: 'v1', key: 'quora-answer-system', platform: 'quora', version: 1, lifecycle: 'draft', body: 'Keep this draft' },
  });
  assert.equal(saved.dirty, false);
  assert.equal(saved.savedText, 'Keep this draft');

  let createdPayload = null;
  let versionCalls = 0;
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({
      ok: true,
      prompts: [{ id: 'v1', key: 'quora-answer-system', platform: 'quora', version: 1, lifecycle: 'draft' }],
    }),
    create: async (payload) => {
      createdPayload = payload;
      return {
        success: true,
        data: { data: { id: 'v1', ...payload, version: 1, lifecycle: 'draft' } },
      };
    },
    createVersion: async () => {
      versionCalls += 1;
      return {
        success: true,
        data: { data: { id: 'v2', key: 'quora-answer-system', platform: 'quora', version: 2, lifecycle: 'draft', body: 'Edited.' } },
      };
    },
  });
  const first = await session.saveWorkspace({ platform: 'quora', body: 'First instructions.', sourceId: null });
  assert.equal(first.ok, true);
  assert.equal(createdPayload.key, 'quora-answer-system');
  assert.equal(createdPayload.platform, 'quora');
  assert.equal(versionCalls, 0);

  const sessionWithHistory = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    create: async () => {
      throw new Error('create should not run when a source version exists');
    },
    createVersion: async (id, payload) => {
      versionCalls += 1;
      assert.equal(id, 'v1');
      assert.deepEqual(payload, { body: 'Edited instructions.' });
      return {
        success: true,
        data: { data: { id: 'v2', key: 'quora-answer-system', platform: 'quora', version: 2, lifecycle: 'draft', body: 'Edited instructions.' } },
      };
    },
  });
  sessionWithHistory.getState().prompts.push({
    id: 'v1',
    key: 'quora-answer-system',
    platform: 'quora',
    version: 1,
    lifecycle: 'draft',
  });
  const second = await sessionWithHistory.saveWorkspace({
    platform: 'quora',
    body: 'Edited instructions.',
    sourceId: 'v1',
  });
  assert.equal(second.ok, true);
  assert.equal(second.saved.version, 2);
  assert.equal(versionCalls, 1);

  let saves = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const guarded = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    create: () => {
      saves += 1;
      return gate;
    },
  });
  const left = guarded.saveWorkspace({ platform: 'quora', body: 'Once.', sourceId: null });
  const right = guarded.saveWorkspace({ platform: 'quora', body: 'Twice.', sourceId: null });
  assert.equal(saves, 1);
  assert.equal((await right).ignored, true);
  release({
    success: true,
    data: { data: { id: 'v1', key: 'quora-answer-system', platform: 'quora', version: 1, lifecycle: 'draft', body: 'Once.' } },
  });
  await left;
});

function promptDetail(row, body) {
  return { success: true, data: { data: { ...row, body } } };
}

test('first-create and version failures keep the API error and the editor text', async () => {
  const cases = [
    {
      status: 503,
      data: { code: 'PROMPT_INDEX_REQUIRED', message: 'index' },
      code: 'PROMPT_INDEX_REQUIRED',
      message: /production index migration/,
    },
    {
      status: 409,
      data: { code: 'DUPLICATE_PROMPT_KEY', message: 'dup' },
      code: 'DUPLICATE_PROMPT_KEY',
      message: /already exists/,
    },
    {
      status: 409,
      data: { code: 'ACTIVE_PROMPT_CONFLICT', message: 'race' },
      code: 'ACTIVE_PROMPT_CONFLICT',
      message: /Another activation/,
    },
    {
      status: 401,
      data: { message: 'unauthorized' },
      code: null,
      message: /session has expired/,
    },
    {
      status: 403,
      data: { message: 'forbidden' },
      code: null,
      message: /super admin/,
    },
  ];

  for (const item of cases) {
    const session = createAnswerStudioPromptSession({
      loadPlatform: async () => ({ ok: true, prompts: [] }),
      create: async () => ({ success: false, status: item.status, data: item.data }),
    });
    session.startFirstPrompt();
    session.updateEditorText('Keep this draft');
    const result = await session.saveEditor();
    assert.equal(result.ok, false);
    assert.equal(result.code, item.code);
    assert.equal(result.status, item.status);
    assert.match(result.message, item.message);
    assert.match(session.getState().notice.message, item.message);
    assert.equal(session.getState().notice.tone, 'error');
    assert.equal(session.getState().editor.text, 'Keep this draft');
    assert.equal(session.getState().platform, 'quora');
  }

  const versioned = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    getPrompt: async () => promptDetail(draftRow('v1'), 'Original.'),
    createVersion: async () => ({
      success: false,
      status: 503,
      data: { code: 'PROMPT_INDEX_REQUIRED', message: 'index' },
    }),
  });
  await versioned.openPrompt(draftRow('v1'), 'edit');
  versioned.updateEditorText('Original. More.');
  const failedVersion = await versioned.saveEditor();
  assert.equal(failedVersion.code, 'PROMPT_INDEX_REQUIRED');
  assert.match(failedVersion.message, /production index migration/);
  assert.equal(versioned.getState().editor.text, 'Original. More.');
});

test('activation and deactivation refresh only the selected editor metadata', async () => {
  const activeDetail = {
    ...draftRow('v2', { version: 2, lifecycle: 'active', activatedAt: '2026-11-06T02:00:00.000Z', activatedBy: 'admin-1' }),
    body: 'Current instructions.',
  };
  let detailMode = 'draft';
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [draftRow('v2', { version: 2, lifecycle: detailMode })] }),
    getPrompt: async () => promptDetail(
      detailMode === 'active' ? activeDetail : draftRow('v2', { version: 2 }),
      'Current instructions.',
    ),
    activate: async () => {
      detailMode = 'active';
      return { success: true, data: { data: activeDetail } };
    },
  });
  await session.openPrompt(draftRow('v2', { version: 2 }), 'edit');
  session.openConfirm('activate', session.getState().editor.base);
  await session.confirmPendingAction();
  assert.equal(session.getState().editor.base.lifecycle, 'active');
  assert.equal(session.getState().editor.base.activatedAt, '2026-11-06T02:00:00.000Z');
  assert.equal(session.getState().editor.base.activatedBy, 'admin-1');
  assert.equal(session.getState().editor.text, 'Current instructions.');
  assert.equal(session.getState().editorMetadataError, '');

  const inactiveDetail = {
    ...draftRow('v2', { version: 2, lifecycle: 'inactive', deactivatedAt: '2026-11-06T03:00:00.000Z', deactivatedBy: 'admin-2' }),
    body: 'Current instructions.',
  };
  let reads = 0;
  const deactivate = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [draftRow('v2', { version: 2, lifecycle: 'inactive' })] }),
    getPrompt: async () => {
      reads += 1;
      return promptDetail(reads === 1 ? draftRow('v2', { version: 2, lifecycle: 'active' }) : inactiveDetail, 'Current instructions.');
    },
    deactivate: async () => ({ success: true, data: { data: inactiveDetail } }),
  });
  await deactivate.openPrompt(draftRow('v2', { version: 2, lifecycle: 'active' }), 'edit');
  deactivate.openConfirm('deactivate', deactivate.getState().editor.base);
  await deactivate.confirmPendingAction();
  assert.equal(deactivate.getState().editor.base.lifecycle, 'inactive');
  assert.equal(deactivate.getState().editor.base.deactivatedAt, '2026-11-06T03:00:00.000Z');
  assert.equal(deactivate.getState().editor.text, 'Current instructions.');

  let unrelatedReads = 0;
  const unrelated = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    getPrompt: async (id) => {
      unrelatedReads += 1;
      return promptDetail(draftRow(id), id === 'other' ? 'Other.' : 'Selected.');
    },
    activate: async () => ({ success: true, data: { data: draftRow('other', { lifecycle: 'active' }) } }),
  });
  await unrelated.openPrompt(draftRow('selected'), 'edit');
  const before = unrelated.getState().editor.base;
  unrelatedReads = 0;
  unrelated.openConfirm('activate', draftRow('other'));
  await unrelated.confirmPendingAction();
  assert.equal(unrelatedReads, 0);
  assert.equal(unrelated.getState().editor.base.id, before.id);
  assert.equal(unrelated.getState().editor.base.lifecycle, 'draft');
  assert.equal(unrelated.getState().editor.text, 'Selected.');

  let refreshCalls = 0;
  const partial = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [draftRow('v2', { version: 2, lifecycle: 'active' })] }),
    getPrompt: async () => {
      refreshCalls += 1;
      if (refreshCalls === 1) return promptDetail(draftRow('v2', { version: 2 }), 'Current instructions.');
      return { success: false, status: 500, data: { message: 'detail down' } };
    },
    activate: async () => ({ success: true, data: { data: draftRow('v2', { version: 2, lifecycle: 'active' }) } }),
  });
  await partial.openPrompt(draftRow('v2', { version: 2 }), 'edit');
  partial.openConfirm('activate', partial.getState().editor.base);
  await partial.confirmPendingAction();
  assert.match(partial.getState().notice.message, /now the active prompt/);
  assert.match(partial.getState().notice.message, /editor metadata could not be refreshed/);
  assert.equal(partial.getState().editor.base.lifecycle, 'draft');
  assert.equal(partial.getState().editor.text, 'Current instructions.');

  const recovered = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
    getPrompt: async () => promptDetail(draftRow('v2', { version: 2, lifecycle: 'active', activatedAt: '2026-11-06T02:00:00.000Z' }), 'Current instructions.'),
  });
  await recovered.openPrompt(draftRow('v2', { version: 2 }), 'edit');
  recovered.getState().editorMetadataError = 'The action succeeded, but the editor metadata could not be refreshed.';
  await recovered.retryEditorMetadata();
  assert.equal(recovered.getState().editor.base.lifecycle, 'active');
  assert.equal(recovered.getState().editorMetadataError, '');
  assert.equal(recovered.getState().editor.text, 'Current instructions.');
});

test('editor revisions keep newer text, isolate platforms, and ignore stale reloads', async () => {
  let releaseSave;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const session = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [draftRow('v1')] }),
    create: () => saveGate,
  });
  session.startFirstPrompt();
  session.updateEditorText('Hello');
  const saving = session.saveEditor();
  session.updateEditorText('Hello more');
  releaseSave({
    success: true,
    data: {
      data: {
        id: 'v1',
        key: 'quora-answer-system',
        platform: 'quora',
        version: 1,
        lifecycle: 'draft',
        body: 'Hello',
      },
    },
  });
  await saving;
  assert.equal(session.getState().editor.text, 'Hello more');
  assert.equal(session.getState().editor.savedText, 'Hello');
  assert.equal(session.getState().editor.base.version, 1);
  assert.equal(session.getState().editor.dirty, true);

  const details = deferred();
  const viewer = createAnswerStudioPromptSession({
    getPrompt: () => details.promise,
  });
  viewer.startFirstPrompt();
  viewer.updateEditorText('Typed first');
  const loading = viewer.openPrompt(draftRow('v1'), 'view');
  viewer.updateEditorText('Typed first and more');
  details.resolve(promptDetail(draftRow('v1'), 'Server body'));
  const loaded = await loading;
  assert.equal(loaded.preserved, true);
  assert.equal(viewer.getState().editor.text, 'Typed first and more');

  const firstDetail = deferred();
  const secondDetail = deferred();
  const replacement = createAnswerStudioPromptSession({
    getPrompt: (id) => (id === 'old' ? firstDetail.promise : secondDetail.promise),
  });
  const older = replacement.openPrompt(draftRow('old'), 'view');
  const newer = replacement.openPrompt(draftRow('new'), 'view');
  firstDetail.resolve(promptDetail(draftRow('old'), 'Old body'));
  secondDetail.resolve(promptDetail(draftRow('new'), 'New body'));
  await older;
  await newer;
  assert.equal(replacement.getState().editor.base.id, 'new');
  assert.equal(replacement.getState().editor.text, 'New body');

  const late = deferred();
  const closed = createAnswerStudioPromptSession({
    getPrompt: () => late.promise,
  });
  const opening = closed.openPrompt(draftRow('v1'), 'view');
  closed.closeEditor();
  late.resolve(promptDetail(draftRow('v1'), 'Too late'));
  await opening;
  assert.equal(closed.getState().editor, null);

  const platforms = createAnswerStudioPromptSession({
    loadPlatform: async () => ({ ok: true, prompts: [] }),
  });
  platforms.startFirstPrompt();
  platforms.updateEditorText('Quora draft');
  await platforms.switchPlatform('reddit');
  platforms.startFirstPrompt();
  platforms.updateEditorText('Reddit draft');
  await platforms.switchPlatform('quora');
  assert.equal(platforms.getState().editor.text, 'Quora draft');
  await platforms.switchPlatform('reddit');
  assert.equal(platforms.getState().editor.text, 'Reddit draft');

  const quoraReload = deferred();
  let quoraLoads = 0;
  const reload = createAnswerStudioPromptSession({
    loadPlatform: (platform) => {
      if (platform === 'quora') {
        quoraLoads += 1;
        if (quoraLoads > 1) return quoraReload.promise;
      }
      return Promise.resolve({ ok: true, prompts: [] });
    },
  });
  await reload.loadList('quora');
  reload.startFirstPrompt();
  reload.updateEditorText('Keep quora');
  const reloading = reload.reloadEditor();
  const switched = reload.switchPlatform('reddit');
  quoraReload.resolve({ ok: false, message: 'Quora list failed' });
  await reloading;
  await switched;
  assert.equal(reload.getState().platform, 'reddit');
  assert.equal(reload.getState().editorError, '');
  assert.equal(reload.getState().editor, null);
  await reload.switchPlatform('quora');
  assert.equal(reload.getState().editor.text, 'Keep quora');
});
