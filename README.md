# tecofize-bot

A Devvit web app that publishes posts to Reddit on behalf of a subreddit moderator. It exposes two integration surfaces:

1. **In-Reddit UI** — a "Create Post via Bot" context menu item visible to moderators in the subreddit.
2. **External API** — a `POST /api/publish` endpoint consumed by the [reddit-poc](../reddit-poc) full-stack UI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | [Devvit](https://developers.reddit.com/) — Reddit's app platform |
| Server framework | [Hono](https://hono.dev/) |
| Build tool | [Vite](https://vite.dev/) via `@devvit/start/vite` |
| Language | TypeScript |

---

## Project Structure

```
tecofize-bot/
├── devvit.json          App manifest (menu items, forms, permissions)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.ts         Hono app entry — mounts all route groups
    ├── core/
    │   └── nuke.ts      Bulk comment moderation utilities (dormant)
    └── routes/
        ├── api.ts       POST /api/publish  ← external integration point
        ├── forms.ts     POST /internal/form/create-post-submit
        ├── menu.ts      POST /internal/menu/create-post
        └── triggers.ts  POST /internal/triggers/on-app-install
```

---

## How it works

### In-Reddit flow (moderator UI)

```
Moderator clicks "Create Post via Bot" in subreddit menu
    │
    ▼
Reddit POSTs → /internal/menu/create-post
    │  returns showForm (title, body, linkUrl, imageUrl fields)
    ▼
Moderator fills form and submits
    │
    ▼
Reddit POSTs form values → /internal/form/create-post-submit
    │  calls reddit.submitPost()
    ▼
Post created in the subreddit
```

### External API flow (reddit-poc UI)

```
reddit-poc backend POSTs → /api/publish
    { title, body?, imageUrl?, linkUrl?, subredditName }
    │
    ▼
api.ts calls reddit.submitPost()
    │
    ▼
Post created in the subreddit
```

Post type is determined automatically:
- `imageUrl` present → link post with image URL
- `linkUrl` present (no imageUrl) → link post
- Neither → text post using `body`

---

## Commands

```bash
npm run login        # Authenticate Devvit CLI with your Reddit account (run once)
npm run dev          # Playtest with live reload — prints a tunnel URL
npm run build        # Production build → dist/server/index.cjs
npm run type-check   # tsc --build (no emit)
npm run lint         # ESLint on src/
npm run prettier     # Format all files
npm run deploy       # type-check + lint + devvit upload (new version)
npm run launch       # deploy + devvit publish (submits for Reddit review)
```

---

## Deploying an Updated Bot

Follow these steps every time you push a change.

### Step 1 — Authenticate (first time only)

```bash
npm run login
```

This opens a browser to authorise the Devvit CLI with your Reddit account. You only need to do this once per machine.

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Type-check and lint

```bash
npm run type-check
npm run lint
```

Fix any errors before continuing. The deploy script will reject a build with type errors.

### Step 4 — Deploy (upload a new version)

```bash
npm run deploy
```

This runs `type-check → lint → devvit upload`. Devvit compiles the app and uploads it under your Reddit developer account. The command prints a version number on success, e.g.:

```
✓ Uploaded tecofize-bot@1.0.1
```

The new version is **not yet live** — it is staged for review or playtest.

### Step 5 — Test the new version in playtest

```bash
npm run dev
```

`npm run dev` runs Vite in watch mode **and** starts the Devvit playtest session. It prints a tunnel URL like:

```
▲ Playtest running at https://app-<id>.playtest.devvit.dev
```

- Open Reddit and navigate to your **development subreddit** (the one you configured with Devvit during setup).
- The new version is immediately live there. Test via the "Create Post via Bot" menu item and via the reddit-poc UI (see below).

### Step 6 — Publish for production (optional)

Once you are satisfied with the playtest:

```bash
npm run launch
```

This submits the app for Reddit's review process. After approval it becomes available for any subreddit to install.

---

## Testing via the reddit-poc UI

The [reddit-poc](../reddit-poc) app provides a browser UI that calls `/api/publish` directly. Here is how to run an end-to-end test.

### Prerequisites

- The bot is running in playtest (`npm run dev` is active and printing a tunnel URL).
- You have Node.js ≥ 18 installed.

### 1 — Note the tunnel URL

While `npm run dev` is running, copy the URL it printed:

```
https://app-<id>.playtest.devvit.dev
```

### 2 — Configure the backend

```bash
cd ../reddit-poc/backend
cp .env.example .env
```

Open `.env` and set:

```env
DEVVIT_BOT_URL=https://app-<id>.playtest.devvit.dev   # tunnel URL from above
SUBREDDIT_NAME=your_dev_subreddit_name                 # without r/
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

### 3 — Start the backend

```bash
npm install
npm run dev
```

You should see:

```
[server] Reddit POC backend running on http://localhost:4000
[server] Forwarding posts to Devvit bot at https://app-<id>.playtest.devvit.dev
[server] Target subreddit: r/your_dev_subreddit_name
```

### 4 — Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 5 — Publish a test post

1. Select a post type: **Text**, **Image**, or **Link**.
2. Enter a title (required).
3. Fill in the body / upload an image / paste a URL depending on the type.
4. Click **Publish Post**.
5. The UI shows a green **"Published!"** banner on success or a red error message on failure.
6. Navigate to your dev subreddit on Reddit to confirm the post appeared.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Could not reach the Devvit bot` | Bot not running or wrong URL | Check `npm run dev` is active; re-copy the tunnel URL |
| `SUBREDDIT_NAME is not configured` | Missing `.env` value | Set `SUBREDDIT_NAME` in `reddit-poc/backend/.env` |
| `subredditName is required` | Bot received request without subreddit | Ensure `SUBREDDIT_NAME` is set in backend `.env` |
| Post not appearing on Reddit | Wrong subreddit name, or account lacks mod perms | Confirm the account used in `npm run login` is a mod of the subreddit |
| Image posts not working | Localhost image URL not reachable by Reddit | In dev, use a Text or Link post; for images in prod set `HOST_URL` in backend `.env` |

---

## API Contract — `POST /api/publish`

**URL:** `{DEVVIT_BOT_URL}/api/publish`  
**Content-Type:** `application/json`

### Request body

```json
{
  "title": "My post title",
  "subredditName": "your_subreddit",
  "body": "Optional body text",
  "imageUrl": "https://...",
  "linkUrl": "https://..."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✅ | Max 300 characters |
| `subredditName` | string | ✅ | Without `r/` prefix |
| `body` | string | — | Used when neither `imageUrl` nor `linkUrl` is set |
| `imageUrl` | string | — | Takes priority over `linkUrl` |
| `linkUrl` | string | — | Used when `imageUrl` is absent |

### Success response `200`

```json
{ "success": true, "message": "Post published successfully." }
```

### Error responses

```json
{ "success": false, "error": "Title is required." }          // 400
{ "success": false, "error": "Failed to publish post: ..." } // 500
```

---

## Permissions

Declared in `devvit.json`:

| Permission | Reason |
|-----------|--------|
| `reddit: true` | Required to call `reddit.submitPost()` |
| `media: true` | Required for image uploads via the in-Reddit form |
