import { Hono } from 'hono';
import { scheduler } from '@devvit/web/server';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);

  // Schedule the queue-polling cron job to run every 30 seconds.
  // The job name must match the key declared in devvit.json scheduler.tasks.
  await scheduler.runJob({
    name: 'pollQueue',
    cron: '*/30 * * * * *',
  });

  console.log('[triggers] pollQueue cron job scheduled (every 30s)');

  return c.json<TriggerResponse>({ status: 'success' }, 200);
});
