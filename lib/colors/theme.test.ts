import { describe, it, expect } from "vitest";
import { paletteToThemeVars, primaryAccentContrast, THEME_VAR_KEYS } from "./theme";

describe("paletteToThemeVars", () => {
  const palette = ["#c9a0a0", "#8faf8f", "#faf8f5", "#d4c4a8", "#6b6560"];

  it("returns all required keys", () => {
    const vars = paletteToThemeVars(palette);
    for (const key of THEME_VAR_KEYS) {
      expect(vars[key]).toBeDefined();
      expect(vars[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("meets minimum contrast ratio on primary accent vs cream", () => {
    const ratio = primaryAccentContrast(palette);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it("uses primary picks for blush and sage when provided", () => {
    const fullPalette = ["#8b4a5c", "#d4c4a8", "#8fa8bf", "#4a6fa8", "#1a2a4a"];
    const vars = paletteToThemeVars(fullPalette, ["#8b4a5c", "#d4c4a8"]);
    expect(vars["--color-blush"].toLowerCase()).toMatch(/^#8[a-f0-9]/);
    expect(vars["--color-sage"].toLowerCase()).toBe("#d4c4a8");
    expect(vars["--color-blush"]).not.toBe("#8fa8bf");
    expect(vars["--color-mist"]).not.toBe("#4a6fa8");
  });
});
