import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState } from "@/lib/types";

export async function POST() {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();

    const current: WeddingState = {
      ...DEFAULT_WEDDING_STATE,
      ...(data?.data as Partial<WeddingState>),
    };

    if (current.intro_completed) {
      return NextResponse.json({ ok: true });
    }

    await getSupabase()
      .from("wedding_state")
      .upsert({
        id: 1,
        data: { ...current, intro_completed: true },
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to complete intro" }, { status: 500 });
  }
}
