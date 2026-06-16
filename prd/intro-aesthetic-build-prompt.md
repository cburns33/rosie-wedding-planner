# Builder prompt — Rosie-led intro + aesthetic personalization

## Task

Implement the **first-visit intro experience** for Kelsie's wedding planning app (Rosie). This is a cohesive feature spanning:

1. A trimmed **home welcome overlay**
2. A **Rosie-led conversational intro** on first `/chat` visit
3. **Structured aesthetic capture** (vibe, layout inspo, borrow/avoid, colors)
4. An in-app **primary color picker** (pick 2 presets) + **Coolors handoff** (build full palette externally)
5. Optional **Pinterest screenshot uploads** (no link scraping)
6. **Visible feedback** on the home page (vibe card, latest decision, personalized Up next)
7. **UI accent theming** driven by her chosen palette

**Goal:** When Kelsie opens Rosie for the first time, a short guided conversation captures how she wants the wedding to *feel* and look. Her answers persist to `wedding_state`, shape Rosie's recommendations and vendor emails, and visibly change the app (palette swatches on home, accent colors in the UI). She can change everything later in chat.

## Shipped behavior (authoritative for QA)

| Topic | As shipped |
|-------|------------|
| **First landing** | `/` redirects to `/chat` while `aesthetic.introCompleted === false`. |
| **Home welcome overlay** | Only after vibe intro completes: `intro_completed === false` && `aesthetic.introCompleted === true`. |
| **Beat 1 copy** | `lib/intro.ts` → `introOpeningMessage()` (engagement congrats OK; no gift-from-Chase). |
| **Color beat** | `show_primary_color_picker` → `PrimaryColorPickerCard` (pick 2). Then `CoolorsHandoffCard` with 5-color starter URL (`genCoolorsStarterFromPrimaryPicks`). Paste Coolors **Export → URL** in chat to auto-apply palette. |
| **Intro beats 2–5a** | Server-scripted (`lib/intro-beats.ts`, `lib/intro-script.ts`); LLM one-sentence reflect only. Progress via `aesthetic.introUserTurns` when messages don't persist. |
| **Your vibe card** | Categorized sections: quoted headline (feeling + moment), muted moment line, Inspired by, Details chips, 5 swatches, Skipping chips (`lib/vibe-display.ts`). |
| **Chat formatting** | Assistant bubbles render `**bold**` and `[label](url)` via `FormattedMessage`. |
| **Image upload** | Base64 in `POST /api/chat`, main thread only. No `/api/chat/upload`. |
| **State loading** | `mergeWeddingState()` for legacy partial `aesthetic` objects. |
| **QA reset** | `node scripts/reset-intro.mjs` or `qa/reset-intro.sql` |
| **QA color shortcut** | `node scripts/seed-primary-picker.mjs` then open `/chat` |

See also `qa/README.md` and `qa/intro-review.md`.

**Explicitly out of scope:**

- The scrapped emotional opener ("Congratulations, close your eyes…")
- Gift-from-Chase acknowledgement in intro copy
- Pinterest URL scraping or Coolors iframe embed
- Live Pinterest sync
- Changing fonts, cream background, or warm-dark body text (accents only)
- Intro gate on vendor focus chats (vendor threads keep existing `vendorOpeningMessage()` behavior)
- New Supabase tables (extend existing `wedding_state` jsonb only)
- Persisting uploaded inspiration images long-term in v1 (process for palette extraction; optional note in `aesthetic.notes` is enough)

---

## Read first (in order)

1. `PROJECT.md` — architecture, first-visit behavior, file map, known issues
2. `prd/vendor-email-drafts-build-prompt.md` — pattern for inline chat cards + API sidecar fields (`emailDraft`, `suggestFocus`)
3. `lib/system-prompt.ts` — `ROSIE_BASE_PROMPT`, `buildSystemPrompt`, tools, hardcoded aesthetic (must fix)
4. `app/api/chat/route.ts` — tool loop, `applyWeddingDataUpdate`, response shape
5. `components/ChatInterface.tsx` — `openingMessage`, `emailDraft` rendering pattern
6. `components/PlanningHomeShell.tsx` + `WelcomeOverlay.tsx` — home intro overlay
7. `components/PlanningHome.tsx` + `lib/planning-utils.ts` — Up next, summary cards
8. `app/globals.css` — static theme tokens (`--color-blush`, `--color-sage`, etc.)
9. `lib/types.ts`, `lib/wedding-defaults.ts`, `supabase/schema.sql` — seeded `wedding_state`

---

## Locked product decisions (do not re-debate)

### Intro surfaces

| Surface | Behavior |
|---------|----------|
| **Home (`/`)** | While `aesthetic.introCompleted === false`, redirects to `/chat`. After vibe intro: planning home. Trimmed `WelcomeOverlay` when `intro_completed === false` (only after vibe intro done). Dismiss → scroll to `#up-next`. No Rosie dialogue on home. |
| **Main chat (`/chat`)** | First landing experience. Rosie-led vibe intro (empty main thread, `aesthetic.introCompleted === false`). Beat 1 via scripted `openingMessage`. |
| **Vendor focuses** | Unchanged. No aesthetic intro rerun. No image attach. |

### Conversation rules (match existing Rosie persona)

- One question per turn. Never dump a questionnaire.
- Warm, competent, understated. No wedding jargon unless Kelsie uses it first.
- No gift-from-Chase acknowledgement in intro copy (engagement congrats is fine).
- Extract **qualities**, not "copy this wedding."
- Always **reflect back** before persisting aesthetic data.
- If she skips vibe talk and asks about venue/budget, answer first, then offer to return to vibe later. Never block planning.

### Color (as shipped — superseded Coolors-lite picker)

**Beat 5a:** Rosie calls `show_primary_color_picker`. Kelsie picks **two** preset primaries in `PrimaryColorPickerCard` (`lib/colors/primary-colors.ts`).

**Beat 5b:** Chat returns `coolorsHandoff` with a **5-color** Coolors starter URL (her two exact picks + three generated shuffle slots). `CoolorsHandoffCard` shows **Open palette in Coolors** and lock / spacebar / Export → URL instructions. Rosie replies in plain text (no markdown links; the card holds the link).

**Beat 5c:** Kelsie pastes Coolors **Export → URL** in chat. Server parses `coolors.co/hex-…`, auto-applies via `applyPaletteToWeddingState()`, sets `themeApplied`, shifts accent CSS vars.

**Legacy note:** The original in-app lock/shuffle `PalettePickerCard` and `show_palette_picker` tool were removed. `POST /api/wedding-state/apply-palette` remains for direct API use.

- Copy must say she **can change colors anytime** in chat.
- Palette apply must produce **immediate visible accent change**.

### Screenshots

- She uploads **screenshots** of Pinterest boards or inspo photos. **Do not** scrape Pinterest URLs.
- Chat input accepts image attachments on `/chat`.
- Vision pass extracts dominant colors to **pre-seed or refine** the palette picker. Screenshots are optional; intro completes without them.

### Feedback loop (non-negotiable)

Every intro answer must land somewhere Kelsie can **see or hear back within one navigation**:

1. Rosie's reflect-back message in chat
2. **Latest decision** card on home (via `decision_note`)
3. New **Your vibe** section on home — categorized: quoted headline, moment line, Inspired by, Details chips, palette swatches, Skipping chips (`lib/vibe-display.ts`)
4. **Up next** copy references layout inspo when venue is not booked
5. Accent colors shift after palette confirm

If intro writes JSON she never sees, the feature failed.

### Data truth

- Remove hardcoded aesthetic from `ROSIE_BASE_PROMPT` ("elevated classic", "pink, green, blue"). **`wedding_state.aesthetic` is source of truth** for all Rosie turns after load.
- Seeded defaults in `wedding-defaults.ts` / `schema.sql` remain fallbacks until intro overwrites them.

---

## Intro conversation arc

Runs on **main thread only** when `messages` (thread_key IS NULL) is empty or only contains the stored opening line, and `aesthetic.introCompleted === false`.

### Beat 1 — Open + moment anchor (scripted `openingMessage`)

Fixed text for `openingMessage` on `/chat` (source: `lib/intro.ts`):

```
Hey Kelsie, I'm Rosie, your personal wedding planner agent. First of all, congrats on the engagement!!!

We'll get to your planning home page in a sec. Your answers here will help us build a space that keeps you on track and shows you what's next.

To start, I'd love to get a read on the vibe. Picture a wedding moment that stuck with you, one you went to, or one you saw online. What's happening in that moment?
```

Wire via `app/chat/page.tsx` → `ChatPageShell` → `ChatInterface`, same pattern as vendor `openingMessage`, but only when main thread is empty **and** `!weddingData.aesthetic.introCompleted`.

### Beat 2 — Extract quality (Rosie, prompt-guided)

After she describes a moment:

```
That helps. I'm not trying to recreate that wedding. I want the feeling underneath it.

When you think about that moment, what felt right? The energy, a detail, the way the space felt?
```

### Beat 3 — Structural inspiration (Rosie, prompt-guided)

```
Separate question, and this one is more practical.

Is there a wedding you've been to or seen that you'd want to use as inspiration for the big stuff — venue, layout, dinner format, that kind of thing? It doesn't have to be the same wedding as the moment you just described.
```

If she says no: acknowledge briefly, continue to Beat 4.

### Beat 4 — Borrow vs. avoid (Rosie, prompt-guided)

```
From that — or from the moment you described earlier — what would you actually want for yours?

And what would feel wrong if you copied it straight over?
```

### Beat 5 — Color (original builder spec; see **Color (as shipped)** above for current behavior)

Rosie introduces the picker (wording can vary; must include "change anytime"):

```
Let's pick a starting color scheme for the app and for how I'll talk about your florals and décor. Nothing permanent — you can change it anytime in chat.

I put together a palette based on what you've said. Lock the colors you want to keep, shuffle the rest, and tap Use this palette when one feels right.
```

Then the API returns `palettePicker` (see below) and renders `PalettePickerCard`.

**Starter colors:** infer from Beats 1–4 via `inferStarterPalette()` (see Color utilities). If she already uploaded screenshots earlier in the thread, prefer vision-extracted colors as locked starters.

### Beat 6 — Screenshots optional (anytime before or after color; not a gate)

Rosie offer (after color confirm or woven into Beat 5 if natural):

```
If you have a Pinterest board or photos that match this, upload a few screenshots here — pins from the board, inspiration photos, whatever captures the colors and vibe. I can't pull from Pinterest links directly, but screenshots work great.

Totally fine to skip for now and add them later.
```

Accept image uploads in chat. On upload, run vision extraction; optionally re-open picker pre-seeded with extracted colors or auto-suggest palette tweaks.

**Coolors URL paste:** if message matches a Coolors URL, parse hex list, offer to apply or open picker pre-filled.

### Beat 7 — Reflect + persist + handoff (Rosie)

Summarize in plain language, then persist via `update_wedding_data` (multiple calls OK within tool loop):

```
So here's what I'm hearing: [2–3 lines — feeling, structural inspo, borrow, avoid, colors].

Want to start with what's on Up next, or is something else on your mind?
```

On persist:

- Set `aesthetic.introCompleted: true`
- Push `decision_note`: `"Vibe set: [short summary]"` (surfaces on home Latest decision card)
- Dispatch `wedding-state-updated` (existing client event)

---

## Schema extension

Extend `WeddingState.aesthetic` in `lib/types.ts`:

```typescript
aesthetic: {
  palette: string[];           // 5 hex strings, e.g. "#8faf8f"
  style: string | null;        // short label, e.g. "Garden romance, relaxed but elevated"
  music: string | null;        // unchanged; not part of intro questions
  notes: string[];             // free-form; include summary bullets
  borrow: string[];            // NEW — what she wants
  avoid: string[];             // NEW — what to skip
  layout: string[];            // NEW — e.g. ["outdoor ceremony", "long-table dinner"]
  inspiration: {               // NEW
    moment: string | null;     // Beat 1–2 summary
    structural: string | null; // Beat 3 reference wedding / layout inspo
  };
  introCompleted: boolean;     // NEW — vibe intro arc finished
  themeApplied: boolean;       // NEW — palette mapped to CSS accents
};
```

Update `DEFAULT_WEDDING_STATE`, `supabase/schema.sql` seed block, and any tests that assert full state shape.

**Do not** add a DB migration file unless this repo's convention requires it; jsonb is schemaless. Document new fields in `PROJECT.md`.

### Example persisted state after intro

```json
"aesthetic": {
  "style": "Garden romance, relaxed but elevated",
  "palette": ["#8faf8f", "#faf8f5", "#d4c4a8", "#c9a0a0", "#6b6560"],
  "music": "DJ with potential live instrument",
  "notes": ["Romantic without being stuffy"],
  "borrow": ["outdoor ceremony", "long tables", "candlelit warmth"],
  "avoid": ["church formality", "heavy rustic decor"],
  "layout": ["outdoor ceremony", "long-table dinner"],
  "inspiration": {
    "moment": "Friend's garden cocktail hour — string lights, mingling",
    "structural": "Cousin's vineyard wedding — long tables, outdoor ceremony"
  },
  "introCompleted": true,
  "themeApplied": true
}
```

---

## System prompt changes (`lib/system-prompt.ts`)

### 1. Remove hardcoded aesthetic from `ROSIE_BASE_PROMPT`

Delete the static lines:

```
- Aesthetic: elevated classic
- Palette: pink, green, and blue
```

Replace with:

```
- Aesthetic preferences live in wedding_state.aesthetic — always treat that object as source of truth, especially borrow, avoid, layout, style, and palette. Never contradict saved aesthetic unless Kelsie updates it in conversation.
```

Also update the vendor email tone line that hardcodes "elevated classic aesthetic" to reference `wedding_state` dynamically (or generic "her saved aesthetic from wedding state").

### 2. Add intro mode block (main chat only)

When `!vendorFocus && !weddingData.aesthetic.introCompleted`, append to system prompt:

```
**Intro mode (main chat, first visit)**

Kelsie is setting her vibe for the first time. Guide her through this arc before heavy planning talk, one question at a time:

1. Moment that stuck with her (may already be answered if openingMessage was sent)
2. What felt right about that moment (feeling, not copying the whole wedding)
3. A wedding she'd use as inspiration for venue, layout, dinner format (explicit question — may be a different wedding than step 1)
4. What to borrow vs. what would feel wrong copied over
5. Color scheme — call show_palette_picker with a starter palette inferred from the conversation
6. Optional Pinterest/inspo screenshots (upload only, not links)
7. Reflect back a 2–3 line summary, persist all aesthetic fields via update_wedding_data, set aesthetic.introCompleted true, decision_note "Vibe set: …"

Rules:
- One question per turn
- If she pivots to planning, answer helpfully first, then gently offer to finish vibe setup
- Never store "copy Sarah's wedding" — store borrow/avoid/layout dimensions
- Before show_palette_picker, you should have enough context for inferStarterPalette; if not, ask one more clarifying question
- After she confirms a palette in the UI, acknowledge it and continue to screenshots offer or handoff
- Screenshots are optional; do not block intro completion on images
```

Export `introOpeningMessage()` from this file (or `lib/intro.ts`) with Beat 1 exact copy.

---

## API & tools

### New tool: `show_palette_picker`

Available in **main chat only** (not vendor focuses). Rosie calls when ready for Beat 5.

```typescript
{
  name: "show_palette_picker",
  description: "Surface the inline palette picker for Kelsie to lock and shuffle colors. Call during intro when vibe questions are answered and you are ready for color selection. Pass 5 hex starter colors.",
  input_schema: {
    type: "object",
    properties: {
      colors: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 5 hex colors (#RRGGBB) to seed the picker.",
        minItems: 5,
        maxItems: 5,
      },
      hint: {
        type: "string",
        description: "Optional one-line context shown above the picker.",
      },
    },
    required: ["colors"],
  },
}
```

**Handler (`app/api/chat/route.ts`):**

- Validate 5 hex colors; normalize to `#RRGGBB` uppercase or lowercase consistently.
- Set response sidecar: `palettePicker: { colors: string[], hint?: string }` (same turn as Rosie text).
- Do **not** persist until Kelsie confirms in UI.

### New API route: `POST /api/wedding-state/apply-palette`

Separate from chat (called by `PalettePickerCard` on confirm). Auth same as other wedding-state routes.

**Body:**

```json
{ "palette": ["#...", "#...", "#...", "#...", "#..."] }
```

**Behavior:**

1. Merge into `wedding_state.aesthetic.palette`
2. Set `aesthetic.themeApplied: true`
3. Optionally append `decision_note` only if intro not yet complete (avoid duplicate on re-pick)
4. Return updated `WeddingState`

Client dispatches `wedding-state-updated` after success.

### Image upload for chat

**Preferred:** `POST /api/chat/upload` (multipart, auth-protected)

- Accept `image/jpeg`, `image/png`, `image/webp`; max 5 MB per file; max 5 files per message.
- Store temporarily or process inline; return `{ urls: string[] }` or base64 references for the chat turn.
- **Do not** add Supabase Storage bucket setup unless already in project; if no storage, pass base64 to Claude vision in the same request (keep images out of `messages` table content — store text-only in DB, e.g. "Uploaded 3 inspiration screenshots").

**Chat POST extension:**

- Accept optional `images: string[]` (base64 or signed URLs) alongside `message`.
- When images present, send multimodal content to Anthropic; instruct Rosie to extract colors/mood and call `show_palette_picker` or `update_wedding_data` as appropriate.

**Sentry:** extend `lib/sentry-scrub.ts` to strip image payloads if logged.

### Coolors URL parsing

`lib/colors/coolors.ts`:

- `parseCoolorsUrl(url: string): string[] | null` — support `coolors.co/hex1-hex2-…` and `coolors.co/palette/hex1-…`
- `genCoolorsUrl(colors: string[]): string` — strip `#`, join with `-`

When user message contains a parseable Coolors URL, chat route or Rosie can detect and apply. Minimal path: document in intro prompt that Rosie should parse and offer apply; optional server-side helper called before Anthropic if you want reliability without relying on model.

---

## Color utilities (`lib/colors/`)

### `inferStarterPalette(input): string[]`

Input shape:

```typescript
{
  style?: string | null;
  borrow?: string[];
  avoid?: string[];
  layout?: string[];
  extractedFromImages?: string[]; // optional vision output
}
```

Return 5 hex colors. Heuristic approach (keep simple, testable):

- Keyword buckets: garden/green → sage family; romantic/blush → blush family; classic/gold → warm neutrals + gold; modern/minimal → cool grays + one accent
- If `extractedFromImages` provided, use top 2 as locked seeds, generate rest harmonically
- Default fallback: current app defaults (`#c9a0a0`, `#8faf8f`, `#faf8f5`, `#d4c4a8`, `#6b6560`) mapped to wedding-safe set
- Clamp saturation/lightness so text contrast on cream background remains accessible for UI accents

### `shufflePalette(colors: string[], lockedIndices: boolean[]): string[]`

- Locked indices unchanged
- Regenerate unlocked slots using HSL offsets from average hue of locked colors (analogous + slight variation)
- Return new length-5 array

### `paletteToThemeVars(palette: string[]): Record<string, string>`

Map 5 palette colors to CSS custom properties:

| Token | Role |
|-------|------|
| `--color-blush` | Primary accent (palette[0] or most saturated) |
| `--color-blush-light` | lighten(primary, ~30%) |
| `--color-blush-pale` | lighten(primary, ~45%) |
| `--color-sage` | Secondary accent (palette[1] or greenest) |
| `--color-sage-light` / `--color-sage-pale` | derived |
| `--color-mist` | Tertiary accent (palette[2] or coolest) |
| `--color-mist-light` / `--color-mist-pale` | derived |

**Fixed (never override):** `--color-cream`, `--color-warm-dark`, `--color-warm-mid`, `--color-warm-light`, `--color-border`

Implement `lighten(hex, amount)` in same module.

### Tests (`lib/colors/*.test.ts`)

- `inferStarterPalette` returns 5 valid hex colors for sample inputs
- `shufflePalette` preserves locked indices
- `parseCoolorsUrl` / `genCoolorsUrl` round-trip
- `paletteToThemeVars` returns all required keys

---

## UI components

### 1. Trim `WelcomeOverlay.tsx`

Replace body copy with:

```
This is your planning home. Up next shows where to focus. Ask Rosie when you want to talk things through.
```

Keep "Welcome" / "Your planning home" structure or simplify title to match. Keep dismiss → scroll to `#up-next` behavior unchanged.

### 2. `PalettePickerCard.tsx` (new)

Pattern: `VendorEmailDraftCard.tsx` — inline in chat, left-aligned, max-width ~85%.

**UI:**

- Header: "Color palette" (uppercase tracking label)
- Optional `hint` line from API
- Row of **5 swatches** (rounded-lg, h-12, flex-1 each, gap-2)
- Tap swatch → toggle lock (padlock icon overlay when locked)
- **Shuffle** button (secondary) — calls `shufflePalette` client-side, updates local state
- **Use this palette** (primary blush button) — `POST /api/wedding-state/apply-palette`, disable while loading
- Footer link: **Open in Coolors** → `genCoolorsUrl(currentColors)` in new tab
- Subtle note: "You can change this anytime in chat."

**On confirm success:**

- Show brief "Applied" state on button
- Dispatch `wedding-state-updated`
- Apply theme vars immediately via shared theme helper (see ThemeProvider)

**Accessibility:** swatch buttons have `aria-label` ("Color 3, locked" / "Color 3, unlocked"); keyboard focusable.

### 3. `ChatInterface.tsx` updates

- Render `PalettePickerCard` when `palettePicker` in API response (state alongside `emailDraft`)
- Clear `palettePicker` on next user send (same as `emailDraft`)
- **`openingMessage`:** pass from server only when intro not complete
- **Image upload:** extend `ChatInput` with attachment button; preview thumbnails; send base64 or upload first then message

### 4. `ChatInput.tsx` updates

- Attach button (paperclip or image icon), accept multiple images
- Show selected files with remove
- On send: if images, include in request payload
- Disabled while loading

### 5. `YourVibeCard` or section in `PlanningHome.tsx` (new)

Show when `aesthetic.introCompleted === true` OR any of `style`, `borrow`, `palette` populated.

**Contents (as shipped):**

- Section label: "Your vibe"
- Serif headline: quoted excerpts from `inspiration.feeling` + `inspiration.moment` (woven)
- Muted one-liner: fuller quoted `inspiration.moment` when it adds detail beyond the headline
- **Inspired by:** quoted excerpt from `inspiration.structural`
- **Details:** up to 4 `borrow` chips
- Row of 5 palette swatches (read-only circles)
- **Skipping:** up to 3 `avoid` chips (muted styling)
- Link: "Refine with Rosie" → `/chat`

Logic in `lib/vibe-display.ts` → `getYourVibePresentation()`. `aesthetic.style` stores a short feeling label only (not a mashup headline).

Place after hero or before Up next (designer's choice; must be visible without scrolling on desktop after intro).

### 6. Theme application

**`components/ThemeProvider.tsx`** (client):

- Wrap in `app/layout.tsx` or both shell components
- On mount + `wedding-state-updated`: fetch `/api/wedding-state`
- If `aesthetic.themeApplied && aesthetic.palette.length >= 5`, call `applyThemeVars(paletteToThemeVars(palette))` on `document.documentElement`
- Export `applyThemeVars(vars: Record<string, string>)` from `lib/colors/theme.ts`

**Reduced motion:** theme apply is instant (no animation required).

### 7. `getUpNext()` personalization (`lib/planning-utils.ts`)

When `venue.status !== "booked"` and `aesthetic.layout.length > 0`:

- Append to `detail` or replace generic copy with layout-aware text, e.g.:
  - `"You mentioned outdoor ceremony and long-table dinner — let's find venues that fit."`
- Keep `href: "/chat"` and sensible `cta`

Use first 2 layout items max; don't overload the card.

---

## Server / page wiring

### `app/chat/page.tsx`

```typescript
// Pseudologic
const messages = await getMessages();
const weddingData = await getWeddingData();
const openingMessage =
  messages.length === 0 && !weddingData.aesthetic.introCompleted
    ? introOpeningMessage()
    : undefined;
return <ChatPageShell initialMessages={messages} openingMessage={openingMessage} />;
```

### `app/api/chat/route.ts` response shape

Extend JSON response:

```typescript
{
  message: string;
  suggestFocus?: { vendor: string; label: string };
  emailDraft?: EmailDraft;
  palettePicker?: { colors: string[]; hint?: string }; // NEW
}
```

---

## Home welcome vs. aesthetic intro flags

These are independent.

| Flag | Meaning |
|------|---------|
| `intro_completed` | Home welcome overlay dismissed |
| `aesthetic.introCompleted` | Vibe + color intro arc finished in chat |

**As shipped:** `/` redirects to `/chat` until vibe intro completes. Home welcome overlay appears only after vibe intro, on first home visit.

Do **not** set `intro_completed` from chat. Keep existing `POST /api/wedding-state/complete-intro` for overlay only.

---

## Skip paths

| Situation | Behavior |
|-----------|----------|
| She ignores vibe, asks about venue | Rosie answers; offers to finish vibe later; can set `introCompleted` only after she confirms or explicitly skips |
| "Skip" / "let's just plan" | Rosie saves whatever was gathered, sets `introCompleted: true`, does not block |
| No structural inspo wedding | `inspiration.structural: null`, continue |
| No screenshots | Intro completes |
| No palette confirm | If she skips color beat, keep default palette, `themeApplied: false`, still allow intro completion |
| Returns later | `openingMessage` not shown; normal chat; she can say "let's update my colors" |

Add prompt guidance for explicit skip handling.

---

## Files to create

```
lib/colors/infer.ts
lib/colors/harmony.ts          # shufflePalette, lighten
lib/colors/coolors.ts          # parse/gen URLs
lib/colors/theme.ts            # paletteToThemeVars, applyThemeVars
lib/colors/infer.test.ts
lib/colors/harmony.test.ts
lib/colors/coolors.test.ts
components/PalettePickerCard.tsx
components/ThemeProvider.tsx
app/api/wedding-state/apply-palette/route.ts
app/api/chat/upload/route.ts   # not implemented — images inline in chat POST
```

## Files to modify

```
lib/types.ts
lib/wedding-defaults.ts
lib/intro.ts                   # introOpeningMessage export optional
lib/system-prompt.ts
lib/planning-utils.ts
app/api/chat/route.ts
app/chat/page.tsx
components/WelcomeOverlay.tsx
components/ChatInterface.tsx
components/ChatInput.tsx
components/PlanningHome.tsx
components/PlanningHomeShell.tsx  # ThemeProvider if not in layout
app/layout.tsx                    # ThemeProvider wrap
app/globals.css                     # document CSS var usage unchanged; vars set at runtime
supabase/schema.sql               # seed aesthetic shape
PROJECT.md
SETUP.md                          # fix stale "signature intro animation on /chat" line
```

---

## Verification checklist

Before finishing, confirm:

- [ ] `npm run build` passes
- [ ] `npm test` passes (new `lib/colors/*.test.ts`)
- [ ] Fresh state: `/` redirects to `/chat`; Beat 1 `openingMessage` appears (no gift-from-Chase mention)
- [ ] After vibe intro: `/` loads home; welcome overlay if `intro_completed === false`; dismiss scrolls to Up next
- [ ] Rosie walks through vibe questions one at a time (manual test with fresh messages + `aesthetic.introCompleted: false`)
- [ ] `show_palette_picker` renders `PalettePickerCard` inline
- [ ] Lock + Shuffle works client-side; locked colors unchanged after shuffle
- [ ] **Use this palette** persists to DB and shifts accent colors visibly (Up next blush tint, buttons, progress)
- [ ] Home shows **Your vibe** card with categorized sections after intro
- [ ] **Latest decision** shows "Vibe set: …"
- [ ] Up next venue copy references `layout` when present
- [ ] Image upload accepts screenshots; Rosie responds with color/mood feedback (manual)
- [ ] Coolors URL pasted in chat → parsed colors offered/applied (manual or unit test)
- [ ] **Open in Coolors** link opens valid pre-seeded URL
- [ ] Vendor focus `/chat/photographer` unchanged; no palette picker in vendor threads
- [ ] `ROSIE_BASE_PROMPT` no longer hardcodes elevated classic / pink green blue
- [ ] Returning visit: no `openingMessage`; theme persists from saved palette
- [ ] Re-pick palette in chat updates home swatches and accents
- [ ] No new required env vars (vision uses existing `ANTHROPIC_API_KEY`)
- [ ] Sentry scrub strips image payloads if upload logging added

---

## Manual test script

1. Reset DB: `node scripts/reset-intro.mjs` or `qa/reset-intro.sql` (main `messages` cleared, intro flags false).
2. Open `/` → redirects to `/chat` → verify Beat 1 opening message.
3. Reply with a garden cocktail hour moment → Rosie asks what felt right (Beat 2).
4. Reply with warmth/intimacy → Rosie asks structural inspo wedding (Beat 3).
5. Reply with cousin's vineyard, long tables → Rosie asks borrow vs avoid (Beat 4).
6. Reply with borrow/avoid → Rosie introduces color picker; card appears with 5 swatches.
7. Lock 2 colors, shuffle twice, tap **Use this palette** → accents change.
8. Upload 1 inspiration screenshot (main `/chat` paperclip) → Rosie comments on colors (optional refine).
9. Rosie reflects back summary → navigate `/` → welcome overlay (if not yet dismissed) → Your vibe card + Latest decision; Up next mentions layout if venue not booked.
10. Open `/chat/photographer` → vendor opener only, no intro rerun, no image attach.
11. Paste `https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560` → verify parse/apply path.

---

## Docs updates

**`PROJECT.md`:**

- First visit flow: home overlay + chat vibe intro
- New fields under `aesthetic`
- New components, API routes, tools
- Theme accent behavior
- Remove/implement note about hidden aesthetic section (now visible as Your vibe)

**`SETUP.md`:**

- Replace "signature intro animation on /chat" with accurate description

---

## Implementation notes

- **Follow `emailDraft` / `suggestFocus` pattern** for `palettePicker` — ephemeral API sidecar, client card, plain text in stored messages only.
- **Simplicity first** — shuffle algorithm does not need to match Coolors. Good enough harmony + lock is sufficient.
- **Surgical changes** — do not refactor auth, vendor focuses, or Zola integration.
- **Tool loop cap** — existing 3-iteration limit may be tight when intro persist writes many fields + palette picker in one turn. If needed, bump to 5 **only for main thread** or batch aesthetic updates into fewer tool calls. Prefer one `update_wedding_data` per field path (existing behavior) unless you add a batch path; test intro completion turn does not truncate.
- **Contrast** — if generated accent is too light on cream, darken in `paletteToThemeVars`. Add a unit test for minimum contrast ratio on primary accent vs cream (WCAG AA for large text is enough for buttons).
- **Mobile** — palette swatches stack or scroll horizontally; touch targets ≥ 44px.
- **No em dashes** in user-facing copy (project writing rule).

---

## Success

Kelsie signs in, dismisses a short home welcome, opens Ask Rosie, and has a natural conversation about how she wants the wedding to feel. She locks in colors she likes, sees the app accents shift, and returns home to a vibe card written in her words. When she asks about venues or florists, Rosie references her borrow/avoid list without re-asking. She never uploaded a Pinterest link, never saw a product wizard, and knows she can change colors anytime.
