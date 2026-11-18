export function singleEmailBlockers(readiness) {
  if (!readiness || !Array.isArray(readiness.blockers)) return ['readiness_unavailable'];
  return readiness.blockers;
}

export function canRunSingleEmailTest(readiness, graphMessageId) {
  const id = String(graphMessageId || '').trim();
  return singleEmailBlockers(readiness).length === 0 && id.length >= 16 && !/[\s?]/.test(id);
}
