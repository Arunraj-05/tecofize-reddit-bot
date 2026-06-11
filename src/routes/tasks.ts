import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { pollAndPublish } from '../core/queuePoller';

export const tasks = new Hono();

// Reddit POSTs here when the cron job fires (every 30 seconds).
// Declared in devvit.json under scheduler.tasks.pollQueue.endpoint
tasks.post('/poll-queue', async (c) => {
  try {
    await pollAndPublish();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tasks/poll-queue] Unexpected error:', message);
  }

  return c.json<TaskResponse>({}, 200);
});
