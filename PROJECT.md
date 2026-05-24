# Rosie — Project Summary

A personalized wedding planning AI agent built as an engagement gift from Chase Burns to his sister Kelsie Burns, who is marrying Hank Harris in spring 2027.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Anthropic API** — `claude-sonnet-4-6`
- **Supabase** — Postgres via JS client, server-side only
- **Tailwind CSS v4** — CSS-based theme config (no tailwind.config.ts)
- **Vercel** — deploy target

---

## Running locally

```bash
cp .env.local.example .env.local   # fill in 3 values
npm install --cache /tmp/npm-cache  # use temp cache if npm cache has permission issues
npm run dev
```

The npm cache at `/Users/chaseburns/.npm/_cacache/content-v2/sha512/1f/` is owned by root due to a prior install. Always pass `--cache /tmp/npm-cache-rosie` to npm install to avoid it.

---

## Environment variables

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

No public/client-side env vars needed. All Supabase access is server-side via service role key.

---

## Database (Supabase)

Run `supabase/schema.sql` once in the Supabase SQL editor. Two tables:

**`messages`** — conversation history
| column | type |
|--------|------|
| id | bigserial PK |
| role | text ('user' \| 'assistant') |
| content | text |
| created_at | timestamptz |

**`wedding_state`** — single-row structured planning data (id always = 1)
| column | type |
|--------|------|
| id | int PK (always 1) |
| data | jsonb |
| updated_at | timestamptz |

The `wedding_state.data` shape is defined in `lib/types.ts` (`WeddingState`) and seeded with defaults in `lib/wedding-defaults.ts`.

---

## Architecture

### Chat flow (`app/api/chat/route.ts`)

1. Fetch all messages + current wedding state from Supabase in parallel
2. Build system prompt (Rosie's personality + current wedding state JSON injected at the bottom)
3. Call Anthropic API with full message history + `update_wedding_data` tool
4. If response contains `tool_use`, process each tool call (deep-set into `wedding_state`, re-fetch, rebuild system prompt), then make a second API call with tool results
5. Save user message + assistant text to `messages` table
6. Return assistant text as JSON

Tool use loops up to 3 times (handles multiple updates per turn).

### Structured data updates

Rosie uses a tool `update_wedding_data(path, value, decision_note?)` to silently track things as they're decided. `path` is dot-notation (e.g. `"venue.status"`, `"vendors.photographer.name"`). `lib/deep-set.ts` applies the update via `structuredClone` + recursive traversal. When `decision_note` is provided, it's pushed to the `decisions` array in wedding state.

### First visit vs. returning

`app/page.tsx` fetches messages from Supabase server-side. If `initialMessages.length === 0`, `ChatInterface` shows `IntroScreen`. Otherwise it shows the conversation directly.

On first visit, the intro screen's opening message (`INITIAL_ROSIE_MESSAGE` from `lib/system-prompt.ts`) is never saved to DB — it's shown in the UI and passed to the API as `initialMessage` in the body of the first POST request, so the API can prepend it as an assistant turn before Kelsie's first message.

### Dashboard

`app/dashboard/page.tsx` reads `wedding_state` directly from Supabase (server component). No client-side fetching. Refresh the page to see updates after a chat session.

---

## File map

```
app/
  layout.tsx              fonts (Cormorant Garamond, Inter, Great Vibes) + metadata
  globals.css             Tailwind v4 theme, intro animation keyframes
  page.tsx                chat page (server component, fetches messages)
  dashboard/page.tsx      planning overview (server component, fetches wedding state)
  api/chat/route.ts       main chat API — Anthropic + tool use loop + Supabase saves

components/
  Nav.tsx                 top nav — "Rosie" wordmark + Chat | Planning tabs
  ChatInterface.tsx       client component — manages intro→chat transition + message state
  IntroScreen.tsx         first-visit screen — SVG signature + staggered sentences + input
  RosieSignature.tsx      SVG handwriting animation (path extracted from Great Vibes font)
  MessageBubble.tsx       message display — left (Rosie, white) / right (Kelsie, blush)
  ChatInput.tsx           auto-resizing textarea + send button (used in chat view)
  Dashboard.tsx           budget tracker, venue status, vendor list, decisions log

lib/
  types.ts                WeddingState, VendorEntry, Message interfaces
  supabase.ts             lazy Supabase client (getSupabase() — avoids build-time crash)
  system-prompt.ts        ROSIE_BASE_PROMPT, buildSystemPrompt(), WEDDING_TOOLS, INITIAL_ROSIE_MESSAGE
  wedding-defaults.ts     DEFAULT_WEDDING_STATE — what the DB is seeded with
  deep-set.ts             deepSet(obj, 'a.b.c', value) utility

scripts/
  extract-paths.mjs       one-time script used to extract SVG path data from Great Vibes TTF
                          (requires fontkit dev dep + /tmp/GreatVibes.ttf — already done, don't re-run)

supabase/
  schema.sql              run once in Supabase SQL editor to create tables + seed wedding state
```

---

## Design system

**Fonts**
- `font-script` — Great Vibes (signature/title only)
- `font-serif` — Cormorant Garamond (decorative headings)
- `font-sans` — Inter (body, default)

**Colors** (defined in `@theme` in globals.css)
- `cream` `#faf8f5` — page background
- `warm-dark` `#2c2825` — primary text
- `warm-mid` `#6b6560` — secondary text
- `warm-light` `#b0a99f` — placeholder/muted
- `border` `#e8e2da` — borders
- `blush` `#c9a0a0` — primary accent (Kelsie messages, signature, badges)
- `blush-light` `#f2e0e0` — Kelsie message bubbles
- `sage` `#8faf8f` — green accent (contacted status)
- `mist` `#8fa8bf` — blue accent (considering status)

---

## Intro animation sequence

| Time | Event |
|------|-------|
| 0.3s | SVG stroke starts drawing |
| 6.3s | SVG stroke finishes (fill has been fading in since 0.3s) |
| 5.6s | First sentence begins fading in (overlaps with last letter) |
| 6.6s | Second sentence |
| 7.6s | Third sentence |
| 8.6s | Fourth sentence |
| 9.6s | Fifth sentence |
| 10.4s | Input fades in |

To adjust pacing, change `SENTENCE_START` and `SENTENCE_GAP` at the top of `IntroScreen.tsx`. The SVG animation duration lives in `RosieSignature.tsx` inline styles (`6s`).

### SVG path extraction (already done)
The `RosieSignature` component has the Great Vibes "Rosie" path data hardcoded. It was extracted by:
1. Downloading Great Vibes TTF from Google Fonts to `/tmp/GreatVibes.ttf`
2. Running `node scripts/extract-paths.mjs` using `fontkit` (not opentype.js — opentype.js can't handle this font's composite glyphs)

Don't re-run unless the font or text changes.

---

## Rosie's pre-loaded context

These facts live in `ROSIE_BASE_PROMPT` in `lib/system-prompt.ts` and are all subject to change as Kelsie updates them:

- Budget: $75,000
- Guests: 250–300
- Date: spring 2027
- Location: southeast/central Texas (Houston is the hub; exact venue TBD)
- Aesthetic: elevated classic
- Palette: pink, green, blue
- Music: DJ + possibly one live instrument (no full band)
- Decision style: 3 options at a time
- Fiancé: Hank Harris (always "Hank", never "your fiancé")
- Created by: Chase Burns (brother)

---

## Known issues / things to be aware of

- **Returning visits skip the intro** — by design. If Kelsie wants to replay the intro, clear the `messages` table in Supabase.
- **Dashboard doesn't auto-refresh** — it's a server component. Reload the page to see updates after chatting.
- **Nav shows on intro screen** — the "Rosie" wordmark in the nav overlaps with the signature animation. Could hide the nav on first visit.
- **No auth** — anyone with the URL can chat. Fine for a personal gift; add Supabase Auth if that ever matters.
- **Tool use is sequential** — if Rosie calls `update_wedding_data` multiple times in one response, they process one at a time (loop in `route.ts`). Works correctly, just not parallelized.
