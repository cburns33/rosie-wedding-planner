# Rosie — Setup Guide

## 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. **Existing projects:** if you set up Rosie before vendor focuses, re-run only the migration block at the top of `schema.sql` (adds `messages.thread_key` and `vendor_memory` table). Chat will error until this is applied.
4. Grab credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` (base URL only, no `/rest/v1` suffix)
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
5. Under **Authentication → URL Configuration**, add your site URL and redirect URL:
   - Site URL: `http://localhost:3000` (or your Vercel URL)
   - Redirect URLs: `http://localhost:3000/auth/callback` (and production equivalent)
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

### Optional: skip auth locally

Add to `.env.local`:

```
DISABLE_AUTH=true
```

This bypasses magic-link sign-in **only when `NODE_ENV` is not `production`**. Remove the line to test the real sign-in flow. Do not set this on Vercel.

## 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the same environment variables as `.env.local` (do **not** include `DISABLE_AUTH` in production).

For Sentry source maps on Vercel, also add `SENTRY_AUTH_TOKEN` (create at [sentry.io/settings/auth-tokens](https://sentry.io/settings/auth-tokens/) with `project:releases` and `org:read` scopes).

After deploying, share the URL with Kelsie.

## 5. Sentry (error monitoring)

Rosie reports crashes and server errors to [Sentry](https://talos-advisory.sentry.io) (`talos-advisory/javascript-nextjs`). Chat message bodies are scrubbed before upload; session replay is off.

**Local:** copy DSN values from `.env.local.example` into `.env.local` (or use the values already there after setup).

**Vercel:** add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, and `SENTRY_AUTH_TOKEN`.

To verify, temporarily throw in an API route and check the Sentry Issues dashboard within ~30 seconds.


## How it works

### Planning home (`/`)

The default landing page after sign-in. A wedding briefing, not a task board:

- Weeks-to-go, **Up next** (one clear focus + link to chat or a vendor focus)
- Progress milestones, summary cards (budget, vendors, latest decision)
- **The details** — budget, venue, vendor list, decisions (most rows/cards link through to Rosie)

Updates after chat without a manual reload: the home refetches `wedding_state` when you return to the tab or after Rosie saves changes.

### Ask Rosie (`/chat`)

Main conversation. Rosie holds full history for this thread (`thread_key = null`). First visit shows the signature intro animation; returning visits go straight to the thread.

When talk centers on one vendor, Rosie may offer to continue in **your [vendor] focus** — a soft link appears; she never auto-redirects.

### Vendor focuses (`/chat/[vendor]`)

Dedicated chat for each of nine vendors (photographer, caterer, DJ, etc.). Click a vendor on the home or follow a handoff link from general chat.

Facts still save to the global plan no matter which focus you're in. Rosie keeps internal per-vendor notes in Supabase (`vendor_memory`); Kelsie never sees those.

### Rosie + structured data

Rosie silently calls tools when something is worth tracking (venue shortlisted, vendor quoted, budget thought, decision made). Structured data lives in `wedding_state`; vendor running notes in `vendor_memory`.

The system prompt lives in `lib/system-prompt.ts`. The RTF in the repo root is the original source — if you update it, paste the new text into `ROSIE_BASE_PROMPT`.

## Model

Currently using `claude-sonnet-4-6`. To change, update `model` in `app/api/chat/route.ts`.
