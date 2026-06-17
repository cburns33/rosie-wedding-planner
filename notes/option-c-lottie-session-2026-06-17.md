# Session handoff — Option C intro Lottie (2026-06-17)

Handoff note for continuing intro mockup work on another machine.

## Goal

Customize the Lottie Creator base file for **Option C** (`/mockups` tab C): blush palette, hero word **Rosie**, trim-path **draw only** (no erase), export to `public/animations/`, wire into the app, verify on mockups.

## What we did

### Lottie Creator (MCP)

- **Creator file:** `73c38b3d-81b2-475e-a0c4-a2ce66a15549`
- **URL:** https://creator.lottiefiles.com/?fileId=73c38b3d-81b2-475e-a0c4-a2ce66a15549
- Removed the original **hello** layer.
- Imported **Rosie** SVG paths (Great Vibes outlines, 11 glyph paths from `lib/mockup-paths.ts`).
- Applied **blush stroke** `#c9a0a0` (Creator rgb ~201, 161, 161), width 3.
- **Trim path draw-only:** end 0→100%, frames **25–300**; erase keyframes removed (previously went to frame 690).
- Scene shortened to **320 frames @ 120fps**.

**Note:** Creator MCP has **no export API**. Cloud file holds live edits; local `.lottie` was built from MCP path capture (see below).

### Local export pipeline

| File | Purpose |
|------|---------|
| `scripts/rosie-creator-export.json` | Path/trim/stroke payload captured from Creator MCP |
| `scripts/build-rosie-lottie.mjs` | Builds `public/animations/rosie_anim.lottie` |
| `public/animations/rosie_anim.lottie` | Shipped hero animation |
| `public/animations/hello_anim.lottie` | Original placeholder (kept, unused by Option C) |

Rebuild after Creator changes:

```bash
node scripts/build-rosie-lottie.mjs
```

Or export dotLottie from Creator UI (Export → Handoff) and replace `public/animations/rosie_anim.lottie`.

### App wiring

| File | Change |
|------|--------|
| `lib/intro-lottie.ts` | `INTRO_HERO_LOTTIE.src` → `/animations/rosie_anim.lottie`, segment `[25, 300]` |
| `components/intro-mockups/IntroMockupC.tsx` | Uses `LottieHandwriting`; caption: "Handwritten 'Rosie' in blush" |
| `components/LottieHandwriting.tsx` | DotLottie player with segment + `onComplete` |
| `middleware.ts` | `/mockups` added to `PUBLIC_PATHS` (preview without auth in prod) |

### Verified

- `npm run dev` → http://localhost:3000/mockups → tab **C — Ink settle** → Replay
- Flow: companion `HandwritingDraw` → blush Rosie Lottie → "Spring 2027"

## Known issue (discussed, not fixed)

**Stroke + trim path draws letter outlines; counters stay hollow** (o, e, R loops look unfilled).

Root cause: animation is **stroke trim on outline contours**, not solid fill reveal.

**Preferred directions (no manual bezier editing):**

1. **Simplest:** Replace hero `LottieHandwriting` with `HandwritingDraw` + `MOCKUP_PATHS.rosie` + blush fill (same as tabs A/B). Solid glyphs, per-letter fade/scale.
2. **Keep Lottie + draw feel:** Filled glyph layer + **alpha matte** driven by a thin trim stroke (fill revealed under the pen).
3. **Middle ground:** Filled paths with **per-glyph stagger** in Lottie or SVG.

Filled paths already exist in `lib/mockup-paths.ts` (`generate-mockup-paths.mjs` / fontkit). The hollow look is from Creator import with **stroke + trim**, not bad path data.

## Broader mockup feature (same commit)

This session sits on top of intro mockup scaffolding also in the repo:

- `/mockups` page — `MockupsReview`, tabs A/B/C
- `HandwritingDraw`, `lib/mockup-paths.ts`, `scripts/generate-mockup-paths.mjs`
- `@lottiefiles/dotlottie-react` dependency
- `app/globals.css` mockup animation utilities

## Quick start on another computer

```bash
git pull origin main
npm install
npm run dev
# open http://localhost:3000/mockups → tab C
```

Optional: open Creator file (link above) to tweak timing/colors, then rebuild or re-export.

## Open decisions

- [ ] Keep Lottie for Option C hero, or switch to `HandwritingDraw` for solid fill?
- [ ] If Lottie: matte reveal vs per-glyph stagger?
- [ ] Remove placeholder caption / update mockups page copy ("Placeholder Great Vibes paths…") when hero is final?
- [ ] Re-sync `rosie-creator-export.json` after next Creator edit?

## Palette reference (`INTRO_LOTTIE_COLORS`)

- blush: `#c9a0a0`
- blushLight: `#f2e0e0`
- sage: `#8faf8f`
- warmLight: `#b0a99f` (companion line in Option C)
- cream: `#faf8f5`
