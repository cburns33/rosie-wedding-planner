import { NextResponse } from "next/server";
import { getLatestSnapshot, getZolaProfileUrl } from "@/lib/zola/store";
import { toAggregates } from "@/lib/zola/normalize";

export const dynamic = "force-dynamic";

/**
 * Kelsie-facing: latest Zola aggregates for the home card. Magic-link protected
 * by middleware. Returns aggregates only — never a token, guest names, or the
 * full snapshot payload.
 */
export async function GET() {
  try {
    const [stored, profileUrl] = await Promise.all([
      getLatestSnapshot(),
      getZolaProfileUrl(),
    ]);
    return NextResponse.json(
      toAggregates(stored?.snapshot ?? null, stored?.importedAt ?? null, profileUrl)
    );
  } catch {
    // Graceful degradation: never break the home page on a read failure.
    return NextResponse.json(toAggregates(null, null, null));
  }
}
