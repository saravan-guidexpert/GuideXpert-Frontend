import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceHeartbeat, PRESENCE_HEARTBEAT_MS } from './crmPresenceHeartbeat.js';

function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    schedule(fn, ms) {
      const timer = { fn, ms, at: now + ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    cancel(timer) {
      timer.cleared = true;
    },
    advance(ms) {
      const target = now + ms;
      while (now < target) {
        const pending = timers
          .filter((timer) => !timer.cleared && timer.at <= target)
          .sort((left, right) => left.at - right.at);
        if (pending.length === 0) {
          now = target;
          break;
        }
        const next = pending[0];
        now = next.at;
        next.at = now + next.ms;
        next.fn();
      }
    },
  };
}

async function settle() {
  for (let step = 0; step < 5; step += 1) {
    await Promise.resolve();
  }
}

test('presence heartbeat sends once on start and does not overlap', async () => {
  const clock = fakeClock();
  let calls = 0;
  let release;
  const loop = createPresenceHeartbeat({
    send: () => {
      calls += 1;
      return new Promise((resolve) => {
        release = () => resolve({ status: 200 });
      });
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  loop.start();
  await settle();
  assert.equal(calls, 1);
  clock.advance(PRESENCE_HEARTBEAT_MS);
  await settle();
  assert.equal(calls, 1);
  release();
  await settle();
  clock.advance(PRESENCE_HEARTBEAT_MS);
  await settle();
  assert.equal(calls, 2);
});

test('stopping the presence heartbeat ignores a late 401', async () => {
  const clock = fakeClock();
  let calls = 0;
  let release;
  let unauthorized = 0;
  const loop = createPresenceHeartbeat({
    send: () => {
      calls += 1;
      return new Promise((resolve) => {
        release = () => resolve({ status: 401 });
      });
    },
    onUnauthorized: () => {
      unauthorized += 1;
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  loop.start();
  await settle();
  loop.stop();
  release();
  await settle();
  clock.advance(PRESENCE_HEARTBEAT_MS * 2);
  await settle();
  assert.equal(unauthorized, 0);
  assert.equal(calls, 1);
});

test('a live 401 stops the presence heartbeat and notifies once', async () => {
  const clock = fakeClock();
  let calls = 0;
  let unauthorized = 0;
  const loop = createPresenceHeartbeat({
    send: async () => {
      calls += 1;
      return { status: 401 };
    },
    onUnauthorized: () => {
      unauthorized += 1;
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  loop.start();
  await settle();
  clock.advance(PRESENCE_HEARTBEAT_MS * 2);
  await settle();
  assert.equal(unauthorized, 1);
  assert.equal(calls, 1);
});

test('a 403 or network error keeps the presence heartbeat running', async () => {
  const clock = fakeClock();
  let calls = 0;
  let unauthorized = 0;
  const loop = createPresenceHeartbeat({
    send: async () => {
      calls += 1;
      if (calls === 1) return { status: 403 };
      if (calls === 2) throw new Error('offline');
      return { status: 200 };
    },
    onUnauthorized: () => {
      unauthorized += 1;
    },
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  loop.start();
  await settle();
  clock.advance(PRESENCE_HEARTBEAT_MS);
  await settle();
  clock.advance(PRESENCE_HEARTBEAT_MS);
  await settle();
  assert.equal(unauthorized, 0);
  assert.equal(calls, 3);
});
