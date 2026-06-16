import { normalizeHex } from "./harmony";
import { coolorsToPalette } from "./infer";

/** Parse coolors.co/hex1-hex2-… or coolors.co/palette/hex1-… URLs. */
export function parseCoolorsUrl(
  url: string
): string[] | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /coolors\.co(?:\/palette\/([0-9a-fA-F-]+)|\/([0-9a-fA-F-]+))/i
  );
  if (!match) return null;
  const segment = match[1] ?? match[2];
  const parts = segment.split("-").filter(Boolean);
  if (parts.length < 2) return null;
  const colors = parts.map((p) => normalizeHex(p)).filter((c): c is string => c != null);
  return colors.length >= 2 ? colors : null;
}

/** Build a Coolors URL from hex colors (no # prefix). */
export function genCoolorsUrl(colors: string[]): string {
  const stripped = colors
    .map((c) => normalizeHex(c)?.slice(1) ?? c.replace(/^#/, ""))
    .filter(Boolean);
  return `https://coolors.co/${stripped.join("-")}`;
}

/** Starter link for intro: exact two primaries plus three generated shuffle slots. */
export function genCoolorsStarterFromPrimaryPicks(picks: string[]): string {
  const normalized = picks
    .map((c) => normalizeHex(c))
    .filter((c): c is string => c != null)
    .slice(0, 2);

  if (normalized.length < 2) {
    return genCoolorsUrl(coolorsToPalette(picks));
  }

  const padded = coolorsToPalette(normalized);
  return genCoolorsUrl([normalized[0], normalized[1], ...padded.slice(2)]);
}

/** Detect and extract Coolors palette from free text. */
export function extractCoolorsFromText(text: string): string[] | null {
  const urlMatch = text.match(/https?:\/\/[^\s]*coolors\.co[^\s]*/i);
  if (!urlMatch) return null;
  return parseCoolorsUrl( urlMatch[0]);
}
