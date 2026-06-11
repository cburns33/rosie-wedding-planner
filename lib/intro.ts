import type { WeddingState } from "./types";

/** Intro shows only before Kelsie's first reply on the opening screen. */
export function shouldShowIntro(
  weddingData: WeddingState,
  messageCount: number
): boolean {
  if (weddingData.intro_completed) return false;
  // Existing sessions before this flag was added
  if (messageCount > 0) return false;
  return true;
}
