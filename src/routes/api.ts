import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';

type PublishPostBody = {
  title?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  subredditName?: string;
};

export const api = new Hono();

api.post('/publish', async (c) => {
  const body = await c.req.json<PublishPostBody>();

  if (!body.title) {
    return c.json({ success: false, error: 'Title is required.' }, 400);
  }

  if (!body.subredditName) {
    return c.json({ success: false, error: 'subredditName is required.' }, 400);
  }

  try {
    const base = { title: body.title, subredditName: body.subredditName };

    const postOptions = body.imageUrl
      ? { ...base, url: body.imageUrl }
      : body.linkUrl
        ? { ...base, url: body.linkUrl }
        : { ...base, text: body.body ?? '' };

    await reddit.submitPost(postOptions);

    return c.json({ success: true, message: 'Post published successfully.' }, 200);
  } catch (error: unknown) {
    console.error('Error publishing post:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: `Failed to publish post: ${message}` }, 500);
  }
});
