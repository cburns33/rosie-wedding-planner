import { describe, it, expect } from "vitest";
import { getUpNext } from "@/lib/planning-utils";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { introOpeningMessage, shouldShowWelcome, shouldRedirectToIntroChat } from "@/lib/intro";
import { isProtectedFromChatWeddingDataPath } from "@/lib/wedding-data-guard";
import { extractCoolorsFromText } from "@/lib/colors/coolors";
import { primaryColorLabel } from "@/lib/colors/primary-colors";
import { paletteToThemeVars } from "@/lib/colors/theme";

describe("intro aesthetic integration", () => {
  it("shows welcome overlay only after vibe intro when intro_completed is false", () => {
    const beforeVibe = mergeWeddingState({
      intro_completed: false,
      aesthetic: { ...mergeWeddingState().aesthetic, introCompleted: false },
    });
    const afterVibe = mergeWeddingState({
      intro_completed: false,
      aesthetic: { ...mergeWeddingState().aesthetic, introCompleted: true },
    });
    expect(shouldShowWelcome(beforeVibe)).toBe(false);
    expect(shouldShowWelcome(afterVibe)).toBe(true);
  });

  it("redirects home to chat until vibe intro is complete", () => {
    expect(
      shouldRedirectToIntroChat(
        mergeWeddingState({ aesthetic: { ...mergeWeddingState().aesthetic, introCompleted: false } })
      )
    ).toBe(true);
    expect(
      shouldRedirectToIntroChat(
        mergeWeddingState({ aesthetic: { ...mergeWeddingState().aesthetic, introCompleted: true } })
      )
    ).toBe(false);
  });

  it("intro opening message has no gift mention", () => {
    const msg = introOpeningMessage();
    expect(msg.toLowerCase()).not.toContain("gift");
    expect(msg.toLowerCase()).not.toContain("chase");
    expect(msg).toContain("vibe");
  });

  it("up next references layout when venue not booked", () => {
    const state = mergeWeddingState({
      venue: { status: "undecided", shortlist: [], selected: null },
      aesthetic: {
        ...mergeWeddingState().aesthetic,
        layout: ["outdoor ceremony", "long-table dinner"],
      },
    });
    const upNext = getUpNext(state);
    expect(upNext.detail).toContain("outdoor ceremony");
    expect(upNext.detail).toContain("long-table dinner");
  });

  it("parses Coolors URL from chat message text", () => {
    const colors = extractCoolorsFromText(
      "https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560"
    );
    expect(colors).toHaveLength(5);
    expect(colors![0]).toBe("#8faf8f");
  });

  it("mergeWeddingState defaults primary picker flags", () => {
    expect(mergeWeddingState().aesthetic.pendingPrimaryPicker).toBe(false);
    expect(mergeWeddingState().aesthetic.primaryPicks).toEqual([]);
  });

  it("blocks intro_completed from chat wedding data updates", () => {
    expect(isProtectedFromChatWeddingDataPath("intro_completed")).toBe(true);
    expect(isProtectedFromChatWeddingDataPath("aesthetic.introCompleted")).toBe(
      false
    );
  });

  it("primaryColorLabel resolves preset names", () => {
    expect(primaryColorLabel("#c9a0a0")).toBe("Blush");
  });

  it("paletteToThemeVars produces blush accent from palette", () => {
    const vars = paletteToThemeVars([
      "#c9a0a0",
      "#8faf8f",
      "#faf8f5",
      "#d4c4a8",
      "#6b6560",
    ]);
    expect(vars["--color-blush"]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
