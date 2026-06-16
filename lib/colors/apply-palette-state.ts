import { getSupabase } from "@/lib/supabase";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { deepSet } from "@/lib/deep-set";
import { normalizeHex } from "@/lib/colors/harmony";
import { normalizePalette } from "@/lib/colors/infer";
import type { WeddingState } from "@/lib/types";

export async function getWeddingDataFromDb(): Promise<WeddingState> {
  const { data } = await getSupabase()
    .from("wedding_state")
    .select("data")
    .eq("id", 1)
    .single();
  return mergeWeddingState(data?.data as Partial<WeddingState> | undefined);
}

async function persistWeddingState(updated: WeddingState): Promise<void> {
  const { error } = await getSupabase()
    .from("wedding_state")
    .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Save two primary color picks and dismiss the inline picker. */
export async function savePrimaryPicksToState(
  picks: string[]
): Promise<WeddingState | null> {
  const normalized = picks
    .map((c) => normalizeHex(c))
    .filter((c): c is string => c != null);

  if (normalized.length !== 2) return null;

  const current = await getWeddingDataFromDb();
  let updated = deepSet(
    current as unknown as Record<string, unknown>,
    "aesthetic.primaryPicks",
    normalized
  ) as unknown as WeddingState;

  updated = deepSet(
    updated as unknown as Record<string, unknown>,
    "aesthetic.pendingPrimaryPicker",
    false
  ) as unknown as WeddingState;

  await persistWeddingState(updated);
  return updated;
}

/** Apply a 5-color palette, clear pending pickers, set themeApplied. */
export async function applyPaletteToWeddingState(
  colors: string[]
): Promise<WeddingState | null> {
  const normalized = normalizePalette(colors);
  if (!normalized) return null;

  const current = await getWeddingDataFromDb();
  let updated = deepSet(
    current as unknown as Record<string, unknown>,
    "aesthetic.palette",
    normalized
  ) as unknown as WeddingState;

  updated = deepSet(
    updated as unknown as Record<string, unknown>,
    "aesthetic.themeApplied",
    true
  ) as unknown as WeddingState;

  updated = deepSet(
    updated as unknown as Record<string, unknown>,
    "aesthetic.pendingPrimaryPicker",
    false
  ) as unknown as WeddingState;

  await persistWeddingState(updated);
  return updated;
}
