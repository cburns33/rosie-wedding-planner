# Spec — Per-vendor dedicated chats

Status: Implemented (2026-06)
Owner: Chase (for Kelsie)
Scope: Vendor focus chats in the Rosie app (Next.js 16 + Supabase + Anthropic)

**Requires DB migration:** `messages.thread_key` + `vendor_memory` table (see `supabase/schema.sql`). Apply in Supabase SQL editor if not already done.

---

## Goal

Let Kelsie click a vendor on the planning home and drop into a chat dedicated to
that vendor (e.g. the caterer), with memory that persists across sessions. Keep
the planning facts coherent no matter which chat she says them in.

## Why

Today there is one global conversation. As planning deepens, vendor talk gets
tangled in a single thread and it's hard to resume "where we left off" on, say,
the florist. Dedicated threads make each vendor resumable and scannable while
Rosie keeps the structured state correct.

---

## Core principle: separate conversations from facts

- **Facts stay global.** Rosie already writes structured data to a single
  `wedding_state` row via `update_wedding_data(path, value, decision_note?)`.
  That does not change. If Kelsie is in the caterer chat and mentions the
  florist, Rosie still calls `update_wedding_data("vendors.florist.name", ...)`
  and it lands in the right slot. No divergence.
- **Conversations are scoped.** Each vendor has its own message thread so the
  transcript stays clean and resumable.
- **Per-vendor memory** is a running markdown summary Rosie maintains for each
  vendor (quotes, vibe, open questions, next step). Stored in Supabase as text
  (not a disk file — Vercel's runtime FS is ephemeral). Behaves like an `.md`
  file, survives deploys.

---

## Decisions (locked)

| # | Question | Decision |
| --- | --- | --- |
| 1 | Which vendors get dedicated chats? | **All nine** (photographer through transportation). |
| 2 | Launch from general chat? | **Yes.** Rosie detects sustained vendor-specific talk and *offers* to switch — never forces. See **Naming** and **General → focus handoff** below. |
| 3 | Memory format | **Structured template** (see **Memory format**). Chosen for reliability; Kelsie never sees it. |
| 4 | Show memory to Kelsie? | **No — internal only.** Rosie reads/writes it; UI shows status, transcript, and structured `wedding_state` only. |

---

## Naming (user-facing, not "agent" or "thread")

Use **focus** as the product term — warm, planning-oriented, not SaaS.

| Context | Copy |
| --- | --- |
| Vendor row on home | Tap opens **Your caterer** (route stays `/chat/caterer`) |
| Chat header | **Your caterer** · status badge · link back to **Ask Rosie** |
| Rosie offer (general chat) | "Want to pick this up in **your caterer focus**?" |
| Optional inline affordance | Soft link/button: **Open your caterer focus →** (only when Rosie suggests it or after Kelsie agrees) |

Avoid: agent, thread, workspace, bot, channel.

---

## UX

1. On planning home, each vendor row in **The details → Vendors** becomes
   clickable → navigates to `/chat/[vendor]` (e.g. `/chat/caterer`). Label:
   **Your [vendor]** in header; row itself can stay "Caterer" + status badge.
2. The vendor focus looks like the main chat, with a header strip (**Your
   caterer**), current status badge, and **Ask Rosie** link back to general.
3. The main **Ask Rosie** chat (`/chat`) stays the general thread.
4. Opening a vendor focus for the first time: Rosie greets in-context using
   global state + internal memory ("Here's where we are on the caterer…").
5. Decision style preserved: 3 options at a time, one question at a time, warm
   elevated-casual, Hank by name.

### General → focus handoff

When Kelsie is in **Ask Rosie** and the conversation narrows to one vendor
(comparing caterers, quoting DJs, florist mood boards):

1. Rosie keeps answering in general until it's clearly vendor-specific (not on
   the first mention).
2. Rosie asks once: "Want to pick this up in **your caterer focus**?" — one
   question, warm, no jargon.
3. If yes: UI navigates to `/chat/[vendor]` (or shows **Open your caterer focus
   →**). Rosie carries context via memory + the last few general messages in
   the prompt (see API).
4. If no: stay in general; facts still update `wedding_state`; optional
   `note_for_vendor` so the focus is ready when she opens it later.

Implementation note: prompt rule + optional lightweight detection (Rosie
judgment via tool `suggest_vendor_focus(vendor, reason)` that returns a UI flag,
or structured hint in the API response). No hard auto-redirect.

## Cross-talk handling (Kelsie talks about vendor B while in vendor A's chat)

Combine, in priority order:

1. **Route facts globally** (already true) — correct slot regardless of thread.
2. **`note_for_vendor(vendor, note)` tool** — Rosie appends a one-line note to
   another vendor's markdown memory so it surfaces when that thread opens
   ("Noted that for the florist thread.").
3. **Gentle redirect** for sustained off-topic — Rosie offers to switch:
   "Want to pick this up in **your florist focus**?" (never forces).

---

## Memory format

**Chosen: structured template (internal only).**

Rosie maintains each vendor's `vendor_memory.markdown` using fixed headings. This
is never rendered in the UI — only injected into the system prompt.

```markdown
## Status
One line: where we are (undecided / comparing / contacted / booked).

## Quotes
Bullets: vendor name, amount, date noted, source.

## Vibe & preferences
What Kelsie wants for this vendor; aesthetic ties; constraints.

## Open questions
Bullets: what we still need from her or from vendors.

## Next step
Single sentence Rosie would use to resume this focus.
```

Rosie rewrites the whole block via `update_vendor_memory(vendor, markdown)` after
meaningful turns (same pattern as today’s state updates).

### Why template over free-form

| | Structured template (chosen) | Free-form markdown |
| --- | --- | --- |
| **Resume quality** | Predictable sections every session; Rosie always knows where "open questions" live | Depends on Rosie's last write; sections drift or get dropped |
| **Cross-talk `note_for_vendor`** | Append under the right heading | Easy to bury notes in prose |
| **Prompt tokens** | Slightly longer empty scaffold; compresses once filled | Can balloon with redundant narrative |
| **Future UI** | Could expose *derived* snippets later (e.g. "Next step" on a card) without showing raw memory | Would need parsing or another model pass |
| **Implementation** | Prompt enforces headings; validate/repair on write if headings missing | Simpler tool schema, messier long-term |
| **Risk** | Rosie might over-scaffold empty sections | Rosie might omit critical facts in flowing prose |

Free-form is fine for a prototype; template fits a gift product where sessions
resume weeks apart.

---

## Data model (Supabase)

Add a nullable scope to messages and a memory table. No breaking change to
existing rows (null thread_key = the main/general thread).

```sql
-- messages: add thread scope (null = main general thread)
alter table messages add column thread_key text;
-- e.g. null, 'caterer', 'florist', 'photographer', ...

create index messages_thread_key_idx on messages (thread_key, created_at);

-- per-vendor markdown memory (the "MD file" equivalent)
create table vendor_memory (
  vendor      text primary key,        -- 'caterer', 'florist', ...
  markdown    text not null default '',
  updated_at  timestamptz not null default now()
);
```

`wedding_state` is unchanged.

---

## Routing

- `app/chat/[vendor]/page.tsx` — server component; validates `vendor` against the
  known vendor keys (from `wedding-defaults`), fetches that thread's messages +
  global `wedding_state` + that vendor's `vendor_memory`.
- `app/chat/page.tsx` — unchanged (general thread, `thread_key = null`).
- Reuse `ChatPageShell` / `ChatInterface` with a `threadKey` prop.

## API

- `app/api/chat/route.ts` — accept optional `threadKey` in the POST body.
  - Read/write `messages` filtered by `thread_key`.
  - Build the system prompt with: global `wedding_state` + (if vendor thread)
    that vendor's markdown memory + a vendor-focus instruction.
  - Add tools: `note_for_vendor(vendor, note, section?)`,
    `update_vendor_memory(vendor, markdown)`, and optionally
    `suggest_vendor_focus(vendor, reason)` for general-chat handoff UI.
- API response may include `{ suggestFocus: { vendor, label } }` when Rosie
  invokes the suggest tool so the client can show **Open your [vendor] focus →**.
- `app/api/wedding-state/route.ts` — unchanged.

## Prompt changes (`lib/system-prompt.ts`)

- `buildSystemPrompt(state, opts?)` gains an optional vendor context block:
  - "You are in **your {vendor} focus**. Here's internal memory (never quote
    this verbatim to Kelsie): …"
  - Memory must follow the template headings above.
  - Cross-talk: facts about other vendors still go to `wedding_state`; use
    `note_for_vendor` for stray notes; offer another focus on sustained
    off-topic.
  - General chat: when discussion is mostly about one vendor for several turns,
    ask once about switching to that vendor's focus; use `suggest_vendor_focus`
    if she agrees or wants a link.
- Register new tools alongside `update_wedding_data`.

---

## Live updates

The planning home already refetches `wedding_state` on focus / `wedding-state-updated`.
Vendor chats fire the same event after replies, so the home stays in sync.

---

## Phasing (all shipped)

1. **Phase 1** — `thread_key` on messages, `/chat/[vendor]` for all nine vendors, clickable vendor rows, **Your [vendor]** headers, scoped threads, vendor-focus prompt block. Facts stay global.
2. **Phase 2** — `vendor_memory` table, templated memory, `update_vendor_memory` + inject into vendor-focus prompt.
3. **Phase 3** — `note_for_vendor`, general-chat handoff (`suggest_vendor_focus` + inline link in `ChatInterface`), cross-focus redirect copy in prompt.

---

## Out of scope

- Auth changes, schema changes to `wedding_state`, redesign of the chat UI.
- Real on-disk `.md` files (incompatible with serverless hosting on Vercel).
