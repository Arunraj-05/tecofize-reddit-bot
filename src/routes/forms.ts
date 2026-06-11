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
    
    // Build options based on what was provided
    let postOptions: any = {
      title: values.title,
      subredditName: subreddit?.name,
    };

    if (values.imageUrl) {
      // If image is uploaded, use it as a link post
      postOptions.url = values.imageUrl;
    } else if (values.linkUrl) {
      // If link is provided
      postOptions.url = values.linkUrl;
    } else {
      // Otherwise, standard text post
      postOptions.text = values.body || '';
    }

    await reddit.submitPost(postOptions);

    return c.json<UiResponse>({
      showToast: `Successfully created post!`,
    }, 200);
  } catch (error: any) {
    console.error('Error creating post:', error);
    return c.json<UiResponse>({
      showToast: `Error creating post: ${error.message || 'Unknown error'}`,
    }, 200);
  }
});
