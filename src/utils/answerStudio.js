'use strict';

export const ANSWER_STUDIO_QUESTION_LIMIT = 8000;
export const ANSWER_STUDIO_SECTION_KEY = 'answer-studio';

export const ANSWER_STUDIO_PLATFORMS = Object.freeze([
  {
    id: 'quora',
    name: 'Quora',
    description: 'A direct, explanatory answer for a Quora question.',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'A conversational reply for a Reddit post.',
  },
]);

/** Same whitespace rules as the generation API, so the 8,000 limit matches the server. */
export function normalizeStudioQuestion(value) {
  const text = String(value ?? '').normalize('NFC').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((line) => line.replace(/[^\S\n]+/g, ' ').trim());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function questionValidation(question) {
  const value = normalizeStudioQuestion(question);
  if (!value) {
    return { ok: false, code: 'empty', message: 'Enter a question before generating.' };
  }
  if (value.length > ANSWER_STUDIO_QUESTION_LIMIT) {
    return {
      ok: false,
      code: 'length',
      message: `Question must be at most ${ANSWER_STUDIO_QUESTION_LIMIT} characters.`,
    };
  }
  return { ok: true, question: value };
}

export function canGenerate(question, loading) {
  if (loading) return false;
  return questionValidation(question).ok;
}

export function buildGeneratePayload(platform, question) {
  return { platform, question };
}

export function canAccessAnswerStudio(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  return Array.isArray(user.sectionAccess) && user.sectionAccess.includes(ANSWER_STUDIO_SECTION_KEY);
}

export function generationErrorMessage(status, serverMessage) {
  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return serverMessage || 'You do not have access to Answer Studio.';
  if (status === 400) return serverMessage || 'Check the question and try again.';
  if (status === 502) return serverMessage || 'The answer service could not produce an answer. Try again.';
  if (status === 503) return serverMessage || 'Answer Studio is not configured yet.';
  if (status === 504) return 'The answer service timed out. Try again.';
  if (status === 500) return serverMessage || 'The answer could not be saved. Try again.';
  if (status === 0) return serverMessage || 'Cannot reach the server. Check your connection and try again.';
  return serverMessage || 'Something went wrong. Try again.';
}

export function shouldApplyGeneration(requestId, latestRequestId) {
  return requestId === latestRequestId;
}

export function beginAnotherDraft(state) {
  return {
    ...state,
    loading: false,
    error: '',
    copyMessage: '',
    editing: false,
    originalAnswer: '',
    draftAnswer: '',
    metadata: null,
  };
}

export function nextPlatform(current, key) {
  const ids = ANSWER_STUDIO_PLATFORMS.map((item) => item.id);
  const index = Math.max(0, ids.indexOf(current));
  if (key === 'ArrowRight' || key === 'ArrowDown') return ids[(index + 1) % ids.length];
  if (key === 'ArrowLeft' || key === 'ArrowUp') return ids[(index - 1 + ids.length) % ids.length];
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids[ids.length - 1];
  return null;
}

export function beginGeneration(requestId) {
  return {
    requestId: requestId + 1,
    patch: { loading: true, error: '', copyMessage: '' },
  };
}

/** Drop the visible answer and retire any request that is still in flight. */
export function dismissGeneration(requestId, state) {
  return {
    requestId: requestId + 1,
    state: beginAnotherDraft(state),
  };
}

/**
 * Apply a generation result only when it is still the latest request.
 * A dismissed or superseded request returns null and must not be written.
 */
export function settleGeneration(requestId, latestRequestId, result) {
  if (!shouldApplyGeneration(requestId, latestRequestId)) return null;
  if (!result?.success) {
    return {
      loading: false,
      error: generationErrorMessage(result?.status, result?.data?.message || result?.message),
    };
  }
  const data = result.data?.data;
  if (!data || typeof data.answer !== 'string') {
    return {
      loading: false,
      error: 'The answer service returned an unexpected response.',
    };
  }
  return {
    loading: false,
    error: '',
    originalAnswer: data.answer,
    draftAnswer: data.answer,
    metadata: data,
    editing: false,
  };
}

export async function copyAnswerText(text, clipboard, fallback) {
  const value = String(text ?? '');
  if (!value) {
    return { ok: false, message: 'There is no answer to copy.' };
  }
  try {
    if (clipboard && typeof clipboard.writeText === 'function') {
      await clipboard.writeText(value);
      return { ok: true, message: 'Copied.' };
    }
  } catch {
    // The permission prompt can fail. The caller may supply the textarea fallback.
  }
  if (typeof fallback === 'function') {
    try {
      if (fallback(value)) return { ok: true, message: 'Copied.' };
    } catch {
      // Fall through to the visible failure.
    }
  }
  return { ok: false, message: 'Could not copy. Allow clipboard access and try again.' };
}
