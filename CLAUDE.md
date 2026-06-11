# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start devvit playtest (live reload on dev subreddit)
npm run build        # Build with Vite (outputs to dist/server/)
npm run type-check   # Run tsc --build
npm run lint         # Run ESLint on src/**/*.{ts,tsx}
npm run prettier     # Format all files with Prettier
npm run deploy       # type-check + lint + devvit upload
npm run launch       # deploy + devvit publish (submits for Reddit review)
npm run login        # Authenticate CLI with Reddit
```

There are no automated tests in this project.

## Architecture

This is a **Devvit web app** — a Reddit platform app where the backend runs as a Node.js server that Reddit's infrastructure calls via HTTP. The entry point is [src/index.ts](src/index.ts), which creates a Hono app and hands it to `@devvit/web/server`'s `createServer`/`getServerPort`.

### Routing structure

Two top-level route groups are mounted:

- `/api` — public-facing endpoints ([src/routes/api.ts](src/routes/api.ts), currently empty)
- `/internal` — called by Reddit's platform, never by end users:
  - `/internal/menu/*` — context menu item handlers ([src/routes/menu.ts](src/routes/menu.ts))
  - `/internal/form/*` — form submission handlers ([src/routes/forms.ts](src/routes/forms.ts))
  - `/internal/triggers/*` — app lifecycle events ([src/routes/triggers.ts](src/routes/triggers.ts))

### Devvit platform contracts

Menu items are declared in [devvit.json](devvit.json) under `menu.items`. Each item's `endpoint` field maps to a route under `/internal/menu/`. When a moderator clicks a menu item, Reddit POSTs to that endpoint and expects a `UiResponse` — either `showForm` (to open a form) or `showToast` (to show a notification).

Forms are declared in `devvit.json` under `forms`, mapping a form name to its submit endpoint under `/internal/form/`. When a form is submitted, Reddit POSTs the field values to that endpoint.

Triggers (e.g. `on-app-install`) are lifecycle hooks POSTed by Reddit to `/internal/triggers/<event-name>`.

### Core logic

[src/core/nuke.ts](src/core/nuke.ts) contains the bulk comment moderation logic (from the original template). It uses async generators to traverse comment trees recursively (`getAllCommentsInThread`, `getAllCommentsInPost`) before batch-processing with `Promise.all`. This file is not wired to any current menu item — the active feature is "Create Post via Bot".

### Current feature: Create Post via Bot

1. Moderator clicks "Create Post via Bot" from a subreddit or post context menu
2. Reddit POSTs to `/internal/menu/create-post` → returns `showForm: { name: 'createPost', ... }`
3. Moderator fills the form and submits
4. Reddit POSTs form values to `/internal/form/create-post-submit` → calls `reddit.submitPost()`
5. Response is a `showToast` confirming success or failure

Post type is determined by which optional fields are filled: `imageUrl` → link post with image URL, `linkUrl` → link post, neither → text post.

### Key Devvit imports

- `@devvit/web/server` — exports `reddit` (Reddit API client), `context` (request context with `subredditId`, etc.), `createServer`, `getServerPort`
- `@devvit/web/shared` — exports TypeScript types for request/response shapes (`UiResponse`, `MenuItemRequest`, `OnAppInstallRequest`, etc.)
- `@devvit/shared-types/tid.js` — Reddit thing ID branded types (`T1` = comment, `T3` = post, `T5` = subreddit)

### Build output

Vite (via `@devvit/start/vite` plugin) builds to `dist/server/index.cjs` as declared in `devvit.json`. TypeScript declarations go to `dist/types/`.

### TypeScript strictness

The `tsconfig.json` enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`. ESLint enforces `@typescript-eslint/no-floating-promises` as an error — always `await` or `.catch()` promises.

## Known gotchas

- **lint script on Windows**: The lint script uses `src/**/*.{ts,tsx}` without quotes — single quotes break glob expansion in PowerShell. Do not add quotes back.
- **`exactOptionalPropertyTypes`**: Optional properties typed as `string | undefined` cannot be passed where `string` is required. Always narrow with a null-check guard before passing to Devvit APIs (e.g. check `subreddit` before using `subreddit.name`).
- **`no-useless-assignment`**: Declaring `let x = someDefault` and then unconditionally reassigning inside `try/catch` triggers this rule. Declare as `let x: Type` without an initial value instead.
- **`@typescript-eslint/no-explicit-any`**: ESLint rejects `any` types. Use specific types or `unknown` with `instanceof` narrowing in catch blocks.
- **`noUnusedLocals`**: Assigning the return value of an awaited call without using it (e.g. `const post = await reddit.submitPost(...)`) causes a type error. Use bare `await` when the return value is not needed.
