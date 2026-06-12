# PRD — Zola integration (Rosie as planning companion, not Zola clone)

Status: Draft (planning session, 2026-06-11)  
Owner: Chase (for Kelsie)  
Depends on: existing `wedding_state`, vendor focuses, chat tools  
Production: https://rosie-wedding-planner.vercel.app

---

## Decisions (locked)

| # | Question | Decision |
| --- | --- | --- |
| 1 | Who chooses integration approach? | **Chase decides.** Kelsie is non-technical; she should never see DevTools, tokens, CSV uploads, or "connect your account" flows unless unavoidable. |
| 2 | Unofficial Zola mobile API? | **Yes, use it.** Read-only sync via `mobile-api.zola.com` is the primary data path. ToS/breakage risk accepted by Chase for a personal gift app. |
| 3 | Who configures the connection? | **Chase**, before or after Kelsie creates her Zola account: paste refresh token into Vercel env (`ZOLA_REFRESH_TOKEN`), run first sync, store profile URL in `wedding_state`. No in-app connect UI for Kelsie in v1. |
| 4 | CSV import? | **Chase-only fallback** when API sync breaks or before Zola account exists. Not exposed in Kelsie's UI unless sync has been down for 7+ days (then a simple "Ask Chase to refresh" message, not a file picker). |
| 5 | Assume Zola usage? | **Yes.** Kelsie will use Zola for guests, RSVPs, registry, and budget. Rosie links out; does not ask "Are you on Zola?" |
| 6 | Auto-reconcile counts? | **Yes, silently.** When Zola snapshot updates, write RSVP aggregates to `wedding_state.guests` without prompting Kelsie. Log a `decisions[]` entry only when the delta is large (>10% invited count change). |
| 7 | Write back to Zola? | **No** in v1. Read-only API only. |
| 8 | Meal-level detail for caterer? | **Yes, aggregates from API/CSV** (choice counts, dietary tags). No full guest-name lists in chat prompts. |

---

## Problem

Rosie is useful for decisions, vendor focus chats, and a scannable briefing, but Kelsie will almost certainly run day-to-day wedding ops in **Zola** (guest list, RSVPs, registry, budget tracker, website, seating chart). Without a bridge, Rosie becomes a side app she opens occasionally while the live plan lives elsewhere.

**Goal:** Make Rosie feel connected to Kelsie's real Zola profile so she keeps coming back, without rebuilding Zola inside Rosie.

---

## Product thesis

| System | Role |
|--------|------|
| **Zola** | System of record for guests, RSVPs, registry, website, seating, Zola-native budget line items, vendor marketplace inquiries |
| **Rosie** | AI planning companion: decisions, vendor deep-dives, "what should I do next?", reconciling facts, surfacing gaps, linking out to Zola for operational tasks |

Rosie should **read context from Zola** (and optionally accept manual exports) so answers like "How many people haven't RSVP'd?" or "Do we have enough registry left for the apartment fund?" are grounded in reality. Rosie should **not** replace Zola's guest manager, seating UI, registry builder, or wedding website.

---

## What Zola offers (relevant to integration)

Zola couples typically use:

- **Guest list + RSVPs** (exportable CSV from desktop: full list, addresses, RSVP + meal choices)
- **Registry + gift tracker** (gifts received, thank-you status; embeddable widget for external sites)
- **Budget tracker** (category line items, payment reminders; integrates with Zola-booked vendors)
- **Wedding website** (public URL, registry slug)
- **Seating chart** (drag-and-drop, PDF export)
- **Vendor inquiries** (messages with Zola marketplace vendors)
- **Checklist / countdown** (phased planning tasks)

**Official integration surface for third parties:** essentially the **registry embed widget** (`widget.zola.com`) for public registry display. Zola does **not** publish a supported couple-facing API.

**Unofficial path:** community projects (e.g. [zola-mcp](https://github.com/chrischall/zola-mcp)) call Zola's **mobile API** (`mobile-api.zola.com`) with the account's refresh token (the `usr` cookie JWT). This is personal automation, not endorsed by Zola, and may break or conflict with [Zola's Terms of Use](https://www.zola.com/terms) (scraping / unauthorized access clauses). Zola's ToU also states the account holder is responsible for actions by an "Authorized Agent."

**Vendor-side EDI** (Pipe17, Fulfil, etc.) is irrelevant; that is for brands fulfilling registry orders, not couples.

---

## Integration tiers (explored)

| Tier | What it means | Pros | Cons |
|------|---------------|------|------|
| **0 — Zola-aware** | Store profile/registry URL; Rosie prompt knows Zola is SoR; deep links | Zero risk, fast | No live data; manual updates |
| **1 — Manual import** | Kelsie uploads Zola CSV exports; Rosie parses snapshots | Official export path; no auth secrets | Stale until re-upload; desktop-only export on Zola side |
| **2 — Read-only API sync** | Server holds refresh token; periodic pull of RSVP/budget/registry summaries | Fresh data; powers home cards + chat tools | Unofficial API; token custody; breakage risk; ToS gray area |
| **3 — Write-through** | Rosie chat can add guests, update budget in Zola (with confirm) | Less double-entry | Highest risk; needs confirmation UX; out of scope for v1 |
| **4 — Full clone** | Guest/seating/registry UI in Rosie | — | Wrong product; explicitly rejected |

**Recommendation:** Ship **Tier 0 + Tier 2 (read-only API sync)** as the core product. Tier 1 (CSV) exists for Chase maintenance only. Tier 3 (write-through) stays out of scope.

---

## User stories

### Kelsie-facing (must have)

1. **As Kelsie**, I open the planning home and see live RSVP progress (attending / pending / declined) pulled from our Zola account without doing anything.
2. **As Kelsie**, I see registry thank-you status at a glance ("8 gifts to thank") on the home briefing.
3. **As Kelsie**, when I ask "who hasn't RSVP'd yet?" or "how's the guest count looking?", Rosie answers from Zola data, in plain language, not "go upload a file."
4. **As Kelsie**, when I ask "where do I manage RSVPs?" or "update the registry", Rosie links me to Zola (not a Rosie screen).
5. **As Kelsie**, in **your caterer focus**, Rosie references meal counts and headcount from Zola when we talk final numbers.
6. **As Kelsie**, I tap **Open Zola →** on the home card when I need to do something operational (add a guest, send invites, mark a gift thanked).
7. **As Kelsie**, if Zola data is temporarily unavailable, Rosie still works and says something warm like "I'm a little out of date on RSVPs — Chase is on it" (not technical error copy).

### Chase-facing (maintenance)

8. **As Chase**, I set `ZOLA_REFRESH_TOKEN` in Vercel env and the app syncs automatically on a schedule.
9. **As Chase**, I get a Sentry alert when sync fails (401, parse error, API shape change) so I can refresh the token or patch the client.
10. **As Chase**, I can POST a CSV to a server route (or run a one-off script) to backfill snapshots if the API is down during RSVP crunch time.
11. **As Chase**, I set the Zola profile/registry URL once in env or via a direct DB/API patch so deep links work before Kelsie asks.

### Explicit non-goals (see Out of scope)

- Managing guest list, seating, or registry inside Rosie
- Replacing Zola website or invitation ordering
- Searching Zola's vendor directory from Rosie (Rosie's vendor work stays in focus chats + `wedding_state`)

---

## UX

### Kelsie sees: zero setup

No settings page, no file uploads, no OAuth, no token paste. Integration is invisible; data just appears once Chase has configured the backend.

### Planning home — **Guests & registry** card (Zola-powered)

Placement: among the three summary cards or as a fourth scannable card (not buried in The details).

**Healthy state (sync working)**

- **RSVPs:** "142 yes · 108 waiting · 18 no" (or similar warm copy)
- **Registry:** "24 gifts · 3 to thank" (when API provides gift tracker)
- **Open Zola →** (external link to profile URL)
- No "last synced" timestamp visible to Kelsie (internal only)

**Degraded state (sync stale or failed)**

- Show last known snapshot with subtle "as of [date]" if data is >48h old
- Copy: "RSVP numbers may be a touch behind — I'll catch up soon." (no mention of tokens, API, or Chase unless sync down >7 days)
- **Open Zola →** still works

**Pre-Zola account (before Kelsie creates Zola)**

- Card hidden or shows placeholder: "Guest list lives on Zola — we'll hook up when yours is ready."
- Rosie planning works unchanged

**Do not show Kelsie:** Connect buttons, import UI, sync now, dismissed toggles, error codes, DevTools instructions.

### Chase setup (document in `SETUP.md`, not in app UI)

1. Kelsie (or Chase) creates Zola account; note wedding website URL.
2. Chase signs into zola.com, copies `usr` cookie from DevTools (same as [zola-mcp](https://github.com/chrischall/zola-mcp#getting-your-refresh-token)).
3. Chase sets Vercel env:
   - `ZOLA_REFRESH_TOKEN` — refresh JWT (~1 year)
   - `ZOLA_TOKEN_ENCRYPTION_KEY` — if storing encrypted copy in Supabase (optional if env-only)
   - `ZOLA_PROFILE_URL` — optional; can also seed `wedding_state.integrations.zola.profileUrl`
4. Deploy → cron runs first sync → home card populates.
5. **Annual maintenance:** refresh token before expiry; Sentry alert on 401.

Optional: store token in `integration_secrets` table encrypted, **or** read only from `ZOLA_REFRESH_TOKEN` env on each cron (simpler for single-user gift; env rotation = redeploy).

### Chat behavior

- Rosie always treats Zola snapshot as authoritative when present and recent (<48h).
- Phrasing: "From your Zola guest list…" not "from your CSV export" or "API sync."
- Operational handoffs link to Zola directly; Rosie does not explain how to export spreadsheets.
- Caterer focus: prompt injection block with meal aggregates from snapshot.
- If no snapshot yet: Rosie uses `wedding_state` estimates and avoids pretending to know RSVP details.

### Registry embed (optional Phase 2b)

If registry slug is known, planning home could show Zola's **official embed widget** in a collapsible section ("Your registry on Zola"). This is read-only public data, no auth. Low priority; link-out may be enough.

---

## Data model

### Extend `WeddingState` (`lib/types.ts`)

```typescript
integrations: {
  zola: {
    enabled: boolean;              // user opted in
    dismissed: boolean;            // "not using Zola"
    profileUrl: string | null;
    registrySlug: string | null;   // parsed from URL
    syncMethod: "none" | "csv" | "api";
    lastSyncAt: string | null;     // ISO
    lastImportFileName: string | null;
    apiConnected: boolean;         // Phase 3
    tokenExpiresHint: string | null; // optional metadata, not the token
  };
};
```

### New table: `zola_snapshots` (recommended over bloating `wedding_state`)

Keeps PII and large payloads out of the hot row Rosie edits every chat turn.

```sql
create table zola_snapshots (
  id            bigserial primary key,
  imported_at   timestamptz not null default now(),
  source        text not null,  -- 'csv_rsvp' | 'csv_guests' | 'api_sync'
  data          jsonb not null, -- normalized snapshot (see shape below)
  raw_file_hash text            -- dedupe identical re-uploads
);

create index zola_snapshots_imported_at_idx on zola_snapshots (imported_at desc);
```

**Latest snapshot** = most recent row (single-user app; no `user_id` needed unless auth expands).

### Normalized snapshot shape (`data` jsonb)

```typescript
interface ZolaSnapshot {
  summary: {
    invited: number;
    attending: number;
    declined: number;
    pending: number;
    households: number;
  };
  events?: Array<{
    name: string;
    attending: number;
    declined: number;
    pending: number;
  }>;
  meals?: {
    // aggregate meal choice counts for caterer focus
    choices: Record<string, number>;
    dietaryNotes?: string[]; // aggregated tags if present in export
  };
  registry?: {
    giftsReceived: number;
    thankYouPending: number;
    fundsReceived?: number; // if parseable from API
  };
  budget?: {
    plannedTotal: number;
    spentTotal: number;
    categoryCount: number;
  };
  syncedAt: string;
}
```

**Do not store** full guest names/addresses in snapshots unless a future story requires it; prefer aggregates for chat prompt injection. If full rows are stored for caterer meal export, treat as sensitive: no Sentry logging, scrub in API errors.

### Encrypted credentials (Phase 3 only)

```sql
create table integration_secrets (
  provider      text primary key,  -- 'zola'
  encrypted_token bytea not null,
  updated_at    timestamptz not null default now()
);
```

Encrypt at rest with server key (`ZOLA_TOKEN_ENCRYPTION_KEY` env). Never return to client. Rotate if leaked.

### Reconciliation with existing `wedding_state`

| Zola snapshot field | Rosie field | Rule |
|---------------------|-------------|------|
| `summary.invited` | `guests.finalCount` | Auto-update on sync; log `decisions[]` if >10% change from prior |
| `summary.attending` | `guests.rsvpAttending` | Auto-update every sync |
| `summary.pending` / `declined` | `guests.rsvpPending` / `rsvpDeclined` | Auto-update every sync |
| Budget spent | `budget.zolaSpent` (new optional field) or `budget.notes[]` | Append on first sync; update on subsequent |
| Booked vendors (API) | `vendors.*.status` | **Never auto-book**; Rosie may mention in chat only |

Suggested optional additions to `guests`:

```typescript
guests: {
  estimated: string;
  finalCount: number | null;
  rsvpAttending: number | null;
  rsvpPending: number | null;
  rsvpDeclined: number | null;
  lastZolaImportAt: string | null;
};
```

---

## Routes & API

| Route | Method | Purpose | Phase |
|-------|--------|---------|-------|
| `/api/integrations/zola` | GET | Latest snapshot summary for home card (aggregates only, no PII) | 1 |
| `/api/integrations/zola/sync` | POST | On-demand API pull (Chase only: protect with `CRON_SECRET` or same auth) | 1 |
| `/api/integrations/zola/import` | POST | multipart CSV → parse → snapshot (Chase maintenance; not linked in UI) | 2 |
| `/api/cron/zola-sync` | GET | Scheduled pull (Vercel Cron + `CRON_SECRET`) | 1 |

No `/settings/integrations` page in v1. Profile URL seeded via env (`ZOLA_PROFILE_URL`) or one-time PATCH if Chase adds a hidden admin route later.

Auth: Kelsie-facing GET is same magic-link middleware. Sync/import/cron routes require `CRON_SECRET` header or service-only access.

### Chat tools (new)

| Tool | Phase | Purpose |
|------|-------|---------|
| `get_zola_summary` | 1+ | Read latest snapshot aggregates for Rosie mid-conversation |
| `sync_zola_snapshot` | 1 | Server-triggered on cron; optionally callable in tool loop if data stale mid-chat |
| `reconcile_guest_counts` | 1 | After sync, auto-write RSVP aggregates to `wedding_state.guests` (no user prompt) |

Inject into `buildSystemPrompt`: block with Zola summary if `integrations.zola.enabled` and snapshot exists (aggregates only).

**Principle unchanged:** conversations scoped; facts global. Zola data feeds facts and prompt context, not separate threads.

### Background sync (core, not optional)

Vercel Cron → `GET /api/cron/zola-sync` every **6 hours** (adjust if rate limits appear). On success: new `zola_snapshots` row, auto-reconcile `wedding_state.guests`, dispatch `zola-snapshot-updated` for home refetch (alongside existing `wedding-state-updated`).

First deploy with valid token should run sync immediately (cron or post-deploy hook).

---

## CSV import — parsing requirements (Chase fallback only)

Support Zola desktop exports documented in their FAQ:

1. **RSVP export** — attending/declined/pending, per-event if columns present, meal selections
2. **Guest list export** — household/group counts, invitation count

**Acceptance for parser:**

- Detect encoding UTF-8; reject with friendly error if not CSV
- Map Zola column headers flexibly (document expected headers from a sample export Chase captures once during development)
- Idempotent: re-upload replaces logical "current" snapshot (new row, latest wins)
- Return parse preview before commit (optional two-step POST)

**Edge cases:**

- Empty file, header-only, wrong export type → "This looks like an address list, not RSVPs. Try Track RSVPs → Export."
- Zola template changes → parser version field in snapshot; Sentry alert on parse failure rate

---

## Zola API client (core — Phase 1)

Implementation notes for build session:

- **Prefer vendoring or adapting** [zola-mcp](https://github.com/chrischall/zola-mcp) read-only client (`lib/zola/client.ts`) rather than reinventing auth. MIT license; review before ship.
- Read-only endpoints to implement first:
  - `track_rsvps` / `list_events` → RSVP summary + per-event counts
  - `get_gift_tracker` → gifts received, thank-you pending
  - `get_budget` → planned vs spent totals (surface on home if useful; lower priority than RSVPs)
  - `get_wedding_dashboard` → optional single-call bootstrap
- Session refresh: `POST /v3/sessions/refresh` with `ZOLA_REFRESH_TOKEN` → 30-min bearer + `x-zola-session-id`; refresh per cron invocation (serverless-safe).
- Map all responses → `ZolaSnapshot` normalization layer (isolates Zola API churn from Rosie UI).
- Token source: **`ZOLA_REFRESH_TOKEN` env var** on Vercel (simplest). Optional encrypted copy in `integration_secrets` if env rotation without redeploy is desired later.
- No in-app consent UI; Chase accepts ToS risk during setup. No "official Zola integration" marketing.

**Do not implement in Rosie:** vendor directory search, `add_guest`, `assign_seat`, `update_budget_item`, or any write tool from zola-mcp.

---

## Acceptance criteria

### Phase 1 — API sync + home card (ship together)

- [ ] With `ZOLA_REFRESH_TOKEN` set, cron sync populates `zola_snapshots` within first deploy cycle
- [ ] Planning home shows RSVP counts and **Open Zola →** with zero Kelsie setup
- [ ] Registry thank-you count shown when gift tracker data available
- [ ] `GET /api/integrations/zola` returns aggregates only (no token, no guest names)
- [ ] Rosie system prompt includes Zola summary block when snapshot exists
- [ ] "Who hasn't RSVP'd?" answered with pending count from snapshot (aggregate; offer Zola link for names)
- [ ] Caterer focus prompt includes meal aggregates when API provides them
- [ ] Auto-reconcile writes `guests.rsvpAttending` / `rsvpPending` / `rsvpDeclined` after each sync
- [ ] Sync failure: home shows last known data + soft degraded copy; chat still works; Sentry alert fires
- [ ] Token never in client responses, logs, or Sentry payloads

### Phase 2 — CSV fallback (Chase only)

- [ ] `POST /api/integrations/zola/import` accepts RSVP CSV with `CRON_SECRET` (or local dev only)
- [ ] Parser produces same `ZolaSnapshot` shape as API path
- [ ] Not linked anywhere in Kelsie-facing UI

### Phase 2b — Budget on home (if time)

- [ ] Zola spent vs planned totals on home or budget summary card
- [ ] Optional note in `budget.notes` when Zola spent diverges from Rosie allocations by >15%

---

## Edge cases & failure modes

| Scenario | Behavior |
|----------|----------|
| Kelsie hasn't created Zola yet | Card hidden or placeholder; Chase sets token when ready |
| Hank manages Zola account | Chase uses shared login for token capture; Kelsie still sees data in Rosie |
| Rosie guest estimate ≠ Zola invited count | Auto-update counts from Zola; log `decisions[]` if delta >10% |
| Stale snapshot (>48h) | Soft "as of [date]" on home; Rosie still cites with date qualifier |
| Stale snapshot (>7 days) | Sentry alert to Chase; Kelsie sees "may be a touch behind" copy |
| CSV uploaded from wrong wedding | Hash + count sanity check; warn if invited < 10 or > 500 |
| Zola API changes | Sync fails closed; Sentry alert; read-only mode until fix |
| Token revoked (~1 year) | Sentry alert; Chase refreshes env var; Kelsie sees degraded copy until fixed |
| PII in prompts | Prefer aggregates; if meal details needed, cap rows injected |
| Concurrent chat + import | Import completes; next chat turn sees new snapshot (re-fetch in API route) |
| `DISABLE_AUTH` local dev | Integrations routes follow same auth bypass rules as today |

---

## Security & privacy

- Single-user gift app, but treat guest data as sensitive
- Extend `lib/sentry-scrub.ts` for integration routes (CSV body, tokens, snapshot payloads)
- No session replay (already off)
- Tokens only on server; encryption key in Vercel env
- Kelsie never manages tokens or uploads; Chase owns credential rotation (document in `SETUP.md`)

---

## Metrics (informal — no analytics required)

For Chase maintenance only:

- Last successful import/sync date (shown in UI)
- Sentry: parse failures, API 401/403 rates
- Qualitative: does Kelsie re-open Rosie weekly during RSVP season?

---

## Implementation phasing

| Phase | Scope | Effort (rough) |
|-------|--------|----------------|
| **1** | Read-only Zola API client, cron sync, `zola_snapshots`, home card, prompt + chat tools, auto-reconcile | Medium |
| **2** | CSV import route (Chase fallback only) | Small |
| **2b** | Zola budget totals on home | Small |
| **3** | Registry embed widget (optional; link-out may suffice) | Small |

**Build order:** Phase 1 as a single ship. Phase 2 in same PR or immediately after for Chase ops safety.

---

## Out of scope

- Guest list CRUD, seating chart UI, or RSVP collection inside Rosie
- Registry creation, gift fulfillment, or thank-you letter sending from Rosie
- Zola wedding website builder or invitation/print ordering
- Bidirectional write to Zola (add guest, change budget, assign seats) in v1
- Zola vendor marketplace search/replace Rosie's vendor focus workflow
- Integrations with The Knot, WithJoy, Google Sheets, or Apple Notes
- Multi-couple / SaaS onboarding (remains single-user gift)
- Claiming official partnership with Zola
- Scraping other couples' public Zola pages
- Real-time webhooks from Zola (not available)
- Replacing Zola checklist with Rosie task engine (future PRD if needed)

---

## Assumptions (Chase-owned — no Kelsie input required)

1. Kelsie will create a Zola account for guests, RSVPs, registry, website, and budget (standard Zola couple stack).
2. Chase captures the refresh token once Kelsie's Zola site exists (or uses a shared Chase/Kelsie staging account during dev).
3. Hank may co-manage Zola; one token on the shared couple account is enough.
4. Meal aggregates for caterer focus are worth pulling; individual guest names stay in Zola unless Kelsie explicitly asks Rosie to help with a specific name (then link to Zola).

---

## New env vars (add to `SETUP.md`)

| Variable | Required | Notes |
|----------|----------|-------|
| `ZOLA_REFRESH_TOKEN` | Yes (when Zola exists) | `usr` cookie JWT from zola.com; ~1 year lifetime |
| `ZOLA_PROFILE_URL` | Recommended | Deep link for **Open Zola →** |
| `CRON_SECRET` | Yes | Protects `/api/cron/zola-sync` |
| `ZOLA_TOKEN_ENCRYPTION_KEY` | Optional | Only if storing token in Supabase, not env-only |

---

## Files likely touched (build session reference)

```
app/api/integrations/zola/route.ts       # new (GET summary for home)
app/api/integrations/zola/import/route.ts
app/api/integrations/zola/sync/route.ts  # Phase 3
app/api/cron/zola-sync/route.ts          # Phase 3
components/ZolaIntegrationCard.tsx       # new
components/PlanningHome.tsx                # embed card
lib/types.ts                               # integrations + guests fields
lib/zola/parse-csv.ts                      # new
lib/zola/normalize.ts                      # new
lib/zola/client.ts                         # Phase 3, read-only
lib/system-prompt.ts                       # Zola context block + tools
supabase/schema.sql                        # zola_snapshots, integration_secrets
lib/sentry-scrub.ts                        # scrub integration payloads
```

---

## Success definition

Kelsie uses Zola for operations and Rosie for thinking. She never configures anything. After Chase drops a token in Vercel, she opens Rosie during RSVP season and sees **live guest and registry stats**, gets caterer-ready meal summaries in vendor focus, and taps **Open Zola →** when she needs to act. Rosie stays the warm planning brain; Zola stays the wedding OS.
