# Cursor SDK App Builder

Chat-driven app builder using the Cursor SDK: scaffold a hot-reloading preview (local or Vercel Sandbox), stream agent activity, and iterate in an iframe.

## Quick start (single-user / dev)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Paste a Cursor API key on first launch (stored under `~/.app-builder/settings.json` unless `CURSOR_API_KEY` is set).

Copy `.env.example` to `.env.local` and set `CURSOR_API_KEY` to skip pasting keys in the UI.

## Preview runtimes

| `APP_BUILDER_PREVIEW_RUNTIME` | Behavior |
|-------------------------------|----------|
| `local` (default) | Next.js dev server on your machine |
| `sandbox` | Preview inside a [Vercel Sandbox](https://vercel.com/docs/sandbox) (HTTPS, mobile-friendly) |

**Sandbox (local):** `vercel link`, then `vercel env pull` for `VERCEL_OIDC_TOKEN`.

**Concurrency:** Hobby allows **10** concurrent sandboxes. Clean up with:

```bash
npm run sandboxes:cleanup
```

## Multi-user mode (Phase 1)

When **Clerk** and **Neon** (`DATABASE_URL`) are configured:

- Users sign in with Clerk; projects and chat history live in Postgres (Drizzle).
- The server uses `CURSOR_API_KEY` — users do not paste keys in production (`ALLOW_USER_API_KEYS` is off in production by default).
- Create projects via the UI → `POST /api/projects` → `POST /api/projects/[id]/provision`.

### Setup

1. Create a [Clerk](https://clerk.com) app and a [Neon](https://neon.tech) database (Vercel Marketplace integrations work).
2. Add env vars from `.env.example` to `.env.local` and your Vercel project.
3. Apply schema: `npm run db:push`
4. Optional: `npm run db:studio` to inspect tables.

If Clerk or Neon is missing, the app falls back to the original localStorage + API-key flow.

### Deploy on Vercel

Link the repo, set `CURSOR_API_KEY`, Clerk keys, `DATABASE_URL`, and `APP_BUILDER_PREVIEW_RUNTIME`. Run `db:push` against production `DATABASE_URL` once before first use.