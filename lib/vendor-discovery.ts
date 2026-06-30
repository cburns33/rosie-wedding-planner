import type { VendorCandidate } from "./types";

const MAX_CANDIDATES = 4;

interface RawCandidate {
  name?: unknown;
  location?: unknown;
  url?: unknown;
  priceHint?: unknown;
  whyFits?: unknown;
  email?: unknown;
  phone?: unknown;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimmedOrNull(value: unknown): string | null {
  const trimmed = trimmedString(value);
  return trimmed ? trimmed : null;
}

/** Cap to 4, drop candidates missing name/url, validate url is http(s), strip empty optional fields. */
export function sanitizeCandidates(raw: unknown): VendorCandidate[] {
  if (!Array.isArray(raw)) return [];

  const sanitized: VendorCandidate[] = [];
  for (const item of raw as RawCandidate[]) {
    const name = trimmedString(item?.name);
    const url = trimmedString(item?.url);
    if (!name || !url || !isHttpUrl(url)) continue;

    sanitized.push({
      name,
      location: trimmedString(item?.location),
      url,
      priceHint: trimmedOrNull(item?.priceHint),
      whyFits: trimmedString(item?.whyFits),
      email: trimmedOrNull(item?.email),
      phone: trimmedOrNull(item?.phone),
    });

    if (sanitized.length >= MAX_CANDIDATES) break;
  }

  return sanitized;
}

/** Formats the saved note appended to vendor.notes and vendor_memory Research. */
export function formatCandidateNote(candidate: {
  location: string;
  whyFits: string;
  url: string;
}): string {
  const parts = [candidate.location, candidate.whyFits].filter(Boolean);
  return `${parts.join(" — ")} (${candidate.url})`;
}
