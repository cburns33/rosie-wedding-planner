import { describe, it, expect } from "vitest";
import {
  applyIntroCompletionSideEffects,
  buildVibeHeadline,
  buildVibeSetDecisionNote,
  buildWovenHeadline,
  getYourVibePresentation,
  hasVibeSetDecision,
  normalizeVibePhrase,
  quoteExcerpt,
  summarizeFeelingPhrase,
  finalizeVibeDisplayFields,
} from "@/lib/vibe-display";
import { mergeWeddingState } from "@/lib/wedding-defaults";

describe("vibe display", () => {
  it("summarizes feeling answers into short phrases", () => {
    expect(
      summarizeFeelingPhrase(
        "Relaxed and warm. Intimate without being stuffy — like everyone was actually having fun."
      )
    ).toBe("Relaxed & warm");
  });

  it("wraps exact excerpts in quotes", () => {
    expect(quoteExcerpt("Garden cocktail hour with string lights", 48)).toBe(
      '"Garden cocktail hour with string lights"'
    );
  });

  it("normalizes borrow phrases for chips", () => {
    expect(normalizeVibePhrase("long tables and outdoor ceremony")).toBe(
      "Long tables and outdoor ceremony"
    );
  });

  it("weaves feeling and moment with quoted excerpts", () => {
    const headline = buildWovenHeadline(
      "Relaxed and warm. Intimate without being stuffy.",
      "Friend's garden cocktail hour — string lights, everyone mingling outside at golden hour"
    );
    expect(headline).toContain('"Relaxed and warm"');
    expect(headline).toContain("garden cocktail hour");
    expect(headline).not.toContain("vineyard");
  });

  it("builds a legacy headline from feeling and moment only", () => {
    const aesthetic = mergeWeddingState().aesthetic;
    const headline = buildVibeHeadline({
      ...aesthetic,
      inspiration: {
        ...aesthetic.inspiration,
        feeling: "Relaxed and warm. Intimate without being stuffy.",
        moment: "Garden cocktail hour with string lights",
        structural: "My cousin's vineyard wedding",
      },
      layout: ["outdoor ceremony", "long tables"],
      borrow: ["long tables", "candlelit warmth"],
    });
    expect(headline).toContain("Relaxed and warm");
    expect(headline).not.toContain("vineyard");
    expect(headline).not.toContain("Outdoor ceremony");
  });

  it("finalizes display fields from intro answers", () => {
    const aesthetic = {
      ...mergeWeddingState().aesthetic,
      inspiration: {
        moment: "Garden cocktail hour with string lights",
        feeling: "Relaxed and warm. Intimate without being stuffy.",
        structural: "My cousin's vineyard wedding — outdoor ceremony, long farm tables",
      },
      borrow: ["long tables", "outdoor ceremony", "candlelit warmth"],
      avoid: ["church formality", "heavy rustic decor"],
      layout: ["outdoor ceremony", "long tables"],
    };
    const out = finalizeVibeDisplayFields(aesthetic);
    expect(out.style).toBe("Relaxed & warm");
    expect(out.style).not.toContain("vineyard");
    expect(out.borrow[0]).toBe("Long tables");
    expect(out.avoid[0]).toBe("Church formality");
  });

  it("builds the vibe-set decision note from feeling answers", () => {
    const aesthetic = {
      ...mergeWeddingState().aesthetic,
      inspiration: {
        ...mergeWeddingState().aesthetic.inspiration,
        feeling: "Relaxed and warm. Intimate without being stuffy.",
      },
    };
    expect(buildVibeSetDecisionNote(aesthetic)).toBe("Vibe set: Relaxed & warm");
  });

  it("appends a vibe decision when intro completes", () => {
    const state = mergeWeddingState({
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: true,
        inspiration: {
          ...mergeWeddingState().aesthetic.inspiration,
          feeling: "Relaxed and warm. Intimate without being stuffy.",
        },
      },
    });

    const updated = applyIntroCompletionSideEffects(state);
    expect(updated.decisions).toHaveLength(1);
    expect(updated.decisions[0].decision).toBe("Vibe set: Relaxed & warm");
    expect(updated.aesthetic.style).toBe("Relaxed & warm");
    expect(updated.aesthetic.dashboardHandoffPending).toBe(true);
    expect(updated.aesthetic.dashboardHandoffAsked).toBe(false);
  });

  it("does not duplicate an existing vibe-set decision", () => {
    const state = mergeWeddingState({
      decisions: [{ date: "2026-06-16", decision: "Vibe set: Relaxed & warm" }],
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: true,
      },
    });

    const updated = applyIntroCompletionSideEffects(state);
    expect(updated.decisions).toHaveLength(1);
    expect(hasVibeSetDecision(updated.decisions)).toBe(true);
  });

  it("returns categorized sections for the card", () => {
    const aesthetic = {
      ...mergeWeddingState().aesthetic,
      style: "Relaxed and warm. Intimate without being stuffy — like everyone was actually having fun.",
      inspiration: {
        moment:
          "Friend's garden cocktail hour — string lights, everyone mingling outside at golden hour",
        feeling: "Relaxed and warm. Intimate without being stuffy.",
        structural: "My cousin's vineyard wedding — outdoor ceremony, long farm tables",
      },
      layout: ["outdoor ceremony"],
      borrow: ["long tables", "outdoor ceremony", "candlelit warmth"],
      avoid: ["church formality", "heavy rustic decor"],
    };
    const view = getYourVibePresentation(aesthetic);
    expect(view.headline).toContain('"Relaxed and warm"');
    expect(view.headline).not.toContain("vineyard");
    expect(view.momentLine).toContain("garden cocktail hour");
    expect(view.inspiredBy).toContain("vineyard wedding");
    expect(view.details).toEqual(["Long tables", "Outdoor ceremony", "Candlelit warmth"]);
    expect(view.avoid).toEqual(["Church formality", "Heavy rustic decor"]);
  });

  it("cleans first-person phrasing and drops non-answer chips", () => {
    const aesthetic = {
      ...mergeWeddingState().aesthetic,
      style: "Fun energy and romantic ambiance",
      inspiration: {
        feeling: "Fun energy and romantic ambiance",
        moment: "I love weddings with fun bright colors and yet very classy vibes",
        structural: "I love Boxwood Manor in Tomball, Texas",
      },
      borrow: ["I would want it all"],
      avoid: [],
    };
    const view = getYourVibePresentation(aesthetic);

    expect(view.headline).toBe('"Fun energy and romantic ambiance"');
    expect(view.momentLine).toBe(
      '"Weddings with fun bright colors and yet very classy vibes"'
    );
    expect(view.inspiredBy).toBe('"Boxwood Manor in Tomball, Texas"');
    expect(view.details).toEqual([]);
  });

  it("does not repeat the moment in both the headline and the moment line", () => {
    const aesthetic = {
      ...mergeWeddingState().aesthetic,
      style: null,
      inspiration: {
        feeling: null,
        moment: "Garden cocktail hour with string lights",
        structural: null,
      },
    };
    const view = getYourVibePresentation(aesthetic);

    expect(view.headline).toContain("Garden cocktail hour");
    expect(view.momentLine).toBeNull();
  });
});
