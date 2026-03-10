import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { groupPipelineStages } from "@/lib/dashboard-pipeline-utils";

/**
 * GET /api/dashboard/pipeline-summary
 *
 * Returns deal counts and aggregate values for the 4 active pipeline stages
 * (SCREENING, DUE_DILIGENCE, IC_REVIEW, CLOSING). CLOSED and DEAD deals are excluded.
 *
 * Response: { stages: [{ stage, count, totalValue }] }
 */
export async function GET(req: Request) {
  try {
    const authUser = await getAuthUser();
    const url = new URL(req.url);
    const firmId =
      authUser?.firmId ?? url.searchParams.get("firmId") ?? undefined;

    const directFilter = firmId ? { firmId } : {};

    // Exclude CLOSED and DEAD deals from the pipeline funnel.
    // Note: Deal model has no numeric dealValue column (targetSize is stored as String).
    // We return count per stage; totalValue will be 0 until a numeric value field is added.
    const raw = await prisma.deal.groupBy({
      by: ["stage"],
      where: {
        ...directFilter,
        stage: { notIn: ["CLOSED", "DEAD"] },
      },
      _count: { stage: true },
    });

    // Normalize to the shape groupPipelineStages expects (no _sum available)
    const rawWithSum = raw.map((r) => ({
      ...r,
      _sum: { dealValue: null as number | null },
    }));

    const stages = groupPipelineStages(rawWithSum);

    return NextResponse.json({ stages });
  } catch (err) {
    console.error("[dashboard/pipeline-summary] Error:", err);
    return NextResponse.json(
      { error: "Failed to load pipeline summary" },
      { status: 500 }
    );
  }
}
