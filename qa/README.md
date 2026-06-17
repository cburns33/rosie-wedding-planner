# QA — intro + aesthetic personalization

Reference spec: [`prd/intro-aesthetic-build-prompt.md`](../prd/intro-aesthetic-build-prompt.md) (see **Shipped behavior** section for current product truth).

Working review file: [`qa/intro-review.md`](./intro-review.md)

**QA agent prompt:** [`qa/intro-qa-prompt.md`](./intro-qa-prompt.md) — use **lean pass** for routine regression (API-first, 8 browser checkpoints); **full pass** for milestone sign-off.

## Environment

| Item | Value |
|------|--------|
| App URL | http://localhost:3000 |
| Auth bypass (local) | `DISABLE_AUTH=true` in `.env.local` |
| Dev server | Must already be running (`npm run dev`) |

## Reset before a walkthrough

Clears main-thread chat, intro flags, and aesthetic fields. Preserves budget, vendors, location, Zola data, and non-vibe decisions.

**Option A — Node (recommended):**

```bash
node scripts/reset-intro.mjs
```

**Option B — Supabase SQL editor:**

Run [`qa/reset-intro.sql`](./reset-intro.sql)

**Verify reset:**

```bash
curl -s http://localhost:3000/api/wedding-state
```

Expect `intro_completed: false`, `aesthetic.introCompleted: false`, `aesthetic.style: null`.

## First-visit flow (as shipped)

Order matters for happy-path QA:

1. Open **`/`** → server redirects to **`/chat`** while `aesthetic.introCompleted === false`.
2. **Beat 1** opening message appears (scripted; see `lib/intro.ts` → `introOpeningMessage()`).
3. Complete vibe arc in chat (one Rosie question per turn, primary color picker → Coolors handoff). Beat 8 asks if Kelsie is ready for the planning dashboard; yes → `/`.
4. After Rosie sets `aesthetic.introCompleted: true`, **`/`** loads the planning home.
5. **Welcome overlay** appears on home only when `intro_completed === false` **and** vibe intro is already done. Dismiss → scroll to `#up-next`.
6. Home shows **Your vibe** (categorized sections), **Latest decision** (expect "Vibe set: …" after intro), **Visual Inspo Depot** summary card, personalized **Up next** (layout-aware when venue not booked).

**Visual Inspo Depot:** Ongoing Pinterest/mood screenshots go to **`/chat/inspiration`**, not the intro arc. Images are not stored; Rosie writes markdown to `inspiration_memory`. Home card refetches via `GET /api/inspiration-memory` (counts dated `- (YYYY-MM-DD)` observation bullets only).

**Your vibe card (as shipped):** Quoted headline from feeling + moment answers, muted moment line when longer, **Inspired by** (structural), **Details** chips (borrow), 5 palette swatches, **Skipping** chips (avoid). Copy logic in `lib/vibe-display.ts`.

**Not expected:** Welcome overlay on first load before chat intro. **Not expected:** Gift-from-Chase mention in intro copy (engagement congrats is OK).

## Image upload

Main `/chat` and **`/chat/inspiration`**: paperclip attach button, max 5 images (jpeg/png/webp, 5 MB each). Sent as base64 in `POST /api/chat`. Vendor focus threads have no attach button. Inspo images are analyzed in the turn only; nothing is stored as a file.

## Color step (local QA shortcut)

Skip intro beats 1–4 and surface the primary color picker:

```bash
node scripts/seed-primary-picker.mjs
```

Then open `/chat`. After picking two colors, expect `CoolorsHandoffCard` and a 5-color Coolors URL (not 2-color only).

## Backfill vibe display (existing sessions)

If home still shows old mashup copy after a code update:

```bash
node scripts/backfill-vibe-display.mjs
```

Hard refresh `/` after running.

## API spot checks

| Endpoint | Use |
|----------|-----|
| `GET /api/wedding-state` | Full `WeddingState` JSON |
| `GET /api/inspiration-memory` | Visual Inspo Depot card summary (`observationCount`, `latestPreview`) |
| `POST /api/wedding-state/apply-palette` | Body `{ "palette": ["#...", ...] }` (5 hex colors); also used internally when Coolors URL is pasted in chat |
| `POST /api/wedding-state/primary-picks` | Body `{ "picks": ["#...", "#..."] }` (optional; chat POST `primaryPicks` is preferred) |
| `POST /api/wedding-state/complete-intro` | Marks home welcome overlay dismissed |

After Coolors URL paste or palette apply: `aesthetic.themeApplied === true` and accent CSS vars update via `ThemeProvider`.

## Phase 1 checklist mapping

If a test plan says “welcome overlay on `/` first, then navigate to `/chat`”, that is **stale**. Use the flow above. See updated checklist in [`qa/intro-review.md`](./intro-review.md).
