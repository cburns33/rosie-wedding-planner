import { NextResponse } from "next/server";
import { createHash } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { isCronAuthorized } from "@/lib/zola/cron-auth";
import { parseZolaCsv, CsvParseError } from "@/lib/zola/parse-csv";
import { getLatestSnapshot, insertSnapshot } from "@/lib/zola/store";
import { reconcileWeddingState } from "@/lib/zola/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chase-only CSV fallback (not linked in any Kelsie-facing UI). Accepts a
 * multipart upload of a Zola RSVP export, parses to a snapshot, and reconciles.
 * Protected by CRON_SECRET.
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach a CSV under the 'file' field." },
        { status: 400 }
      );
    }
    text = await file.text();
  } catch {
    return NextResponse.json(
      { error: "Could not read the upload as multipart form data." },
      { status: 400 }
    );
  }

  try {
    const { snapshot, source } = parseZolaCsv(text);
    const hash = createHash("sha256").update(text).digest("hex");

    const previous = await getLatestSnapshot();
    const previousInvited = previous?.snapshot.summary.invited ?? null;

    await insertSnapshot(snapshot, source, hash);
    await reconcileWeddingState(snapshot, previousInvited);

    return NextResponse.json({ ok: true, source, summary: snapshot.summary });
  } catch (err) {
    if (err instanceof CsvParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    Sentry.captureException(err, {
      tags: { integration: "zola", op: "csv_import" },
    });
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
