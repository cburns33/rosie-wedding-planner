import type { IntroBeatId } from "./intro-beats";
import { looksLikeStructuralLayoutAnswer } from "./intro-beats";

/** Beats 2–5a use server-scripted questions; the LLM only writes one reflect sentence. */
export const SCRIPTED_INTRO_BEATS: IntroBeatId[] = ["2", "3", "4", "5a"];

export function isScriptedIntroBeat(beat: IntroBeatId): boolean {
  return SCRIPTED_INTRO_BEATS.includes(beat);
}

/** Fixed forward question per beat (PRD copy). */
export function getIntroBeatQuestion(beat: IntroBeatId): string | null {
  switch (beat) {
    case "2":
      return "When you think about that moment, what felt right? The energy, a detail, the way the space felt?";
    case "3":
      return `Separate question, and this one is more practical.

Is there a wedding you've been to or seen that you'd want to use as inspiration for the big stuff — venue, layout, dinner format, that kind of thing? It doesn't have to be the same wedding as the moment you just described.`;
    case "4":
      return `From that — or from the moment you described earlier — what would you actually want for yours?

And what would feel wrong if you copied it straight over?`;
    case "5a":
      return `Let's pick a starting color scheme for the app and for how I'll talk about your florals and décor. Nothing permanent — you can change it anytime in chat.

Tap two colors below that feel closest to your vibe.`;
    default:
      return null;
  }
}

const REFLECT_CONTEXT: Partial<Record<IntroBeatId, string>> = {
  "2": "She described a wedding moment that stuck with her.",
  "3": "She shared what felt right about that moment (the feeling, not copying the wedding).",
  "4": "She named a wedding or setup she wants as inspiration for venue, layout, or dinner format.",
  "5a": "She shared what she wants to borrow and what would feel wrong copied over.",
};

export function getIntroReflectFallback(beat: IntroBeatId): string {
  switch (beat) {
    case "2":
      return "That moment sounds really special.";
    case "3":
      return "That's a clear picture of the feeling you want.";
    case "4":
      return "That's helpful inspiration for the big-picture setup.";
    case "5a":
      return "Got it — that helps me know what to lean into and what to skip.";
    default:
      return "That helps.";
  }
}

export function buildIntroReflectPrompt(
  userAnswer: string,
  beat: IntroBeatId
): { system: string; user: string } {
  return {
    system:
      "You are Rosie, a warm wedding planner. Write exactly one sentence reflecting what Kelsie said. No questions. No em dashes. Do not ask anything.",
    user: `${REFLECT_CONTEXT[beat] ?? "She answered a vibe question."}\n\nHer words: "${userAnswer}"\n\nOne reflecting sentence only:`,
  };
}

export function parseBorrowAvoid(message: string): {
  borrow: string[];
  avoid: string[];
} {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const splitAt = lower.search(
    /\b(avoid|skip|not|would feel wrong|wouldn't want|don't want|do not want)\b/
  );

  if (splitAt > 0) {
    const borrowPart = trimmed.slice(0, splitAt).replace(/^borrow[:\s]*/i, "").trim();
    const avoidPart = trimmed
      .slice(splitAt)
      .replace(/^(avoid|skip|not|would feel wrong|wouldn't want|don't want|do not want)[:\s]*/i, "")
      .trim();
    return {
      borrow: splitList(borrowPart),
      avoid: splitList(avoidPart),
    };
  }

  return { borrow: splitList(trimmed), avoid: [] };
}

function splitList(text: string): string[] {
  return text
    .split(/[,;]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export type IntroPersistFn = (
  path: string,
  value: unknown
) => Promise<void>;

/** Save Kelsie's latest answer based on which beat she just completed. */
export async function persistIntroUserAnswer(
  userTurnNumber: number,
  message: string,
  applyUpdate: IntroPersistFn
): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) return;

  switch (userTurnNumber) {
    case 1:
      await applyUpdate("aesthetic.inspiration.moment", trimmed);
      break;
    case 2:
      await applyUpdate("aesthetic.inspiration.feeling", trimmed);
      break;
    case 3:
      await applyUpdate("aesthetic.inspiration.structural", trimmed);
      if (looksLikeStructuralLayoutAnswer(trimmed)) {
        await applyUpdate("aesthetic.layout", splitList(trimmed));
      }
      break;
    case 4: {
      const { borrow, avoid } = parseBorrowAvoid(trimmed);
      if (borrow.length > 0) await applyUpdate("aesthetic.borrow", borrow);
      if (avoid.length > 0) await applyUpdate("aesthetic.avoid", avoid);
      break;
    }
    default:
      break;
  }
}

export function composeScriptedIntroReply(
  reflect: string,
  beat: IntroBeatId
): string {
  const question = getIntroBeatQuestion(beat);
  if (!question) return reflect.trim();
  const lead = reflect.trim();
  return lead ? `${lead}\n\n${question}` : question;
}
