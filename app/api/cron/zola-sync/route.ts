import { NextResponse } from "next/server";
import { runZolaSync } from "@/lib/zola/sync";
import { isCronAuthorized } from "@/lib/zola/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Scheduled read-only sync (Vercel Cron). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runZolaSync();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.reason === "no_token" ? 200 : 500 });
  }
  return NextResponse.json(result);
}
