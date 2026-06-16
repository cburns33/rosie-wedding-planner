import { describe, it, expect } from "vitest";
import { parseCoolorsUrl, genCoolorsUrl, genCoolorsStarterFromPrimaryPicks } from "./coolors";

const SAMPLE = ["#8faf8f", "#faf8f5", "#d4c4a8", "#c9a0a0", "#6b6560"];

describe("parseCoolorsUrl", () => {
  it("parses standard coolors URL", () => {
    const result = parseCoolorsUrl(
      "https://coolors.co/8faf8f-faf8f5-d4c4a8-c9a0a0-6b6560"
    );
    expect(result).toHaveLength(5);
    expect(result![0]).toBe("#8faf8f");
    expect(result![4]).toBe("#6b6560");
  });

  it("parses palette path URL", () => {
    const result = parseCoolorsUrl(
      "https://coolors.co/palette/8faf8f-faf8f5-d4c4a8"
    );
    expect(result).toHaveLength(3);
  });

  it("returns null for invalid URL", () => {
    expect(parseCoolorsUrl("https://example.com")).toBeNull();
  });
});

describe("genCoolorsUrl", () => {
  it("round-trips with parseCoolorsUrl", () => {
    const url = genCoolorsUrl(SAMPLE);
    const parsed = parseCoolorsUrl(url);
    expect(parsed).toEqual(SAMPLE.map((c) => c.toLowerCase()));
  });
});

describe("genCoolorsStarterFromPrimaryPicks", () => {
  it("pads two primaries to five Coolors slots", () => {
    const url = genCoolorsStarterFromPrimaryPicks(["#800020", "#f7e7ce"]);
    const parsed = parseCoolorsUrl(url);
    expect(parsed).toHaveLength(5);
    expect(parsed![0]).toBe("#800020");
    expect(parsed![1]).toBe("#f7e7ce");
  });
});
