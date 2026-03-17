import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const entityRelFilter = firmId ? { entity: { firmId } } : {};

    // Pull ALL capital calls and distributions (since inception)
    const [capitalCalls, distributions] = await Promise.all([
      prisma.capitalCall.findMany({
        where: {
          ...entityRelFilter,
          status: { not: "DRAFT" },
        },
        select: { amount: true, dueDate: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.distributionEvent.findMany({
        where: {
          ...entityRelFilter,
          status: { not: "DRAFT" },
        },
        select: { grossAmount: true, distributionDate: true },
        orderBy: { distributionDate: "asc" },
      }),
    ]);

    // Find the earliest date across both sets
    const allDates = [
      ...capitalCalls.map((c) => new Date(c.dueDate)),
      ...distributions.map((d) => new Date(d.distributionDate)),
    ];

    if (allDates.length === 0) {
      return NextResponse.json({ cumulative: [] });
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const now = new Date();

    // Bucket by quarter from earliest date to now
    const startQ = new Date(minDate.getFullYear(), Math.floor(minDate.getMonth() / 3) * 3, 1);
    const endQ = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const quarters: { label: string; calls: number; distributions: number }[] = [];
    const cursor = new Date(startQ);

    while (cursor <= endQ) {
      const qYear = cursor.getFullYear();
      const qMonth = cursor.getMonth(); // 0, 3, 6, 9
      const qEnd = new Date(qYear, qMonth + 3, 0); // last day of quarter
      const qNum = Math.floor(qMonth / 3) + 1;
      const label = `Q${qNum} '${String(qYear).slice(2)}`;

      const qCalls = capitalCalls
        .filter((c) => {
          const cd = new Date(c.dueDate);
          return cd >= cursor && cd <= qEnd;
        })
        .reduce((s, c) => s + c.amount, 0);

      const qDists = distributions
        .filter((d) => {
          const dd = new Date(d.distributionDate);
          return dd >= cursor && dd <= qEnd;
        })
        .reduce((s, d) => s + d.grossAmount, 0);

      quarters.push({ label, calls: qCalls, distributions: qDists });

      // Advance to next quarter
      cursor.setMonth(cursor.getMonth() + 3);
    }

    // Build cumulative series
    let cumCalls = 0;
    let cumDists = 0;
    const cumulative = quarters.map((q) => {
      cumCalls += q.calls;
      cumDists += q.distributions;
      return {
        label: q.label,
        cumCalls,
        cumDists,
        cumNet: cumDists - cumCalls,
      };
    });

    return NextResponse.json({ cumulative });
  } catch (err) {
    logger.error("[dashboard/cash-flow-trend] Error:", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load cash flow trend" },
      { status: 500 }
    );
  }
}
