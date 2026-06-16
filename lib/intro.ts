import type { WeddingState } from "./types";

/** Home welcome overlay after the vibe intro, before first home visit is acknowledged. */
export function shouldShowWelcome(weddingData: WeddingState): boolean {
  return (
    !weddingData.intro_completed && weddingData.aesthetic.introCompleted
  );
}

/** Main chat intro should be the landing experience until the vibe arc finishes. */
export function shouldRedirectToIntroChat(weddingData: WeddingState): boolean {
  return !weddingData.aesthetic.introCompleted;
}

/** Beat 1 opening line for main chat when aesthetic intro is not complete. */
export function introOpeningMessage(): string {
  return `Hey Kelsie, I'm Rosie, your personal wedding planner agent. First of all, congrats on the engagement!!!

We'll get to your planning home page in a sec. Your answers here will help us build a space that keeps you on track and shows you what's next.

To start, I'd love to get a read on the vibe. Picture a wedding moment that stuck with you, one you went to, or one you saw online. What's happening in that moment?`;
}
