import { Hono } from 'hono';
import { scheduler } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import type { FormField } from '@devvit/shared-types/shared/form.js';

export const menu = new Hono();

// Allows a mod to manually (re-)schedule the queue poller cron job without
// needing to reinstall the app. Useful after a redeploy.
menu.post('/schedule-poller', async (c) => {
  try {
    // Cancel any existing pollQueue jobs first to avoid duplicates
    const existing = await scheduler.listJobs();
    for (const job of existing) {
      if (job.name === 'pollQueue') {
        await scheduler.cancelJob(job.id);
      }
    }

    await scheduler.runJob({
      name: 'pollQueue',
      cron: '*/30 * * * * *',
    });

    return c.json<UiResponse>({ showToast: '✅ Queue poller scheduled (runs every 30s)' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json<UiResponse>({ showToast: `❌ Failed to schedule: ${message}` }, 200);
  }
});

const buildCreatePostFields = (): FormField[] => [
  {
    name: 'title',
    label: 'Post Title',
    type: 'string',
    required: true,
  },
  {
    name: 'body',
    label: 'Post Body (Text)',
    type: 'paragraph',
    required: false,
  },
  {
    name: 'linkUrl',
    label: 'Link URL (Optional)',
    type: 'string',
    required: false,
  },
  {
    name: 'imageUrl',
    label: 'Upload Image (Optional)',
    type: 'image',
    required: false,
  }
];

const buildCreatePostForm = () => ({
  fields: buildCreatePostFields(),
  title: 'Create a Bot Post',
  acceptLabel: 'Submit',
  cancelLabel: 'Cancel',
});

menu.post('/create-post', async (c) => {
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'createPost',
        form: buildCreatePostForm(),
      },
    },
    200
  );
});
