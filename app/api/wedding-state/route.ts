import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_WEDDING_STATE, mergeWeddingState } from "@/lib/wedding-defaults";
import type { WeddingState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data } = await getSupabase()
      .from("wedding_state")
      .select("data")
      .eq("id", 1)
      .single();
    const state: WeddingState = mergeWeddingState(
      data?.data as Partial<WeddingState> | undefined
    );
    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(DEFAULT_WEDDING_STATE, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}
