# Rosie — Project Summary

A personalized wedding planning AI agent built as an engagement gift from Chase Burns to his sister Kelsie Burns, who is marrying Hank Harris in spring 2027.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Anthropic API** — `claude-sonnet-4-6`
- **Supabase** — Postgres + magic-link auth via `@supabase/ssr`
- **Tailwind CSS v4** — CSS-based theme config (no tailwind.config.ts)
- **Vercel** — hosting ([rosie-wedding-planner.vercel.app](https://rosie-wedding-planner.vercel.app))
- **Sentry** — error monitoring (`talos-advisory/javascript-nextjs`; chat payloads scrubbed, no session replay)

---

## Production

| What | Where |
|------|--------|
| Live app | https://rosie-wedding-planner.vercel.app |
| GitHub | [cburns33/rosie-wedding-planner](https://github.com/cburns33/rosie-wedding-planner) |
| Vercel project | `cburns33s-projects/rosie-wedding-planner` (auto-deploys on push to `main`) |
| Supabase project | `kmyegwklllfjgoxpnuep` (auth + Postgres) |
| Sentry project | [talos-advisory/javascript-nextjs](https://talos-advisory.sentry.io) |

Push to `main` → Vercel builds and deploys. Sentry source maps upload during the build (`SENTRY_AUTH_TOKEN` on Vercel).

---

## Ongoing maintenance (minimal)

Nothing here needs weekly attention. Typical touch points:

- **Push code** → GitHub → Vercel redeploys automatically.
- **Kelsie cannot sign in** → Supabase **Authentication → URL Configuration** must still list the production URL and callback (see `SETUP.md`).
- **Something broke in prod** → Check [Sentry Issues](https://talos-advisory.sentry.io/issues/); fix code and push.
- **Local dev without magic links** → `DISABLE_AUTH=true` in `.env.local` only. Never on Vercel.
- **Before Kelsie uses it for real** → Confirm she has the production URL and her email is in `ALLOWED_EMAILS` on Vercel.

Full setup and env var list: `SETUP.md`.

---

## Running locally

```bash
cp .env.local.example .env.local   # fill in values
npm install
npm run dev
```

Sign-in lands on **Planning home** (`/`). **Ask Rosie** is at `/chat`.

---

## Environment variables

```
ANTHROPIC_API_KEY=
SUPABASE_URL=                         # base project URL, no /rest/v1 suffix
NEXT_PUBLIC_SUPABASE_URL=             # same as SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # anon/public key (legacy: NEXT_PUBLIC_SUPABASE_ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY=            # server-side DB access for chat API
ALLOWED_EMAILS=                       # comma-separated magic-link allowlist

# Optional — local dev only (ignored in production):
DISABLE_AUTH=true                     # bypass magic-link; remove to re-enable auth

# Sentry (optional locally; required on Vercel for source maps):
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=                    # build-time source map upload
```

Chat data uses the service role key server-side. Auth uses the publishable key + cookies via `@supabase/ssr`.

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | **Planning home** — wedding briefing (weeks-to-go, up next, progress, summary cards, details) |
| `/chat` | **Ask Rosie** — main conversation (`thread_key = null`) |
| `/chat/[vendor]` | **Vendor focus** — scoped chat for one of nine vendors (e.g. `/chat/caterer`) |
| `/dashboard` | Redirects to `/` (legacy bookmark) |
| `/login` | Magic-link sign-in |
| `/api/chat` | Chat POST (Anthropic + tools) |
| `/api/wedding-state` | GET read-only wedding state (for client refetch) |
| `/api/integrations/zola` | GET latest Zola aggregates for the home card (magic-link; aggregates only) |
| `/api/integrations/zola/sync` | POST manual Zola sync (Chase; `CRON_SECRET`) |
| `/api/integrations/zola/import` | POST CSV fallback import (Chase; `CRON_SECRET`; not in UI) |
| `/api/cron/zola-sync` | GET scheduled Zola sync (Vercel Cron; `CRON_SECRET`) |

Nav: **Home** · **Ask Rosie** · Sign out. Rosie wordmark → `/`.

---

## Database (Supabase)

Run `supabase/schema.sql` in the Supabase SQL editor on first setup. If the project predates a feature, re-run only the relevant migration block from that file:

- **Zola integration** (top): `zola_snapshots` + `service_role` grants
- **Vendor focuses** (bottom): `messages.thread_key` + `vendor_memory`

**`messages`** — conversation history (scoped by thread)

| column | type |
|--------|------|
| id | bigserial PK |
| role | text ('user' \| 'assistant') |
| content | text |
| thread_key | text, nullable — `null` = main Ask Rosie thread; vendor key = that focus |
| created_at | timestamptz |

**`wedding_state`** — single-row structured planning data (id always = 1)

| column | type |
|--------|------|
| id | int PK (always 1) |
| data | jsonb |
| updated_at | timestamptz |

**`vendor_memory`** — internal per-vendor notes (Rosie-only, never shown in UI)

| column | type |
|--------|------|
| vendor | text PK (e.g. `caterer`) |
| markdown | text |
| updated_at | timestamptz |

**`zola_snapshots`** — normalized, aggregate-only snapshots from the Zola integration

| column | type |
|--------|------|
| id | bigserial PK |
| imported_at | timestamptz |
| source | text ('api_sync' \| 'csv_rsvp' \| 'csv_guests') |
| data | jsonb (`ZolaSnapshot` — aggregates only, no guest names) |
| raw_file_hash | text, nullable (CSV dedupe) |

Latest snapshot = most recent `imported_at`. See the Zola integration section below.

The `wedding_state.data` shape is in `lib/types.ts` (`WeddingState`), seeded in `lib/wedding-defaults.ts`.

---

## Architecture

### Planning home (`/`)

Server-fetches `wedding_state`, renders `PlanningHomeShell` (client wrapper).

- **Briefing** (`PlanningHome.tsx`): hero, up-next card (links to `/chat` or `/chat/[vendor]`), milestone strip, three summary cards, then **The details** (`Dashboard.tsx`).
- **Live updates**: `PlanningHomeShell` refetches via `GET /api/wedding-state` on tab focus/visibility and on `wedding-state-updated` (dispatched from chat after each reply). No websocket.
- **Interactivity**: most cards link to chat or vendor focus; hover lift via `.card-interactive` in `globals.css`. Sticky **Ask Rosie** pill on mobile.

Derived UI logic lives in `lib/planning-utils.ts` (`getUpNext`, `getMilestones`, `getSummary`, `weeksToGo`).

### Chat flow (`app/api/chat/route.ts`)

1. Accept `message`, optional `initialMessage`, optional `threadKey` (vendor key or omitted for main thread).
2. Fetch scoped messages + `wedding_state` (+ vendor memory when in a focus).
3. Build system prompt via `buildSystemPrompt(state, vendorFocus?)`.
4. Call Anthropic with thread-appropriate tools (`getTools()`).
5. Tool loop (up to 3): process tool calls, re-fetch state, second API call.
6. Save user + assistant messages with matching `thread_key`.
7. Return `{ message, suggestFocus? }` — `suggestFocus` surfaces a handoff link in general chat.

### Tools

| Tool | Available in | Purpose |
|------|--------------|---------|
| `update_wedding_data` | all threads | Structured facts → `wedding_state` (global, always) |
| `update_vendor_memory` | vendor focus | Rewrite internal templated markdown for that vendor |
| `note_for_vendor` | vendor focus | Append a note to another vendor's memory |
| `suggest_vendor_focus` | main chat only | Return `{ vendor, label }` for UI handoff link |

**Principle:** conversations are scoped; facts are global. Kelsie can mention the florist while in the caterer focus and Rosie still writes to `vendors.florist.*`.

### Vendor focuses

- Nine vendors: keys in `lib/vendors.ts` (`VENDOR_KEYS`, labels, `vendorFocusLabel()`).
- User-facing term: **focus** ("your caterer focus"), not "agent" or "thread".
- Internal memory template headings in `lib/system-prompt.ts` (`VENDOR_MEMORY_TEMPLATE`).
- First open of a focus shows a contextual opener (`vendorOpeningMessage()`); not the signature intro.

### First visit vs. returning (main chat only)

`app/chat/page.tsx` loads messages where `thread_key IS NULL`. Intro shows only when `shouldShowIntro()` is true (`lib/intro.ts`: not `intro_completed`, no prior messages).

The signature intro (`IntroScreen`) lives on `/chat` only. Planning home (`/`) is always the briefing; Kelsie taps **Ask Rosie** when ready.

On first message, `INITIAL_ROSIE_MESSAGE` is shown in UI and sent as `initialMessage` in the first POST so the API prepends it before Kelsie's turn. Sets `intro_completed` on `wedding_state`.

### Auth (`middleware.ts`)

Supabase magic link + `ALLOWED_EMAILS` allowlist. Protects all routes except `/login`, `/auth/callback`, `/api/auth/login`, Sentry's `/monitoring` tunnel, and Chase-only integration routes that self-protect with `CRON_SECRET` (`/api/cron/*`, `/api/integrations/zola/sync`, `/api/integrations/zola/import`).

`DISABLE_AUTH=true` in `.env.local` bypasses auth in non-production only (for local UI work). Never set in Vercel production env.

### Sentry

`@sentry/nextjs` across client, server, and edge. `lib/sentry-scrub.ts` strips chat/API bodies before events leave the app. Config: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `app/global-error.tsx`, `next.config.ts` (`tunnelRoute: "/monitoring"`).

---

### Zola integration (read-only)

Rosie pulls live RSVP + registry aggregates from the couple's Zola account so the home card and chat answers are grounded in reality. Kelsie configures nothing; Chase sets `ZOLA_REFRESH_TOKEN`, `ZOLA_PROFILE_URL`, and `CRON_SECRET` (see `SETUP.md`).

- **Client** (`lib/zola/client.ts`): adapts the MIT [zola-mcp](https://github.com/chrischall/zola-mcp) auth flow — the `usr` cookie JWT refreshes a short-lived session token against `mobile-api.zola.com`. Read-only; no write tools.
- **Sync** (`lib/zola/sync.ts`): cron (once daily at noon UTC via `vercel.json`; Vercel Hobby limit) → fetch RSVPs/events, gift tracker (skipped if account has no registry yet), budget → `normalize.ts` → insert `zola_snapshots` row → `reconcile.ts` writes RSVP counts into `wedding_state.guests` (logs a `decisions[]` entry only on a >10% invited-count change).
- **Headline event**: an account can have several events (wedding, rehearsal, etc.). The summary shown on the home card and in chat comes from one "headline" event. The API path picks it by event `type` (`wedding`/`reception`/`ceremony`), falling back to the largest headcount. Meal aggregates come from that headline event (catering-relevant), with a fallback to whichever event actually collected meal choices.
- **Surfacing**: home card `ZolaGuestsCard.tsx` (hidden until a snapshot exists), refetched by `PlanningHomeShell` on focus and the `zola-snapshot-updated` event. Chat injects an aggregate block into the system prompt and exposes the `get_zola_summary` tool. Meal choices are only added to the caterer focus.
- **Privacy**: snapshots and API responses are aggregates only — no guest names/addresses. `lib/sentry-scrub.ts` strips integration payloads and tokens. Open-text custom questions (e.g. dietary notes) are intentionally not captured.
- **Degradation**: sync failures never break home/chat; the last snapshot stays visible and Sentry gets a scrubbed alert.
- **CSV fallback** (`/api/integrations/zola/import`, `lib/zola/parse-csv.ts`): Chase-only, not linked in any UI. Auto-detects the export kind from cell contents (headers are unreliable — Zola names each event's status column after the event). RSVP exports are laid out as per-event column blocks: an event status column (`Attending`/`Declined`/`No Response`), followed by that event's own `Meal Choice` and custom-question columns. The parser ties each `Meal Choice` to its event block, ignores custom-question columns, picks the headline event by name (`wedding`/`reception`/`ceremony`), and counts everyone pending for a plain guest-list upload.

## File map

```
app/
  layout.tsx                  fonts + metadata
  globals.css                 theme, intro/briefing animations, .card-interactive
  page.tsx                    planning home (server → PlanningHomeShell)
  chat/page.tsx               main Ask Rosie chat
  chat/[vendor]/page.tsx      vendor focus chat
  dashboard/page.tsx          redirect → /
  api/chat/route.ts           Anthropic + tool loop + scoped message saves
  api/wedding-state/route.ts  GET wedding state JSON
  api/integrations/zola/route.ts        GET Zola aggregates for home card
  api/integrations/zola/sync/route.ts   POST manual Zola sync (CRON_SECRET)
  api/integrations/zola/import/route.ts POST CSV fallback (CRON_SECRET)
  api/cron/zola-sync/route.ts           GET scheduled sync (Vercel Cron)
  auth/callback/route.ts      magic-link callback
  global-error.tsx            Sentry root error boundary

instrumentation-client.ts     Sentry browser init
instrumentation.ts              Sentry server registration
sentry.server.config.ts         Sentry Node init
sentry.edge.config.ts           Sentry Edge init
lib/sentry-scrub.ts             strip chat payloads before Sentry upload

components/
  Nav.tsx                     Home | Ask Rosie | Sign out
  PlanningHome.tsx            briefing layout (hero, up next, progress, summaries)
  PlanningHomeShell.tsx       client refetch wrapper
  Dashboard.tsx               budget, venue, vendors, decisions (interactive cards)
  ZolaGuestsCard.tsx          Zola-powered RSVP + registry home card
  ChatPageShell.tsx           nav + ChatInterface wrapper
  ChatInterface.tsx           messages, intro, vendor header, suggestFocus link
  IntroScreen.tsx             signature intro (main chat first visit)
  MessageBubble.tsx, ChatInput.tsx, RosieSignature.tsx, VineDecoration.tsx

lib/
  types.ts                    WeddingState, Message (+ thread_key), VendorMemory
  vendors.ts                  VENDOR_KEYS, labels, isVendorKey, vendorFocusLabel
  planning-utils.ts           weeksToGo, getUpNext, getMilestones, getSummary
  system-prompt.ts            ROSIE_BASE_PROMPT, buildSystemPrompt, getTools, memory template
  wedding-defaults.ts         DEFAULT_WEDDING_STATE
  intro.ts                    shouldShowIntro()
  deep-set.ts, supabase.ts, auth.ts, supabase-env.ts
  zola/                       Zola integration (read-only)
    client.ts                 mobile API auth + read-only fetch
    normalize.ts              raw API/CSV → ZolaSnapshot + public aggregates
    sync.ts                   orchestrate fetch → snapshot → reconcile
    reconcile.ts              fold RSVP aggregates into wedding_state
    store.ts                  zola_snapshots read/write + profile URL
    parse-csv.ts              CSV fallback parser (Chase only)
    cron-auth.ts              CRON_SECRET bearer check

prd/
  vendor-chats.md             spec for vendor focuses (implemented)

supabase/
  schema.sql                  tables + seed + vendor migration block
```

---

## Design system

**Fonts**
- `font-script` — Great Vibes (signature/title only)
- `font-serif` — Cormorant Garamond (decorative headings)
- `font-sans` — Inter (body, default)

**Colors** (`@theme` in globals.css)
- `cream`, `warm-dark`, `warm-mid`, `warm-light`, `border`
- `blush` / `blush-light` / `blush-pale` — primary accent
- `sage` / `sage-light` — green (contacted, done)
- `mist` / `mist-light` — blue (considering)

**UX references (vibe, don't clone)**
- Structure: Withjoy/Zola phased progress
- Clarity: Linear hierarchy and whitespace
- Warmth: Airbnb-style scannable cards
- Aesthetic: editorial wedding / serif + whitespace
- Avoid: Asana, Monday, Notion databases, generic admin dashboards

**Hidden for now:** Aesthetic section in `Dashboard.tsx` (placeholders; Kelsie decides palette/style/music via Rosie).

---

## Rosie's pre-loaded context

In `ROSIE_BASE_PROMPT` (`lib/system-prompt.ts`); all subject to change as Kelsie updates:

- Budget: $75,000 · Guests: 250–300 · Date: spring 2027
- Location: southeast/central Texas, Houston hub
- Aesthetic: elevated classic · Palette: pink, green, blue
- Music: DJ + possible live instrument (no full band)
- Decision style: 3 options at a time, one question at a time
- Fiancé: Hank Harris (always "Hank")
- Gift from: Chase Burns (brother)

---

## Known issues / things to be aware of

- **Schema migration required** for vendor focuses — run the `thread_key` + `vendor_memory` block in `supabase/schema.sql` if not already applied. Chat POST fails without `thread_key` column.
- **Vercel preview env vars** — production and development env vars are set; preview (PR) deploys may need the same vars added manually in the Vercel dashboard if you use branch previews.
- **Returning visits skip the intro** on `/chat` — clear `messages` (main thread only: `thread_key IS NULL`) to replay.
- **Aesthetic placeholders** exist in seeded `wedding_state` but are not shown on the home UI.
- **Tool use is sequential** — multiple `update_wedding_data` calls in one turn process one at a time (loop in `route.ts`).
- **`/dashboard`** redirects to `/`; update any bookmarks.
