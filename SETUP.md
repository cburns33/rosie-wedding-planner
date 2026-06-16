# Rosie — Setup Guide

**Production (live):** https://rosie-wedding-planner.vercel.app  
**Repo:** https://github.com/cburns33/rosie-wedding-planner

This guide covers first-time setup and where things live. Day-to-day, you mostly push code to GitHub and Vercel redeploys. See **Ongoing maintenance** at the bottom.

---

## 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. **Existing projects:** re-run only the migration blocks you are missing from `schema.sql`. **Run each block in full, including its `GRANT` / `REVOKE` lines.** Every table here is RLS-protected and reachable only via the `service_role` key; creating a table without its grants leaves server-side reads/writes failing with `permission denied`, and the failure can be silent.
   - **Core tables + grants** (bottom of file): the `GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_state` and `... ON public.messages TO service_role` lines. Missing these means RSVP reconcile never lands in `wedding_state` and chat history never saves (this bit the live DB; fixed via a migration on 2026-06-12).
   - **Visual Inspo Depot**: `inspiration_memory` table (single row, markdown only)
   - **Vendor focuses** (bottom of file): `messages.thread_key` + `vendor_memory` table. Chat will error without the `thread_key` column.
   - **Zola integration** (top of file): `zola_snapshots` table **and** its `service_role` grants. With the table but no grants, sync auth succeeds but inserts fail with permission denied.
4. Grab credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` (base URL only, no `/rest/v1` suffix)
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
5. Under **Authentication → URL Configuration**, add your site URL and redirect URLs. Production is already configured as:
   - Site URL: `https://rosie-wedding-planner.vercel.app`
   - Redirect URLs: `https://rosie-wedding-planner.vercel.app/auth/callback`, `http://localhost:3000/**`, `https://*-cburns33s-projects.vercel.app/**`
6. Under **Authentication → Providers → Email**, ensure email sign-in is enabled (magic link)

## 2. Anthropic API key

Get your key at [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`

## 3. Local development

```bash
cp .env.local.example .env.local
# fill in API keys + ALLOWED_EMAILS (comma-separated, e.g. kelsie@...,hank@...)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should land on **Planning home** after sign-in.

Run the unit tests with `npm test` (Vitest; `npm run test:watch` for watch mode). Coverage lives next to the code it tests, e.g. `lib/zola/*.test.ts`.

### Optional: skip auth locally

Add to `.env.local`:

```
DISABLE_AUTH=true
```

This bypasses magic-link sign-in **only when `NODE_ENV` is not `production`**. Remove the line to test the real sign-in flow. Do not set this on Vercel.

## 4. Vercel (hosting)

**Already set up:** project `rosie-wedding-planner` on team `cburns33s-projects`, linked to GitHub. Pushes to `main` trigger production deploys.

Production URL: https://rosie-wedding-planner.vercel.app

### Environment variables on Vercel

These are configured for **Production** and **Development**. Copy from `.env.local.example` / your local `.env.local`:

| Variable | Notes |
|----------|--------|
| `ANTHROPIC_API_KEY` | Server only |
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | Same base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public |
| `ALLOWED_EMAILS` | Comma-separated allowlist |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | Sentry |
| `SENTRY_AUTH_TOKEN` | Build-time source maps |
| `ZOLA_REFRESH_TOKEN`, `ZOLA_PROFILE_URL`, `CRON_SECRET` | Zola integration (see section 5) |

Do **not** set `DISABLE_AUTH` on Vercel.

**Preview deploys (optional):** if you use PR preview URLs, add the same variables for the Preview environment in the [Vercel env settings](https://vercel.com/cburns33s-projects/rosie-wedding-planner/settings/environment-variables).

### Manual deploy (if needed)

```bash
npx vercel link --project rosie-wedding-planner --scope cburns33s-projects
npx vercel --prod
```

**Hobby plan note:** Vercel Hobby allows cron jobs at most once per day. The project uses `0 12 * * *` (noon UTC) in `vercel.json`. Pushes to `main` deploy via GitHub normally; `npx vercel --prod` will fail if the cron schedule runs more often than daily.

## 5. Zola integration (read-only sync)

Rosie pulls live RSVP and registry stats from Kelsie's Zola account so the home card and chat answers stay grounded. Kelsie never configures anything — this is entirely Chase-side env setup.

It uses Zola's unofficial mobile API (`mobile-api.zola.com`), the same path the iOS app uses. This is personal automation and not endorsed by Zola; see `prd/zola-integration.md` for the accepted ToS risk. There is no write-back to Zola.

### Capture the refresh token

1. Make sure Kelsie's Zola account exists (Chase can use the shared login).
2. Sign in at [zola.com/account/login](https://www.zola.com/account/login) in any browser.
3. Open DevTools → **Application** → **Cookies** → `https://www.zola.com`.
4. Copy the value of the `usr` cookie — it's a JWT that lasts about a year and doubles as the refresh token.

### Set the env vars (Vercel + local)

| Variable | Required | Notes |
|----------|----------|-------|
| `ZOLA_REFRESH_TOKEN` | Yes (once Zola exists) | The `usr` cookie JWT. Server only; never sent to the client or logged. |
| `ZOLA_PROFILE_URL` | Recommended | The couple's Zola wedding/registry URL. Powers the **Open Zola →** link. |
| `CRON_SECRET` | Yes | Random string. Protects the cron, manual sync, and CSV import routes. Must be named exactly `CRON_SECRET` (not `ZOLA_CRON_SECRET`). |

Add these in the [Vercel env settings](https://vercel.com/cburns33s-projects/rosie-wedding-planner/settings/environment-variables) (Production + Development) and in `.env.local` for local work. After changing env vars on Vercel, redeploy so the runtime picks them up.

**No registry yet:** sync still succeeds if the Zola account has no registry (`registry: null`). RSVP counts populate; gift tracker and registry lines on the home card stay empty until a registry is created on Zola.

### How it runs

- **Cron:** `vercel.json` schedules `GET /api/cron/zola-sync` once daily at **noon UTC** (`0 12 * * *`; Vercel Hobby limit). On success it writes a row to `zola_snapshots`, reconciles `wedding_state.guests` (RSVP counts), and the home card refreshes.
- **Manual sync:** `POST /api/integrations/zola/sync` with header `Authorization: Bearer $CRON_SECRET` runs a sync on demand.
- **CSV fallback (Chase only, not in any UI):** `POST /api/integrations/zola/import` with the same header and a multipart `file` field backfills a snapshot when the API is unavailable. It accepts either a **Track RSVPs → Export** (any tab; the Overview export is most complete since it carries every event) or a **guest-list upload**. The parser auto-detects which from the file contents, so you don't pass a type. RSVP exports may contain several events and several `Meal Choice` columns; only the wedding/reception event's numbers drive the home card. Open-text custom-question answers (e.g. dietary notes) are ignored on purpose.
- **Graceful degradation:** if a sync fails, the home and chat keep working on the last known snapshot, and Sentry receives a scrubbed alert (no token, no guest data).

### Annual maintenance

The `usr` token expires after ~1 year (or if Zola signs the account out). When sync starts 401ing, Sentry alerts; recapture the `usr` cookie and update `ZOLA_REFRESH_TOKEN` on Vercel, then redeploy.

### Verify

With `ZOLA_REFRESH_TOKEN` and `CRON_SECRET` set locally, hit the sync route and confirm a `zola_snapshots` row appears:

```bash
curl -X POST http://localhost:3000/api/integrations/zola/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Success looks like `{"ok":true,"invited":…,"attending":…}`. Query Supabase: `select * from zola_snapshots order by imported_at desc limit 1`.

Production manual sync uses the same header against `https://rosie-wedding-planner.vercel.app/api/integrations/zola/sync`.

The Zola read-only client is adapted from the MIT-licensed [zola-mcp](https://github.com/chrischall/zola-mcp) project (auth flow only — no write tools).

## 6. Sentry (error monitoring)

Rosie reports crashes and server errors to [Sentry](https://talos-advisory.sentry.io) (`talos-advisory/javascript-nextjs`). Chat message bodies are scrubbed before upload; session replay is off.

SDK files: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `lib/sentry-scrub.ts`, `app/global-error.tsx`.

**Local:** DSN + optional `SENTRY_AUTH_TOKEN` in `.env.local` (see `.env.local.example`).

**Vercel:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` (already set for production).

Create or rotate tokens at [sentry.io/settings/auth-tokens](https://sentry.io/settings/auth-tokens/) (`project:releases` + `org:read` is enough; full admin also works).

To verify, temporarily throw in an API route and check the Sentry Issues dashboard within ~30 seconds.


## How it works

### Planning home (`/`)

The default landing page after sign-in. While the vibe intro is incomplete (`aesthetic.introCompleted === false`), **`/` redirects to `/chat`** so the intro sequence is first.

After vibe intro completes, `/` shows the wedding briefing:

- Weeks-to-go, **Your vibe**, **Up next**, progress milestones, summary cards
- **Welcome overlay** on first home visit only (after vibe intro, before `intro_completed`): trimmed copy, dismiss → scroll to Up next
- **The details** — budget, venue, vendor list, decisions

Updates after chat without a manual reload: refetch on tab focus and `wedding-state-updated`.

### Ask Rosie (`/chat`)

Main conversation (`thread_key = null`). **First-time landing:** Beat 1 opening message (`lib/intro.ts`), then Rosie-led vibe arc, inline **primary color picker** (pick 2), **Coolors handoff card** (5-color starter link), paste Coolors Export → URL to apply palette, optional image attach (paperclip, main thread only). Returning visits go straight to the thread when intro is complete.

Assistant messages render **bold** and markdown links via `FormattedMessage`.

When talk centers on one vendor, Rosie may offer to continue in **your [vendor] focus** — a soft link appears; she never auto-redirects.

### QA / replay intro (local)

```bash
node scripts/reset-intro.mjs   # or run qa/reset-intro.sql in Supabase
node scripts/seed-primary-picker.mjs   # optional: jump to primary color step only
```

See `qa/README.md` for the full first-visit flow and checklist.

### Vendor focuses (`/chat/[vendor]`)

Dedicated chat for each of nine vendors (photographer, caterer, DJ, etc.). Click a vendor on the home or follow a handoff link from general chat.

Facts still save to the global plan no matter which focus you're in. Rosie keeps internal per-vendor notes in Supabase (`vendor_memory`); Kelsie never sees those.

### Rosie + structured data

Rosie silently calls tools when something is worth tracking (venue shortlisted, vendor quoted, budget thought, decision made). Structured data lives in `wedding_state`; vendor running notes in `vendor_memory`.

The system prompt lives in `lib/system-prompt.ts`. The RTF in the repo root is the original source — if you update it, paste the new text into `ROSIE_BASE_PROMPT`.

## Model

Currently using `claude-sonnet-4-6`. To change, update `model` in `app/api/chat/route.ts`.

---

## Ongoing maintenance

You do not need to operate Sentry, Vercel, or Supabase on a schedule. For a single-user gift app, this is enough:

| If… | Then… |
|-----|--------|
| You change the app | Push to `main` on GitHub. Vercel redeploys. |
| Kelsie cannot log in | Check Supabase **Authentication → URL Configuration** still matches the production URL (section 1 above). |
| Something breaks in production | Open [Sentry Issues](https://talos-advisory.sentry.io/issues/), fix code, push again. |
| You work locally without magic links | Keep `DISABLE_AUTH=true` in `.env.local` only. |
| You hand off to Kelsie | Share https://rosie-wedding-planner.vercel.app and confirm her email is in `ALLOWED_EMAILS`. |
| Zola RSVP stats stop updating | The `usr` token likely expired (~1 year) or Zola signed the account out. Sentry alerts on the 401. Recapture the `usr` cookie (section 5) and update `ZOLA_REFRESH_TOKEN` on Vercel, then redeploy. |

Billing: all three services have free tiers; one active user should stay free or very cheap. Optional: glance at usage once a month.

Architecture and file map: `PROJECT.md`. Feature specs: `prd/`.
