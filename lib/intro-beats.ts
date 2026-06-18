import type { WeddingState } from "./types";

/** Beats Rosie should deliver after Kelsie's latest reply (Beat 1 is the scripted opening). */
export type IntroBeatId =
  | "2"
  | "3"
  | "4"
  | "5a"
  | "5b"
  | "5b-wait"
  | "7"
  | "8"
  | "skip"
  | "pivot";

export interface IntroBeatInput {
  weddingData: WeddingState;
  /** User messages on main thread before the current request (excludes this turn). */
  priorUserTurns: number;
  userMessage: string;
  hasPrimaryPicksConfirm: boolean;
  hasCoolorsPaste: boolean;
}

export interface IntroBeatResolution {
  beat: IntroBeatId;
  userTurnNumber: number;
}

/** Count user messages stored for the main thread. */
export function countPriorUserTurns(
  messages: Array<{ role: string }>
): number {
  return messages.filter((m) => m.role === "user").length;
}

export function isExplicitVibeSkip(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(skip this|skip the vibe|skip vibe|let'?s skip(?:\s+this|\s+the vibe|\s+vibe)?|let'?s just plan|don'?t want to (?:do|talk about) (?:this|vibe)|move on to planning)\b/.test(
      lower
    ) ||
    /^skip[\s—-]/i.test(message.trim())
  );
}

/** She asks a planning question without explicitly skipping the vibe arc. */
export function isPlanningPivot(message: string): boolean {
  if (isExplicitVibeSkip(message)) return false;
  const lower = message.toLowerCase();
  const planningTopic =
    /\b(venue|budget|photographer|caterer|florist|dj|timeline|guest list|rsvp)\b/.test(
      lower
    );
  const asksHelp =
    /\?|where should|need to find|help me|how much|what do you think|can we talk about/.test(
      lower
    );
  return planningTopic && asksHelp;
}

export function isEmptyOrOffTopicAnswer(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 3) return true;
  const lower = trimmed.toLowerCase();
  if (/^(idk|i don'?t know|not sure|whatever|skip|pass)\.?$/i.test(trimmed))
    return true;
  if (/^(\?+|hmm+|um+|ok)\.?$/i.test(trimmed)) return true;
  if (lower === "no" || lower === "maybe") return true;
  return false;
}

/** Affirmative reply to the beat 8 dashboard handoff question. */
export function isAffirmativeAnswer(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return false;
  if (/^(yes|yeah|yep|yup|sure|ok|okay|please|ready|absolutely|definitely)\.?$/i.test(trimmed)) {
    return true;
  }
  return /\b(yes please|let'?s go|sounds good|show me|go ahead|take me there|open (?:the )?dashboard|let'?s do it)\b/i.test(
    trimmed
  );
}

/** User describes venue/layout/ceremony format — counts as beat 3 even if phrased informally. */
export function looksLikeStructuralLayoutAnswer(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(outdoor ceremony|long table|farm table|vineyard|layout|seated dinner|candlelit|reception|dinner format|ceremony|venue|cocktail hour|tent|barn|garden wedding|tablescape)\b/.test(
    lower
  );
}

const FEELING_REASK_FORBIDDEN = `FORBIDDEN this turn (beats 1–2 are done): do NOT ask what felt right, what got her, what made it land, the energy, the light, the looseness, what stuck with her most, or any clarifying loop on the moment/feeling.`;

/** Completed intro user answers — prefer wedding_state over message count. */
export function getCompletedIntroUserTurns(
  weddingData: WeddingState,
  dbUserTurns: number
): number {
  const fromState = weddingData.aesthetic.introUserTurns;
  if (typeof fromState === "number" && fromState >= 0) {
    return Math.max(fromState, dbUserTurns);
  }
  return dbUserTurns;
}

export function resolveIntroBeat(input: IntroBeatInput): IntroBeatResolution | null {
  const { weddingData, priorUserTurns, userMessage, hasPrimaryPicksConfirm, hasCoolorsPaste } =
    input;

  const completedTurns = getCompletedIntroUserTurns(weddingData, priorUserTurns);
  const userTurnNumber = completedTurns + 1;

  if (weddingData.aesthetic.introCompleted) {
    if (weddingData.aesthetic.dashboardHandoffPending) {
      return { beat: "8", userTurnNumber };
    }
    return null;
  }

  if (isExplicitVibeSkip(userMessage)) {
    return { beat: "skip", userTurnNumber };
  }

  if (isPlanningPivot(userMessage)) {
    return { beat: "pivot", userTurnNumber };
  }

  if (hasPrimaryPicksConfirm) {
    return { beat: "5b", userTurnNumber };
  }

  if (hasCoolorsPaste) {
    return { beat: "7", userTurnNumber };
  }

  if (
    weddingData.aesthetic.primaryPicks.length >= 2 &&
    !weddingData.aesthetic.themeApplied
  ) {
    return { beat: "5b-wait", userTurnNumber };
  }

  if (weddingData.aesthetic.themeApplied) {
    return { beat: "7", userTurnNumber };
  }

  if (userTurnNumber <= 1) return { beat: "2", userTurnNumber };
  if (userTurnNumber === 2) return { beat: "3", userTurnNumber };
  if (userTurnNumber === 3) return { beat: "4", userTurnNumber };
  if (userTurnNumber === 4) return { beat: "5a", userTurnNumber };

  // Turn 5+ without colors yet — stay on primary picker (e.g. she typed instead of using UI).
  if (userTurnNumber >= 5 && !weddingData.aesthetic.primaryPicks.length) {
    return { beat: "5a", userTurnNumber };
  }

  return { beat: "7", userTurnNumber };
}

const BEAT_DIRECTIVES: Record<IntroBeatId, string> = {
  "2": `**Intro beat 2 — feeling (this turn only)**

Kelsie just described a wedding moment. Your job this turn:
1. One or two sentences reflecting what she shared (warm, specific).
2. Ask exactly ONE question: what felt right about that moment — the energy, a detail, or the way the space felt. You are after the feeling, not copying the whole wedding.

Do NOT ask about structural layout, venue format, colors, or ceremony details yet.
Do NOT ask a second question or offer multiple sub-questions.
Quietly save \`aesthetic.inspiration.moment\` via update_wedding_data if you have enough from her answer.`,

  "3": `**Intro beat 3 — structural inspiration (this turn only)**

Kelsie just shared what felt right about her moment. Beats 1–2 are DONE.

Your job this turn:
1. One sentence reflecting her feeling (not another feeling question).
2. Ask exactly ONE new question — use this framing (adapt naturally, same meaning):

"Separate question, and this one is more practical. Is there a wedding you've been to or seen that you'd want to use as inspiration for the big stuff — venue, layout, dinner format? It doesn't have to be the same wedding as the moment you described."

${FEELING_REASK_FORBIDDEN}

If she already said she has no reference wedding, acknowledge once and ask beat 4 (borrow/avoid) in the same reply.
Quietly save \`aesthetic.style\` (short vibe phrase) via update_wedding_data.`,

  "4": `**Intro beat 4 — borrow vs avoid (this turn only)**

Kelsie just answered about structural inspiration (or described layout/ceremony/format in her message). Beats 1–3 are DONE.

Your job this turn:
1. One sentence reflecting her structural inspo or layout preferences.
2. Ask what she'd actually want for hers AND what would feel wrong copied straight over. Both borrow and avoid in one turn is OK.

${FEELING_REASK_FORBIDDEN}
Do NOT re-ask beat 3 (reference wedding / layout inspo). Do NOT ask about colors yet.

Quietly save \`aesthetic.inspiration.structural\`, \`aesthetic.borrow\`, \`aesthetic.avoid\`, and \`aesthetic.layout\` via update_wedding_data.`,

  "5a": `**Intro beat 5a — primary colors (this turn only)**

Kelsie just shared borrow/avoid preferences. Your job this turn:
1. One sentence reflecting what she wants and what she'd skip.
2. Introduce color selection in one or two sentences (nothing permanent — she can change anytime).
3. Call \`show_primary_color_picker\`. Do NOT ask another vibe question.

Do NOT re-ask beats 2–4. Do NOT ask clarifying questions about earlier answers.
Quietly persist borrow, avoid, layout, and style if not already saved.`,

  "5b": `**Intro beat 5b — Coolors handoff (this turn only)**

Kelsie confirmed two primary colors in the inline picker. The Coolors handoff card is already visible.
1. Acknowledge her two picks warmly (use color names if you know them).
2. Explain lock + spacebar shuffle + paste Export → URL back here. Plain text only — the card has the button.
Do NOT ask questions from beats 1–4. Do NOT call show_primary_color_picker again.`,

  "5b-wait": `**Intro beat 5b — waiting for Coolors URL (this turn only)**

Kelsie chose two primaries but has not pasted a Coolors Export → URL yet. The Coolors handoff card should still be visible.
1. Answer briefly if she asked something, otherwise remind her in one sentence: lock colors in Coolors, shuffle, paste the Export → URL here.
2. Do NOT re-ask vibe questions from beats 2–4. Do NOT call show_primary_color_picker again unless she asks to restart colors.`,

  "7": `**Intro beat 7 — reflect + handoff (this turn only)**

Wrap the intro arc. Your job this turn:
1. Reflect back 2–3 lines: feeling, structural inspo, borrow, avoid, colors.
2. Persist remaining aesthetic fields via update_wedding_data, set \`aesthetic.introCompleted\` true, and add decision_note "Vibe set: [short summary]".
3. End with ONE short check: does that sound like what you're going for?

Do NOT mention the planning dashboard yet (beat 8 handles that). Do NOT re-ask any earlier beat questions.`,

  "8": `**Intro beat 8 — dashboard handoff (this turn only)**

The vibe intro is saved. Your job this turn:
1. If Kelsie has not yet been asked, say: "Great — ready to see your planning dashboard now? You'll also find How This Works in the menu anytime you want the full walkthrough."
2. If she confirms yes, acknowledge briefly — the app will navigate her to home.

Do NOT re-ask vibe questions. Do NOT call tools unless she asks to change saved vibe fields.`,

  skip: `**Intro — explicit skip (this turn only)**

Kelsie wants to skip or move past the vibe setup. Your job this turn:
1. Answer any planning question she asked, or acknowledge the skip warmly.
2. Save whatever vibe context you already have via update_wedding_data.
3. Set \`aesthetic.introCompleted\` true. Do not block her from planning.

Do NOT continue the beat questionnaire.`,

  pivot: `**Intro — planning pivot (this turn only)**

Kelsie pivoted to a planning topic mid-intro. Your job this turn:
1. Answer her planning question helpfully and completely.
2. One short line offering to finish vibe setup later — do NOT ask a new vibe beat question this turn.

Do NOT ignore her question to push the next beat. Do NOT re-ask earlier vibe questions.`,
};

export function buildIntroBeatDirectiveBlock(
  resolution: IntroBeatResolution,
  userMessage: string
): string {
  const allowClarify =
    resolution.beat !== "skip" &&
    resolution.beat !== "pivot" &&
    resolution.beat !== "5b" &&
    resolution.beat !== "5b-wait" &&
    resolution.beat !== "7" &&
    resolution.beat !== "8" &&
    isEmptyOrOffTopicAnswer(userMessage);

  const clarifyNote = allowClarify
    ? `\n\nHer latest answer was empty or off-topic — you may ask ONE short clarifying question for this beat only, then stop. Do not loop.`
    : `\n\nHer answer counts — advance. Do NOT ask clarifying follow-ups on this beat.`;

  const visibleReplyRule = `\n\nYou MUST send Kelsie a visible chat reply this turn. If you call tools, include the full reply in the same turn — never tool-only responses.`;

  return `\n\n${BEAT_DIRECTIVES[resolution.beat]}${visibleReplyRule}${clarifyNote}`;
}

/** Per-turn hint appended to Kelsie's message — stronger than system prompt alone. */
export function buildIntroBeatUserHint(
  beat: IntroBeatId,
  userMessage: string
): string | null {
  switch (beat) {
    case "2":
      return "System: Kelsie answered beat 1 (moment). Reply with beat 2 ONLY — one sentence reflecting her moment, then one question about what felt right (feeling/energy/space). Do not ask about layout, venue, or colors yet.";
    case "3":
      return "System: Beats 1–2 are DONE. Do NOT ask about feeling, energy, what got her, or what made it land. Reply with beat 3 ONLY — reflect her feeling in one line, then ask about a wedding she'd use for venue/layout/dinner-format inspiration (can be a different wedding than the moment).";
    case "4":
      if (looksLikeStructuralLayoutAnswer(userMessage)) {
        return "System: Kelsie's message describes layout/structural inspo — treat beat 3 as answered. Reply with beat 4 ONLY — reflect her setup in one line, then ask what to borrow vs what would feel wrong copied over. Do NOT re-ask feeling or what stuck with her.";
      }
      return "System: Reply with beat 4 ONLY — reflect her structural inspo, then ask borrow vs avoid. Beats 1–3 are DONE. Do NOT re-ask feeling, energy, or layout inspiration.";
    case "5a":
      return "System: Reply with beat 5a ONLY — reflect borrow/avoid, introduce colors, call show_primary_color_picker. Beats 1–4 are DONE.";
    default:
      return null;
  }
}
