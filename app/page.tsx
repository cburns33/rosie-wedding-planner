import PlanningHomeShell from "@/components/PlanningHomeShell";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState } from "@/lib/types";

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

export default async function HomePage() {
  const weddingData = await getWeddingData();
  return <PlanningHomeShell initialData={weddingData} />;
}
