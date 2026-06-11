# tecofize-bot

A Devvit web app that publishes posts to Reddit. It has two integration surfaces:

1. **In-Reddit UI** — "Create Post via Bot" context menu for moderators.
2. **Queue worker** — a cron job that polls an external Express backend every 30 seconds and publishes queued posts via `reddit.submitPost()`.

> For the complete end-to-end setup guide see [WORKFLOW.md](../WORKFLOW.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | [Devvit](https://developers.reddit.com/) — Reddit's official app platform |
| Server framework | [Hono](https://hono.dev/) |
| Build tool | [Vite](https://vite.dev/) via `@devvit/start/vite` |
| Language | TypeScript |

---

## Project Structure

```
tecofize-bot/
├── .env.example         Environment variable template
├── devvit.json          App manifest (menu, forms, scheduler, permissions)
├── vite.config.ts       Injects .env values into bundle at build time
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts         Hono app entry — mounts all route groups
    ├── config/
    │   └── index.ts     Reads EXPRESS_PUBLIC_URL + DEVVIT_SECRET
    ├── core/
    │   ├── nuke.ts      Bulk comment moderation (dormant)
    │   └── queuePoller.ts  Fetches queue from Express, calls reddit.submitPost()
    └── routes/
        ├── api.ts       POST /api/publish  (legacy direct path)
        ├── forms.ts     POST /internal/form/create-post-submit
        ├── menu.ts      POST /internal/menu/create-post
        ├── tasks.ts     POST /internal/cron/poll-queue  ← cron handler
        └── triggers.ts  POST /internal/triggers/on-app-install
```

---

## How the Queue Flow Works

```
Express backend saves a pending job
    │
    ▼  every 30 seconds
Devvit cron fires → /internal/cron/poll-queue
    │
    ▼  fetch() → GET {EXPRESS_PUBLIC_URL}/internal-api/queue
Claims all pending jobs
    │
    ▼  for each job
reddit.submitPost({ title, subredditName, text|url })
    │
    ▼  fetch() → POST {EXPRESS_PUBLIC_URL}/internal-api/queue/:id/complete
Reports done or failed
```

The `reddit` client is Devvit's pre-authenticated API client — no OAuth tokens or API keys needed.

---

## Environment Variables

Copy `.env.example` to `.env` before running.

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPRESS_PUBLIC_URL` | ✅ | Public HTTPS URL of the Express backend. In dev: tunnel URL from `npx localtunnel --port 4000`. In prod: your deployed domain. |
| `DEVVIT_SECRET` | ✅ | Shared secret added to every `fetch()` call as `x-devvit-secret`. Must match `DEVVIT_SECRET` in `reddit-poc/backend/.env`. |

These are baked into the bundle at build time by `vite.config.ts`. **You must rebuild and redeploy after changing them.**

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Commands

```bash
npm run login        # Authenticate Devvit CLI with Reddit (once per machine)
npm run dev          # Playtest with live reload on your dev subreddit
npm run build        # Production Vite build → dist/server/index.cjs
npm run type-check   # tsc --build (no emit)
npm run lint         # ESLint on src/
npm run prettier     # Format all files
npm run deploy       # type-check + lint + devvit upload (new version)
npm run launch       # deploy + devvit publish (Reddit app review)
```

---

## Deploying an Update

```bash
# 1. Edit .env if EXPRESS_PUBLIC_URL or DEVVIT_SECRET changed
# 2. Deploy
npm run deploy

# 3. Start playtest
npm run dev

# 4. Open the playtest URL in your browser to trigger on-app-install
#    This re-schedules the pollQueue cron job
```

---

## devvit.json — Key Sections

### Scheduler

```json
"scheduler": {
  "tasks": {
    "pollQueue": {
      "endpoint": "/internal/cron/poll-queue"
    }
  }
}
```

The task name `pollQueue` matches the argument passed to `scheduler.runJob({ name: 'pollQueue', cron: '*/30 * * * * *' })` in `triggers.ts`.

### HTTP Permissions

```json
"permissions": {
  "http": {
    "domains": ["loca.lt", "ngrok-free.app", "ngrok.io"]
  }
}
```

Add your production domain here when deploying to prod. Devvit blocks `fetch()` to undeclared domains.

---

## API Contracts

### `POST /internal/cron/poll-queue`

Called by Reddit's scheduler every 30 seconds. No request body needed. Internally calls `pollAndPublish()` from `src/core/queuePoller.ts`.

### `POST /api/publish` (legacy)

Direct publish — used by the in-Reddit moderator form. Not called by the queue flow.

```json
{
  "title": "string (required)",
  "subredditName": "string (required)",
  "body": "string (optional)",
  "imageUrl": "string (optional)",
  "linkUrl": "string (optional)"
}
```
