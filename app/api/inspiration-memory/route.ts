import { NextResponse } from "next/server";
import {
  getInspirationMemory,
  summarizeInspirationMemory,
} from "@/lib/inspiration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markdown = await getInspirationMemory();
    return NextResponse.json(summarizeInspirationMemory(markdown), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { observationCount: 0, latestPreview: null },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
