import { NextResponse } from "next/server";
import { computeAssetAttribution } from "@/lib/computations/performance-attribution";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAssetProjectionsSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/assets/[id]/attribution
 * Returns full attribution data: projected vs actual metrics with variance.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attribution = await computeAssetAttribution(id);
    return NextResponse.json(attribution);
  } catch (err: any) {
    console.error("[assets/attribution] GET error:", err);
    if (err.message?.includes("not found")) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to compute attribution" }, { status: 500 });
  }
}

/**
 * PATCH /api/assets/[id]/attribution
 * GP manual override of projected metrics.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await parseBody(req, UpdateAssetProjectionsSchema);
    if (error) return error;

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        projectedIRR: data!.projectedIRR,
        projectedMultiple: data!.projectedMultiple,
        ...(data!.projectedMetrics !== undefined
          ? { projectedMetrics: data!.projectedMetrics as Prisma.InputJsonValue }
          : {}),
      },
    });

    return NextResponse.json({ id: asset.id, message: "Projections updated" });
  } catch (err: any) {
    console.error("[assets/attribution] PATCH error:", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
