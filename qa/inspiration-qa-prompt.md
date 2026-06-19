# QA agent — Visual Inspo Depot

Use this prompt when testing **`/chat/inspiration`** (Visual Inspo Depot). Do **not** use the intro QA prompt for inspo uploads.

## Environment

| Item | Value |
|------|--------|
| App URL | http://localhost:3000 |
| Auth bypass (local) | `DISABLE_AUTH=true` in `.env.local` |
| Dev server | Must already be running (`npm run dev`) |

## Critical: how to upload screenshots

**Never paste an image into the chat text field.** Pasting dumps a huge data URL into the message, can freeze or crash the page, and may sign you out.

**Always use the paperclip attach button** (left of the text field):

1. Open `/chat/inspiration`
2. Click the **paperclip / attach** button
3. Choose a JPEG, PNG, or WebP screenshot (Pinterest pins, mood boards, venue photos)
4. Confirm a thumbnail preview appears above the composer
5. Optionally add a short caption, then click **Send**

Paste in the text field is only for **plain text** (e.g. "this is the ceremony vibe I want").

## Happy path

| Step | Action | Pass criteria |
|------|--------|---------------|
| I1 | Open `/chat/inspiration` | Header says **Visual Inspo Depot**; paperclip visible |
| I2 | Attach 1 screenshot via paperclip | Thumbnail preview appears |
| I3 | Send with or without caption | Rosie replies with a warm description (not "Something went wrong") |
| I4 | `GET /api/inspiration-memory` | `observationCount` increases after Rosie saves memory (bullets must use `- (YYYY-MM-DD)` format) |
| I5 | Home `/` → Visual Inspo Depot card | Shows updated count / latest preview |

## Optional

| Step | Action | Pass criteria |
|------|--------|---------------|
| I6 | Click suggested prompt "Summarize what I've shared…" | Readable prose summary, not raw markdown |
| I7 | Attach 2–3 images in one message | Rosie acknowledges batch; no error toast |

## Failure modes to report

- Attach button used but Rosie says "Something went wrong" or connection hiccup
- Page crash or redirect to `/login` after paste or attach
- Home card stays empty after successful upload (often means observations missing date prefix)

## API

```bash
curl -s http://localhost:3000/api/inspiration-memory
```

Chat POST (for debugging only — prefer browser attach in QA):

```bash
# Do not paste base64 by hand in normal QA; use the paperclip in the UI.
```
