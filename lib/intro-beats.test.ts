import { describe, it, expect } from "vitest";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import {
  countPriorUserTurns,
  isAffirmativeAnswer,
  isExplicitVibeSkip,
  isPlanningPivot,
  looksLikeStructuralLayoutAnswer,
  resolveIntroBeat,
  buildIntroBeatDirectiveBlock,
  buildIntroBeatUserHint,
} from "@/lib/intro-beats";

function introState(overrides: Parameters<typeof mergeWeddingState>[0] = {}) {
  return mergeWeddingState({
    aesthetic: {
      ...mergeWeddingState().aesthetic,
      introCompleted: false,
    },
    ...overrides,
  });
}

describe("intro beat tracker", () => {
  it("counts prior user turns from messages", () => {
    expect(
      countPriorUserTurns([
        { role: "assistant", content: "opening" },
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ])
    ).toBe(2);
  });

  it("maps user turns 1–4 to beats 2–5a", () => {
    const base = introState();
    const withTurns = (n: number) =>
      introState({
        aesthetic: { ...mergeWeddingState().aesthetic, introUserTurns: n },
      });

    expect(
      resolveIntroBeat({
        weddingData: base,
        priorUserTurns: 0,
        userMessage: "Garden cocktail hour with string lights",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("2");

    expect(
      resolveIntroBeat({
        weddingData: withTurns(1),
        priorUserTurns: 0,
        userMessage: "Warm and intimate, everyone mingling",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("3");

    expect(
      resolveIntroBeat({
        weddingData: withTurns(2),
        priorUserTurns: 0,
        userMessage: "My cousin's vineyard wedding with long tables",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("4");

    expect(
      resolveIntroBeat({
        weddingData: withTurns(3),
        priorUserTurns: 0,
        userMessage: "Long tables and outdoor ceremony; skip church formality",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("5a");
  });

  it("returns null when intro is complete and dashboard handoff is done", () => {
    const done = introState({
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: true,
        dashboardHandoffPending: false,
      },
    });
    expect(
      resolveIntroBeat({
        weddingData: done,
        priorUserTurns: 0,
        userMessage: "hello",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })
    ).toBeNull();
  });

  it("returns beat 8 while dashboard handoff is pending", () => {
    const pending = introState({
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: true,
        dashboardHandoffPending: true,
      },
    });
    expect(
      resolveIntroBeat({
        weddingData: pending,
        priorUserTurns: 7,
        userMessage: "yes",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("8");
  });

  it("detects affirmative dashboard handoff replies", () => {
    expect(isAffirmativeAnswer("yes")).toBe(true);
    expect(isAffirmativeAnswer("let's go")).toBe(true);
    expect(isAffirmativeAnswer("not yet")).toBe(false);
  });

  it("detects explicit skip and planning pivot", () => {
    expect(isExplicitVibeSkip("Skip this — I need to find a venue now")).toBe(true);
    expect(isPlanningPivot("Where should we look for a venue?")).toBe(true);
    expect(isPlanningPivot("Skip this — I need to find a venue now")).toBe(false);
  });

  it("routes primary picks confirm to beat 5b", () => {
    expect(
      resolveIntroBeat({
        weddingData: introState(),
        priorUserTurns: 4,
        userMessage: "I've picked Blush and Sage as my two primary colors.",
        hasPrimaryPicksConfirm: true,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("5b");
  });

  it("waits for Coolors URL after primary picks without theme", () => {
    const withPicks = introState({
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: false,
        primaryPicks: ["#c9a0a0", "#8faf8f"],
        themeApplied: false,
      },
    });
    expect(
      resolveIntroBeat({
        weddingData: withPicks,
        priorUserTurns: 5,
        userMessage: "Still working on it",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("5b-wait");
  });

  it("routes Coolors paste to beat 7 and themed turns to beat 7", () => {
    const themed = introState({
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        introCompleted: false,
        themeApplied: true,
        primaryPicks: ["#c9a0a0", "#8faf8f"],
      },
    });

    expect(
      resolveIntroBeat({
        weddingData: introState(),
        priorUserTurns: 5,
        userMessage: "https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: true,
      })?.beat
    ).toBe("7");

    expect(
      resolveIntroBeat({
        weddingData: themed,
        priorUserTurns: 6,
        userMessage: "That sounds right",
        hasPrimaryPicksConfirm: false,
        hasCoolorsPaste: false,
      })?.beat
    ).toBe("7");
  });

  it("buildIntroBeatDirectiveBlock includes advance guard by default", () => {
    const block = buildIntroBeatDirectiveBlock(
      { beat: "3", userTurnNumber: 2 },
      "Warm garden energy with candles"
    );
    expect(block).toContain("Intro beat 3");
    expect(block).toContain("FORBIDDEN");
    expect(block).toContain("advance");
  });

  it("detects structural layout answers for beat 4 hint", () => {
    expect(
      looksLikeStructuralLayoutAnswer(
        "outdoor ceremony, long farm tables, candlelit dinner"
      )
    ).toBe(true);
    const hint = buildIntroBeatUserHint(
      "4",
      "outdoor ceremony, long farm tables, candlelit dinner"
    );
    expect(hint).toContain("beat 3 as answered");
    expect(hint).toContain("borrow");
  });

  it("beat 3 user hint forbids feeling re-asks", () => {
    const hint = buildIntroBeatUserHint("3", "Relaxed and warm");
    expect(hint).toContain("Beats 1–2 are DONE");
    expect(hint).toContain("Do NOT ask about feeling");
  });
});
