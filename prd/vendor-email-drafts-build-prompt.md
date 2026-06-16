# Builder prompt — Vendor email drafts for Rosie

## Task

Implement **Tier 1 vendor outreach**: Rosie drafts inquiry/follow-up emails for vendors; Kelsie copies or opens them in her own mail app. **No outbound send.** No email provider (Resend, SendGrid, etc.). No new database tables.

**Goal:** When Kelsie is ready to reach out to a photographer, caterer, etc., Rosie writes a polished draft grounded in her wedding state, surfaces it as a scannable card with **Copy** and **Open in email**, and remembers the draft in internal vendor memory.

---

## Read first (in order)

1. `PROJECT.md` — architecture, chat flow, tools, file map
2. `prd/vendor-chats.md` — vendor focus model (implemented)
3. `lib/system-prompt.ts`, `app/api/chat/route.ts` — tools + prompt + API response shape (`suggestFocus` pattern)
4. `components/ChatInterface.tsx` — how `suggestFocus` renders inline after a reply
5. `components/Dashboard.tsx` — existing `mailto:` link on vendor contact email
6. `lib/types.ts`, `lib/vendors.ts` — `VendorEntry.contact`, vendor keys

---

## Locked product decisions (do not re-debate)

- **Draft only.** Rosie never sends email. No API keys for email providers. No "Send" button.
- **Kelsie sends from her own inbox.** `mailto:` opens her default mail client; she is always in control.
- **Sign as Kelsie**, not Rosie. Closing line uses Kelsie's name (first name is fine: "Kelsie"). No "sent on behalf of" framing.
- **Primary context: vendor focus chats** (`/chat/[vendor]`). Tool also available in main **Ask Rosie** when a specific vendor is named in the tool call.
- **Use contact email from `wedding_state`.** If missing, Rosie asks Kelsie for it and saves via existing `update_wedding_data` — do not invent an address.
- **Ephemeral UI card.** Draft appears inline after the reply that generated it (same turn as `suggestFocus`). Do not persist drafts to Supabase in v1; Rosie can redraft on request.
- **Internal memory only.** Log a one-line outreach note in vendor memory under a new `## Outreach` heading. Kelsie never sees raw memory.
- **Optional status bump.** If Kelsie says she sent it, Rosie may set `vendors.<key>.status` to `contacted` via existing `update_wedding_data` — no new tool.

---

## UX spec

### When it triggers

Kelsie asks naturally, e.g.:

- "Can you draft an email to ask about their availability?"
- "Help me write a follow-up to the quote they sent"
- "I want to reach out to this photographer"

Rosie should call `draft_vendor_email` when she has enough context (vendor identity, purpose of email). If contact email is missing, ask once, save it, then draft.

### Inline card (new component)

After Rosie's text reply, when the API returns `emailDraft`, render a card below the assistant bubble (same placement pattern as `suggestFocus`).

**Card contents:**

| Field | Display |
|-------|---------|
| To | `Maria Chen <maria@studio.com>` or email only |
| Subject | full subject line |
| Body | scrollable preview (max ~8 lines, `whitespace-pre-line`) |

**Actions:**

1. **Copy email** — copies full body to clipboard (primary action). Toast or brief "Copied" state on button.
2. **Open in email** — `mailto:` link with `to`, `subject`, `body` query params. **Only show when encoded URL length ≤ 1800 chars** (safe margin under client limits). If too long, hide this button and show subtle hint: "Email is long — copy and paste into your mail app."

Match existing design: cream/blush palette, rounded-2xl border, `text-warm-dark`, hover states consistent with `suggestFocus` link styling.

**Copy for card header:** "Draft email" (not "Rosie sent" or "Ready to send").

### Rosie prose alongside the card

Rosie's chat text should be short and human: introduce the draft, mention she can tweak anything, remind her to send from her own email. Do **not** duplicate the full email body in the chat bubble if the card shows it — a one-line intro is enough.

---

## API & tool design

### New tool: `draft_vendor_email`

Add to `getTools()` for **both** main chat and vendor focus.

```typescript
{
  name: "draft_vendor_email",
  description: "Prepare a vendor outreach email for Kelsie to send herself. Call when she asks for a draft, inquiry, or follow-up email. Do not call for general advice about emailing — only when producing an actual draft.",
  input_schema: {
    type: "object",
    properties: {
      vendor: {
        type: "string",
        enum: [...VENDOR_KEYS],
        description: "Vendor category key."
      },
      to_email: {
        type: "string",
        description: "Recipient email. Omit to use vendors.<vendor>.contact.email from state."
      },
      to_name: {
        type: "string",
        description: "Recipient name for greeting. Omit to use contact.name or vendor business name."
      },
      subject: {
        type: "string",
        description: "Email subject line."
      },
      body: {
        type: "string",
        description: "Full email body. Sign as Kelsie. Professional-warm tone. Plain text only, no markdown."
      },
      purpose: {
        type: "string",
        enum: ["inquiry", "follow_up", "hold_date", "other"],
        description: "Internal tag for memory logging."
      }
    },
    required: ["vendor", "subject", "body", "purpose"]
  }
}
```

### Tool handler (`app/api/chat/route.ts`)

On `draft_vendor_email`:

1. Resolve `vendor` key; reject unknown.
2. Resolve `to_email`: input → `weddingData.vendors[vendor].contact?.email`. If still missing, return tool result `"No email on file for this vendor — ask Kelsie for the contact email and save it before drafting."` (do not set `emailDraft`).
3. Resolve `to_name`: input → `contact.name` → `vendors[vendor].name` → null.
4. Set response-level `emailDraft` (last draft wins if multiple calls in one turn — unlikely):

```typescript
interface EmailDraft {
  vendor: VendorKey;
  to: string;
  toName: string | null;
  subject: string;
  body: string;
}
```

5. Append outreach note via existing `appendVendorNote(vendor, note, "Outreach")`:

   `(2026-06-12) Draft inquiry email to maria@studio.com — subject: "Spring 2027 wedding photography inquiry"`

6. Return tool result: `"Draft ready for Kelsie."`

### API response

Extend JSON response:

```typescript
return NextResponse.json({
  message: assistantText,
  suggestFocus,
  emailDraft, // EmailDraft | null
});
```

### Client (`components/ChatInterface.tsx`)

- Add state for `emailDraft` from API response (clear on new user message send).
- Render `<VendorEmailDraftCard draft={emailDraft} />` after messages, before loading indicator (mirror `suggestFocus` placement).
- Pass `emailDraft` only from latest response — do not try to reconstruct from stored messages on page load.

---

## Prompt changes (`lib/system-prompt.ts`)

### Base prompt addition (in `ROSIE_BASE_PROMPT` or vendor section)

Add a **Vendor outreach** block:

```
**Vendor outreach (draft only)**

When Kelsie wants to email a vendor, draft the email with `draft_vendor_email`. You prepare text; she sends it from her own inbox. Never claim you sent anything. Never offer to send on her behalf.

Email tone: professional, warm, concise. Plain text. Sign as Kelsie (not Rosie). Include what's relevant: spring 2027, ~250–300 guests, southeast/central Texas / Houston area, elevated classic aesthetic — only what fits the ask.

Typical structure:
- Brief intro (who she is, wedding date window)
- Specific ask (availability, pricing, portfolio review, follow-up on quote)
- One or two relevant details (guest count, venue area if known)
- Warm close + sign-off as Kelsie

If `vendors.<name>.contact.email` is missing, ask for it once, save via `update_wedding_data`, then draft. If she hasn't picked a specific business yet, help her choose first — don't draft to a placeholder.

After she confirms she sent an email, you may update `vendors.<name>.status` to `contacted` if appropriate.
```

### Vendor focus block

Add one line: "This focus is the natural place to draft outreach emails for this vendor."

### Memory template

Extend `VENDOR_MEMORY_TEMPLATE` with:

```markdown
## Outreach
Bullets: date, recipient, purpose (inquiry / follow-up), subject line — drafts prepared for Kelsie to send herself. Not a sent log unless she confirms she sent it.
```

---

## New files

| File | Purpose |
|------|---------|
| `components/VendorEmailDraftCard.tsx` | Inline draft card UI |
| `lib/vendor-email.ts` | `buildMailtoUrl()`, `canUseMailto()`, clipboard helper |
| `lib/vendor-email.test.ts` | Unit tests for URL encoding + length guard |

Keep helpers small. No separate email service module.

### `lib/vendor-email.ts` sketch

```typescript
export function buildMailtoUrl(opts: {
  to: string;
  subject: string;
  body: string;
}): string;

/** Returns false when encoded mailto would exceed maxLength (default 1800). */
export function canUseMailto(opts: {...}, maxLength?: number): boolean;

export async function copyToClipboard(text: string): Promise<boolean>;
```

Use standard `encodeURIComponent` for query params. `mailto:` format: `mailto:addr?subject=...&body=...`

---

## Out of scope (do not build)

- Sending email server-side (Resend, Postmark, SendGrid, SMTP)
- Inbound reply tracking or "did they respond?"
- Persisting drafts to Supabase / draft history UI
- Attachments
- Rich HTML email
- Hank as co-sender (v1: Kelsie only unless she asks Rosie to mention Hank in body copy)
- Settings for Kelsie's reply-to address or email signature block
- Auto-setting `status: contacted` on draft alone (only when she confirms send)

---

## Verification checklist

Before finishing, confirm:

- [ ] `npm run build` passes
- [ ] `npm test` passes (new `lib/vendor-email.test.ts`)
- [ ] In `/chat/caterer`, asking "draft an inquiry email" returns assistant text + `emailDraft` in network response
- [ ] Card shows To, Subject, Body preview with Copy and Open in email (when short enough)
- [ ] Copy puts full body on clipboard
- [ ] Open in email opens mail client with pre-filled fields (manual test)
- [ ] Long body (>1800 char mailto): Copy visible, Open in email hidden with hint
- [ ] Missing contact email: Rosie asks, saves via tool, then drafts on follow-up (no crash)
- [ ] Main chat `/chat` can draft when vendor specified in tool (e.g. photographer)
- [ ] `vendor_memory` gains `## Outreach` note after draft (inspect Supabase or log)
- [ ] No new env vars required
- [ ] Stored assistant message in DB is plain text only (no broken JSON in `messages.content`)

---

## Manual test script

1. Set `vendors.photographer.contact` in DB or tell Rosie: "The photographer is Lens & Light, email hello@lenslight.com, contact Maria."
2. Open `/chat/photographer`
3. Ask: "Can you draft an email asking about spring 2027 availability and their packages?"
4. Verify card appears, copy works, mailto works
5. Say: "I sent it" — verify status can move to `contacted`
6. Ask for another draft with a intentionally long body (paste lorem) — verify mailto hidden

---

## Docs

Update `PROJECT.md` briefly:

- New tool `draft_vendor_email`
- New component `VendorEmailDraftCard.tsx`
- API response field `emailDraft`

No `SETUP.md` changes (no env vars).

---

## Implementation notes

- **Follow `suggestFocus` pattern** — structured sidecar on API response, client-only affordance, not embedded in stored message content.
- **Simplicity first** — one new tool, one new component, one small util file, prompt additions only.
- **Surgical changes** — do not refactor `MessageBubble`, chat storage, or auth.
- **Tool loop limit** — existing 3-iteration cap in chat route is sufficient; draft + memory update + wedding_data can coexist in one turn.
- **Security** — no PII concerns beyond what's already in vendor contact fields; no new Sentry scrub rules needed unless you log draft bodies (don't).

---

## Success

Kelsie is in her caterer focus, asks Rosie to draft an inquiry email, gets a warm professional draft in a card, taps Copy or Open in email, sends from Gmail herself. Rosie remembers an outreach note internally. She never thinks Rosie emailed anyone.
