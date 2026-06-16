import { describe, it, expect } from "vitest";
import { inferStarterPalette, normalizePalette } from "./infer";

describe("inferStarterPalette", () => {
  it("returns 5 valid hex colors for garden input", () => {
    const result = inferStarterPalette({
      style: "Garden romance",
      borrow: ["outdoor ceremony", "string lights"],
      layout: ["garden cocktail hour"],
    });
    expect(result).toHaveLength(5);
    for (const c of result) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("returns 5 valid hex colors for modern input", () => {
    const result = inferStarterPalette({ style: "Modern minimal" });
    expect(result).toHaveLength(5);
    for (const c of result) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("prefers extracted image colors as seeds", () => {
    const result = inferStarterPalette({
      extractedFromImages: ["#ff0000", "#00ff00"],
    });
    expect(result).toHaveLength(5);
    expect(result[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(result[1]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns default palette when no input", () => {
    const result = inferStarterPalette({});
    expect(result).toHaveLength(5);
  });
});

describe("normalizePalette", () => {
  it("accepts exactly 5 hex colors", () => {
    const result = normalizePalette([
      "#c9a0a0",
      "#8faf8f",
      "#faf8f5",
      "#d4c4a8",
      "#6b6560",
    ]);
    expect(result).toHaveLength(5);
  });

  it("rejects wrong count", () => {
    expect(normalizePalette(["#c9a0a0", "#8faf8f"])).toBeNull();
  });
});
