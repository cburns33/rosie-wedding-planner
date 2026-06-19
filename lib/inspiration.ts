import { getSupabase } from "@/lib/supabase";

export const INSPIRATION_THREAD_KEY = "inspiration" as const;

export type InspirationThreadKey = typeof INSPIRATION_THREAD_KEY;

export function isInspirationThreadKey(
  value: string | null | undefined
): value is InspirationThreadKey {
  return value === INSPIRATION_THREAD_KEY;
}

export const INSPIRATION_FOCUS_LABEL = "Visual Inspo Depot";

export const INSPIRATION_SUGGESTED_PROMPTS = [
  "Summarize what I've shared with you so far",
] as const;

export const INSPIRATION_MEMORY_TEMPLATE = `Use exactly these headings in the markdown:

## What she's drawn to
(Short synthesis — mood, recurring visual themes, what keeps showing up.)

## Observations
(Dated bullets — one per screenshot or batch. Describe layout, florals, lighting, tablescape, ceremony details. No hex codes or palette inference.)

## Tags
(comma-separated themes, e.g. garden, long tables, candlelight)

## Open threads
(Anything she said she might share later, or questions to revisit.)`;

export function inspirationOpeningMessage(): string {
  return `This is your Visual Inspo Depot — drop Pinterest screenshots, mood board grabs, dress inspo, or venue photos anytime. I'll describe what I notice and keep private notes so I can reference your taste later. Nothing is stored as an image file, just my written takeaways.

Use the **attach button** (paperclip) for screenshots — don't paste images into the text field.

Where should we start?`;
}

export async function getInspirationMemory(): Promise<string> {
  try {
    const { data } = await getSupabase()
      .from("inspiration_memory")
      .select("markdown")
      .eq("id", 1)
      .single();
    return (data?.markdown as string | undefined) ?? "";
  } catch {
    return "";
  }
}

export async function upsertInspirationMemory(markdown: string): Promise<void> {
  await getSupabase()
    .from("inspiration_memory")
    .upsert({ id: 1, markdown, updated_at: new Date().toISOString() });
}

export interface InspirationCardSummary {
  observationCount: number;
  latestPreview: string | null;
}

/** Card stats derived from internal markdown (no images). */
export function summarizeInspirationMemory(markdown: string): InspirationCardSummary {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return { observationCount: 0, latestPreview: null };
  }

  const observationLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") && /^\-\s*\(\d{4}-\d{2}-\d{2}\)/.test(line));

  const count = observationLines.length;
  const latest = observationLines.length
    ? observationLines[observationLines.length - 1]
        .replace(/^\-\s*\(\d{4}-\d{2}-\d{2}\)\s*/, "")
        .trim()
    : null;

  return {
    observationCount: count,
    latestPreview: latest ? truncatePreview(latest, 72) : null,
  };
}

function truncatePreview(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
