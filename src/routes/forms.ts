import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { reddit, context } from '@devvit/web/server';

type CreatePostFormValues = {
  title?: string;
  body?: string;
  linkUrl?: string;
  imageUrl?: string;
};

export const forms = new Hono();

forms.post('/create-post-submit', async (c) => {
  const values = await c.req.json<CreatePostFormValues>();
  
  if (!values.title) {
    return c.json<UiResponse>({
      showToast: 'Title is required.',
    }, 200);
  }

  try {
    const subreddit = await reddit.getSubredditById(context.subredditId);
    if (!subreddit) {
      return c.json<UiResponse>({ showToast: 'Could not find subreddit.' }, 200);
    }

    const base = { title: values.title, subredditName: subreddit.name };

    const postOptions = values.imageUrl
      ? { ...base, url: values.imageUrl }
      : values.linkUrl
        ? { ...base, url: values.linkUrl }
        : { ...base, text: values.body ?? '' };

    await reddit.submitPost(postOptions);

    return c.json<UiResponse>({ showToast: 'Successfully created post!' }, 200);
  } catch (error: unknown) {
    console.error('Error creating post:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<UiResponse>({ showToast: `Error creating post: ${message}` }, 200);
  }
});
