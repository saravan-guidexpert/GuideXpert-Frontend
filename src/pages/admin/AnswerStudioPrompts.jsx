import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import {
  activateAnswerStudioPrompt,
  createAnswerStudioPrompt,
  createAnswerStudioPromptVersion,
  deactivateAnswerStudioPrompt,
  getAnswerStudioPrompt,
  listAnswerStudioPrompts,
} from '../../utils/adminApi';
import { ANSWER_STUDIO_PLATFORMS, nextPlatform } from '../../utils/answerStudio';
import {
  ANSWER_STUDIO_PROMPT_BODY_LIMIT,
  activeDatabasePrompt,
  canActivatePrompt,
  canDeactivatePrompt,
  canManageAnswerStudioPrompts,
  createAnswerStudioPromptSession,
  defaultPromptFor,
  formatPromptSize,
  loadAllPromptPages,
  logicalPromptKey,
  platformUsesDefault,
} from '../../utils/answerStudioPrompts';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function LifecycleBadge({ lifecycle }) {
  if (lifecycle === 'active') {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Active
      </span>
    );
  }
  const label = lifecycle === 'inactive' ? 'Inactive' : 'Draft';
  const tone = lifecycle === 'inactive' ? 'bg-[#F3F4F6] text-[#6B7280]' : 'bg-amber-50 text-amber-800';
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}

function Dialog({ title, children, onClose }) {
  const titleId = useId();
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <h2 id={titleId} className="text-[20px] font-semibold text-[#111827]">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function usePromptSession() {
  const session = useRef(null);
  if (session.current == null) {
    session.current = createAnswerStudioPromptSession({
      loadPlatform: (platform) => loadAllPromptPages(platform, (query) => listAnswerStudioPrompts(query)),
      create: createAnswerStudioPrompt,
      createVersion: createAnswerStudioPromptVersion,
      getPrompt: getAnswerStudioPrompt,
      activate: activateAnswerStudioPrompt,
      deactivate: deactivateAnswerStudioPrompt,
    });
  }
  const state = useSyncExternalStore(session.current.subscribe, session.current.getState, session.current.getState);
  return [session.current, state];
}

export default function AnswerStudioPrompts() {
  const { user } = useAuth();
  const allowed = canManageAnswerStudioPrompts(user);
  const [session, state] = usePromptSession();
  const {
    platform,
    prompts,
    loading,
    loadError,
    notice,
    dialog,
    busy,
    editor,
    editorError,
    editorMetadataError,
  } = state;
  const hydratedFor = useRef('');

  useEffect(() => {
    if (!allowed) return undefined;
    session.loadList(session.getState().platform);
    return undefined;
  }, [allowed, session]);

  useEffect(() => {
    if (!allowed || loading || editor || prompts.length === 0) return undefined;
    const target = activeDatabasePrompt(prompts) || prompts[0];
    const token = `${platform}:${target.id}`;
    if (hydratedFor.current === token) return undefined;
    hydratedFor.current = token;
    session.openPrompt(target, 'edit');
    return undefined;
  }, [allowed, loading, editor, prompts, platform, session]);

  function handlePlatformKeyDown(event) {
    const next = nextPlatform(platform, event.key);
    if (!next) return;
    event.preventDefault();
    session.switchPlatform(next);
    document.getElementById(`prompt-platform-${next}`)?.focus();
  }

  function selectPlatform(next) {
    if (next === platform) return;
    session.switchPlatform(next);
  }

  function saveEditor(event) {
    event.preventDefault();
    session.saveEditor();
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-[28px] font-bold text-[#111827]">System Prompt Management</h1>
        <p className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900" role="alert">
          Only a super admin can manage Answer Studio prompts.
        </p>
      </section>
    );
  }

  const active = activeDatabasePrompt(prompts);
  const usesDefault = platformUsesDefault(prompts);
  const fallback = defaultPromptFor(platform);
  const platformName = ANSWER_STUDIO_PLATFORMS.find((item) => item.id === platform)?.name || platform;
  const size = formatPromptSize(editor?.text || '');
  const promptKey = editor?.base?.key || logicalPromptKey(platform);
  const showWorkspace = Boolean(editor);
  const showFirstPrompt = !loading && !loadError && prompts.length === 0 && !showWorkspace;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#111827]">System Prompt Management</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#6B7280]">
            Manage the instructions that control how GuideXpert generates Quora and Reddit answers.
          </p>
        </div>
        <div className="inline-flex h-[42px] items-center rounded-[10px] bg-[#F3F4F6] p-1" role="tablist" aria-label="Platform" onKeyDown={handlePlatformKeyDown}>
          {ANSWER_STUDIO_PLATFORMS.map((item) => {
            const selected = platform === item.id;
            return (
              <button
                key={item.id}
                id={`prompt-platform-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectPlatform(item.id)}
                className={`h-full rounded-[8px] px-4 text-[14px] font-medium ${
                  selected ? 'bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {notice?.message ? (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-[10px] border px-4 py-3 text-[14px] ${
            notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {loading && !editor ? (
        <div className="space-y-3" role="status" aria-label="Loading prompts">
          <div className="h-40 animate-pulse rounded-[14px] bg-[#F3F4F6]" />
          <div className="h-24 animate-pulse rounded-[14px] bg-[#F3F4F6]" />
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-4" role="alert">
          <p className="text-[14px] text-red-800">{loadError}</p>
          <button type="button" onClick={() => session.loadList(platform)} className="mt-3 h-10 rounded-[10px] border border-red-200 bg-white px-4 text-[14px] font-medium text-[#111827]">
            Retry
          </button>
        </div>
      ) : null}

      {showFirstPrompt ? (
        <section className="rounded-[14px] border border-[#E5E7EB] bg-white px-6 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">Using the version-controlled default</p>
          <h2 className="mt-2 text-[20px] font-semibold text-[#111827]">No database prompts for {platformName} yet</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6B7280]">
            Generation currently uses {fallback.key}. Create the first prompt when you want future {platformName} answers to use your own instructions.
          </p>
          <button type="button" onClick={() => session.startFirstPrompt()} className="mt-5 h-10 rounded-[10px] bg-[#2563EB] px-5 text-[14px] font-semibold text-white hover:bg-[#1D4ED8]">
            Create First Prompt
          </button>
        </section>
      ) : null}

      {showWorkspace ? (
        <form onSubmit={saveEditor} className="space-y-4 rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:p-6">
          {usesDefault && !editor.base ? (
            <p className="text-[14px] text-[#6B7280]">
              Using the version-controlled default {fallback.key} until this draft is activated.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#6B7280]">
            <span>Platform: <span className="font-medium text-[#111827]">{platformName}</span></span>
            <span>Prompt key: <span className="font-mono font-medium text-[#111827]">{promptKey}</span></span>
            <span>Version: <span className="font-medium text-[#111827]">{editor.base?.version || 'New'}</span></span>
            <span className="inline-flex items-center gap-2">Lifecycle: {editor.base ? <LifecycleBadge lifecycle={editor.base.lifecycle} /> : <LifecycleBadge lifecycle="draft" />}</span>
            <span>Size: <span className="font-medium text-[#111827]">{size.label} · {size.chars.toLocaleString()} chars</span></span>
            <span>Updated: <span className="font-medium text-[#111827]">{formatWhen(editor.base?.updatedAt)}</span></span>
            <span>Updated by: <span className="font-medium text-[#111827]">{editor.base?.updatedBy || '—'}</span></span>
            <span>Source: <span className="font-medium text-[#111827]">{editor.base ? 'database' : 'new draft'}</span></span>
            {editor.dirty ? <span className="font-semibold text-amber-700">Unsaved changes</span> : null}
          </div>

          {editor.mode === 'view' ? (
            <p className="text-[14px] text-[#6B7280]">This version is immutable. Create a new version to change the text.</p>
          ) : null}
          {editorError ? <p className="text-[14px] text-red-700" role="alert">{editorError}</p> : null}
          {editorMetadataError ? <p className="text-[14px] text-amber-800" role="status">{editorMetadataError}</p> : null}

          <label className="block">
            <span className="sr-only">System prompt</span>
            <textarea
              value={editor.text}
              onChange={(event) => session.updateEditorText(event.target.value)}
              readOnly={editor.mode === 'view'}
              spellCheck={false}
              aria-label="System prompt"
              className="min-h-[28rem] w-full rounded-[10px] border border-[#D1D5DB] px-4 py-3 font-mono text-[14px] leading-relaxed text-[#111827] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 read-only:bg-[#F8FAFC]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#6B7280]">
              Draft size: {size.label} · {size.chars.toLocaleString()} / {ANSWER_STUDIO_PROMPT_BODY_LIMIT.toLocaleString()} characters
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => session.discardEditor()} disabled={!editor.dirty || busy} className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50">
                Discard
              </button>
              <button type="button" onClick={() => session.reloadEditor()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50">
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload
              </button>
              {editor.mode === 'view' ? (
                <button type="button" onClick={() => session.openPrompt(editor.base, 'edit')} className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                  Create new version
                </button>
              ) : (
                <button type="submit" disabled={!editor.dirty || busy || !editor.text.trim()} className="h-10 rounded-[10px] bg-[#2563EB] px-5 text-[14px] font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? 'Saving…' : 'Save New Version'}
                </button>
              )}
              {editor.base && canActivatePrompt(editor.base) && !editor.dirty ? (
                <button type="button" onClick={() => session.openConfirm('activate', editor.base)} disabled={busy} className="h-10 rounded-[10px] bg-[#111827] px-4 text-[14px] font-semibold text-white disabled:opacity-50">
                  Activate
                </button>
              ) : null}
              {editorMetadataError ? (
                <button type="button" onClick={() => session.retryEditorMetadata()} disabled={busy} className="h-10 rounded-[10px] border border-amber-300 px-4 text-[14px] font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50">
                  Retry metadata
                </button>
              ) : null}
              {active && canDeactivatePrompt(active) ? (
                <button type="button" onClick={() => session.openConfirm('deactivate', active)} disabled={busy} className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50">
                  Deactivate
                </button>
              ) : null}
            </div>
          </div>
        </form>
      ) : null}

      {prompts.length > 0 ? (
        <section className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:p-5">
          <h2 className="text-[20px] font-semibold text-[#111827]">Prompt history</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(340px,340px))]">
            {prompts.map((prompt) => {
              const selected = editor?.base?.id === prompt.id;
              return (
                <article
                  key={prompt.id}
                  className={`flex w-full flex-col rounded-[14px] border bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:w-[340px] ${
                    prompt.lifecycle === 'active' ? 'border-emerald-200' : 'border-[#E5E7EB]'
                  } ${selected ? 'ring-2 ring-[#2563EB]/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[18px] font-semibold text-[#111827]">Version {prompt.version}</p>
                    <LifecycleBadge lifecycle={prompt.lifecycle} />
                  </div>
                  <p className="mt-2 text-[13px] text-[#6B7280]">
                    {formatWhen(prompt.createdAt)} · {prompt.createdBy || 'Unknown'} · {prompt.key}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">Content size unavailable</p>
                  <div className="mt-4 rounded-[10px] bg-[#111827] px-3 py-3">
                    <p className="font-mono text-[13px] text-slate-300">{prompt.key} · version {prompt.version}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => session.openPrompt(prompt, 'view')} className="h-9 rounded-[8px] border border-[#D1D5DB] px-3 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                      View Version
                    </button>
                    <button type="button" onClick={() => session.openPrompt(prompt, 'edit')} className="h-9 rounded-[8px] border border-[#D1D5DB] px-3 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                      Create New Version
                    </button>
                    {canActivatePrompt(prompt) ? (
                      <button type="button" onClick={() => session.openConfirm('activate', prompt)} className="h-9 rounded-[8px] bg-[#111827] px-3 text-[13px] font-semibold text-white">
                        Activate
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {dialog?.type === 'activate' || dialog?.type === 'deactivate' ? (
        <Dialog
          title={dialog.type === 'activate' ? 'Activate this draft?' : 'Deactivate this prompt?'}
          onClose={() => !busy && session.closeDialog()}
        >
          <p className="text-[14px] leading-6 text-[#6B7280]">
            {dialog.type === 'activate'
              ? `Version ${dialog.prompt.version} will replace the active database prompt for ${platformName}. Future generations on this platform will use it.`
              : `Future ${platformName} answers will use the version-controlled default prompt, ${fallback.key}. ${dialog.prompt.key} stays in the history and is not deleted.`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => session.closeDialog()} disabled={busy} className="h-10 rounded-[10px] border border-[#D1D5DB] px-4 text-[14px] font-medium text-[#374151]">
              Cancel
            </button>
            <button type="button" onClick={() => session.confirmPendingAction()} disabled={busy} className="h-10 rounded-[10px] bg-[#2563EB] px-4 text-[14px] font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving…' : dialog.type === 'activate' ? 'Activate' : 'Deactivate'}
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
