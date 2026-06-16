import { redirect } from "next/navigation";
import PlanningHomeShell from "@/components/PlanningHomeShell";
import { getSupabase } from "@/lib/supabase";
import { mergeWeddingState } from "@/lib/wedding-defaults";
import { shouldRedirectToIntroChat } from "@/lib/intro";
import {
  getInspirationMemory,
  summarizeInspirationMemory,
} from "@/lib/inspiration";
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
    return mergeWeddingState(data?.data as Partial<WeddingState> | undefined);
  } catch {
    return mergeWeddingState();
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
  const weddingData = await getWeddingData();

  if (shouldRedirectToIntroChat(weddingData)) {
    redirect("/chat");
  }

  const [zola, inspirationMemory] = await Promise.all([
    getZolaAggregates(),
    getInspirationMemory(),
  ]);
  const inspirationSummary = summarizeInspirationMemory(inspirationMemory);

  return (
    <PlanningHomeShell
      initialData={weddingData}
      initialZola={zola}
      initialInspirationSummary={inspirationSummary}
    />
  );
}
