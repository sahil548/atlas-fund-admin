import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const entityFilter = firmId ? { firmId } : {};

    // Get entities with target size and their fundraising rounds + prospects
    const entities = await prisma.entity.findMany({
      where: {
        ...entityFilter,
        status: "ACTIVE",
        targetSize: { not: null, gt: 0 },
      },
      select: {
        id: true,
        name: true,
        targetSize: true,
        totalCommitments: true,
        fundraisingRounds: {
          where: {
            status: { in: ["OPEN", "PLANNING"] },
          },
          include: {
            prospects: {
              select: {
                status: true,
                softCommitAmount: true,
                hardCommitAmount: true,
                targetAmount: true,
              },
            },
          },
        },
      },
    });

    const funds = entities.map((entity) => {
      const targetSize = entity.targetSize ?? 0;
      const totalCommitted = entity.totalCommitments ?? 0;

      // Aggregate prospect amounts across all active rounds
      let hardCommits = 0;
      let softCommits = 0;
      let pipeline = 0;

      for (const round of entity.fundraisingRounds) {
        for (const prospect of round.prospects) {
          if (prospect.status === "HARD_COMMIT") {
            hardCommits += prospect.hardCommitAmount ?? 0;
          } else if (prospect.status === "SOFT_COMMIT") {
            softCommits += prospect.softCommitAmount ?? 0;
          } else if (!["DECLINED", "WITHDRAWN"].includes(prospect.status)) {
            pipeline += prospect.targetAmount ?? 0;
          }
        }
      }

      const pctClosed = targetSize > 0
        ? Math.min(100, (totalCommitted / targetSize) * 100)
        : 0;

      return {
        entityId: entity.id,
        entityName: entity.name,
        targetSize,
        totalCommitted,
        hardCommits,
        softCommits,
        pipeline,
        pctClosed,
      };
    });

    // Compute aggregates
    const aggregate = {
      totalTarget: funds.reduce((s, f) => s + f.targetSize, 0),
      totalCommitted: funds.reduce((s, f) => s + f.totalCommitted, 0),
      totalHardCommits: funds.reduce((s, f) => s + f.hardCommits, 0),
      totalSoftCommits: funds.reduce((s, f) => s + f.softCommits, 0),
      totalPipeline: funds.reduce((s, f) => s + f.pipeline, 0),
    };

    // Filter out entities with no active prospect activity
    const activeFunds = funds.filter(
      (f) => f.hardCommits > 0 || f.softCommits > 0 || f.pipeline > 0
    );

    // Recompute aggregates from active funds only
    const activeAggregate = {
      totalTarget: activeFunds.reduce((s, f) => s + f.targetSize, 0),
      totalCommitted: activeFunds.reduce((s, f) => s + f.totalCommitted, 0),
      totalHardCommits: activeFunds.reduce((s, f) => s + f.hardCommits, 0),
      totalSoftCommits: activeFunds.reduce((s, f) => s + f.softCommits, 0),
      totalPipeline: activeFunds.reduce((s, f) => s + f.pipeline, 0),
    };

    return NextResponse.json({ funds: activeFunds, aggregate: activeAggregate });
  } catch (err) {
    logger.error("[dashboard/fundraising-summary] Error:", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load fundraising summary" },
      { status: 500 }
    );
  }
}
