import { NextResponse } from "next/server";
import { savePrimaryPicksToState } from "@/lib/colors/apply-palette-state";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = Array.isArray(body.picks) ? body.picks : [];
    const updated = await savePrimaryPicksToState(raw);

    if (!updated) {
      return NextResponse.json(
        { error: "picks must be exactly 2 hex colors" },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to save primary picks" }, { status: 500 });
  }
}
