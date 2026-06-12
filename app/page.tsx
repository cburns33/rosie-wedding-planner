import PlanningHomeShell from "@/components/PlanningHomeShell";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState } from "@/lib/types";
import { getLatestSnapshot, getZolaProfileUrl } from "@/lib/zola/store";
import { toAggregates, type ZolaAggregates } from "@/lib/zola/normalize";

export const dynamic = "force-dynamic";

async function getWeddingData(): Promise<WeddingState> {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();
    return { ...DEFAULT_WEDDING_STATE, ...(data?.data as Partial<WeddingState>) };
  } catch {
    return DEFAULT_WEDDING_STATE;
  }
}

async function getZolaAggregates(): Promise<ZolaAggregates | null> {
  try {
    const [stored, profileUrl] = await Promise.all([
      getLatestSnapshot(),
      getZolaProfileUrl(),
    ]);
    return toAggregates(
      stored?.snapshot ?? null,
      stored?.importedAt ?? null,
      profileUrl
    );
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [weddingData, zola] = await Promise.all([
    getWeddingData(),
    getZolaAggregates(),
  ]);
  return <PlanningHomeShell initialData={weddingData} initialZola={zola} />;
}
