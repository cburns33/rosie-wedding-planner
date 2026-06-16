import { describe, it, expect } from "vitest";
import { shufflePalette, lighten, normalizeHex } from "./harmony";

describe("shufflePalette", () => {
  const colors = ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"];

  it("preserves locked indices", () => {
    const locked = [true, false, true, false, false];
    const result = shufflePalette(colors, locked);
    expect(result[0]).toBe(colors[0]);
    expect(result[2]).toBe(colors[2]);
  });

  it("returns 5 colors", () => {
    const result = shufflePalette(colors, [false, false, false, false, false]);
    expect(result).toHaveLength(5);
  });
});

describe("lighten", () => {
  it("lightens a hex color", () => {
    const result = lighten("#000000", 0.5);
    expect(normalizeHex(result)).toBe("#808080");
  });
});
