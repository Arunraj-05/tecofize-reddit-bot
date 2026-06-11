import { reddit } from '@devvit/web/server';
import { config } from '../config';

type QueueJobStatus = 'pending' | 'processing' | 'done' | 'failed';

type QueueJob = {
  id: string;
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  subredditName: string;
  status: QueueJobStatus;
  createdAt: string;
  updatedAt: string;
};

type QueueListResponse = {
  jobs: QueueJob[];
};

type JobCompleteRequest = {
  status: 'done' | 'failed';
  error?: string;
};

async function markJob(jobId: string, payload: JobCompleteRequest): Promise<void> {
  const url = `${config.expressPublicUrl}/internal-api/queue/${jobId}/complete`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-devvit-secret': config.devvitSecret,
    },
    body: JSON.stringify(payload),
  });
}

export async function pollAndPublish(): Promise<void> {
  if (!config.expressPublicUrl) {
    console.error('[queuePoller] EXPRESS_PUBLIC_URL is not set — skipping poll');
    return;
  }

  if (!config.devvitSecret) {
    console.error('[queuePoller] DEVVIT_SECRET is not set — skipping poll');
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${config.expressPublicUrl}/internal-api/queue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-devvit-secret': config.devvitSecret,
      },
    });
  } catch (err) {
    console.error('[queuePoller] Could not reach Express backend:', err);
    return;
  }

  if (!response.ok) {
    console.error(`[queuePoller] Queue endpoint returned ${response.status}`);
    return;
  }

  const data = (await response.json()) as QueueListResponse;
  const jobs = data.jobs ?? [];

  if (jobs.length === 0) return;

  console.log(`[queuePoller] Processing ${jobs.length} job(s)`);

  for (const job of jobs) {
    try {
      const base = { title: job.title, subredditName: job.subredditName };

      const postOptions = job.imageUrl
        ? { ...base, url: job.imageUrl }
        : job.linkUrl
          ? { ...base, url: job.linkUrl }
          : { ...base, text: job.body ?? '' };

      await reddit.submitPost(postOptions);

      await markJob(job.id, { status: 'done' });
      console.log(`[queuePoller] Job ${job.id} published successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[queuePoller] Job ${job.id} failed:`, message);
      await markJob(job.id, { status: 'failed', error: message });
    }
  }
}
