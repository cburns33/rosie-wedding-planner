# Builder prompt — Zola read-only integration for Rosie

## Task

Implement **Phase 1** (required) and **Phase 2** (recommended) of the Zola integration for Rosie, a Next.js 16 wedding planning gift app. Read the full spec first: `prd/zola-integration.md`.

**Goal:** Kelsie (non-technical) opens the planning home and sees live RSVP + registry stats from her Zola account with zero setup. Chase configures `ZOLA_REFRESH_TOKEN` in Vercel env; Rosie syncs automatically. No settings page, no connect UI, no CSV upload for Kelsie.

---

## Read first (in order)

1. `prd/zola-integration.md` — source of truth (locked decisions, acceptance criteria, out of scope)
2. `PROJECT.md` — architecture, routes, tools, file map
3. `SETUP.md` — env vars, deployment
4. `lib/types.ts`, `lib/wedding-defaults.ts` — `WeddingState` shape
5. `lib/system-prompt.ts`, `app/api/chat/route.ts` — how tools + prompts work today
6. `components/PlanningHome.tsx`, `components/PlanningHomeShell.tsx` — home briefing + refetch pattern
7. [zola-mcp](https://github.com/chrischall/zola-mcp) — adapt read-only mobile API client (`mobile-api.zola.com`, `usr` cookie JWT as refresh token). MIT license. Do not copy write tools.

---

## Locked product decisions (do not re-debate)

- **Read-only** unofficial Zola mobile API is the primary data path. ToS risk accepted.
- **Kelsie never configures anything.** No `/settings`, no token paste, no file upload in UI.
- **Chase configures** via env vars only: `ZOLA_REFRESH_TOKEN`, `ZOLA_PROFILE_URL`, `CRON_SECRET`.
- **Auto-reconcile** RSVP aggregates into `wedding_state.guests` on every sync — no prompts to Kelsie. Log `decisions[]` only if invited count changes >10%.
- **Aggregates only** in snapshots, prompts, and API responses — no guest names/addresses in Sentry, client JSON, or chat prompts.
- **No write-back** to Zola (no add guest, update budget, assign seat).
- **Graceful degradation:** sync failure must not break chat or home; show last known snapshot + warm copy.

---

## Phase 1 — ship this

### 1. Database

Add to `supabase/schema.sql` (migration block at top, like existing vendor migration):

```sql
create table zola_snapshots (
  id            bigserial primary key,
  imported_at   timestamptz not null default now(),
  source        text not null,  -- 'api_sync' | 'csv_rsvp' | 'csv_guests'
  data          jsonb not null,
  raw_file_hash text
);
create index zola_snapshots_imported_at_idx on zola_snapshots (imported_at desc);
```

Do **not** add `integration_secrets` unless you have a strong reason — read token from `ZOLA_REFRESH_TOKEN` env only (simpler for single-user gift).

### 2. Types (`lib/types.ts`)

- Add `ZolaSnapshot` interface (see PRD).
- Extend `WeddingState`:
  - `integrations.zola` — `profileUrl`, `syncMethod`, `lastSyncAt`, `apiConnected` (minimal; skip `dismissed` / connect flows)
  - `guests.rsvpAttending`, `rsvpPending`, `rsvpDeclined`, `lastZolaImportAt` (nullable)
  - Optional: `budget.zolaSpent` (Phase 2b)

Update `lib/wedding-defaults.ts` with sensible defaults.

### 3. Zola client (`lib/zola/`)

Create:

- `client.ts` — auth (`POST /v3/sessions/refresh`), session headers (`Authorization` + `x-zola-session-id`), read-only fetch helpers
- `normalize.ts` — map raw API responses → `ZolaSnapshot`
- `sync.ts` — orchestrate: fetch RSVPs/events, gift tracker, optionally budget → insert snapshot → reconcile `wedding_state`

Reference zola-mcp for endpoint paths and response shapes. Read-only endpoints:

- RSVP / events (`track_rsvps`, `list_events`)
- Gift tracker (`get_gift_tracker`)
- Budget (`get_budget`) — lower priority

Token: `process.env.ZOLA_REFRESH_TOKEN`. Profile URL: `process.env.ZOLA_PROFILE_URL` (also persist to `wedding_state.integrations.zola.profileUrl` on first sync if missing).

### 4. API routes

| Route | Auth | Behavior |
|-------|------|----------|
| `GET /api/integrations/zola` | Magic link (same as app) | Latest snapshot aggregates + profile URL + staleness flag. No PII, no token. |
| `GET /api/cron/zola-sync` | `Authorization: Bearer ${CRON_SECRET}` | Run sync; return 200/500 |
| `POST /api/integrations/zola/sync` | `CRON_SECRET` | Manual on-demand sync for Chase |

Add `vercel.json` cron schedule: every 6 hours → `/api/cron/zola-sync`.

On sync success: insert `zola_snapshots` row, reconcile guests, update `integrations.zola.lastSyncAt`.

On sync failure: capture to Sentry (scrubbed); do not throw on home page load.

### 5. Planning home UI

New component `components/ZolaGuestsCard.tsx` (or similar):

- **Healthy:** "142 yes · 108 waiting · 18 no" + "24 gifts · 3 to thank" + **Open Zola →**
- **Stale (>48h):** same numbers + subtle "as of [date]" or soft "may be a touch behind"
- **No snapshot / no token:** hide card OR minimal placeholder (not a connect CTA)
- Match existing design: `card-interactive`, cream/blush/sage palette, `font-serif` headings

Wire into `PlanningHome.tsx` among summary cards.

Extend `PlanningHomeShell.tsx` to refetch `GET /api/integrations/zola` on tab focus and on new custom event `zola-snapshot-updated` (dispatch after sync if client-triggered, or piggyback on existing refetch interval).

### 6. Chat integration (`lib/system-prompt.ts` + `app/api/chat/route.ts`)

- Fetch latest snapshot in chat route (same as wedding_state).
- Inject prompt block when snapshot exists: RSVP aggregates, registry thank-you count, meal choice aggregates (for caterer focus only).
- Add tool `get_zola_summary` — returns aggregates for mid-conversation tool loop.
- Prompt rules:
  - Cite as "From your Zola guest list…"
  - If no snapshot: don't invent RSVP numbers; use `wedding_state` estimates
  - Operational tasks → link to `ZOLA_PROFILE_URL`
  - Caterer focus (`threadKey === 'caterer'`): include meal aggregates in vendor context block

Do **not** add `sync_zola_snapshot` as a user-facing chat tool unless data is >48h stale and sync is cheap; cron is primary.

### 7. Reconciliation (`lib/zola/reconcile.ts`)

After each sync:

- Write `guests.rsvpAttending`, `rsvpPending`, `rsvpDeclined`, `finalCount` (from invited), `lastZolaImportAt`
- If invited count changed >10% from previous snapshot: append to `decisions[]` with date + note
- Never auto-update `vendors.*.status` from Zola

### 8. Security

- Extend `lib/sentry-scrub.ts` for integration routes (token, CSV body, full snapshot payloads)
- Never log `ZOLA_REFRESH_TOKEN`
- Client never receives token or guest names

### 9. Docs

Update:

- `SETUP.md` — new env vars, token capture steps (DevTools → `usr` cookie), cron, annual token refresh
- `.env.local.example` — `ZOLA_REFRESH_TOKEN`, `ZOLA_PROFILE_URL`, `CRON_SECRET`
- `PROJECT.md` — brief section on Zola integration + new routes/files

---

## Phase 2 — CSV fallback (Chase only, same PR or follow-up)

- `POST /api/integrations/zola/import` — multipart CSV, protected by `CRON_SECRET`
- `lib/zola/parse-csv.ts` — RSVP + guest list exports → same `ZolaSnapshot` shape
- **Not linked in any Kelsie-facing UI**

---

## Out of scope (do not build)

- Settings/connect page, OAuth, in-app token paste
- Guest list CRUD, seating chart, registry management in Rosie
- Write tools to Zola (add guest, update budget, assign seat)
- Zola vendor marketplace search
- Registry embed widget (optional later)
- `integration_secrets` table unless env-only token proves insufficient

---

## Verification checklist

Before finishing, confirm:

- [ ] `npm run build` passes
- [ ] With `ZOLA_REFRESH_TOKEN` in `.env.local`, manual hit to sync route creates a `zola_snapshots` row
- [ ] Planning home shows RSVP line when snapshot exists
- [ ] `GET /api/integrations/zola` returns aggregates only (inspect JSON)
- [ ] Chat with "how many people haven't RSVP'd?" uses snapshot pending count
- [ ] Caterer focus (`/chat/caterer`) system prompt includes meal aggregates when available
- [ ] Sync failure: home still renders; Sentry receives scrubbed error
- [ ] No token in network tab responses
- [ ] `DISABLE_AUTH=true` local dev: GET route works; cron route still requires secret

---

## Env vars to document

```
ZOLA_REFRESH_TOKEN=     # usr cookie JWT from zola.com (~1 year)
ZOLA_PROFILE_URL=         # https://www.zola.com/wedding/... or registry URL
CRON_SECRET=              # random string; protects cron + manual sync + CSV import
```

Chase already created Kelsie's Zola account. Token capture: sign in at zola.com → DevTools → Application → Cookies → copy `usr` value.

---

## Implementation notes

- **Simplicity first:** env-only token, no encryption layer unless needed.
- **Surgical changes:** match existing patterns (`wedding-state-updated` event, tool loop in chat route, Supabase service role).
- **Single-user app:** latest snapshot = `select * from zola_snapshots order by imported_at desc limit 1`.
- **Vercel serverless:** refresh Zola session token on each cron invocation (don't rely on in-memory cache across invocations).
- If zola-mcp code is adapted, credit in comment; keep dependency minimal (inline client preferred over npm dep if small).

---

## Success

Kelsie opens Rosie, sees RSVP and registry stats on the home briefing, asks Rosie about guest count and gets a real answer, taps **Open Zola →** to manage guests. She never knows a token exists. Chase sets env vars once and gets Sentry alerts if sync breaks.
