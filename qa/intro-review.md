# Intro + aesthetic QA review

**App URL:** http://localhost:3000  
**Reset:** `node scripts/reset-intro.mjs`  
**Spec:** `prd/intro-aesthetic-build-prompt.md` (Shipped behavior section)  
**QA guide:** `qa/README.md`  
**Tested:** 2026-06-16 (Playwright MCP, local dev server)

> **Post-review update (2026-06-16):** Color beat redesigned — `PrimaryColorPickerCard` + `CoolorsHandoffCard` + Coolors URL auto-apply. In-app lock/shuffle picker removed. See `PROJECT.md`, `prd/intro-aesthetic-build-prompt.md` (Shipped behavior), and `qa/README.md`. Re-test STEP-14, STEP-07, STEP-10 against new flow.

> **Fix session (2026-06-16, continued):** Latest decision (`STEP-05`) appended server-side via `applyIntroCompletionSideEffects()`. Beat 8 dashboard handoff + `redirectTo` home. **Visual Inspo Depot** (`/chat/inspiration`, `inspiration_memory` table, home card). Home refresh crash fixed (`mergeWeddingState`, `YourVibeCard` guards). Dev-server hang + inspo card contrast (use `bg-sage-pale` + dark text when theme remaps `--color-sage`).

## Pass / fail checklist

### Phase 1 — Happy path

- [x] `/` redirects to `/chat` when vibe intro not complete
- [x] Beat 1 opening message on `/chat` (Rosie intro + engagement congrats; no gift-from-Chase mention)
- [x] Rosie one question per turn through vibe arc (scripted beats 2–5a; re-verify after prompt changes)
- [ ] Palette picker appears (lock, shuffle, Use this palette, Open in Coolors) — see STEP-14
- [x] Accents change after palette confirm (`themeApplied: true`; visual change subtle)
- [x] After intro completes, `/` loads planning home
- [ ] Welcome overlay on home (trimmed copy, Let's go) — only after vibe intro done
- [ ] Dismiss overlay scrolls to Up next; overlay does not reappear on reload
- [x] Home: Your vibe card (categorized sections: headline, moment, inspired by, details, swatches, skipping)
- [ ] Home: Latest decision mentions vibe — re-test after STEP-05 fix
- [x] Up next references layout inspo when venue not booked
- [x] `/chat/photographer` — vendor opener only, no intro rerun, no image attach

### Phase 2 — Edge cases

- [ ] E1 Skip vibe → answers planning question
- [ ] E2 Mid-intro pivot to budget
- [ ] E3 No structural inspo wedding
- [ ] E4 Skip palette / navigate away
- [ ] E5 Coolors URL paste
- [ ] E6 Double palette confirm
- [ ] E7 Refresh mid-intro
- [x] E8 Mobile width (~390px) — redirect works after fresh reset (see race note)
- [x] E9 Home before chat complete — `/` redirects to `/chat`; overlay N/A until vibe done
- [ ] E10 Image upload on main `/chat` (paperclip; vendor threads have no attach)

---

## Issues

[STEP-01] Intro arc far longer than shipped beat structure  
Severity: major → **fixed (2026-06-16)**  
Area: intro  
Steps: Completed happy path with scripted Kelsie replies through Beat 1–4 equivalents.  
Expected: ~5 beats (moment → qualities → structural inspo → borrow/avoid → palette), one question per turn.  
Actual: 10+ Rosie turns before palette appeared. Repeated structural-inspo questions after answers already given. User had to ask "Can we move on to colors?" to reach palette picker.  
**Resolution:** `lib/intro-beats.ts` + `lib/intro-script.ts` drive beats 2–5a server-side; LLM writes one-sentence reflect only. `aesthetic.introUserTurns` tracks progress when Supabase messages don't persist. Happy path reaches primary picker in ~4 user turns.  
Screenshot: n/a

[STEP-02] Compound / multi-part questions in single turns  
Severity: minor  
Area: intro  
Steps: Read each Rosie reply during happy path.  
Expected: One question per turn (PRD locked decision).  
Actual: Several turns bundle reflect-back + new question, or list multiple sub-questions ("was it the relaxed energy, the way it looked… what's the feeling…").  
Screenshot: n/a

[STEP-03] `aesthetic.style` never populated after intro complete  
Severity: major → **fixed (2026-06-16)**  
Area: home  
Steps: Completed full intro; checked `GET /api/wedding-state`.  
Expected: Style label on Your vibe card (e.g. short vibe phrase).  
Actual: `style: null`. Home card shows swatches + avoid only, no style headline or borrow bullets.  
**Resolution:** `finalizeVibeDisplayFields()` runs after intro turns; `style` stores feeling-only summary (`Relaxed & warm`). Card headline derives from `inspiration.feeling` + `inspiration.moment` with quoted excerpts (`lib/vibe-display.ts`).  
Screenshot: n/a

[STEP-04] `aesthetic.borrow` empty despite explicit borrow answers  
Severity: major → **fixed (2026-06-16)**  
Area: home  
Steps: User said "I want long tables and outdoor ceremony"; API after intro.  
Expected: `borrow` includes long tables, outdoor ceremony; Your vibe shows borrow bullets.  
Actual: `borrow: []`. `layout: ['long tables', 'outdoor ceremony']` populated instead. Home shows no borrow list.  
**Resolution:** Intro persist path normalizes borrow/avoid into `aesthetic.borrow` / `aesthetic.avoid`; card shows them under **Details** chips.  
Screenshot: n/a

[STEP-05] No `decision_note` / Latest decision after vibe set  
Severity: major → **fixed (2026-06-16)**  
Area: home  
Steps: Completed intro; opened `/`.  
Expected: Latest decision card shows "Vibe set: …" per PRD feedback loop.  
Actual: `decisions: []`. Home shows "Nothing decided yet — ask Rosie where to start".  
**Resolution:** `applyIntroCompletionSideEffects()` in `lib/vibe-display.ts` appends `"Vibe set: …"` when intro completes; chat route calls it when `aesthetic.introCompleted` is set.  
Screenshot: n/a

[STEP-06] Welcome overlay skipped on happy-path first home visit  
Severity: major  
Area: home  
Steps: After full intro, navigated to `/` for first time.  
Expected: Overlay when `intro_completed === false` && `aesthetic.introCompleted === true`.  
Actual: No overlay. API showed `intro_completed: true` without user clicking Let's go. Overlay works when flags are correct (verified in E1 skip path). Likely cause: unrestricted `update_wedding_data` path allows LLM to set `intro_completed` during chat (PRD: chat must not set this flag).  
Screenshot: n/a

[STEP-07] Palette picker ephemeral — disappears on next user message  
Severity: major (see STEP-14)  
Area: palette  
Steps: Palette appeared; user sent "Love these colors — let's go with this palette!"  
Expected: Picker may remain or confirm state clear; palette already applied via button.  
Actual: Picker removed from thread on send (by design per emailDraft pattern). User cannot re-shuffle after typing without asking Rosie again.  
Screenshot: n/a

[STEP-14] Rosie references palette but nothing visible in chat  
Severity: major  
Area: palette  
Steps: Rosie sends "Here's a starter palette… lock the colors you like…" User replies in chat (with or without having clicked **Use this palette**).  
Expected: Inline `PalettePickerCard` visible whenever Rosie intro text promises a palette; persisted or re-surfaced until confirmed.  
Actual: Two failure modes observed:
1. **Text without card:** Rosie message is stored in `messages`; `palettePicker` is a non-persisted API sidecar. If `show_palette_picker` is not called on that turn, or after any user send (`setPalettePicker(null)` in `ChatInterface.tsx` line 77), the thread shows palette copy with **no swatches, lock, or shuffle UI**.
2. **QA false positive:** Playwright a11y snapshot reported picker controls in one session, but the visible thread state (and user screenshot) shows Rosie + user both talking about colors as if a picker were on screen when it was not. Scripted reply "Love these colors — let's go with this palette!" should not run unless swatches are visibly confirmed.

User screenshot: `assets/c__Users_chase_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-be6fbc8a-f8ce-442c-826e-3a9fcd8fcf91.png`

[STEP-08] E1 skip — intro marked complete without answering venue question  
Severity: major  
Area: edge-case  
Steps: Reset; Beat 1; reply "Skip this — I need to find a venue now". Waited 75s+.  
Expected: Rosie answers venue/planning question first; saves partial vibe; sets introCompleted; does not block.  
Actual: `introCompleted: true` quickly. No Rosie reply rendered in chat after 75s (only user message visible). Home became accessible.  
Screenshot: n/a

[STEP-09] E1 skip — welcome overlay does appear when flags correct  
Severity: n/a (pass note)  
Area: home  
Steps: After E1 skip, navigated to `/` with `intro_completed: false`, `introCompleted: true`.  
Expected: Welcome overlay with trimmed copy + Let's go.  
Actual: Overlay shown; Let's go dismisses successfully.  
Screenshot: n/a

[STEP-10] E5 Coolors URL — no inline palette picker  
Severity: major  
Area: palette  
Steps: Post-intro, pasted `https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560` in chat.  
Expected: Parse URL and offer to apply (PRD: show_palette_picker or apply).  
Actual: Rosie described colors and asked "Want me to lock these in?" — no `PalettePickerCard` surfaced.  
Screenshot: n/a

[STEP-11] Reset script clears 0 messages every run  
Severity: minor  
Area: edge-case  
Steps: Ran `node scripts/reset-intro.mjs` multiple times.  
Expected: Main-thread messages cleared for fresh Beat 1.  
Actual: Log always shows "Cleared 0 main-thread message(s)". Messages may not persist to Supabase or delete filter mismatches; E7 refresh recovery untested.  
Screenshot: n/a

[STEP-12] Reset script post-reset copy is stale  
Severity: polish  
Area: edge-case  
Steps: Read reset script console output.  
Expected: Matches shipped flow (`/` → `/chat` for Beat 1; overlay after vibe intro).  
Actual: Says "Refresh … to see the welcome overlay, then open /chat for Beat 1" (wrong order).  
Screenshot: n/a

[STEP-13] E8 mobile — stale home flash possible on race  
Severity: minor  
Area: edge-case  
Steps: Reset + immediate navigate to `/` at 390px width.  
Expected: Redirect to `/chat`.  
Actual: First navigation showed home (stale `introCompleted` from prior session); second navigation after API confirmed reset redirected correctly.  
Screenshot: n/a

---

## Qualitative notes

- **Rosie tone:** Warm, on-brand, engagement congrats feel right. No gift-from-Chase mention. Reflect-backs are thoughtful but contribute to length.
- **Intro length:** Happy path took ~12 user messages over several minutes. A busy first-time user (Kelsie persona) would likely abandon or ask to skip before palette.
- **Palette picker UX:** Lock/shuffle/apply worked smoothly. "Open in Coolors" link present. Copy includes "change anytime in chat." Applied state shows briefly on button.
- **Accents:** `themeApplied` flips true and palette persists; accent shift on Send button / links is present but subtle in default theme.
- **Your vibe card:** Categorized sections (quoted headline, moment line, Inspired by, Details chips, 5 swatches, Skipping chips). No longer mashes feeling + structural into one headline. See `lib/vibe-display.ts`, `components/YourVibeCard.tsx`.
- **Vendor chat:** Photographer focus clean — vendor header, generic opener, no paperclip. Pass.
- **Attach button:** Present on main `/chat` only (not tested with file upload — E10 not run).

---

## Follow-up direction (from Chase — partially implemented 2026-06-16)

**Stricter intro beat discipline, with smooth transitions**

Rosie went off-script during QA (see STEP-01): clarifying follow-ups, tangents (ceremony setting, guest takeaway), and Beat 3 re-asked late after answers were already given. Current `INTRO_MODE_BLOCK` lists beats but does not enforce progression; base persona warmth encourages digression.

**Implemented:** Server-side beat rails (`lib/intro-beats.ts`, `lib/intro-script.ts`), `introUserTurns` counter, scripted questions for beats 2–5a, one-sentence LLM reflect only.

**Still open:** Skip/pivot paths (STEP-08), compound questions in reflects (STEP-02), full re-QA of edge cases E1–E7.

**QA re-test when fixed:** Happy path should reach palette in ~5–7 user turns without a "move on to colors" nudge; each Rosie turn should reference the prior answer plus one forward question.

---

## Suggested next session

**Primary:** [STEP-06] **Welcome overlay skipped on happy path** — guard `intro_completed` so chat tools / LLM cannot set it; only `POST /api/wedding-state/complete-intro` (Let's go) should flip the flag. Re-run happy path: complete intro → land on `/` → overlay must show before dismiss.

**Secondary:** Re-QA **STEP-05** (Latest decision) and **Visual Inspo Depot** end-to-end (upload in `/chat/inspiration`, confirm home card updates; note card only counts `- (YYYY-MM-DD)` observation bullets).

**Also worth a pass:** Re-run Phase 1 happy path end-to-end; confirm STEP-14/07/10 against the primary-picker + Coolors handoff flow (older QA referenced removed `PalettePickerCard`).

---

## Phase 3 — API spot checks

| Check | Result |
|-------|--------|
| After intro completes | `aesthetic.introCompleted === true` ✓ |
| Aesthetic capture | `style` (feeling label), `borrow`, `avoid`, `inspiration.*` populated after scripted intro ✓ (re-verify on fresh reset) |
| After palette confirm | `themeApplied === true`, 5 hex values ✓ |
| Messages persisted | Reset reports 0 cleared; persistence unclear |
| Overlay flag | Happy path: `intro_completed` true without overlay dismiss ✗ (STEP-06). Skip path: false until Let's go ✓ |
| Latest decision | Server-side vibe decision append shipped (STEP-05); re-QA on fresh reset |

---

## Prioritized summary

### Blockers
None (foundational checks passed: server up, reset works, redirect, Beat 1, chat API responds).

### Major
1. **Palette ghost reference** — Rosie promises a palette in text but UI often empty; chat confirm destroys ephemeral picker (STEP-14) — *may be stale after primary-picker redesign; re-test*
2. ~~Intro arc too long~~ — fixed (STEP-01); re-QA edge cases
3. ~~`style`, `borrow` on Your vibe~~ — fixed (STEP-03, 04); ~~**`decision_note`**~~ fixed (STEP-05); re-QA on fresh reset
4. Welcome overlay skipped on happy path — `intro_completed` set outside overlay dismiss (STEP-06)
5. E1 skip: no Rosie reply to venue question; intro still completes (STEP-08)
6. E5 Coolors URL does not surface palette picker (STEP-10) — *Coolors URL auto-apply may cover this; re-test paste path*

### Minor
1. Compound questions in single turns (STEP-02)
2. Reset clears 0 messages (STEP-11)
3. E8 stale-state race on immediate post-reset navigate (STEP-13)

### Polish
1. Reset script messaging stale (STEP-12)

### PRD / shipped behavior gaps
- Beat structure enforced server-side for beats 2–5a; skip/pivot paths still need QA (E1–E3)
- Feedback loop: Your vibe ✓; Latest decision fixed server-side (STEP-05; re-QA); **welcome overlay still skipped on happy path** (STEP-06)
- `intro_completed` must not be set from chat (flag may be set via unrestricted tool path) (STEP-06)
- Coolors URL paste should trigger apply flow (re-test STEP-10)
- E2, E3, E4, E6, E7, E10 not executed in this pass

### Ship / no-ship recommendation

**No-ship** for intro + aesthetic milestone until welcome overlay is reliable on the happy path and Phase 1 is re-QA'd end-to-end. Latest decision and Your vibe card are fixed; remaining blocker is overlay flag guard (STEP-06) plus edge-case skip/pivot behavior.
