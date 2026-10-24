export function loginFieldErrors({ identifier, password }) {
  const errors = {};
  if (!String(identifier || '').trim()) errors.identifier = 'Enter your email or username.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function beginLogin(fields) {
  const errors = loginFieldErrors(fields);
  if (Object.keys(errors).length > 0) return { ok: false, phase: 'idle', errors };
  return { ok: true, phase: 'submitting', errors: {} };
}

export function loginButtonState(phase) {
  if (phase === 'submitting') return { disabled: true, label: 'Signing in…' };
  if (phase === 'success') return { disabled: true, label: 'Signed in' };
  return { disabled: false, label: 'Sign in' };
}

export function loginFailure(result) {
  if (!result || result.status === 0) {
    return { kind: 'network', message: 'Cannot reach the server. Check your connection and try again.' };
  }
  if (result.code === 'account_inactive' || result.status === 403) {
    return { kind: 'inactive', message: result.message || 'This account is inactive.' };
  }
  if (result.status === 429) {
    return { kind: 'rate', message: result.message || 'Too many attempts. Try again later.' };
  }
  if (result.status === 401) return { kind: 'invalid', message: 'Invalid email or password.' };
  return { kind: 'error', message: result.message || 'Sign-in failed.' };
}

function safeDetail(result) {
  const message = typeof result?.message === 'string' ? result.message.trim() : '';
  if (!message || message.length > 180) return '';
  if (/^(not found|request failed|error|sign-in failed)$/i.test(message)) return '';
  if (/stack|exception|mongo|passwordhash|secret|\/api\/|at\s+\w+\s+\(/i.test(message)) return '';
  return message;
}

export function resetFailure(result) {
  if (!result || result.status === 0 || result.code === 'network') {
    return 'Unable to connect. Check your connection and try again.';
  }
  if (result.status === 429 || result.code === 'rate_limited') {
    return safeDetail(result) || 'Too many attempts. Try again later.';
  }
  if (result.status >= 500 || result.status === 404) {
    return 'Something went wrong. Please try again shortly.';
  }
  return safeDetail(result) || 'Reset code is invalid or expired.';
}

const CRM_APP_HOME = '/crm/app';

export function safeCrmNext(value) {
  if (typeof value !== 'string') return CRM_APP_HOME;
  let path = value.trim();
  if (path === '/crm-app' || path.startsWith('/crm-app/')) path = `/crm/app${path.slice('/crm-app'.length)}`;
  if (path !== CRM_APP_HOME && !path.startsWith(`${CRM_APP_HOME}/`)) return CRM_APP_HOME;
  if (path.startsWith('/crm/app/login') || path.startsWith('/crm/app/reset')) return CRM_APP_HOME;
  if (path.includes('..') || path.includes('\\') || path.includes('://') || path.includes('\n') || path.includes('\0')) {
    return CRM_APP_HOME;
  }
  if (path.length > 300) return CRM_APP_HOME;
  return path;
}
