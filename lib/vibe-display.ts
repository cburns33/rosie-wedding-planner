import { deepSet } from "./deep-set";
import type { WeddingState } from "./types";

export interface YourVibePresentation {
  headline: string | null;
  momentLine: string | null;
  inspiredBy: string | null;
  details: string[];
  avoid: string[];
}

function trimWords(text: string, maxWords: number): string {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(" ");
}

function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars).replace(/\s+\S*$/, "");
  return cut.length > 0 ? `${cut}…` : `${text.slice(0, maxChars)}…`;
}

const LEAD_IN_PATTERNS: RegExp[] = [
  /^(i|we)\s+((really|absolutely|honestly|totally|definitely|just|kind of|sort of)\s+)?((would|could|might|do)\s+)?(love|loved|like|liked|want|wanted|adore|enjoy|prefer|think|feel)\s+(to\s+)?(have\s+|do\s+|use\s+|see\s+|go\s+(for|with)\s+)?/i,
  /^i'?d\s+((really|absolutely)\s+)?(love|like|want|prefer)\s+(to\s+)?(have\s+)?/i,
  /^(honestly|maybe|probably|personally|for me|i'?m thinking|i guess|i think|i feel like|something like)[,:]?\s+/i,
];

/** Drop conversational first-person preambles so quotes read like a vibe board, not a transcript. */
function stripLeadIn(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  let s = text.trim();
  for (let pass = 0; pass < 2; pass += 1) {
    let changed = false;
    for (const pattern of LEAD_IN_PATTERNS) {
      const next = s.replace(pattern, "").trim();
      if (next !== s && next.length > 0) {
        s = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const VAGUE_PHRASE =
  /^(it all|all of it|all|everything|anything|whatever|both|either|the whole thing|all the things|not sure|unsure|idk|i don'?t know|dunno|no idea|nothing|none|no|maybe|i guess|tbd|n\/?a)$/i;

/** A non-answer that should never become a chip (e.g. "I would want it all"). */
function isVaguePhrase(text: string | null | undefined): boolean {
  if (!text?.trim()) return true;
  const s = text.trim().replace(/[.!?]+$/, "").toLowerCase();
  return VAGUE_PHRASE.test(s) || s.length <= 2;
}

/** Exact excerpt from an answer, wrapped in quotes for display. */
export function quoteExcerpt(
  text: string | null | undefined,
  maxChars: number
): string | null {
  if (!text?.trim()) return null;

  let excerpt = text.trim();
  const firstSentence = excerpt.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 0 && firstSentence.length <= maxChars) {
    excerpt = firstSentence;
  } else if (excerpt.length > maxChars) {
    excerpt = truncateAtWord(excerpt, maxChars);
  }

  return `"${excerpt}"`;
}

/** Short quoted clause for weaving moment into the headline. */
function quoteShortClause(text: string | null | undefined, maxChars: number): string | null {
  if (!text?.trim()) return null;

  let excerpt =
    text.trim().split(/[,;—]/)[0]?.trim() ?? text.trim();
  excerpt = excerpt.split(/[.!?]/)[0]?.trim() ?? excerpt;

  if (excerpt.length > maxChars) {
    excerpt = truncateAtWord(excerpt, maxChars);
  }

  return `"${excerpt}"`;
}

/** Short phrase for chips and headlines (not full chat sentences). */
export function normalizeVibePhrase(text: string): string {
  let s = text
    .trim()
    .replace(/^borrow[:\s]*/i, "")
    .replace(/^and\s+/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");

  s = stripLeadIn(s) ?? "";

  if (s.length > 32) {
    s = trimWords(s, 4);
  }

  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One-line mood label from a feeling answer. */
export function summarizeFeelingPhrase(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;

  let s = text.trim().split(/[.!?]/)[0]?.trim() ?? text.trim();
  s = s.split(/\s+(without|like|when|where|because)\b/i)[0]?.trim() ?? s;
  s = s.replace(/\s+and\s+/gi, " & ");
  s = s.replace(/\s*—\s*/g, ", ");

  if (s.length > 44) {
    s = trimWords(s, 5);
  }

  return s || null;
}

export function buildWovenHeadline(
  feeling: string | null | undefined,
  moment: string | null | undefined
): string | null {
  const feelingQ = quoteExcerpt(feeling, 56);
  const momentQ = quoteShortClause(moment, 44);

  if (feelingQ && momentQ) return `${feelingQ} · ${momentQ}`;
  return feelingQ ?? momentQ;
}

/** Muted one-liner for the moment answer. */
export function buildMomentLine(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  return quoteExcerpt(text, 96);
}

/** @deprecated Use buildWovenHeadline; kept for tests and legacy callers. */
export function buildVibeHeadline(aesthetic: WeddingState["aesthetic"]): string | null {
  return buildWovenHeadline(
    aesthetic.inspiration.feeling ?? aesthetic.style,
    aesthetic.inspiration.moment
  );
}

export function finalizeVibeDisplayFields(
  aesthetic: WeddingState["aesthetic"]
): {
  style: string | null;
  borrow: string[];
  avoid: string[];
} {
  const borrow = (aesthetic.borrow ?? [])
    .map(normalizeVibePhrase)
    .filter((phrase) => phrase && !isVaguePhrase(phrase));
  const avoid = (aesthetic.avoid ?? [])
    .map(normalizeVibePhrase)
    .filter((phrase) => phrase && !isVaguePhrase(phrase));

  const style =
    summarizeFeelingPhrase(aesthetic.inspiration.feeling) ??
    summarizeFeelingPhrase(aesthetic.style);

  return {
    style,
    borrow: borrow.slice(0, 4),
    avoid: avoid.slice(0, 3),
  };
}

export function hasVibeSetDecision(
  decisions: WeddingState["decisions"]
): boolean {
  return decisions.some((entry) => entry.decision.startsWith("Vibe set:"));
}

/** Latest decision log line when the vibe intro completes. */
export function buildVibeSetDecisionNote(
  aesthetic: WeddingState["aesthetic"]
): string {
  const { style } = finalizeVibeDisplayFields(aesthetic);
  return style ? `Vibe set: ${style}` : "Vibe set: your wedding vibe";
}

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

function applyDashboardHandoffFlags(state: WeddingState): WeddingState {
  let updated = state as unknown as Record<string, unknown>;
  updated = deepSet(updated, "aesthetic.dashboardHandoffPending", true);
  updated = deepSet(updated, "aesthetic.dashboardHandoffAsked", false);
  return updated as unknown as WeddingState;
}

/** Finalize display fields, append a vibe decision, and queue beat 8 handoff. */
export function applyIntroCompletionSideEffects(
  state: WeddingState,
  explicitDecisionNote?: string
): WeddingState {
  const display = finalizeVibeDisplayFields(state.aesthetic);
  let updated = state as unknown as Record<string, unknown>;

  if (display.style) {
    updated = deepSet(updated, "aesthetic.style", display.style);
  }
  if (display.borrow.length > 0) {
    updated = deepSet(updated, "aesthetic.borrow", display.borrow);
  }
  if (display.avoid.length > 0) {
    updated = deepSet(updated, "aesthetic.avoid", display.avoid);
  }

  let weddingState = updated as unknown as WeddingState;
  const decisions = [...weddingState.decisions];

  if (explicitDecisionNote) {
    const isVibeNote = explicitDecisionNote.startsWith("Vibe set:");
    if (!isVibeNote || !hasVibeSetDecision(decisions)) {
      decisions.push({
        date: todayIsoDate(),
        decision: explicitDecisionNote,
      });
    }
  } else if (!hasVibeSetDecision(decisions)) {
    decisions.push({
      date: todayIsoDate(),
      decision: buildVibeSetDecisionNote(weddingState.aesthetic),
    });
  }

  weddingState = { ...weddingState, decisions };
  return applyDashboardHandoffFlags(weddingState);
}

/** Card-ready copy from structured intro answers. */
export function getYourVibePresentation(
  aesthetic: WeddingState["aesthetic"]
): YourVibePresentation {
  const inspiration = aesthetic.inspiration ?? {
    moment: null,
    feeling: null,
    structural: null,
  };

  const cleanedFeeling = stripLeadIn(inspiration.feeling ?? aesthetic.style);
  const cleanedMoment = stripLeadIn(inspiration.moment);

  // Headline is the feeling (her summarized mood); the moment is a supporting
  // line. Only fall back to the moment for the headline when there is no feeling.
  const headline =
    quoteExcerpt(cleanedFeeling, 64) ?? quoteExcerpt(cleanedMoment, 96);
  const momentBecameHeadline = !cleanedFeeling && Boolean(cleanedMoment);

  let momentLine = momentBecameHeadline ? null : buildMomentLine(cleanedMoment);

  // Never repeat the same sentence in both the headline and the moment line.
  if (headline && momentLine) {
    const headInner = headline.slice(1, -1).toLowerCase();
    const lineInner = momentLine.slice(1, -1).toLowerCase();
    if (
      headInner === lineInner ||
      headInner.startsWith(lineInner) ||
      lineInner.startsWith(headInner)
    ) {
      momentLine = null;
    }
  }

  const inspiredBy = quoteExcerpt(stripLeadIn(inspiration.structural), 80);

  const details = (aesthetic.borrow ?? [])
    .map(normalizeVibePhrase)
    .filter((phrase) => phrase && !isVaguePhrase(phrase))
    .slice(0, 4);

  const avoid = (aesthetic.avoid ?? [])
    .map(normalizeVibePhrase)
    .filter((phrase) => phrase && !isVaguePhrase(phrase))
    .slice(0, 3);

  return { headline, momentLine, inspiredBy, details, avoid };
}
