import { describe, it, expect } from "vitest";
import { summarizeInspirationMemory } from "@/lib/inspiration";

describe("inspiration memory", () => {
  it("summarizes observation bullets for the home card", () => {
    const markdown = `## Observations
- (2026-06-16) Garden long-table setup with loose greenery and candlelight
- (2026-06-17) Minimal signage with handwritten escort cards`;

    expect(summarizeInspirationMemory(markdown)).toEqual({
      observationCount: 2,
      latestPreview: "Minimal signage with handwritten escort cards",
    });
  });

  it("returns empty stats for blank memory", () => {
    expect(summarizeInspirationMemory("")).toEqual({
      observationCount: 0,
      latestPreview: null,
    });
  });
});
