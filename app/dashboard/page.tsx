import Nav from "@/components/Nav";
import Dashboard from "@/components/Dashboard";
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
    return (data?.data as WeddingState) ?? DEFAULT_WEDDING_STATE;
  } catch {
    return DEFAULT_WEDDING_STATE;
  }
}

export default async function DashboardPage() {
  const weddingData = await getWeddingData();

  return (
    <div className="flex flex-col min-h-full">
      <Nav />
      <main className="flex-1 pt-16 overflow-y-auto">
        <Dashboard data={weddingData} />
      </main>
    </div>
  );
}
