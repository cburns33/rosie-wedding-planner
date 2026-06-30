import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isCronAuthorized } from "@/lib/zola/cron-auth";

export const dynamic = "force-dynamic";

/** Sends sample metrics to Sentry. Protected by CRON_SECRET for verification. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SENTRY_DSN) {
    return NextResponse.json(
      { error: "SENTRY_DSN is not configured" },
      { status: 503 }
    );
  }

  Sentry.metrics.count("test_metric", 1);
  Sentry.metrics.distribution("api_response_time", 150, {
    unit: "millisecond",
  });

  await Sentry.flush(2000);

  return NextResponse.json({ ok: true, metrics: ["test_metric", "api_response_time"] });
}
