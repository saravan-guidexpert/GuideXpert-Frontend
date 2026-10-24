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

function safeDetail(result) {
  const message = typeof result?.message === 'string' ? result.message.trim() : '';
  if (!message || message.length > 180) return '';
  if (/^(not found|request failed|error|sign-in failed)$/i.test(message)) return '';
  if (/stack|exception|mongo|passwordhash|secret|\/api\/|at\s+\w+\s+\(/i.test(message)) return '';
  return message;
}

export function loginFailure(result) {
  if (!result || result.status === 0 || result.code === 'network') {
    return { kind: 'network', message: 'Unable to connect. Check your connection and try again.' };
  }
  if (
    result.code === 'account_not_found'
    || result.code === 'user_not_found'
    || (result.status === 404 && !safeDetail(result))
  ) {
    return { kind: 'missing', message: "We couldn't find an account with those details." };
  }
  if (result.code === 'account_inactive' || result.status === 403) {
    return { kind: 'inactive', message: safeDetail(result) || 'This account is inactive.' };
  }
  if (result.status === 429 || result.code === 'rate_limited') {
    return { kind: 'rate', message: safeDetail(result) || 'Too many attempts. Try again later.' };
  }
  if (result.status === 401 || result.code === 'invalid_credentials') {
    return { kind: 'invalid', message: 'The username or password is incorrect.' };
  }
  if (result.status >= 500) {
    return { kind: 'error', message: 'Something went wrong. Please try again shortly.' };
  }
  return { kind: 'error', message: safeDetail(result) || 'Something went wrong. Please try again shortly.' };
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

export function safeCrmNext(value) {
  if (typeof value !== 'string') return '/crm-app';
  const path = value.trim();
  if (path !== '/crm-app' && !path.startsWith('/crm-app/')) return '/crm-app';
  if (path.startsWith('/crm-app/login') || path.startsWith('/crm-app/reset')) return '/crm-app';
  if (path.startsWith('/crm/login') || path.startsWith('/crm/reset')) return '/crm-app';
  if (path.includes('\\') || path.includes('://') || path.includes('\n') || path.includes('\0')) return '/crm-app';
  if (path.length > 300) return '/crm-app';
  return path;
}
