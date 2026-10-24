export const PRESENCE_HEARTBEAT_MS = 60_000;

export function createPresenceHeartbeat({ send, onUnauthorized, schedule, cancel } = {}) {
  const scheduleTimer = schedule || ((fn, ms) => setInterval(fn, ms));
  const cancelTimer = cancel || ((timer) => clearInterval(timer));
  let timer = null;
  let stopped = true;
  let inFlight = false;
  let generation = 0;

  async function beat() {
    if (stopped || inFlight) return;
    const ticket = generation;
    inFlight = true;
    let result;
    try {
      result = await send();
    } catch {
      result = { status: 0, code: 'network' };
    } finally {
      inFlight = false;
    }
    if (stopped || ticket !== generation) return;
    if (result && result.status === 401) {
      const notify = onUnauthorized;
      stop();
      if (typeof notify === 'function') notify(result);
    }
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    void beat();
    timer = scheduleTimer(() => { void beat(); }, PRESENCE_HEARTBEAT_MS);
  }

  function stop() {
    stopped = true;
    generation += 1;
    if (timer != null) cancelTimer(timer);
    timer = null;
  }

  return { start, stop };
}
