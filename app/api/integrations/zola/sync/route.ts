import { NextResponse } from "next/server";
import { runZolaSync } from "@/lib/zola/sync";
import { isCronAuthorized } from "@/lib/zola/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual on-demand sync for Chase. Protected by CRON_SECRET. */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runZolaSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
