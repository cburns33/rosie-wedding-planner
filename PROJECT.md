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
| `/chat/inspiration` | **Visual Inspo Depot** — screenshot/mood-board chat (`thread_key = inspiration`) |
| `/chat/[vendor]` | **Vendor focus** — scoped chat for one of nine vendors (e.g. `/chat/caterer`) |
| `/dashboard` | Redirects to `/` (legacy bookmark) |
| `/login` | Magic-link sign-in |
| `/api/chat` | Chat POST (Anthropic + tools) |
| `/api/wedding-state` | GET read-only wedding state (for client refetch) |
| `/api/inspiration-memory` | GET inspiration card summary for home refetch |
| `/api/integrations/zola` | GET latest Zola aggregates for the home card (magic-link; aggregates only) |
| `/api/integrations/zola/sync` | POST manual Zola sync (Chase; `CRON_SECRET`) |
| `/api/integrations/zola/import` | POST CSV fallback import (Chase; `CRON_SECRET`; not in UI) |
| `/api/cron/zola-sync` | GET scheduled Zola sync (Vercel Cron; `CRON_SECRET`) |

Nav: **Home** · **Ask Rosie** · Sign out. Rosie wordmark → `/`.

---

## Database (Supabase)

Run `supabase/schema.sql` in the Supabase SQL editor on first setup. If the project predates a feature, re-run only the relevant migration block from that file:

- **Zola integration** (top): `zola_snapshots` + `service_role` grants
- **Visual Inspo Depot**: `inspiration_memory` table + `service_role` grants
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

**`inspiration_memory`** — internal Visual Inspo Depot markdown (Rosie-only; single row id = 1)

| column | type |
|--------|------|
| id | int PK (always 1) |
| markdown | text |
| updated_at | timestamptz |

Images are not stored. Rosie writes dated observation bullets; home card stats come from `summarizeInspirationMemory()` in `lib/inspiration.ts`.

**`zola_snapshots`** — normalized, aggregate-only snapshots from the Zola integration

| column | type |
|--------|------|
| id | bigserial PK |
| imported_at | timestamptz |
| source | text ('api_sync' \| 'csv_rsvp' \| 'csv_guests') |
| data | jsonb (`ZolaSnapshot` — aggregates only, no guest names) |
| raw_file_hash | text, nullable (CSV dedupe) |

Latest snapshot = most recent `imported_at`. See the Zola integration section below.

The `wedding_state.data` shape is in `lib/types.ts` (`WeddingState`), seeded in `lib/wedding-defaults.ts`. Key **aesthetic** fields (jsonb, no migration required):

| Field | Type | Notes |
|-------|------|--------|
| `aesthetic.palette` | `string[]` | 5 hex colors |
| `aesthetic.style` | `string \| null` | Short feeling label (e.g. `Relaxed & warm`) |
| `aesthetic.borrow` / `avoid` / `layout` | `string[]` | From intro arc |
| `aesthetic.inspiration.moment` / `.feeling` / `.structural` | `string \| null` | Beat 1–3 raw answers |
| `aesthetic.introUserTurns` | `number` | Server-side intro progress when messages don't persist |
| `aesthetic.introCompleted` | `boolean` | Vibe arc finished |
| `aesthetic.themeApplied` | `boolean` | Palette mapped to CSS accents |
| `aesthetic.primaryPicks` | `string[]` | Two hex primaries chosen before Coolors handoff |
| `aesthetic.pendingPrimaryPicker` | `boolean` | Show inline primary picker on `/chat` load |
| `aesthetic.dashboardHandoffPending` | `boolean` | Beat 8 queued after vibe finalize |
| `aesthetic.dashboardHandoffAsked` | `boolean` | Beat 8 handoff question sent |

> **`service_role` grants matter.** `wedding_state`, `messages`, `vendor_memory`, and `zola_snapshots` are RLS-protected and reachable only via the server-side `service_role` key. Creating a table is not enough; the matching `GRANT … TO service_role` lines in `schema.sql` must also run. Without them, reads/writes fail with `permission denied`. See `SETUP.md` §1.

---

## Testing

Unit tests run on **Vitest** (`vitest.config.ts`, Node environment, tsconfig path aliases resolved natively).

```bash
npm test          # run once
npm run test:watch
```

Coverage includes Zola logic and intro/aesthetic utilities:

- `lib/zola/normalize.test.ts` — headline-event selection, meal-count guard, aggregates shape.
- `lib/zola/reconcile.test.ts` — RSVP write-through, `>10%` decisions threshold, Supabase error surfacing.
- `lib/colors/*.test.ts` — palette inference, shuffle, Coolors URLs, theme vars + contrast.
- `lib/intro-aesthetic.test.ts` — intro redirect, welcome overlay gating, opening message, layout-aware Up next.
- `lib/intro-beats.test.ts`, `lib/intro-script.test.ts` — beat resolution and scripted intro copy.
- `lib/vibe-display.test.ts` — Your vibe card sections, quoted excerpts, finalize fields, vibe decision append.
- `lib/inspiration.test.ts` — inspo thread key, memory summary, card stats.

---

## Architecture

### Planning home (`/`)

Server-fetches `wedding_state`, renders `PlanningHomeShell` (client wrapper).

- **Intro redirect:** while `aesthetic.introCompleted === false`, `app/page.tsx` redirects to `/chat` (`shouldRedirectToIntroChat()` in `lib/intro.ts`). Planning home is unavailable until the vibe arc finishes.
- **Briefing** (`PlanningHome.tsx`): hero, **Your vibe** (`YourVibeCard.tsx`), up-next card, milestone strip, summary cards (**Visual Inspo Depot** replaces budget-left card), then **The details** (`Dashboard.tsx`).
- **Your vibe card:** Categorized display via `lib/vibe-display.ts` — quoted headline (feeling + moment), muted moment line, **Inspired by**, **Details** chips, 5 palette swatches, **Skipping** chips. `aesthetic.style` is a short feeling label only (not a mashup).
- **Welcome overlay** (`WelcomeOverlay.tsx`): trimmed copy; shows only when `intro_completed === false` **and** vibe intro is already complete (`shouldShowWelcome()`). Dismiss via `POST /api/wedding-state/complete-intro` → scroll to `#up-next`.
- **Visual Inspo Depot card:** Links to `/chat/inspiration`. Uses `bg-sage-pale` + `text-warm-dark` (not cream on `bg-sage`) so copy stays readable when `ThemeProvider` remaps `--color-sage` to a light palette color.
- **Live updates**: debounced refetch on tab focus / `wedding-state-updated` (`PlanningHomeShell` → `/api/wedding-state`, `/api/inspiration-memory`, Zola). Client merges API JSON via `mergeWeddingState()`. **Theme**: `ThemeProvider` applies accent CSS vars when `aesthetic.themeApplied && palette.length >= 5`.

Derived UI logic lives in `lib/planning-utils.ts` (`getUpNext`, `getMilestones`, `getSummary`, `weeksToGo`).

### Chat flow (`app/api/chat/route.ts`)

1. Accept `message`, optional `images` (base64 data URLs, main thread only), optional `primaryPicks` (two hex when confirming inline picker), optional `initialMessage`, optional `threadKey`.
2. Fetch scoped messages + `wedding_state` (+ vendor memory when in a focus). Merge defaults via `mergeWeddingState()`.
3. Build system prompt via `buildSystemPrompt(state, vendorFocus?, zola?)`. Intro mode block appended on main thread when `!aesthetic.introCompleted`. Beats 2–5a are **scripted server-side** (`lib/intro-beats.ts`, `lib/intro-script.ts`); the LLM writes a one-sentence reflect only on those turns.
4. Call Anthropic with thread-appropriate tools (`getTools()`).
5. Tool loop (up to 3 in vendor focus, **5 on main thread**): process tool calls, re-fetch state, continue until done.
6. Save user + assistant messages (text-only in DB; image uploads stored as “Uploaded N inspiration screenshot(s)”).
7. Return `{ message, suggestFocus?, emailDraft?, primaryColorPicker?, coolorsHandoff? }` — sidecar fields are ephemeral (not stored in `messages`). Primary picks are saved via `primaryPicks` on the same POST (also sets `coolorsHandoff` with a 5-color starter URL). Coolors Export → URL paste auto-applies palette server-side.

### Tools

| Tool | Available in | Purpose |
|------|--------------|---------|
| `update_wedding_data` | all threads | Structured facts → `wedding_state` (global, always) |
| `draft_vendor_email` | all threads | Prepare outreach email for Kelsie to copy or open in her mail app |
| `show_primary_color_picker` | main chat only | Surface inline `PrimaryColorPickerCard` (pick 2 preset primaries) |
| `update_vendor_memory` | vendor focus | Rewrite internal templated markdown for that vendor |
| `update_inspiration_memory` | inspo focus | Rewrite Visual Inspo Depot markdown (dated observation bullets) |
| `note_for_vendor` | vendor focus | Append a note to another vendor's memory |
| `suggest_vendor_focus` | main chat only | Return `{ vendor, label }` for UI handoff link |
| `get_zola_summary` | all threads | Aggregate RSVP/registry figures from latest Zola snapshot |

**Principle:** conversations are scoped; facts are global. Kelsie can mention the florist while in the caterer focus and Rosie still writes to `vendors.florist.*`.

### Vendor focuses

- Nine vendors: keys in `lib/vendors.ts` (`VENDOR_KEYS`, labels, `vendorFocusLabel()`).
- User-facing term: **focus** ("your caterer focus"), not "agent" or "thread".
- Internal memory template headings in `lib/system-prompt.ts` (`VENDOR_MEMORY_TEMPLATE`).
- First open of a focus shows a contextual opener (`vendorOpeningMessage()`); not the signature intro.

### First visit vs. returning

Two independent flags:

| Flag | Meaning |
|------|---------|
| `intro_completed` | Home welcome overlay dismissed |
| `aesthetic.introCompleted` | Vibe + color intro arc finished in chat |

**Landing (as shipped):** `/` redirects to `/chat` until `aesthetic.introCompleted === true`. The vibe intro is the first experience, not something Kelsie navigates to from home.

**Chat intro** (`lib/intro.ts` → `introOpeningMessage()`): Beat 1 is scripted when the main thread is empty and vibe intro is incomplete. Beats 2–5a are server-scripted (`lib/intro-beats.ts`, `lib/intro-script.ts`) with `introUserTurns` progress; answers persist to `inspiration.*`, `borrow`, `avoid`, and finalized display fields via `lib/vibe-display.ts`. Rosie surfaces `PrimaryColorPickerCard` via `show_primary_color_picker`, then a `CoolorsHandoffCard` (5-color starter link to coolors.co). Kelsie builds the full palette in Coolors (lock + spacebar shuffle), pastes Export → URL back in chat; the chat route parses and applies via `applyPaletteToWeddingState()`. Beat 7 reflects and finalizes vibe; beat 8 asks "ready to see your planning dashboard now?" and redirects to `/` on yes (`redirectTo` in chat API). Ongoing screenshots belong in **Visual Inspo Depot** (`/chat/inspiration`), not the intro arc. Image attach on main `/chat` and inspo focus only (base64 in chat POST; inspo images are not stored).

**Home welcome overlay:** after vibe intro completes, first visit to `/` may show trimmed `WelcomeOverlay` if `intro_completed === false`. Dismiss sets the flag via `POST /api/wedding-state/complete-intro` and scrolls to Up next.

**Home feedback:** **Your vibe** card, **Latest decision** (`decision_note` e.g. "Vibe set: …" appended server-side in `applyIntroCompletionSideEffects()`), **Up next** references `aesthetic.layout` when venue is not booked.

**Replay intro:** `node scripts/reset-intro.mjs` or `qa/reset-intro.sql` (clears main-thread messages + intro/aesthetic flags). **Backfill vibe display fields:** `node scripts/backfill-vibe-display.mjs`. **Skip to color step (local QA):** `node scripts/seed-primary-picker.mjs`.

Vendor focuses use `vendorOpeningMessage()` on first open; no aesthetic intro rerun or image attach.

### Auth (`middleware.ts`)

Supabase magic link + `ALLOWED_EMAILS` allowlist. Protects all routes except `/login`, `/auth/callback`, `/api/auth/login`, Sentry's `/monitoring` tunnel, and Chase-only integration routes that self-protect with `CRON_SECRET` (`/api/cron/*`, `/api/integrations/zola/sync`, `/api/integrations/zola/import`).

`DISABLE_AUTH=true` in `.env.local` bypasses auth in non-production only (for local UI work). Never set in Vercel production env.

### Sentry

`@sentry/nextjs` across client, server, and edge. `lib/sentry-scrub.ts` strips chat/API bodies before events leave the app. Config: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `app/global-error.tsx`, `next.config.ts` (`tunnelRoute: "/monitoring"`).

---

### Zola integration (read-only)

Rosie pulls live RSVP + registry aggregates from the couple's Zola account so the home card and chat answers are grounded in reality. Kelsie configures nothing; Chase sets `ZOLA_REFRESH_TOKEN`, `ZOLA_PROFILE_URL`, and `CRON_SECRET` (see `SETUP.md`).

- **Client** (`lib/zola/client.ts`): adapts the MIT [zola-mcp](https://github.com/chrischall/zola-mcp) auth flow — the `usr` cookie JWT refreshes a short-lived session token against `mobile-api.zola.com`. Read-only; no write tools.
- **Sync** (`lib/zola/sync.ts`): cron (once daily at noon UTC via `vercel.json`; Vercel Hobby limit) → fetch RSVPs/events, gift tracker (skipped if account has no registry yet), budget → `normalize.ts` → insert `zola_snapshots` row → `reconcile.ts` writes RSVP counts into `wedding_state.guests` (logs a `decisions[]` entry only on a >10% invited-count change). Reconcile throws if the `wedding_state` read or write is rejected, so a failure surfaces to Sentry instead of silently dropping the reconcile.
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
  page.tsx                    planning home (redirects to /chat until vibe intro done)
  chat/page.tsx               main Ask Rosie chat
  chat/inspiration/page.tsx   Visual Inspo Depot chat
  chat/[vendor]/page.tsx      vendor focus chat
  dashboard/page.tsx          redirect → /
  api/chat/route.ts           Anthropic + tool loop + scoped message saves
  api/wedding-state/route.ts  GET wedding state JSON
  api/inspiration-memory/route.ts  GET inspo card summary JSON
  api/wedding-state/complete-intro/route.ts  POST mark intro_completed
  api/wedding-state/apply-palette/route.ts   POST persist palette + themeApplied
  api/wedding-state/primary-picks/route.ts   POST save two primary picks (optional; chat POST also saves)
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
  PlanningHome.tsx            briefing layout (hero, your vibe, up next, progress, summaries)
  PlanningHomeShell.tsx       client refetch wrapper + welcome overlay
  WelcomeOverlay.tsx          first-visit home onboarding card
  YourVibeCard.tsx            categorized vibe sections after intro
  ThemeProvider.tsx           applies accent CSS vars from saved palette
  PrimaryColorPickerCard.tsx  inline pick-2-primaries step in intro
  CoolorsHandoffCard.tsx      Open in Coolors button + lock/spacebar/export steps
  FormattedMessage.tsx        **bold** and [markdown links](url) in assistant bubbles
  Dashboard.tsx               budget, venue, vendors, decisions (interactive cards)
  ZolaGuestsCard.tsx          Zola-powered RSVP + registry home card
  ChatPageShell.tsx           nav + ChatInterface wrapper
  ChatInterface.tsx           messages, vendor header, sidecar cards (email, primary picker, Coolors)
  VendorEmailDraftCard.tsx    inline vendor email draft (Copy / Open in email)
  MessageBubble.tsx           wraps FormattedMessage for assistant text
  ChatInput.tsx

lib/
  types.ts                    WeddingState, Message (+ thread_key), VendorMemory
  vendors.ts                  VENDOR_KEYS, labels, isVendorKey, vendorFocusLabel
  planning-utils.ts           weeksToGo, getUpNext, getMilestones, getSummary
  system-prompt.ts            ROSIE_BASE_PROMPT, buildSystemPrompt, getTools, memory template
  wedding-defaults.ts         DEFAULT_WEDDING_STATE, mergeWeddingState()
  intro.ts                    shouldShowWelcome(), shouldRedirectToIntroChat(), introOpeningMessage()
  intro-beats.ts              intro beat resolution, skip/pivot detection
  intro-script.ts             scripted Rosie copy for beats 2–5a
  vibe-display.ts             Your vibe card copy (quoted excerpts, chips, finalize, vibe decision)
  inspiration.ts              inspo thread key, memory CRUD, home card summary
  chat-thread.ts              parse threadKey (vendor vs inspiration vs main)
  inspiration.test.ts         inspo summary + thread tests
  colors/                     inferStarterPalette, coolors URL parse/gen, apply-palette-state, primary-colors presets, theme vars
  vendor-email.ts             mailto URL builder, length guard, clipboard helper
  vendor-email.test.ts        unit tests for mailto encoding + length guard
  deep-set.ts, supabase.ts, auth.ts, supabase-env.ts
  zola/                       Zola integration (read-only)
    client.ts                 mobile API auth + read-only fetch
    normalize.ts              raw API/CSV → ZolaSnapshot + public aggregates
    normalize.test.ts         normalizer + toAggregates unit tests (Vitest)
    sync.ts                   orchestrate fetch → snapshot → reconcile
    reconcile.ts              fold RSVP aggregates into wedding_state
    reconcile.test.ts         reconcile write-through + threshold unit tests
    store.ts                  zola_snapshots read/write + profile URL
    parse-csv.ts              CSV fallback parser (Chase only)
    cron-auth.ts              CRON_SECRET bearer check

vitest.config.ts              Vitest config (Node env, tsconfig path aliases)

prd/
  intro-aesthetic-build-prompt.md  vibe intro + palette spec (see Shipped behavior)
  vendor-chats.md             spec for vendor focuses (implemented)

qa/
  README.md                   QA environment, reset, first-visit flow
  intro-review.md               QA checklist + issue log template
  reset-intro.sql               SQL reset for intro walkthroughs

scripts/
  reset-intro.mjs               Node reset for intro walkthroughs
  backfill-vibe-display.mjs     Backfill style/borrow/avoid from inspiration fields
  seed-primary-picker.mjs       Local QA: surface primary color picker without full intro

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
- `cream`, `warm-dark`, `warm-mid`, `warm-light`, `border` — fixed (never overridden at runtime)
- `blush` / `blush-light` / `blush-pale` — primary accent (overridable via `ThemeProvider` when palette applied)
- `sage` / `sage-light` / `sage-pale` — secondary accent (also remapped; can become a light peach/cream from Kelsie's palette)
- `mist` / `mist-light` / `mist-pale` — tertiary accent

Runtime accent mapping: `lib/colors/theme.ts` → `paletteToThemeVars()` → `applyThemeVars()` on `document.documentElement`.

**Contrast rule:** Do not pair `text-cream` with `bg-sage` on themed cards. After palette apply, `--color-sage` may be nearly as light as cream. Use tinted pale backgrounds (`bg-sage-pale`) with `text-warm-dark` / `text-warm-mid`, same as other summary cards.

**UX references (vibe, don't clone)**
- Structure: Withjoy/Zola phased progress
- Clarity: Linear hierarchy and whitespace
- Warmth: Airbnb-style scannable cards
- Aesthetic: editorial wedding / serif + whitespace
- Avoid: Asana, Monday, Notion databases, generic admin dashboards

**Your vibe on home:** `YourVibeCard.tsx` + `lib/vibe-display.ts` — quoted headline (feeling + moment), muted moment line, Inspired by, Details chips, 5 swatches, Skipping chips. Legacy aesthetic placeholders in `Dashboard.tsx` remain hidden.

---

## Rosie's pre-loaded context

In `ROSIE_BASE_PROMPT` (`lib/system-prompt.ts`); all subject to change as Kelsie updates:

- Budget: $75,000 · Guests: 250–300 · Date: spring 2027
- Location: southeast/central Texas, Houston hub
- Aesthetic: from `wedding_state.aesthetic` after intro (not hardcoded in prompt)
- Music: DJ + possible live instrument (no full band)
- Decision style: 3 options at a time, one question at a time
- Fiancé: Hank Harris (always "Hank")
- Gift from: Chase Burns (brother) — not mentioned in vibe intro copy

---

## Known issues / things to be aware of

- **Welcome overlay flag (STEP-06)** — `intro_completed` may be set from chat tools on the happy path instead of only via Let's go dismiss. Overlay works when flags are correct; guard the flag in the chat tool path.
- **Inspo card empty with notes present** — `summarizeInspirationMemory()` only counts bullets matching `- (YYYY-MM-DD)`. Rosie must use that format under **Observations** or the home card stays empty.
- **Message persistence (STEP-11)** — reset script often reports "Cleared 0 messages"; intro uses `introUserTurns` as fallback progress counter.
- **Dev server hang (local)** — long-running `npm run dev` can stop responding (browser refresh appears to do nothing; requests time out). Fix: Ctrl+C and restart `npm run dev`. Home refetch is debounced to reduce load.
- **Partial DB aesthetic rows** — `mergeWeddingState()` normalizes arrays and `inspiration` so home does not crash on refresh; still backfill old rows if cards look wrong (`scripts/backfill-vibe-display.mjs`).
- **Schema migration required** for vendor focuses — run the `thread_key` + `vendor_memory` block in `supabase/schema.sql` if not already applied. Chat POST fails without `thread_key` column.
- **`service_role` grants are easy to miss.** Applying `schema.sql` partially (tables without the `GRANT … TO service_role` lines) leaves server-side reads/writes failing with `permission denied`. Because the app historically did not check the Supabase error, this failed silently: RSVP reconcile never landed in `wedding_state` and chat history never saved. A live-DB migration on 2026-06-12 (`grant_service_role_dml_on_wedding_state_and_messages`) restored the missing grants on `wedding_state` + `messages`; reconcile now throws on a rejected write so it can never fail silently again.
- **Vercel preview env vars** — production and development env vars are set; preview (PR) deploys may need the same vars added manually in the Vercel dashboard if you use branch previews.
- **Replay intro:** `node scripts/reset-intro.mjs` or `qa/reset-intro.sql` — clears main-thread messages and resets intro/aesthetic flags.
- **Legacy DB rows:** use `mergeWeddingState()` when loading `wedding_state` so partial `aesthetic` objects do not crash home (e.g. missing `layout`).
- **Tool use is sequential** — multiple `update_wedding_data` calls in one turn process one at a time (loop in `route.ts`).
- **`/dashboard`** redirects to `/`; update any bookmarks.
