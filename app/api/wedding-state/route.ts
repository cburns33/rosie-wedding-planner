import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE } from "@/lib/wedding-defaults";
import type { WeddingState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();
    const state: WeddingState = {
      ...DEFAULT_WEDDING_STATE,
      ...(data?.data as Partial<WeddingState>),
    };
    return NextResponse.json(state);
  } catch {
    return NextResponse.json(DEFAULT_WEDDING_STATE);
  }
}
