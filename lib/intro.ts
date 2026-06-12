import type { WeddingState } from "./types";

/** Home welcome overlay shows before Kelsie's first visit is acknowledged. */
export function shouldShowWelcome(weddingData: WeddingState): boolean {
  return !weddingData.intro_completed;
}
