/**
 * Option C hero Lottie — Rosie handwriting from Lottie Creator.
 *
 * Creator base file (MCP): fileId 73c38b3d-81b2-475e-a0c4-a2ce66a15549
 * https://creator.lottiefiles.com/?fileId=73c38b3d-81b2-475e-a0c4-a2ce66a15549
 *
 * Rebuild local export: node scripts/build-rosie-lottie.mjs
 */
export const CREATOR_BASE_FILE_ID = "73c38b3d-81b2-475e-a0c4-a2ce66a15549";

export const INTRO_HERO_LOTTIE = {
  src: "/animations/rosie_anim.lottie",
  /** Draw-only frames — trim end 0→100 @ frames 25–300 */
  segment: [25, 300] as [number, number],
} as const;

/** Rosie palette for Creator stroke/fill tweaks */
export const INTRO_LOTTIE_COLORS = {
  blush: "#c9a0a0",
  blushLight: "#f2e0e0",
  sage: "#8faf8f",
  warmLight: "#b0a99f",
  cream: "#faf8f5",
} as const;
