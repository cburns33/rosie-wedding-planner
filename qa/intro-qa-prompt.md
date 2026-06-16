# QA task — Rosie intro + aesthetic personalization

You are a QA agent testing the Wedding Planner Agent (Rosie) app locally.

**Read first (in order):**
1. `qa/README.md` — environment, reset, shipped first-visit flow
2. `prd/intro-aesthetic-build-prompt.md` — **Shipped behavior** section (authoritative when it differs from older spec text)
3. `lib/intro.ts` — exact Beat 1 copy (`introOpeningMessage()`)

Use **Playwright MCP** as your primary browser. Use **Cursor Browser** when you need screenshots for visual/qualitative issues Playwright MCP cannot judge (accent color changes, vibe card layout, overall feel).

If implementation differs from this prompt or the PRD body, note the gap as an issue. Do not fail silently.

---

## Environment (verify before starting)

| Item | Value |
|------|--------|
| App URL | http://localhost:3000 |
| Auth bypass | `DISABLE_AUTH=true` in `.env.local` (no magic link) |
| Dev server | Must already be running — do not start it unless it is down |
| Fresh state | Required for Phase 1 — run reset first (see below) |

**Reset before Phase 1:**

```bash
node scripts/reset-intro.mjs
```

Alternative: run `qa/reset-intro.sql` in Supabase SQL editor.

Verify: `GET /api/wedding-state` → `intro_completed: false`, `aesthetic.introCompleted: false`, `aesthetic.style: null`.

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
2. **Beat 1** opening message appears on `/chat` (scripted; see `lib/intro.ts`)
3. Complete vibe arc in chat (one Rosie question per turn, primary color picker → Coolors handoff, optional screenshots)
4. After Rosie sets `aesthetic.introCompleted: true`, **`/`** loads the planning home
5. **Welcome overlay** on home only if vibe intro is done **and** `intro_completed === false` — dismiss → scroll to `#up-next`
6. Home shows **Your vibe**, **Latest decision**, layout-aware **Up next**

**Beat 1 must NOT mention** a gift from Chase. Engagement congrats **is** expected.

**Image attach:** paperclip on main `/chat` only. Vendor focuses have no attach button.

---

## Phase 1 — Happy path (Playwright MCP)

1. Run reset (`node scripts/reset-intro.mjs`)
2. Navigate to **`/`** → confirm redirect to **`/chat`**
3. Confirm **Beat 1** opening message (Rosie intro, engagement congrats, vibe question; no gift-from-Chase)
4. Reply: *"A friend's wedding — cocktail hour in a garden with string lights, everyone mingling."*
5. Wait for Rosie reply (**one question only**). Reply: *"The garden and the lighting. Romantic but relaxed."*
6. Wait for structural inspo question. Reply: *"My cousin's vineyard wedding — I loved the long tables and outdoor ceremony."*
7. Wait for borrow/avoid question. Reply: *"I want long tables and outdoor ceremony. Not the super formal church part or heavy rustic decor."*
8. Confirm **`PrimaryColorPickerCard`** appears (10 preset primaries, pick 2, **These are my picks**)
9. Confirm **`CoolorsHandoffCard`** appears with **Open palette in Coolors** (5-color URL, not 2-color only)
10. In Coolors: lock primaries, spacebar shuffle, Export → URL → paste back in chat
11. Confirm accents change visibly after URL paste (`themeApplied: true` via API)
12. Continue until Rosie reflects back and sets vibe complete (or confirm `aesthetic.introCompleted` via API)
13. Navigate to **`/`** → planning home loads (no redirect to chat)
14. If welcome overlay appears: confirm trimmed copy + **Let's go** → dismiss → scroll to Up next
15. Confirm **Your vibe** card (style, borrow bullets, palette swatches)
16. Confirm **Latest decision** mentions vibe (e.g. "Vibe set: …")
17. Confirm **Up next** references layout inspo (venue not booked)
18. Open **`/chat/photographer`** → vendor opener only; **no** intro rerun; **no** image attach

Check off each item in `qa/intro-review.md`.

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
| After intro completes | `aesthetic.introCompleted === true` |
| Aesthetic capture | `borrow`, `avoid`, `layout`, `inspiration` populated |
| After palette applied | `aesthetic.themeApplied === true`, `palette` has 5 hex values (Coolors URL paste or `apply-palette`) |
| Messages | Main thread (`thread_key IS NULL`) persisted in Supabase |
| Overlay flag | `intro_completed` stays false until overlay dismissed (not set by chat) |

If you cannot inspect API directly, infer from UI and note the limitation.

---

## Constraints

- Do not modify application code unless a blocker prevents all testing (then fix minimally and document)
- Do not commit unless asked
- **One question per Rosie turn** — flag if she dumps multiple questions
- Do not use Pinterest URLs (out of scope); screenshots only
- Do not expect welcome overlay before vibe intro completes

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
