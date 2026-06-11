import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import type { FormField } from '@devvit/shared-types/shared/form.js';

export const menu = new Hono();

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
