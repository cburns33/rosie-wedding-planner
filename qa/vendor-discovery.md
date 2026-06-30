# QA — Vendor discovery & shortlist

Reference spec: [`prd/vendor-discovery-build-prompt.md`](../prd/vendor-discovery-build-prompt.md)

## Environment

| Item | Value |
|------|--------|
| App URL | http://localhost:3000 |
| Auth bypass (local) | `DISABLE_AUTH=true` in `.env.local` |
| Dev server | Must already be running (`npm run dev`) |

**Local dev points at the same production Supabase project — there is no separate staging DB.** Anything you save while testing (shortlist entries, chat messages, decisions, vendor memory) is real data Kelsie would see. Always reset before handing off or stepping away.

## Reset a vendor focus after testing

Clears one vendor back to a first-visit state: `vendors.<key>` reset to `undecided` with an empty shortlist, matching decision-log entries removed, the chat thread wiped, and internal `vendor_memory` cleared.

```bash
node scripts/reset-vendor-focus.mjs <vendor>
# e.g.
node scripts/reset-vendor-focus.mjs florist
```

Valid keys: `photographer`, `videographer`, `caterer`, `florist`, `dj`, `officiant`, `cake`, `hair_makeup`, `transportation` (see `lib/vendors.ts`).

**Verify reset:**

```bash
curl -s http://localhost:3000/api/wedding-state | grep -A8 '"florist"'
```

Expect `"status":"undecided"`, `"shortlist":[]`, `"name":null`.

## Checklist — before/after testing a vendor focus

- [ ] Note which vendor key(s) you're about to test in
- [ ] Test freely (search, save multiple candidates, ask follow-ups)
- [ ] When done, run `node scripts/reset-vendor-focus.mjs <vendor>` for each vendor touched
- [ ] Confirm via `GET /api/wedding-state` that the vendor is back to `undecided` / empty shortlist
- [ ] Refresh `/` and `/chat/<vendor>` to confirm no leftover "N in consideration" tag or chat history

## Manual test flow

1. Open `/chat/<vendor>`.
2. Ask: "Can you find a few [vendors] near Boxwood Manor that fit our vibe and budget?"
3. Confirm Rosie searches, returns a one-line intro + 2–4 candidate cards with source links.
4. Tap **Save to considering** on one — confirm it shows "Saved" and the home Dashboard shows "1 in consideration" for that category.
5. Save a second candidate from the same round (or ask for more suggestions, then save one) — confirm the count updates to "2 in consideration" and both cards independently show "Saved" (no reverting).
6. Reopen `/chat/<vendor>` — confirm a suggested prompt ("Who's on my \<vendor\> shortlist?") appears, and asking it makes Rosie recap names from state, not raw JSON.
7. Ask "draft an inquiry email to [one of the saved names]" — confirm `draft_vendor_email` still works end-to-end.
8. Run the reset script for that vendor.
