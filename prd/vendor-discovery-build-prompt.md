# Builder prompt — Vendor discovery for Rosie

## Task

Implement **vendor discovery**: inside a vendor focus chat, Rosie searches the web for real local vendors that fit Kelsie's wedding, presents a few as selectable cards, and saves the one she likes into `wedding_state` as `considering` — so the hard part of vendor work (finding people) finally happens inside Rosie instead of in Google/Pinterest/The Knot.

**Why:** Rosie can already *track* and *email* a vendor (`draft_vendor_email`), but has no way to help Kelsie *find* one. Her vendor research happens entirely outside the app, which is why all nine vendors sit at `undecided`. This feature closes the discovery gap and hands off cleanly to the existing email-draft flow.

This is the natural predecessor to `draft_vendor_email`: **discover → save as considering → draft outreach → contacted → booked.**

---

## Read first (in order)

1. `PROJECT.md` — architecture, chat flow, tools, file map
2. `prd/vendor-email-drafts-build-prompt.md` — the sibling feature this mirrors (sidecar card pattern, tool handler, prompt block)
3. `lib/system-prompt.ts` — `getTools(focus)`, `WEDDING_TOOLS`, `DRAFT_VENDOR_EMAIL_TOOL`, vendor focus prompt block, `ROSIE_BASE_PROMPT`
4. `app/api/chat/route.ts` — `handleChatPost`, the tool-handling loop, `saveMessage`, `applyWeddingDataUpdate`, `appendVendorNote`, `buildVendorFocus`, and the **`primaryPicks` round-trip pattern** (client sends a field on the chat POST → server writes state → injects a system note). This is the model for the "save candidate" action.
5. `components/VendorEmailDraftCard.tsx` + `components/ChatInterface.tsx` — how an ephemeral sidecar (`emailDraft`) is returned by the API and rendered inline after the reply
6. `lib/types.ts` — `EmailDraft`, `VendorEntry`, chat response sidecar fields
7. `lib/vendors.ts` — `VENDOR_KEYS`, `VENDOR_LABELS`
8. `components/Dashboard.tsx` — vendors section + status pills (`considering` already styled)
9. `lib/wedding-data-guard.ts` — `isProtectedFromChatWeddingDataPath` (confirm vendor paths are writable from chat)

---

## Locked product decisions (do not re-debate)

- **Discovery happens in vendor focus chats** (`/chat/[vendor]`). Not main chat in v1. The vendor key is implicit from the thread.
- **Web search is the engine.** Use Anthropic's **server-side web search tool** (`type: "web_search_20250305"`, name `web_search`), not a custom search API. The model runs the search; we do not add a search provider key. (See "Verify before building.")
- **Candidates are ephemeral.** Returned as a `vendorCandidates` sidecar on the chat API response (exact pattern as `emailDraft`). Not persisted until Kelsie saves one.
- **Saving writes to existing state.** "Save this one" sets `vendors.<key>` → `status: "considering"`, `name`, `contact` (only verified fields), `notes` via the existing `wedding_state` write path. No new table.
- **Never invent contact info.** Only populate `contact.email`/`phone` when it appears on the vendor's own linked result. Otherwise leave null — the existing `draft_vendor_email` flow already asks for a missing email.
- **Grounded to her wedding.** Searches use her real context: venue Boxwood Manor (Tomball, TX), Houston / southeast-central Texas, spring 2027, ~250–300 guests, her vibe (bright, classy, timeless, hydrangea-forward), and the budget already allocated to that vendor category.
- **Show sources.** Each candidate card links to the source URL. Rosie tells Kelsie to verify details before reaching out.
- **No booking, no payments, no scraping beyond the model's web search.**

---

## UX spec

### When it triggers

In a vendor focus chat, Kelsie asks naturally:

- "Can you find me some photographers near our venue?"
- "Who are good florists in the Houston area for our budget?"
- "Show me a few DJs that fit our vibe."

Rosie calls `web_search` (one or more queries), reads results, then calls `present_vendor_candidates` with 2–4 structured options. If she lacks budget/vibe context she can still search, but should fold in what's in `wedding_state`.

### Candidate cards (new component)

After Rosie's short text reply, when the API returns `vendorCandidates`, render a stack of cards below the assistant bubble (same placement as `VendorEmailDraftCard`).

**Each card shows:**

| Field | Display |
|-------|---------|
| Name | vendor business name |
| Location | city / area |
| Price hint | optional, e.g. "from ~$4,000" or "budget-friendly" — only if found |
| Why it fits | one line tying to her vibe/venue/budget |
| Source | link to the result URL (opens new tab) |

**Per-card action:** **Save to considering** — primary button. On click, the client re-POSTs to `/api/chat` with a `saveVendorCandidate` payload (mirror the `primaryPicks` round-trip). Server writes the vendor and returns a short Rosie confirmation. Card shows a saved state after success.

**Optional secondary:** "Not these — search again" hint (just lets her type a refinement; no special handling needed).

Match existing design: cream/blush/sage palette, `rounded-2xl` borders, `text-warm-dark`, hover states consistent with `VendorEmailDraftCard`. Card header copy: "A few options" (not "Rosie found" or "Booked").

### Rosie prose alongside the cards

Short and human: one line introducing the options, noting she can refine, and a reminder to verify details on the vendor's site. Do **not** repeat all candidate details in the chat bubble — the cards carry them.

### After a save

Rosie acknowledges warmly, mentions the vendor is now in "considering" on the planning home, and offers the obvious next step: "Want me to draft an inquiry email?" (hands off to existing `draft_vendor_email`).

---

## API & tool design

### 1. Enable web search (`lib/system-prompt.ts`)

Add the server tool to `getTools()` for the **vendor focus** branch only (v1):

```typescript
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search",
  max_uses: 4,
  user_location: {
    type: "approximate" as const,
    city: "Houston",
    region: "Texas",
    country: "US",
    timezone: "America/Chicago",
  },
};
```

In `getTools`, the `focus?.vendorKey` branch becomes:

```typescript
return [
  ...WEDDING_TOOLS,
  WEB_SEARCH_TOOL,
  PRESENT_VENDOR_CANDIDATES_TOOL,
  DRAFT_VENDOR_EMAIL_TOOL,
  NOTE_FOR_VENDOR_TOOL,
  UPDATE_VENDOR_MEMORY_TOOL,
  GET_ZOLA_SUMMARY_TOOL,
];
```

> Note: `web_search` is a **server tool** executed by Anthropic; its results come back resolved in the same response. Our custom-tool loop only handles `present_vendor_candidates` / `save`. Cast the tools array as needed so the server-tool object type coexists with `Anthropic.Tool` custom tools.

### 2. New custom tool: `present_vendor_candidates`

```typescript
{
  name: "present_vendor_candidates",
  description:
    "Show Kelsie a short list of real vendor options you found via web_search, as selectable cards. Call only after searching, in a vendor focus chat. Include 2-4 candidates grounded in her venue, area, budget, and vibe.",
  input_schema: {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Vendor business name." },
            location: { type: "string", description: "City/area." },
            url: { type: "string", description: "Source result URL (their site or a listing)." },
            priceHint: { type: "string", description: "Optional price signal if found; omit if unknown. Never guess." },
            whyFits: { type: "string", description: "One line tying to her vibe/venue/budget." },
            email: { type: "string", description: "Only if found on their own site/result. Omit otherwise." },
            phone: { type: "string", description: "Only if found. Omit otherwise." },
          },
          required: ["name", "location", "url", "whyFits"],
        },
      },
    },
    required: ["candidates"],
  },
}
```

### 3. Tool handler (`app/api/chat/route.ts`)

On `present_vendor_candidates`:

1. Require a vendor focus (`vendorKey`); if missing, return tool result `"Vendor discovery only runs inside a vendor focus chat."` and do not set the sidecar.
2. Sanitize: trim, cap at 4 candidates, drop any without `name`/`url`. Validate `url` is http(s).
3. Set response-level `vendorCandidates` (last call wins):

```typescript
interface VendorCandidate {
  name: string;
  location: string;
  url: string;
  priceHint: string | null;
  whyFits: string;
  email: string | null;
  phone: string | null;
}
interface VendorCandidates {
  vendor: VendorKey;
  items: VendorCandidate[];
}
```

4. Return tool result: `"Showed N options to Kelsie."`

### 4. Save action — reuse the chat POST (mirror `primaryPicks`)

Client posts to `/api/chat` with:

```typescript
{ message: "", threadKey: "<vendor>", saveVendorCandidate: { name, location, url, priceHint, whyFits, email, phone } }
```

In `handleChatPost`, before the model call (same place `primaryPicks` is handled):

1. If `saveVendorCandidate` present and `threadKey` is a vendor:
   - Write via the existing wedding-state path (use `applyWeddingDataUpdate` per field, or a single merged upsert through `getWeddingData()` + `deepSet`):
     - `vendors.<key>.status = "considering"`
     - `vendors.<key>.name = candidate.name`
     - `vendors.<key>.contact = { name: null, email: candidate.email ?? null, phone: candidate.phone ?? null }`
     - `vendors.<key>.notes = "<location> — <whyFits> (<url>)"`
   - Add a `decisions[]` note only if you want it visible ("Considering <name> for <label>") — optional; keep consistent with how other saves log.
   - `appendVendorNote(vendor, \`Considering ${name} — ${url}\`, "Research")`.
   - Inject a system line into `userMessage` so Rosie acknowledges naturally (same trick as `primaryPicks`): `"[System: Kelsie saved <name> as a considering <label>. Acknowledge briefly and offer to draft an inquiry email. Do not re-list options.]"`
2. Confirm the vendor path is **not** blocked by `isProtectedFromChatWeddingDataPath` (only `intro_completed` should be protected).

### 5. API response

Extend the existing `NextResponse.json` shape:

```typescript
return NextResponse.json({
  message: assistantText,
  suggestFocus,
  emailDraft,
  primaryColorPicker,
  coolorsHandoff,
  vendorCandidates, // VendorCandidates | null
});
```

### 6. Client (`components/ChatInterface.tsx`)

- Add `vendorCandidates` state from the API response (clear on new user message send, exactly like `emailDraft`).
- Render `<VendorCandidatesCard data={vendorCandidates} onSave={...} />` after messages, before the loading indicator.
- `onSave(candidate)` re-POSTs with `saveVendorCandidate` (reuse the existing send path with an empty `message`), then shows the returned Rosie reply and a saved state on that card.
- Do not reconstruct candidates from stored messages on load (ephemeral, like `emailDraft`).

### 7. Tool loop

Web search adds round-trips. Bump the existing iteration cap (currently 3) to **5 for the vendor focus branch only** so `web_search` → `present_vendor_candidates` can complete in one turn. Do not raise it globally.

---

## Prompt changes (`lib/system-prompt.ts`)

### Vendor focus block — add:

```
**Finding vendors (vendor focus only)**

When Kelsie asks you to find, suggest, or research vendors, use web_search to look for real local options, then call present_vendor_candidates with 2-4 of the best. Ground every search in her real wedding: Boxwood Manor in Tomball TX (Houston area), spring 2027, ~250–300 guests, her budget for this category, and her vibe (bright, classy, timeless, hydrangea-forward).

Only include contact email/phone if you actually see it on the vendor's own page — never guess one. Add a source URL for every candidate. Keep your chat text to a one-line intro plus a reminder to verify details on their site; let the cards carry the specifics.

After she saves one, it becomes a "considering" vendor on her planning home. Offer to draft an inquiry email next (draft_vendor_email).
```

### Vendor memory template — add a `## Research` heading:

```markdown
## Research
Dated bullets: vendors surfaced/considered, source URLs, price signals. Not a booking log.
```

---

## New files

| File | Purpose |
|------|---------|
| `components/VendorCandidatesCard.tsx` | Inline candidate cards with Save action |
| `lib/vendor-discovery.ts` | `sanitizeCandidates()`, url validation, notes formatter |
| `lib/vendor-discovery.test.ts` | Unit tests: cap to 4, drop invalid urls, strip empty fields, notes string |

Keep helpers small. No search-provider module.

---

## Out of scope (do not build)

- Main-chat discovery (vendor focus only in v1)
- A custom search API / provider key (use Anthropic web_search)
- Persisting candidate lists, a "saved searches" history, or a comparison table
- Auto-booking, payments, calendar/availability checks
- Vendor shortlist UI like venue (v1 saves a single `considering` vendor; revisit later)
- Scraping vendor sites beyond what web_search returns
- Writing `contact.email` that wasn't found in a result
- Moving status past `considering` automatically (email/booking flows own later statuses)

---

## Verify before building (open questions — resolve first)

1. **Web search availability:** confirm the installed `@anthropic-ai/sdk` (`package.json`, currently `^0.98.0`) supports the `web_search_20250305` server tool **and** that the API key/account has web search enabled. If not, stop and report — do not silently fall back to a fake search.
2. **Model support:** check the model used in `app/api/chat/route.ts` supports server-side web search; note it in `PROJECT.md` if a model change is needed.
3. **Cost:** web search is billed per search. Keep `max_uses: 4` and note expected cost in the PR description.

---

## Verification checklist

- [ ] `npm run build` passes
- [ ] `npm test` passes (new `lib/vendor-discovery.test.ts`)
- [ ] In `/chat/florist`, "find me florists near our venue" returns assistant text + `vendorCandidates` in the network response (2–4 items, each with a real source URL)
- [ ] Candidate cards render with name, location, why-it-fits, source link; price hint only when present
- [ ] "Save to considering" writes `vendors.florist` (`status: considering`, `name`, `notes`, `contact` only if email/phone were found) — verify in Supabase
- [ ] Saved vendor shows on planning home Dashboard with the `considering` pill
- [ ] After save, Rosie offers to draft an inquiry email; `draft_vendor_email` still works end-to-end
- [ ] No invented emails: a candidate with no found email saves `contact.email = null`
- [ ] Stored assistant message in `messages.content` is plain text only (no tool JSON)
- [ ] No new env vars required (web search rides the existing Anthropic key)
- [ ] `vendor_memory` gains a `## Research` note after candidates are saved

---

## Manual test script

1. Open `/chat/florist`.
2. Ask: "Can you find a few florists near Boxwood Manor that fit our bright, classy vibe and our budget?"
3. Verify Rosie searches, returns a one-line intro + 2–4 candidate cards with source links.
4. Tap **Save to considering** on one.
5. Confirm Rosie acknowledges, the florist appears as `considering` on the home Dashboard, and she offers to draft an email.
6. Ask "draft an inquiry email" → existing flow produces a draft card.
7. Repeat in `/chat/photographer` to confirm it's generic across vendor keys.

---

## Docs

Update `PROJECT.md`:

- New tools: `web_search` (server) + `present_vendor_candidates` in vendor focus
- New component `VendorCandidatesCard.tsx`, new helper `lib/vendor-discovery.ts`
- New API response field `vendorCandidates` and request field `saveVendorCandidate`
- Vendor lifecycle now: discover → considering → contacted → booked

No `SETUP.md` changes unless step 2 (model) requires one.

---

## Implementation notes

- **Mirror `emailDraft`/`primaryPicks` exactly** — structured sidecar on the response, save via a field on the chat POST, no embedding in stored message content.
- **Simplicity first** — one server tool toggle, one custom tool, one component, one small util. No new tables, no new top-level routes (reuse `/api/chat`).
- **Surgical changes** — do not refactor `MessageBubble`, chat storage, auth, or the venue/Zola code.
- **Privacy/Sentry** — do not log candidate contact details or search bodies; existing `lib/sentry-scrub.ts` rules are sufficient as long as you don't add new logging of vendor data.
- **Coding discipline** — every changed line should trace to discovery → considering. If it grows past ~one component + one tool + helpers, you've overbuilt.

---

## Success

Kelsie opens her florist focus, asks Rosie to find options near Boxwood Manor in her budget, gets three real florists as cards with source links, saves the one she likes, and sees it land as "considering" on her planning home — then Rosie offers to draft the inquiry email. The vendor research that used to happen in Google and Pinterest now starts inside Rosie.
