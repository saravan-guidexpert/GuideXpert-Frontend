const NON_BLOCKING = new Set(['bulk_processing_enabled', 'global_processing_enabled']);

export function singleEmailBlockers(readiness) {
  if (!readiness || !Array.isArray(readiness.blockers)) return ['readiness_unavailable'];
  return readiness.blockers.filter((code) => !NON_BLOCKING.has(code));
}

export function readinessNotices(readiness) {
  const checks = readiness && Array.isArray(readiness.checks) ? readiness.checks : [];
  return checks.filter((check) => check.blocking === false && check.verified !== true);
}

export function canRunSingleEmailTest(readiness, graphMessageId) {
  const id = String(graphMessageId || '').trim();
  return singleEmailBlockers(readiness).length === 0 && id.length >= 16 && !/[\s?]/.test(id);
}
