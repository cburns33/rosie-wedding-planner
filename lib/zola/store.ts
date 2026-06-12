import { getSupabase } from "@/lib/supabase";
import type { ZolaSnapshot } from "@/lib/types";

export type ZolaSnapshotSource = "api_sync" | "csv_rsvp" | "csv_guests";

export interface StoredSnapshot {
  snapshot: ZolaSnapshot;
  importedAt: string;
}

/** Most recent snapshot (single-user app — latest row wins). */
export async function getLatestSnapshot(): Promise<StoredSnapshot | null> {
  const { data } = await getSupabase()
    .from("zola_snapshots")
    .select("data, imported_at")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    snapshot: data.data as ZolaSnapshot,
    importedAt: data.imported_at as string,
  };
}

export async function insertSnapshot(
  snapshot: ZolaSnapshot,
  source: ZolaSnapshotSource,
  rawFileHash?: string
): Promise<void> {
  await getSupabase()
    .from("zola_snapshots")
    .insert({ source, data: snapshot, raw_file_hash: rawFileHash ?? null });
}

/** Deep-link target for "Open Zola →": stored profile URL or env fallback. */
export async function getZolaProfileUrl(): Promise<string | null> {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();
    const stored = (data?.data as { integrations?: { zola?: { profileUrl?: string | null } } })
      ?.integrations?.zola?.profileUrl;
    return stored ?? process.env.ZOLA_PROFILE_URL ?? null;
  } catch {
    return process.env.ZOLA_PROFILE_URL ?? null;
  }
}
