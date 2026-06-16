import { NextResponse } from "next/server";
import { applyPaletteToWeddingState } from "@/lib/colors/apply-palette-state";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await applyPaletteToWeddingState(body.palette);

    if (!updated) {
      return NextResponse.json(
        { error: "palette must be exactly 5 hex colors" },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to apply palette" }, { status: 500 });
  }
}
