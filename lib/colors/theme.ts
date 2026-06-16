import {
  contrastRatio,
  ensureAccentContrast,
  hexToHsl,
  hexToRgb,
  lighten,
  normalizeHex,
} from "./harmony";

const CREAM = "#faf8f5";

export const THEME_VAR_KEYS = [
  "--color-blush",
  "--color-blush-light",
  "--color-blush-pale",
  "--color-sage",
  "--color-sage-light",
  "--color-sage-pale",
  "--color-mist",
  "--color-mist-light",
  "--color-mist-pale",
] as const;

function mostSaturated(colors: string[]): string {
  let best = colors[0];
  let bestSat = -1;
  for (const c of colors) {
    const sat = hexToHsl(c)?.s ?? 0;
    if (sat > bestSat) {
      bestSat = sat;
      best = c;
    }
  }
  return best;
}

function greenest(colors: string[]): string {
  let best = colors[0];
  let bestGreen = -1;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    if (!rgb) continue;
    const score = rgb.g - rgb.r;
    if (score > bestGreen) {
      bestGreen = score;
      best = c;
    }
  }
  return best;
}

function coolest(colors: string[]): string {
  let best = colors[0];
  let bestCool = -1;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    if (!rgb) continue;
    const score = rgb.b - rgb.r;
    if (score > bestCool) {
      bestCool = score;
      best = c;
    }
  }
  return best;
}

/** Map palette (+ optional intro primary picks) to accent CSS custom properties. */
export function paletteToThemeVars(
  palette: string[],
  primaryPicks?: string[]
): Record<string, string> {
  const picks = (primaryPicks ?? [])
    .map((c) => normalizeHex(c))
    .filter((c): c is string => c != null)
    .slice(0, 2);

  if (picks.length === 2) {
    const primary = ensureAccentContrast(picks[0], CREAM);
    const secondary = normalizeHex(picks[1]) ?? picks[1];
    const tertiary = ensureAccentContrast(lighten(primary, 0.12), CREAM);

    return {
      "--color-blush": primary,
      "--color-blush-light": lighten(primary, 0.3),
      "--color-blush-pale": lighten(primary, 0.45),
      "--color-sage": secondary,
      "--color-sage-light": lighten(secondary, 0.35),
      "--color-sage-pale": lighten(secondary, 0.48),
      "--color-mist": tertiary,
      "--color-mist-light": lighten(tertiary, 0.35),
      "--color-mist-pale": lighten(tertiary, 0.48),
    };
  }

  const colors = palette.map((c) => normalizeHex(c) ?? c).slice(0, 5);
  while (colors.length < 5) colors.push("#888888");

  const primary = ensureAccentContrast(mostSaturated(colors), CREAM);
  const secondary = ensureAccentContrast(greenest(colors), CREAM);
  const tertiary = ensureAccentContrast(coolest(colors), CREAM);

  return {
    "--color-blush": primary,
    "--color-blush-light": lighten(primary, 0.3),
    "--color-blush-pale": lighten(primary, 0.45),
    "--color-sage": secondary,
    "--color-sage-light": lighten(secondary, 0.35),
    "--color-sage-pale": lighten(secondary, 0.48),
    "--color-mist": tertiary,
    "--color-mist-light": lighten(tertiary, 0.35),
    "--color-mist-pale": lighten(tertiary, 0.48),
  };
}

/** Minimum contrast of primary accent vs cream (for tests). */
export function primaryAccentContrast(
  palette: string[],
  primaryPicks?: string[]
): number {
  const vars = paletteToThemeVars(palette, primaryPicks);
  return contrastRatio(vars["--color-blush"], CREAM);
}

/** Apply theme CSS variables on document root. */
export function applyThemeVars(vars: Record<string, string>): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
