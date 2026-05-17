/**
 * Stream queued progress events plus periodic heartbeat pings while an
 * underlying AI promise runs. Without the heartbeat, slow LLM responses
 * leave the SSE channel idle long enough for clients to trip their
 * inactivity-reconnect threshold (~30s on the tRPC websocket link) and
 * restart the generator from the top in a loop.
 *
 * Drains any final queued events after the promise settles so callers see
 * the AI's late progress callbacks before the generator returns.
 *
 * Yields `{ type: 'progress', ... }` for each dequeued event and
 * `{ type: 'ping' }` between checks. Callers should re-emit both onto
 * the subscription stream.
 */
export async function* streamProgressWithHeartbeat(
  promise: Promise<unknown>,
  progressQueue: Array<{ message: string; progress: number }>,
  heartbeatInterval = 2000,
): AsyncGenerator<
  { type: 'progress'; message: string; progress: number } | { type: 'ping' },
  void,
  unknown
> {
  let done = false;
  promise.then(() => { done = true; }).catch(() => { done = true; });

  while (!done) {
    while (progressQueue.length > 0) {
      const event = progressQueue.shift()!;
      yield { type: 'progress', message: event.message, progress: event.progress };
    }
    yield { type: 'ping' };
    await new Promise(r => setTimeout(r, heartbeatInterval));
  }

  // Drain any progress events queued during the final tick.
  while (progressQueue.length > 0) {
    const event = progressQueue.shift()!;
    yield { type: 'progress', message: event.message, progress: event.progress };
  }
}
