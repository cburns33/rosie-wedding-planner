/** Preset wedding primaries for the intro color step (pick two, then build in Coolors). */
export interface PrimaryColorOption {
  name: string;
  hex: string;
}

export const PRIMARY_COLOR_OPTIONS: PrimaryColorOption[] = [
  { name: "Blush", hex: "#c9a0a0" },
  { name: "Sage", hex: "#8faf8f" },
  { name: "Champagne", hex: "#d4c4a8" },
  { name: "Cream", hex: "#faf8f5" },
  { name: "Dusty blue", hex: "#8fa8bf" },
  { name: "Terracotta", hex: "#c4846c" },
  { name: "Burgundy", hex: "#8b4a5c" },
  { name: "Forest", hex: "#6b8f6b" },
  { name: "Warm gray", hex: "#6b6560" },
  { name: "Lavender", hex: "#b8a8c8" },
];

export function primaryColorLabel(hex: string): string {
  const normalized = hex.toLowerCase();
  const match = PRIMARY_COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === normalized);
  return match?.name ?? hex;
}
