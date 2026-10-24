let sessionEpoch = 0;
let boundSessionKey = '';

export function beginCrmRequest() {
  return sessionEpoch;
}

export function rememberCrmSessionKey(key) {
  const next = key || '';
  if (next === boundSessionKey) return sessionEpoch;
  boundSessionKey = next;
  sessionEpoch += 1;
  return sessionEpoch;
}

export function retireCrmSession() {
  sessionEpoch += 1;
  return sessionEpoch;
}

export function shouldEndCrmSession(status, path, startedEpoch, epochNow = sessionEpoch) {
  if (status !== 401) return false;
  if (String(path).startsWith('/crm-auth/login')) return false;
  return startedEpoch === epochNow;
}

export function resetCrmSessionGuardForTests() {
  sessionEpoch = 0;
  boundSessionKey = '';
}
