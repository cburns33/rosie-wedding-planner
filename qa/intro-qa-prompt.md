# QA task — Rosie intro + aesthetic personalization

You are a QA agent testing the Wedding Planner Agent (Rosie) app locally.

**Read first (in order):**
1. `qa/README.md` — environment, reset, shipped first-visit flow
2. `prd/intro-aesthetic-build-prompt.md` — **Shipped behavior** section (authoritative when it differs from older spec text)
3. `lib/intro.ts` — exact Beat 1 copy (`introOpeningMessage()`)

Use **Playwright MCP** as your primary browser **for full pass only**. For lean pass, browser MCP at 8 checkpoints only. Use **Cursor Browser** when a lean checkpoint fails and you need a screenshot for the issue log.

If implementation differs from this prompt or the PRD body, note the gap as an issue. Do not fail silently.

**Pass mode (pick one):**

| Mode | When to use |
|------|-------------|
| **Lean pass** (default for routine regression) | After small fixes, usage-sensitive cycles. API/curl for chat + state; **8 browser snapshots total**. |
| **Full pass** | Milestone sign-off, first run after large intro changes, or when lean pass fails. See Phase 1 below. |

If Chase does not specify, use **lean pass**.

---

## Environment (verify before starting)

| Item | Value |
|------|--------|
| App URL | http://localhost:3000 |
| Auth bypass | `DISABLE_AUTH=true` in `.env.local` (no magic link) |
| Dev server | Must already be running — do not start it unless it is down |
| Fresh state | Required for Phase 1 — run reset first (see below) |

**Reset before Phase 1:**

For a full clean slate (recommended for this pass):

```bash
node scripts/reset-fresh-except-zola.mjs
```

Clears intro/aesthetic, all chat threads, inspiration memory, vendor memory, and planning decisions. **Preserves Zola guest RSVP counts and `integrations.zola`.** Does not touch `zola_snapshots`.

Intro-only reset (keeps non-vibe decisions and vendor state):

```bash
node scripts/reset-intro.mjs
```

Alternative: run `qa/reset-intro.sql` in Supabase SQL editor (intro-only).

**Verify reset:**

```bash
curl -s http://localhost:3000/api/wedding-state
```

Expect: `intro_completed: false`, `aesthetic.introCompleted: false`, `aesthetic.style: null`, `decisions: []`. Zola guests block should still show RSVP counts if Zola was connected.

---

## Documentation rule

Maintain **`qa/intro-review.md`** throughout. After every meaningful step, append issues:

```
[STEP-XX] Short title
Severity: blocker | major | minor | polish
Area: intro | palette | home | chat | theme | edge-case
Steps: what you did
Expected: from shipped behavior / PRD
Actual: what happened
Screenshot: (path or "n/a")
```

Keep a running **Pass/Fail checklist** at the top of that file. Update it as you go.

At the end, add a **Prioritized summary**: blockers first, then major, minor, polish.

---

## Persona

Act as **Kelsie**, first-time user. Warm but busy. Not technical. Planning a spring 2027 Texas wedding (~250 guests). You have opinions but might skip steps or change your mind.

---

## Shipped first-visit flow (critical)

This order is **not** “home overlay first, then navigate to chat.”

1. Open **`/`** → **redirects to `/chat`** while `aesthetic.introCompleted === false`
2. **Beat 1** opening message on `/chat` (scripted; `lib/intro.ts` → `introOpeningMessage()`)
3. **Beats 2–4** — server-scripted forward questions + one-sentence LLM reflect (4 Kelsie replies)
4. **Beat 5a** — `PrimaryColorPickerCard` (pick 2 presets → **These are my picks**)
5. **Beat 5b** — `CoolorsHandoffCard` with 5-color starter URL; paste Coolors **Export → URL** in chat to auto-apply palette
6. **Beat 7** — Rosie wraps vibe arc, sets `aesthetic.introCompleted: true` + `"Vibe set: …"` decision (LLM turn; not scripted)
7. **Beat 8** — Rosie asks *"Great — ready to see your planning dashboard now?"* → Kelsie says yes → **`redirectTo: "/"`**
8. **`/`** loads planning home. **Welcome overlay** shows when `intro_completed === false` **and** vibe intro is done
9. Dismiss overlay (**Let's go**) → `POST /api/wedding-state/complete-intro` → scroll to `#up-next`; overlay must not return on reload

**Beat 1 must NOT mention** a gift from Chase. Engagement congrats **is** expected.

**Image attach:** paperclip on main `/chat` and `/chat/inspiration` only. Vendor focuses have no attach button.

**Visual Inspo Depot** (`/chat/inspiration`) is **not** part of the intro happy path. Do not upload screenshots during Phase 1 unless testing attach separately (E10).

---

## Phase 1 — Lean pass (recommended; ~half the tokens)

Use this instead of full Phase 1 for routine QA. Same Kelsie script and pass criteria; different **execution rules**.

### Lean rules (mandatory)

1. **Do not read** `prd/intro-aesthetic-build-prompt.md` unless a step fails and you need spec text.
2. **Do not** call `browser_snapshot` or `browser_take_screenshot` except at the **8 checkpoints** below.
3. **Do not** open Cursor Browser unless a checkpoint fails visual verification.
4. **Do not** run Phase 2 in the same session unless Chase asks.
5. **Chat + state via Shell**, not browser:
   - Reset: `node scripts/reset-fresh-except-zola.mjs`
   - State: `curl -s http://localhost:3000/api/wedding-state`
   - Messages: `POST http://localhost:3000/api/chat` with `Content-Type: application/json`
6. After each chat POST, inspect JSON only (`message`, `primaryColorPicker`, `coolorsHandoff`, `redirectTo`). Do not re-open the page to read the thread.
7. Log pass/fail in `qa/intro-review.md` in **short form** unless something fails (then use full issue template).

### Lean chat script (curl / Shell)

Run reset first (same as full pass). Then send these in order. Wait for each response before the next.

| # | Request body | Verify in response / API |
|---|--------------|--------------------------|
| L1 | `{ "message": "A friend's wedding — cocktail hour in a garden with string lights, everyone mingling." }` | `message` reflects + asks feeling |
| L2 | `{ "message": "The garden and the lighting. Romantic but relaxed." }` | asks structural inspo |
| L3 | `{ "message": "My cousin's vineyard wedding — I loved the long tables and outdoor ceremony." }` | asks borrow vs avoid |
| L4 | `{ "message": "I want long tables and outdoor ceremony. Not the super formal church part or heavy rustic decor." }` | `primaryColorPicker` non-null **or** BC3 confirms UI |
| L5 | `{ "message": "These are my picks", "primaryPicks": ["#c9a0a0", "#8faf8f"] }` | `coolorsHandoff.url` present (5-color Coolors URL) **or** BC3 confirms UI |
| L6 | `{ "message": "https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560" }` | curl state → `themeApplied: true`, 5 hex in `palette` |
| L7 | `{ "message": "Yes, that's exactly us." }` | dashboard handoff question in `message` |
| L8 | `{ "message": "Yes" }` | `redirectTo: "/"` **or** BC5 confirms home |

Example (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -ContentType "application/json" -Body '{"message":"..."}'
```

Adjust `primaryPicks` hex values if L4 used different presets in the UI path.

**API gates (curl, no browser):**

| After | Expect |
|-------|--------|
| L6 | `aesthetic.themeApplied === true` |
| L7–L8 | `aesthetic.introCompleted === true`, decision contains `Vibe set:` |
| Before BC5 | `intro_completed === false` (STEP-06) |

### 8 browser checkpoints only

Take **one** snapshot per checkpoint. No clicks between checkpoints except where noted.

| BC | When | Pass criteria |
|----|------|---------------|
| **BC1** | After reset, before L1 | Navigate `/` → lands on `/chat`; Beat 1 mentions vibe/moment; no gift-from-Chase |
| **BC2** | After L4 (if `primaryColorPicker` was null in JSON) | `PrimaryColorPickerCard` visible; else skip BC2 |
| **BC3** | After L5 (if `coolorsHandoff` was null in JSON) | `CoolorsHandoffCard` + **Open palette in Coolors**; else skip BC3 |
| **BC4** | After L8 | Planning home loads; **Welcome overlay** + **Let's go**; API still has `intro_completed: false` |
| **BC5** | Click **Let's go** | Overlay gone; `intro_completed: true` via curl |
| **BC6** | Hard reload `/` | Overlay **does not** return |
| **BC7** | Same page | **Your vibe** + **Latest decision** (`Vibe set:`) + **Up next** mention layout inspo |
| **BC8** | Navigate `/chat/photographer` | Vendor opener; **no** paperclip; **no** Beat 1 intro |

If L4/L5 JSON already proved picker + handoff, **skip BC2/BC3** and note "UI confirmed via API" in the review file.

**Lean pass complete when:** all L1–L8 succeed, BC1 + BC4–BC8 pass (BC2–BC3 as needed), API gates pass.

**Escalate to full pass if:** any chat POST 502, picker/handoff missing in both JSON and UI, overlay regression (BC4/BC6), or Beat 1 wrong after reset.

---

## Phase 1 — Full pass (Playwright MCP)

Use Kelsie's scripted replies below unless Rosie is clearly blocked. Log deviations in `qa/intro-review.md`. Check off each step in the review file checklist.

### A — Reset and entry

| Step | Action | Pass criteria |
|------|--------|---------------|
| A1 | Run `node scripts/reset-fresh-except-zola.mjs` | Script exits 0 |
| A2 | `GET /api/wedding-state` | `intro_completed: false`, `aesthetic.introCompleted: false`, `decisions: []` |
| A3 | Navigate to **`/`** | Redirects to **`/chat`** |
| A4 | Read Beat 1 message | Rosie intro + engagement congrats + vibe/moment question; **no** gift-from-Chase |

### B — Vibe arc (Beats 2–4)

Send each reply, wait for Rosie's response before continuing. Beats 2–4 use **scripted forward questions** in `lib/intro-script.ts`.

| Step | Kelsie sends | Pass criteria |
|------|--------------|---------------|
| B1 | *"A friend's wedding — cocktail hour in a garden with string lights, everyone mingling."* | Rosie reflects + asks about **feeling** (Beat 2) |
| B2 | *"The garden and the lighting. Romantic but relaxed."* | Rosie reflects + asks about **structural/layout inspo** (Beat 3) |
| B3 | *"My cousin's vineyard wedding — I loved the long tables and outdoor ceremony."* | Rosie reflects + asks **borrow vs avoid** (Beat 4) |
| B4 | *"I want long tables and outdoor ceremony. Not the super formal church part or heavy rustic decor."* | Rosie reflects + introduces colors; **`PrimaryColorPickerCard`** appears |

**Timing:** Expect ~4 user turns before the color picker. Flag as **major** if palette UI has not appeared after B4 and one follow-up wait (60s).

### C — Color (Beats 5a → 5b)

| Step | Action | Pass criteria |
|------|--------|---------------|
| C1 | In **`PrimaryColorPickerCard`**, tap **two** preset swatches, click **These are my picks** | Picker confirms; card may dismiss |
| C2 | Confirm **`CoolorsHandoffCard`** visible | **Open palette in Coolors** link; copy mentions lock / spacebar / Export → URL |
| C3 | Paste in chat: `https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560` | Rosie acknowledges; palette auto-applies |
| C4 | `GET /api/wedding-state` | `aesthetic.themeApplied: true`, `palette` has 5 hex values |
| C5 | Visual check (Cursor Browser if needed) | Send button / link accents shift toward new palette (subtle OK) |

Optional: open Coolors via the card, lock/shuffle, paste a different Export → URL instead of C3. Same pass criteria.

### D — Wrap-up and dashboard handoff (Beats 7–8)

| Step | Action | Pass criteria |
|------|--------|---------------|
| D1 | After Coolors paste, read Beat 7 reply | 2–3 line vibe summary + short check-in; **`aesthetic.introCompleted: true`** via API |
| D2 | Reply: *"Yes, that's exactly us."* | Rosie asks dashboard handoff (Beat 8): *ready to see your planning dashboard now?* |
| D3 | Reply: *"Yes"* | **`redirectTo: "/"`** or lands on planning home (no redirect back to `/chat`) |
| D4 | `GET /api/wedding-state` **before** overlay dismiss | `intro_completed: false` (chat must **not** have set this flag) |

### E — Welcome overlay (STEP-06 regression)

| Step | Action | Pass criteria |
|------|--------|---------------|
| E1 | On first home load after intro | **Welcome overlay** visible (trimmed copy + **Let's go**) |
| E2 | Click **Let's go** | Overlay fades; page scrolls toward **Up next** |
| E3 | `GET /api/wedding-state` | `intro_completed: true` |
| E4 | Hard reload **`/`** | Overlay **does not** reappear |

Fail E1 if overlay missing while D4 showed `intro_completed: false` and `introCompleted: true` — log as **major** (STEP-06).

### F — Home content

| Step | Action | Pass criteria |
|------|--------|---------------|
| F1 | **Your vibe** card | Quoted headline (feeling/moment), **Inspired by**, **Details** chips (borrow), 5 swatches, **Skipping** chips if avoid was captured |
| F2 | **Latest decision** | Shows *"Vibe set: …"* (not "Nothing decided yet") |
| F3 | **Visual Inspo Depot** card | Renders (empty state OK after fresh reset) |
| F4 | **Up next** | References layout inspo (long tables / outdoor ceremony) while venue undecided |
| F5 | **Guests & registry** (if Zola connected) | RSVP counts still present (preserved by reset script) |

### G — Vendor focus sanity check

| Step | Action | Pass criteria |
|------|--------|---------------|
| G1 | Open **`/chat/photographer`** | Vendor header + generic opener |
| G2 | Inspect composer | **No** paperclip / image attach |
| G3 | Confirm | **No** Beat 1 intro rerun |

---

**Phase 1 complete when** A1–G3 pass (full pass) or lean L1–L8 + BC1 + BC4–BC8 pass (lean pass). Update the Pass/Fail checklist at the top of `qa/intro-review.md`.

---

## Phase 2 — Edge cases (adversarial)

Reset is **not** required between every test, but note when state may contaminate the next test.

| # | Scenario | What to try |
|---|----------|-------------|
| E1 | Skip vibe | On Beat 1, reply: *"Skip this — I need to find a venue now"* |
| E2 | Mid-intro pivot | Answer Beat 2, then ask about budget instead of continuing |
| E3 | No structural inspo | Say *"No, nothing comes to mind"* at Beat 3 |
| E4 | Skip Coolors handoff | When handoff card appears, navigate to `/` without pasting URL; return to `/chat` |
| E5 | Coolors URL | Paste `https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560` in chat (auto-applies palette) |
| E6 | Double paste | Paste the same Coolors URL twice in quick succession |
| E7 | Refresh mid-intro | Refresh `/chat` mid-conversation; check state recovery |
| E8 | Mobile width | Resize browser ~390px; repeat redirect + primary picker / Coolors handoff |
| E9 | Home before vibe done | With intro incomplete, `/` should redirect to `/chat` (no home overlay yet) |
| E10 | Image upload | On main `/chat`, attach 1 inspiration screenshot via paperclip; confirm Rosie responds |

For qualitative feel (Rosie tone, intro length, picker UX), add bullets under **Qualitative notes** in the review file. Use Cursor Browser for visuals.

---

## Phase 3 — API / state spot checks

When possible (`GET /api/wedding-state` or network tab):

| Check | Expected |
|-------|----------|
| After Beat 7 / intro wrap | `aesthetic.introCompleted === true`, `decisions` includes `"Vibe set: …"` |
| Aesthetic capture | `style`, `borrow`, `avoid`, `layout`, `inspiration.*` populated |
| After Coolors URL paste | `aesthetic.themeApplied === true`, `palette` has 5 hex values |
| Before overlay dismiss | `intro_completed === false` (chat tools must not set this) |
| After **Let's go** | `intro_completed === true` |
| Zola (if connected) | `guests.rsvp*` counts preserved after fresh reset |
| Messages | Main thread persisted in Supabase (note if reset cleared 0 — STEP-11) |

If you cannot inspect API directly, infer from UI and note the limitation.

---

## Constraints

- Do not modify application code unless a blocker prevents all testing (then fix minimally and document)
- Do not commit unless asked
- Do not use Pinterest URLs (out of scope); screenshots only when logging a failed checkpoint
- Do not expect welcome overlay before vibe intro completes
- Do not upload images during Phase 1 happy path (use E10 for attach testing)
- **Lean pass:** max 8 browser snapshots; no PRD read; no Phase 2 in the same session

### Stop and report (do not keep testing)

If any **foundational** check fails, **stop Phase 1/2**, log one blocker issue in `qa/intro-review.md`, and **report back to Chase immediately**. Do not loop on retries, resets, or workarounds unless the failure is clearly transient (single timeout).

Foundational failures include:

- Dev server down or `/` and `/chat` not loading (5xx, blank app, compile error)
- Reset script fails or `GET /api/wedding-state` unreachable
- Auth/env broken (`DISABLE_AUTH` not working when expected)
- `/` does not redirect to `/chat` on fresh reset state
- Beat 1 never appears after reset + navigate
- Chat POST fails on every message (API/Anthropic error)

**After reporting:** wait for direction. You may note what you verified before the break, but do not continue the happy path on a broken base.

Minor/flaky issues (one slow reply, subtle accent change): keep going and log as major/minor.

---

## Output when done

1. Final **`qa/intro-review.md`** with checklist, all issues, qualitative notes, prioritized summary
2. Chat summary: blocker count, ship/no-ship recommendation
3. List any PRD items that appear unimplemented or diverge from **Shipped behavior**
