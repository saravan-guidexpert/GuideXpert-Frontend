'use strict';

export const ANSWER_STUDIO_PROMPTS_PATH = '/admin/answer-studio/prompts';
export const ANSWER_STUDIO_PROMPT_BODY_LIMIT = 100 * 1024;
export const ANSWER_STUDIO_PROMPT_PAGE_LIMIT = 100;

const PROMPT_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const ANSWER_STUDIO_LOGICAL_KEYS = Object.freeze({
  quora: 'quora-answer-system',
  reddit: 'reddit-answer-system',
});

export function logicalPromptKey(platform) {
  return ANSWER_STUDIO_LOGICAL_KEYS[platform] || null;
}

export function formatPromptSize(text) {
  const value = String(text ?? '');
  const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(value).length : value.length;
  const label = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  return { chars: value.length, bytes, label };
}

export function applySavedEditor(editor, saved, revisionAtSave) {
  if (!editor || !saved) return editor;
  const changed = editor.revision !== revisionAtSave;
  const body = typeof saved.body === 'string' ? saved.body : editor.savedText;
  return {
    ...editor,
    base: saved,
    savedText: body,
    text: changed ? editor.text : body,
    dirty: changed ? editor.text !== body : false,
    mode: 'edit',
  };
}

export function settleEditorSave(editor, result, revisionAtSave = editor?.revision) {
  if (!result?.ok || !result.saved) return editor;
  return applySavedEditor(editor, result.saved, revisionAtSave);
}

export const ANSWER_STUDIO_DEFAULT_PROMPTS = Object.freeze({
  quora: Object.freeze({ key: 'quora-default-v1', version: 1, source: 'default' }),
  reddit: Object.freeze({ key: 'reddit-default-v1', version: 1, source: 'default' }),
});

export function canManageAnswerStudioPrompts(user) {
  return user?.isSuperAdmin === true;
}

export function defaultPromptFor(platform) {
  return ANSWER_STUDIO_DEFAULT_PROMPTS[platform] || null;
}

export function normalizePromptBody(value) {
  return String(value ?? '').normalize('NFC').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

export function validatePromptDraft({ key, platform, body, requireKey = true }) {
  const errors = {};
  const normalizedKey = String(key ?? '').normalize('NFC').trim();
  if (requireKey && !PROMPT_KEY_PATTERN.test(normalizedKey)) {
    errors.key = 'Use 1–128 characters: letters, numbers, dots, underscores, or hyphens.';
  }
  if (platform !== 'quora' && platform !== 'reddit') {
    errors.platform = 'Choose Quora or Reddit.';
  }
  const normalizedBody = normalizePromptBody(body);
  if (!normalizedBody) {
    errors.body = 'Enter the system prompt.';
  } else if (normalizedBody.length > ANSWER_STUDIO_PROMPT_BODY_LIMIT) {
    errors.body = `Prompt must be at most ${ANSWER_STUDIO_PROMPT_BODY_LIMIT.toLocaleString()} characters.`;
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    key: normalizedKey,
    platform,
    body: normalizedBody,
  };
}

export function buildCreatePromptPayload(input) {
  const validated = validatePromptDraft(input);
  if (!validated.ok) return validated;
  return {
    ok: true,
    errors: {},
    payload: {
      key: validated.key,
      platform: validated.platform,
      body: validated.body,
    },
  };
}

export function buildVersionPayload(body) {
  const validated = validatePromptDraft({ platform: 'quora', body, requireKey: false });
  if (!validated.ok) return { ok: false, errors: validated.errors };
  return { ok: true, errors: {}, payload: { body: validated.body } };
}

export function promptActionMessage(result) {
  const code = result?.data?.code;
  const status = result?.status;
  if (code === 'ACTIVE_PROMPT_CONFLICT') {
    return 'Another activation changed this platform.';
  }
  if (code === 'PROMPT_INDEX_REQUIRED') {
    return 'This action is unavailable until the production index migration has been completed.';
  }
  if (code === 'PROMPT_NOT_ACTIVE') {
    return 'This version is no longer the active prompt.';
  }
  if (code === 'PROMPT_NOT_DRAFT') {
    return 'Only a draft can be activated. Create a new version to use changed content.';
  }
  if (code === 'PROMPT_ALREADY_ACTIVE') {
    return 'This version is already the active prompt.';
  }
  if (code === 'DUPLICATE_PROMPT_KEY') {
    return 'A prompt with this key already exists. Create a new version instead.';
  }
  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'Only a super admin can manage Answer Studio prompts.';
  return result?.data?.message || result?.message || 'Something went wrong. Try again.';
}

export function readPromptList(result) {
  if (!result?.success) {
    return { ok: false, message: promptActionMessage(result), prompts: [] };
  }
  const prompts = result.data?.data;
  if (!Array.isArray(prompts)) {
    return { ok: false, message: 'The prompt list returned an unexpected response.', prompts: [] };
  }
  return {
    ok: true,
    prompts,
    pagination: result.data.pagination || null,
  };
}

export function readPromptDetail(result) {
  const prompt = result?.data?.data;
  if (!result?.success || !prompt || typeof prompt.body !== 'string') {
    return { ok: false, message: promptActionMessage(result), prompt: null };
  }
  return { ok: true, prompt };
}

export function sortPromptVersions(prompts) {
  return [...prompts].sort((left, right) => {
    const keyOrder = String(left.key).localeCompare(String(right.key));
    if (keyOrder !== 0) return keyOrder;
    return Number(right.version) - Number(left.version);
  });
}

export function activeDatabasePrompt(prompts) {
  return (prompts || []).find((row) => row.lifecycle === 'active') || null;
}

export function platformUsesDefault(prompts) {
  return !activeDatabasePrompt(prompts);
}

export function canActivatePrompt(prompt) {
  return prompt?.lifecycle === 'draft';
}

export function canDeactivatePrompt(prompt) {
  return prompt?.lifecycle === 'active';
}

export function applyCreatedDraft(prompts, created) {
  const next = (prompts || []).filter((row) => row.id !== created.id);
  next.push({ ...created, lifecycle: created.lifecycle || 'draft' });
  return sortPromptVersions(next);
}

export function applyNewVersion(prompts, created) {
  const history = (prompts || []).map((row) => ({ ...row }));
  const source = history.find((row) => row.id === created.id);
  if (source) return history;
  return applyCreatedDraft(history, { ...created, lifecycle: created.lifecycle || 'draft' });
}

export function applyActivation(prompts, activated) {
  return sortPromptVersions((prompts || []).map((row) => {
    if (row.id === activated.id) {
      return { ...row, ...activated, lifecycle: 'active', active: true };
    }
    if (row.platform === activated.platform && row.lifecycle === 'active') {
      return { ...row, lifecycle: 'inactive', active: false, body: row.body };
    }
    return row;
  }));
}

export function applyDeactivation(prompts, deactivated) {
  return (prompts || []).map((row) => (
    row.id === deactivated.id
      ? { ...row, ...deactivated, lifecycle: 'inactive', active: false, body: row.body || deactivated.body }
      : row
  ));
}

export function shouldApplyPromptLoad(requestId, latestRequestId) {
  return requestId === latestRequestId;
}

export function conflictRefreshMessage(code, refresh) {
  const base = promptActionMessage({ data: { code }, status: 409 });
  if (refresh?.applied && refresh.ok) return `${base} The list has been refreshed.`;
  if (refresh?.applied && refresh.ok === false) return `${base} The latest list could not be refreshed.`;
  return base;
}

export function actionRefreshMessage(successText, refresh) {
  if (refresh?.applied && refresh.ok === false) {
    return `${successText} The latest list could not be refreshed.`;
  }
  return successText;
}

function listFailure(error) {
  return { ok: false, message: error?.message || 'Something went wrong. Try again.', prompts: [] };
}

function validationMessage(errors) {
  return errors?.body || errors?.key || errors?.platform || 'Enter the system prompt.';
}

function describeApiFailure(result) {
  return {
    ok: false,
    code: result?.data?.code || null,
    status: result?.status ?? 0,
    message: promptActionMessage(result),
  };
}

/**
 * Owns one prompt-management screen.
 * Each list load takes the next request id. A stale load returns without
 * touching loading, prompts, or errors. The replacement load settles them.
 */
export function createAnswerStudioPromptSession(api) {
  let requestId = 0;
  let dialogEpoch = 0;
  let editorEpoch = 0;
  let editorRevision = 0;
  let busyCount = 0;
  const inFlight = new Set();
  const drafts = { quora: null, reddit: null };
  let snapshot = {
    platform: 'quora',
    prompts: [],
    loading: true,
    loadError: '',
    notice: null,
    dialog: null,
    busy: false,
    editor: null,
    editorError: '',
    editorMetadataError: '',
  };
  const listeners = new Set();

  function publish(next) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function update(partial) {
    publish({ ...snapshot, ...partial });
  }

  function beginBusy() {
    busyCount += 1;
    update({ busy: true });
  }

  function endBusy() {
    busyCount = Math.max(0, busyCount - 1);
    update({ busy: busyCount > 0 });
  }

  async function loadList(platform) {
    const id = requestId + 1;
    requestId = id;
    update({ loading: true, loadError: '', platform });
    let result;
    try {
      result = await api.loadPlatform(platform);
    } catch (error) {
      result = listFailure(error);
    }
    if (!shouldApplyPromptLoad(id, requestId)) {
      return { applied: false, ok: Boolean(result?.ok), message: result?.message || '' };
    }
    if (!result?.ok) {
      const message = result?.message || 'Something went wrong. Try again.';
      update({ loading: false, loadError: message, prompts: [] });
      return { applied: true, ok: false, message };
    }
    update({ loading: false, loadError: '', prompts: result.prompts || [] });
    return { applied: true, ok: true, prompts: result.prompts || [] };
  }

  function rememberDraft(platform, editor) {
    if (platform === 'quora' || platform === 'reddit') drafts[platform] = editor;
  }

  function switchPlatform(nextPlatform) {
    if (nextPlatform === snapshot.platform) {
      return Promise.resolve({ applied: false, ok: true, unchanged: true });
    }
    if (snapshot.editor?.platform === snapshot.platform) {
      rememberDraft(snapshot.platform, snapshot.editor);
    }
    dialogEpoch += 1;
    editorEpoch += 1;
    publish({
      ...snapshot,
      platform: nextPlatform,
      dialog: null,
      editor: drafts[nextPlatform] || null,
      editorError: '',
      editorMetadataError: '',
    });
    return loadList(nextPlatform);
  }

  function closeDialog() {
    dialogEpoch += 1;
    update({ dialog: null });
  }

  function openCreate() {
    dialogEpoch += 1;
    update({
      dialog: { type: 'create', errors: {}, platform: snapshot.platform, epoch: dialogEpoch },
    });
  }

  function openConfirm(type, prompt) {
    dialogEpoch += 1;
    update({ dialog: { type, prompt, epoch: dialogEpoch } });
  }

  function setVersionBody(body) {
    if (snapshot.dialog?.type !== 'version') return;
    update({ dialog: { ...snapshot.dialog, body } });
  }

  async function openDetail(type, prompt) {
    const epoch = dialogEpoch + 1;
    dialogEpoch = epoch;
    update({
      dialog: {
        type,
        prompt,
        body: '',
        loading: true,
        error: '',
        errors: {},
        epoch,
      },
    });
    let result;
    try {
      result = await api.getPrompt(prompt.id);
    } catch (error) {
      result = { success: false, message: error?.message || 'Something went wrong. Try again.' };
    }
    if (epoch !== dialogEpoch || snapshot.dialog?.epoch !== epoch || snapshot.dialog?.prompt?.id !== prompt.id) {
      return { applied: false };
    }
    const detail = readPromptDetail(result);
    if (!detail.ok) {
      update({
        dialog: {
          ...snapshot.dialog,
          loading: false,
          error: detail.message,
          errors: { form: detail.message },
        },
      });
      return { applied: true, ok: false };
    }
    update({
      dialog: {
        ...snapshot.dialog,
        loading: false,
        error: '',
        body: detail.prompt.body,
        prompt: detail.prompt,
      },
    });
    return { applied: true, ok: true };
  }

  async function create(input) {
    const built = buildCreatePromptPayload(input);
    if (!built.ok) {
      const message = validationMessage(built.errors);
      if (snapshot.dialog?.type === 'create') {
        update({ dialog: { ...snapshot.dialog, errors: built.errors }, notice: { tone: 'error', message } });
      } else {
        update({ notice: { tone: 'error', message } });
      }
      return { ok: false, code: null, status: 400, message, errors: built.errors };
    }
    beginBusy();
    let result;
    try {
      result = await api.create(built.payload);
    } catch (error) {
      result = { success: false, message: error?.message || 'Something went wrong. Try again.' };
    } finally {
      endBusy();
    }
    if (!result?.success) {
      const failure = describeApiFailure(result);
      if (snapshot.dialog?.type === 'create') {
        update({
          dialog: { ...snapshot.dialog, errors: { form: failure.message } },
          notice: { tone: 'error', message: failure.message },
        });
      } else {
        update({ notice: { tone: 'error', message: failure.message } });
      }
      return failure;
    }
    const created = result.data?.data;
    if (!created?.id || !created.platform) {
      update({ notice: { tone: 'error', message: 'The prompt service returned an unexpected response.' } });
      return { ok: false };
    }
    const successText = `Draft ${created.key} version ${created.version} was created. It is not active yet.`;
    dialogEpoch += 1;
    update({
      dialog: null,
      platform: created.platform,
      notice: { tone: 'success', message: successText },
    });
    const refresh = await loadList(created.platform);
    if (refresh.applied && refresh.ok === false) {
      update({ notice: { tone: 'error', message: actionRefreshMessage(successText, refresh) } });
    }
    return { ok: true, refresh, saved: created };
  }

  async function writeVersion(sourceId, body, platform) {
    const built = buildVersionPayload(body);
    if (!built.ok) {
      const message = validationMessage(built.errors);
      update({ notice: { tone: 'error', message } });
      return { ok: false, code: null, status: 400, message, errors: built.errors };
    }
    beginBusy();
    let result;
    try {
      result = await api.createVersion(sourceId, built.payload);
    } catch (error) {
      result = { success: false, message: error?.message || 'Something went wrong. Try again.' };
    } finally {
      endBusy();
    }
    if (!result?.success) {
      const failure = describeApiFailure(result);
      update({ notice: { tone: 'error', message: failure.message } });
      return failure;
    }
    const created = result.data?.data;
    const successText = `Version ${created?.version} was saved as a draft. Earlier versions were not changed.`;
    dialogEpoch += 1;
    update({
      dialog: null,
      notice: { tone: 'success', message: successText },
    });
    const refresh = await loadList(platform);
    if (refresh.applied && refresh.ok === false) {
      update({ notice: { tone: 'error', message: actionRefreshMessage(successText, refresh) } });
    }
    return { ok: true, refresh, saved: created };
  }

  async function createVersion(body) {
    const dialog = snapshot.dialog;
    if (!dialog || dialog.type !== 'version') return { ok: false, ignored: true };
    const built = buildVersionPayload(body ?? dialog.body);
    if (!built.ok) {
      update({ dialog: { ...dialog, errors: built.errors } });
      return { ok: false };
    }
    const platform = dialog.prompt.platform || snapshot.platform;
    const result = await writeVersion(dialog.prompt.id, body ?? dialog.body, platform);
    if (!result.ok && snapshot.dialog?.type === 'version' && snapshot.dialog.prompt?.id === dialog.prompt.id) {
      update({ dialog: { ...snapshot.dialog, errors: result.errors || { form: result.message } } });
    }
    return result;
  }

  async function saveWorkspace({ platform, body, sourceId }) {
    const guard = `save:${platform}`;
    if (inFlight.has(guard)) return { ok: false, ignored: true };
    inFlight.add(guard);
    try {
      const logical = logicalPromptKey(platform);
      const versions = snapshot.prompts
        .filter((row) => row.platform === platform && row.key === logical)
        .sort((left, right) => Number(right.version) - Number(left.version));
      const id = sourceId || versions[0]?.id || null;
      if (id) return await writeVersion(id, body, platform);
      return await create({ key: logical, platform, body });
    } finally {
      inFlight.delete(guard);
    }
  }

  function startFirstPrompt() {
    editorEpoch += 1;
    editorRevision += 1;
    const next = {
      platform: snapshot.platform,
      text: '',
      savedText: '',
      base: null,
      mode: 'edit',
      dirty: false,
      revision: editorRevision,
      epoch: editorEpoch,
    };
    rememberDraft(snapshot.platform, next);
    update({ editor: next, editorError: '', editorMetadataError: '' });
    return next;
  }

  function updateEditorText(value) {
    const editor = snapshot.editor;
    if (!editor || editor.mode === 'view') return editor;
    editorRevision += 1;
    const next = {
      ...editor,
      text: value,
      dirty: value !== editor.savedText,
      revision: editorRevision,
    };
    rememberDraft(editor.platform, next);
    if (snapshot.platform === editor.platform) update({ editor: next });
    return next;
  }

  function discardEditor() {
    const editor = snapshot.editor;
    if (!editor) return null;
    editorRevision += 1;
    const next = { ...editor, text: editor.savedText, dirty: false, revision: editorRevision };
    rememberDraft(editor.platform, next);
    update({ editor: next, editorError: '' });
    return next;
  }

  function closeEditor() {
    editorEpoch += 1;
    const platform = snapshot.editor?.platform || snapshot.platform;
    rememberDraft(platform, null);
    update({ editor: null, editorError: '' });
  }

  function showEditor(next) {
    rememberDraft(next.platform, next);
    if (snapshot.platform === next.platform) update({ editor: next, editorError: '' });
  }

  async function openPrompt(prompt, mode) {
    const epoch = editorEpoch + 1;
    editorEpoch = epoch;
    const platform = prompt?.platform || snapshot.platform;
    const revisionAtStart = snapshot.editor?.platform === platform ? snapshot.editor.revision : 0;
    update({ editorError: '' });
    let result;
    try {
      result = await api.getPrompt(prompt.id);
    } catch (error) {
      result = { success: false, message: error?.message || 'Something went wrong. Try again.' };
    }
    if (epoch !== editorEpoch || snapshot.platform !== platform) return { applied: false };
    const detail = readPromptDetail(result);
    if (!detail.ok) {
      const failure = describeApiFailure(result);
      update({ editorError: failure.message, notice: { tone: 'error', message: failure.message } });
      return { ...failure, applied: true };
    }
    const current = snapshot.editor;
    const typedSince = Boolean(
      current
      && current.platform === platform
      && current.revision !== revisionAtStart,
    );
    if (typedSince) return { applied: false, preserved: true };
    editorRevision += 1;
    const next = {
      platform,
      text: detail.prompt.body,
      savedText: detail.prompt.body,
      base: detail.prompt,
      mode,
      dirty: false,
      revision: editorRevision,
      epoch,
    };
    showEditor(next);
    return { applied: true, ok: true, editor: next };
  }

  async function refreshEditorMetadata(promptId) {
    const id = promptId || snapshot.editor?.base?.id;
    if (!snapshot.editor || !id || snapshot.editor.base?.id !== id) {
      return { applied: false, unrelated: true, ok: false };
    }
    const epoch = editorEpoch;
    const platform = snapshot.platform;
    const revision = snapshot.editor.revision;
    if (typeof api.getPrompt !== 'function') {
      return { applied: true, ok: false, message: 'The editor metadata could not be refreshed.' };
    }
    let result;
    try {
      result = await api.getPrompt(id);
    } catch (error) {
      result = { success: false, message: error?.message || 'Something went wrong. Try again.' };
    }
    if (epoch !== editorEpoch || snapshot.platform !== platform) {
      return { applied: false, stale: true, ok: false };
    }
    const latest = snapshot.editor;
    if (!latest || latest.base?.id !== id) return { applied: false, unrelated: true, ok: false };
    const detail = readPromptDetail(result);
    if (!detail.ok) {
      const failure = describeApiFailure(result);
      return { applied: true, ok: false, message: failure.message, code: failure.code, status: failure.status };
    }
    const typed = latest.revision !== revision;
    const next = {
      ...latest,
      base: detail.prompt,
      text: latest.text,
      savedText: typed ? latest.savedText : latest.text,
      dirty: typed ? latest.text !== latest.savedText : false,
      revision: latest.revision,
      mode: latest.mode,
    };
    showEditor(next);
    update({ editorMetadataError: '' });
    return { applied: true, ok: true, editor: next };
  }

  async function retryEditorMetadata() {
    const meta = await refreshEditorMetadata();
    if (meta.applied && meta.ok === false) {
      const message = 'The action succeeded, but the editor metadata could not be refreshed.';
      update({ editorMetadataError: message, notice: { tone: 'error', message } });
    }
    return meta;
  }

  async function reloadEditor() {
    const platform = snapshot.platform;
    const epoch = editorEpoch;
    const baseId = snapshot.editor?.base?.id || null;
    const result = await loadList(platform);
    if (snapshot.platform !== platform || editorEpoch !== epoch) {
      return { applied: false, stale: true };
    }
    if (!result.applied || result.ok === false) {
      const message = result.message || 'Could not reload. Your unsaved text is still in the editor.';
      update({ editorError: message });
      return { applied: Boolean(result.applied), ok: false, stale: false, message };
    }
    const rows = snapshot.prompts;
    const target = rows.find((row) => row.id === baseId) || activeDatabasePrompt(rows) || rows[0] || null;
    if (!target) {
      rememberDraft(platform, null);
      update({ editor: null, editorError: '' });
      return { applied: true, ok: true, editor: null };
    }
    return openPrompt(target, 'edit');
  }

  async function saveEditor() {
    const editor = snapshot.editor;
    if (!editor || editor.mode === 'view' || !editor.dirty) return { ok: false, ignored: true };
    const revision = editor.revision;
    const platform = editor.platform;
    const result = await saveWorkspace({
      platform,
      body: editor.text,
      sourceId: editor.base?.id || null,
    });
    if (result.ignored || !result.ok) return result;
    const current = drafts[platform];
    if (!current || !result.saved) return result;
    const next = applySavedEditor(current, result.saved, revision);
    rememberDraft(platform, next);
    if (snapshot.platform === platform) update({ editor: next, editorError: '' });
    return result;
  }

  async function confirmPendingAction() {
    const action = snapshot.dialog;
    if (!action || (action.type !== 'activate' && action.type !== 'deactivate')) {
      return { ok: false, ignored: true };
    }
    const key = `${action.type}:${action.prompt.id}`;
    if (inFlight.has(key)) return { ok: false, ignored: true };
    inFlight.add(key);
    const platform = action.prompt.platform || snapshot.platform;
    beginBusy();
    try {
      const result = action.type === 'activate'
        ? await api.activate(action.prompt.id)
        : await api.deactivate(action.prompt.id);
      if (!result?.success) {
        const code = result?.data?.code;
        dialogEpoch += 1;
        update({ dialog: null });
        if (code === 'ACTIVE_PROMPT_CONFLICT' || code === 'PROMPT_NOT_ACTIVE') {
          const refresh = await loadList(platform);
          update({ notice: { tone: 'error', message: conflictRefreshMessage(code, refresh) } });
          return { ok: false, refresh };
        }
        update({ notice: { tone: 'error', message: promptActionMessage(result) } });
        return { ok: false };
      }
      const saved = result.data?.data;
      const successText = action.type === 'activate'
        ? `${saved?.key} version ${saved?.version} is now the active prompt for future ${saved?.platform || platform} answers.`
        : `${saved?.key} was deactivated. Future ${saved?.platform || platform} answers use the version-controlled default prompt. The prompt text is still in the history.`;
      dialogEpoch += 1;
      update({
        dialog: null,
        notice: { tone: 'success', message: successText },
      });
      const refresh = await loadList(platform);
      let message = successText;
      let tone = 'success';
      if (refresh.applied && refresh.ok === false) {
        message = actionRefreshMessage(successText, refresh);
        tone = 'error';
      }
      const affectedId = saved?.id || action.prompt.id;
      if (snapshot.editor?.base?.id === affectedId) {
        const meta = await refreshEditorMetadata(affectedId);
        if (meta.applied && meta.ok === false) {
          message = `${message} The action succeeded, but the editor metadata could not be refreshed.`;
          tone = 'error';
          update({
            notice: { tone, message },
            editorMetadataError: 'The action succeeded, but the editor metadata could not be refreshed.',
          });
          return { ok: true, refresh, metadata: meta };
        }
        if (meta.ok) update({ editorMetadataError: '' });
      }
      update({ notice: { tone, message } });
      return { ok: true, refresh };
    } finally {
      inFlight.delete(key);
      endBusy();
    }
  }

  return {
    getState() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadList,
    switchPlatform,
    closeDialog,
    openCreate,
    openConfirm,
    openDetail,
    setVersionBody,
    create,
    createVersion,
    saveWorkspace,
    confirmPendingAction,
    startFirstPrompt,
    updateEditorText,
    discardEditor,
    closeEditor,
    openPrompt,
    reloadEditor,
    saveEditor,
    refreshEditorMetadata,
    retryEditorMetadata,
  };
}

export async function loadAllPromptPages(platform, request) {
  const prompts = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 1000) {
    const result = await request({ platform, page, limit: ANSWER_STUDIO_PROMPT_PAGE_LIMIT });
    const parsed = readPromptList(result);
    if (!parsed.ok) return parsed;
    prompts.push(...parsed.prompts);
    totalPages = Number(parsed.pagination?.totalPages) || 1;
    page += 1;
  }
  return { ok: true, prompts: sortPromptVersions(prompts) };
}
