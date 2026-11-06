import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANSWER_STUDIO_PLATFORMS,
  ANSWER_STUDIO_QUESTION_LIMIT,
  beginAnotherDraft,
  beginGeneration,
  buildGeneratePayload,
  canAccessAnswerStudio,
  canGenerate,
  copyAnswerText,
  dismissGeneration,
  generationErrorMessage,
  nextPlatform,
  questionValidation,
  settleGeneration,
  shouldApplyGeneration,
} from './answerStudio.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Answer Studio page, route, and section access are wired', () => {
  const page = read('pages/admin/AnswerStudio.jsx');
  const app = read('App.jsx');
  const layout = read('components/Admin/AdminLayout.jsx');
  const api = read('utils/adminApi.js');
  assert.match(page, /Answer Studio/);
  assert.match(page, /AI and need a human review/);
  assert.match(page, /not saved/);
  assert.match(app, /path="answer-studio" element=\{<AnswerStudio/);
  assert.match(app, /function ProtectedAdmin/);
  assert.match(layout, /sectionKey: 'answer-studio'/);
  assert.match(layout, /to: '\/admin\/answer-studio'/);
  assert.match(api, /adminRequest\('\/answer-studio\/generate'/);
  assert.doesNotMatch(api, /systemPrompt/);
  assert.doesNotMatch(page, /systemPrompt/);
  assert.match(page, /dismissGeneration\(/);
  assert.match(page, /settleGeneration\(/);
  assert.match(page, /disabled=\{loading\}/);
  assert.match(page, /role=\{copyFailed \? 'alert' : 'status'\}/);
  assert.match(page, /onKeyDown=\{handlePlatformKeyDown\}/);
});

test('Quora and Reddit are selectable platforms', () => {
  assert.deepEqual(ANSWER_STUDIO_PLATFORMS.map((item) => item.id), ['quora', 'reddit']);
  assert.match(ANSWER_STUDIO_PLATFORMS[0].description, /Quora/);
  assert.match(ANSWER_STUDIO_PLATFORMS[1].description, /Reddit/);
});

test('question validation rejects empty and oversized text', () => {
  assert.equal(questionValidation('').ok, false);
  assert.equal(questionValidation('   \n').ok, false);
  assert.equal(questionValidation('How do I choose?').ok, true);
  assert.equal(questionValidation('q'.repeat(ANSWER_STUDIO_QUESTION_LIMIT)).ok, true);
  assert.equal(questionValidation('q'.repeat(ANSWER_STUDIO_QUESTION_LIMIT + 1)).code, 'length');
  assert.equal(questionValidation(`${'q'.repeat(ANSWER_STUDIO_QUESTION_LIMIT)}   \n\n`).ok, true);
  assert.equal(questionValidation(`${'q'.repeat(ANSWER_STUDIO_QUESTION_LIMIT)}\n\n\nq`).code, 'length');
  assert.equal(canGenerate('   ', false), false);
  assert.equal(canGenerate('A real question', false), true);
  assert.equal(canGenerate('A real question', true), false);
});

test('generate payloads contain only the platform and question', () => {
  assert.deepEqual(buildGeneratePayload('quora', 'How should a student compare two colleges?'), {
    platform: 'quora',
    question: 'How should a student compare two colleges?',
  });
  assert.deepEqual(buildGeneratePayload('reddit', 'Is this too narrow?'), {
    platform: 'reddit',
    question: 'Is this too narrow?',
  });
  assert.equal('systemPrompt' in buildGeneratePayload('quora', 'Q'), false);
});

test('errors stay readable and a failed request does not define a new question', () => {
  assert.match(generationErrorMessage(400, 'question is required.'), /question is required/);
  assert.match(generationErrorMessage(401, 'secret stack'), /session has expired/);
  assert.match(generationErrorMessage(403, 'Answer Studio access is required.'), /Answer Studio access/);
  assert.match(generationErrorMessage(502, 'The model returned an empty answer.'), /empty answer/);
  assert.match(generationErrorMessage(504, 'provider timeout sk-secret'), /timed out/);
  assert.equal(generationErrorMessage(504, 'provider timeout sk-secret').includes('sk-secret'), false);
  assert.match(generationErrorMessage(500, 'The answer could not be saved.'), /could not be saved/);
  assert.match(generationErrorMessage(0, 'Cannot reach server.'), /Cannot reach server/);
  const failed = { question: 'Keep this question', error: generationErrorMessage(502, 'The answer service is unavailable.') };
  assert.equal(failed.question, 'Keep this question');
});

function successResult(answer, metadata) {
  return { success: true, data: { data: { answer, ...metadata } } };
}

test('a dismissed generation cannot restore the old answer', () => {
  let requestId = 0;
  let state = {
    question: 'How should a student compare two colleges?',
    platform: 'reddit',
    loading: false,
    error: '',
    originalAnswer: 'Previous answer',
    draftAnswer: 'Previous answer',
    metadata: { answer: 'Previous answer', model: 'old-model', promptKey: 'old-key' },
  };

  const started = beginGeneration(requestId);
  requestId = started.requestId;
  state = { ...state, ...started.patch };
  assert.equal(state.loading, true);

  const dismissed = dismissGeneration(requestId, state);
  requestId = dismissed.requestId;
  state = dismissed.state;
  assert.equal(state.draftAnswer, '');
  assert.equal(state.originalAnswer, '');
  assert.equal(state.metadata, null);
  assert.equal(state.loading, false);
  assert.equal(state.question, 'How should a student compare two colleges?');
  assert.equal(state.platform, 'reddit');

  const stale = settleGeneration(started.requestId, requestId, successResult('Stale answer', {
    model: 'stale-model',
    promptKey: 'stale-key',
    createdAt: '2026-11-06T00:00:00.000Z',
  }));
  assert.equal(stale, null);
  assert.equal(state.draftAnswer, '');
  assert.equal(state.metadata, null);
  assert.equal(state.loading, false);
  assert.equal(state.error, '');

  const next = beginGeneration(requestId);
  requestId = next.requestId;
  state = { ...state, ...next.patch };
  assert.equal(state.loading, true);
  const staleAfterNext = settleGeneration(started.requestId, requestId, successResult('Stale answer', { model: 'stale-model' }));
  assert.equal(staleAfterNext, null);
  assert.equal(state.loading, true);
  assert.equal(state.draftAnswer, '');

  const applied = settleGeneration(next.requestId, requestId, successResult('Fresh answer', {
    model: 'fresh-model',
    promptKey: 'quora-default-v1',
  }));
  state = { ...state, ...applied };
  assert.equal(state.loading, false);
  assert.equal(state.draftAnswer, 'Fresh answer');
  assert.equal(state.originalAnswer, 'Fresh answer');
  assert.equal(state.metadata.model, 'fresh-model');
  assert.equal(state.metadata.promptKey, 'quora-default-v1');
  assert.equal(state.question, 'How should a student compare two colleges?');
});

test('arrow keys move between Quora and Reddit', () => {
  assert.equal(nextPlatform('quora', 'ArrowRight'), 'reddit');
  assert.equal(nextPlatform('reddit', 'ArrowLeft'), 'quora');
  assert.equal(nextPlatform('quora', 'ArrowDown'), 'reddit');
  assert.equal(nextPlatform('reddit', 'ArrowUp'), 'quora');
  assert.equal(nextPlatform('reddit', 'Home'), 'quora');
  assert.equal(nextPlatform('quora', 'End'), 'reddit');
  assert.equal(nextPlatform('quora', 'Enter'), null);
});

test('stale generations are ignored and another draft clears only the answer', () => {
  assert.equal(shouldApplyGeneration(2, 2), true);
  assert.equal(shouldApplyGeneration(1, 2), false);
  const next = beginAnotherDraft({ question: 'Still here', platform: 'reddit' });
  assert.equal(next.question, 'Still here');
  assert.equal(next.platform, 'reddit');
  assert.equal(next.draftAnswer, '');
  assert.equal(next.originalAnswer, '');
  assert.equal(next.metadata, null);
});

test('copy reports success only after the clipboard write resolves', async () => {
  let written = '';
  const success = await copyAnswerText('Edited answer', {
    writeText: async (value) => {
      written = value;
    },
  });
  assert.equal(success.ok, true);
  assert.equal(written, 'Edited answer');

  const failure = await copyAnswerText('Edited answer', {
    writeText: async () => {
      throw new Error('denied');
    },
  });
  assert.equal(failure.ok, false);
  assert.match(failure.message, /clipboard/i);

  const missing = await copyAnswerText('Edited answer', null);
  assert.equal(missing.ok, false);

  const recovered = await copyAnswerText('Edited answer', {
    writeText: async () => {
      throw new Error('denied');
    },
  }, () => true);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.message, 'Copied.');
});

test('section access allows Answer Studio admins and blocks everyone else', () => {
  assert.equal(canAccessAnswerStudio(null), false);
  assert.equal(canAccessAnswerStudio({ isSuperAdmin: false, sectionAccess: ['leads'] }), false);
  assert.equal(canAccessAnswerStudio({ isSuperAdmin: false, sectionAccess: ['answer-studio'] }), true);
  assert.equal(canAccessAnswerStudio({ isSuperAdmin: true, sectionAccess: [] }), true);
});
