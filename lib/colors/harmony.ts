/** Parse #RRGGBB or RRGGBB to normalized lowercase hex. */
export function normalizeHex(color: string): string | null {
  const trimmed = color.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return null;
  return `#${match[1].toLowerCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Lighten a hex color by blending toward white. Amount 0–1. */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    rgb.r + (255 - rgb.r) * a,
    rgb.g + (255 - rgb.g) * a,
    rgb.b + (255 - rgb.b) * a
  );
}

/** Relative luminance for contrast checks. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Clamp saturation/lightness for UI accent use on cream background. */
export function clampForAccent(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const s = Math.max(0.25, Math.min(0.65, hsl.s));
  const l = Math.max(0.35, Math.min(0.55, hsl.l));
  return hslToHex(hsl.h, s, l);
}

/** Ensure accent has minimum contrast vs cream (#faf8f5) for large text / buttons. */
export function ensureAccentContrast(hex: string, background = "#faf8f5"): string {
  let current = clampForAccent(hex);
  const hsl = hexToHsl(current);
  if (!hsl) return hex;
  let { h, s, l } = hsl;
  for (let i = 0; i < 12; i++) {
    if (contrastRatio(current, background) >= 3) return current;
    l = Math.max(0.25, l - 0.04);
    current = hslToHex(h, s, l);
  }
  return current;
}

/** Locked indices unchanged; regenerate unlocked slots harmonically. */
export function shufflePalette(colors: string[], lockedIndices: boolean[]): string[] {
  const normalized = colors.map((c) => normalizeHex(c) ?? "#888888");
  const locked = lockedIndices.map((l, i) => l && normalized[i]).filter(Boolean) as string[];

  const lockedHues = locked
    .map((c) => hexToHsl(c)?.h)
    .filter((h): h is number => h != null);
  const avgHue =
    lockedHues.length > 0
      ? lockedHues.reduce((a, b) => a + b, 0) / lockedHues.length
      : 30;

  let unlockSlot = 0;
  return normalized.map((color, i) => {
    if (lockedIndices[i]) return color;
    const offset = (unlockSlot % 5) * 24 - 48;
    unlockSlot++;
    const baseHsl = hexToHsl(color) ?? { h: avgHue, s: 0.35, l: 0.5 };
    const h = lockedHues.length > 0 ? avgHue + offset : baseHsl.h + offset;
    const s = 0.3 + (unlockSlot % 3) * 0.08;
    const l = 0.42 + (unlockSlot % 4) * 0.06;
    return clampForAccent(hslToHex(h, s, l));
  });
}

export const DEFAULT_PALETTE = [
  "#c9a0a0",
  "#8faf8f",
  "#faf8f5",
  "#d4c4a8",
  "#6b6560",
] as const;
