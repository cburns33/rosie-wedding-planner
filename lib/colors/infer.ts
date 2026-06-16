import {
  clampForAccent,
  DEFAULT_PALETTE,
  ensureAccentContrast,
  hexToHsl,
  hslToHex,
  normalizeHex,
} from "./harmony";

export interface InferPaletteInput {
  style?: string | null;
  borrow?: string[];
  avoid?: string[];
  layout?: string[];
  extractedFromImages?: string[];
}

const KEYWORD_BUCKETS: Array<{ pattern: RegExp; colors: string[] }> = [
  {
    pattern: /garden|green|outdoor|vineyard|botanical|nature|sage/i,
    colors: ["#8faf8f", "#6b8f6b", "#e8efe8", "#d4c4a8", "#6b6560"],
  },
  {
    pattern: /romantic|blush|soft|intimate|candle|warm|rose|garden romance/i,
    colors: ["#c9a0a0", "#e8c4c4", "#faf8f5", "#d4c4a8", "#6b6560"],
  },
  {
    pattern: /classic|elegant|gold|timeless|formal|elevated/i,
    colors: ["#c9a0a0", "#d4c4a8", "#faf8f5", "#b8956a", "#6b6560"],
  },
  {
    pattern: /modern|minimal|clean|contemporary|sleek|simple/i,
    colors: ["#6b6560", "#b0a99f", "#faf8f5", "#8fa8bf", "#2c2825"],
  },
  {
    pattern: /coastal|blue|ocean|mist|sea/i,
    colors: ["#8fa8bf", "#c9d4e0", "#faf8f5", "#6b8f9f", "#6b6560"],
  },
];

function pickBucket(text: string): string[] {
  for (const bucket of KEYWORD_BUCKETS) {
    if (bucket.pattern.test(text)) return [...bucket.colors];
  }
  return [...DEFAULT_PALETTE];
}

function padToFive(colors: string[]): string[] {
  const result = colors.map((c) => ensureAccentContrast(clampForAccent(normalizeHex(c) ?? c)));
  while (result.length < 5) {
    const last = result[result.length - 1] ?? DEFAULT_PALETTE[result.length];
    const hsl = hexToHsl(last);
    if (hsl) {
      result.push(ensureAccentContrast(hslToHex(hsl.h + 30, hsl.s, hsl.l)));
    } else {
      result.push(DEFAULT_PALETTE[result.length] ?? DEFAULT_PALETTE[0]);
    }
  }
  return result.slice(0, 5);
}

/** Infer 5 wedding-safe hex colors from vibe context. */
export function inferStarterPalette(input: InferPaletteInput): string[] {
  const text = [
    input.style,
    ...(input.borrow ?? []),
    ...(input.avoid ?? []),
    ...(input.layout ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  const extracted = (input.extractedFromImages ?? [])
    .map((c) => normalizeHex(c))
    .filter((c): c is string => c != null)
    .slice(0, 2)
    .map((c) => ensureAccentContrast(clampForAccent(c)));

  const base = pickBucket(text);

  if (extracted.length >= 2) {
    const rest = base.filter((c) => !extracted.includes(c)).slice(0, 3);
    return padToFive([...extracted, ...rest]);
  }

  if (extracted.length === 1) {
    return padToFive([extracted[0], ...base.slice(0, 4)]);
  }

  return padToFive(base);
}

/** Normalize exactly 5 hex colors for the palette picker. */
export function normalizePalette(colors: string[]): string[] | null {
  const normalized = colors.map((c) => normalizeHex(c)).filter((c): c is string => c != null);
  if (normalized.length !== 5) return null;
  return normalized.map((c) => ensureAccentContrast(clampForAccent(c)));
}

/** Pad or trim parsed Coolors colors to exactly 5. */
export function coolorsToPalette(colors: string[]): string[] {
  const normalized = colors
    .map((c) => normalizeHex(c))
    .filter((c): c is string => c != null);
  return padToFive(normalized.length > 0 ? normalized : [...DEFAULT_PALETTE]);
}
