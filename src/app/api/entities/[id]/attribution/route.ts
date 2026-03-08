import { NextResponse } from "next/server";
import { computeEntityAttribution } from "@/lib/computations/performance-attribution";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/entities/[id]/attribution
 * Returns entity-level attribution: all assets ranked by their contribution to fund returns.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attribution = await computeEntityAttribution(id);
    return NextResponse.json(attribution);
  } catch (err: any) {
    console.error("[entities/attribution] GET error:", err);
    if (err.message?.includes("not found")) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to compute entity attribution" }, { status: 500 });
  }
}
