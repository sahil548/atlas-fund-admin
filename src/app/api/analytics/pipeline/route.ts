import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseTargetSize(s: string | null): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.BMKbmk]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (/[Bb]/.test(s)) return num * 1_000_000_000;
  if (/[Mm]/.test(s)) return num * 1_000_000;
  if (/[Kk]/.test(s)) return num * 1_000;
  return num;
}

const ACTIVE_STAGES = ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING"];
const STAGE_ORDER: Record<string, number> = {
  SCREENING: 0,
  DUE_DILIGENCE: 1,
  IC_REVIEW: 2,
  CLOSING: 3,
  CLOSED: 4,
  DEAD: 5,
};

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");

  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;

  // Fetch all deals with activities for time tracking
  const deals = await prisma.deal.findMany({
    where,
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (deals.length === 0) {
    return NextResponse.json({
      pipelineValueByStage: {},
      stageDistribution: {},
      timeInStage: {},
      dealVelocity: { closedPerMonth: [], avgDaysToClose: 0 },
      conversionRates: { screeningToDD: 0, ddToIC: 0, icToClose: 0 },
      throughput: { enteringPerMonth: [], exitingPerMonth: [] },
      summary: {
        totalPipelineValue: 0,
        activeDeals: 0,
        avgDaysToClose: 0,
        overallConversion: 0,
      },
    });
  }

  // 1. Pipeline value by stage
  const pipelineValueByStage: Record<string, { value: number; count: number }> = {};
  for (const stage of ACTIVE_STAGES) {
    const stageDeals = deals.filter((d) => d.stage === stage);
    pipelineValueByStage[stage] = {
      value: stageDeals.reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0),
      count: stageDeals.length,
    };
  }

  // Stage distribution (all stages)
  const stageDistribution: Record<string, number> = {};
  for (const stage of [...ACTIVE_STAGES, "CLOSED", "DEAD"]) {
    stageDistribution[stage] = deals.filter((d) => d.stage === stage).length;
  }

  // 2. Time-in-stage tracking
  // For each active deal, find when it last entered its current stage
  const now = new Date();
  const timeInStage: Record<string, { totalDays: number; count: number; avgDays: number }> = {};
  for (const stage of ACTIVE_STAGES) {
    timeInStage[stage] = { totalDays: 0, count: 0, avgDays: 0 };
  }

  for (const deal of deals) {
    if (!ACTIVE_STAGES.includes(deal.stage)) continue;

    // Find the most recent STAGE_CHANGE activity that moved to current stage
    const stageEntry = deal.activities.find(
      (a) =>
        a.activityType.includes("STAGE") &&
        (a.metadata as any)?.newStage === deal.stage
    );

    const enteredAt = stageEntry ? new Date(stageEntry.createdAt) : new Date(deal.createdAt);
    const daysInStage = Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)));

    if (timeInStage[deal.stage]) {
      timeInStage[deal.stage].totalDays += daysInStage;
      timeInStage[deal.stage].count += 1;
    }
  }

  // Compute averages
  for (const stage of ACTIVE_STAGES) {
    const s = timeInStage[stage];
    s.avgDays = s.count > 0 ? Math.round(s.totalDays / s.count) : 0;
  }

  // 3. Deal velocity - deals closed per month (last 6 months)
  const closedDeals = deals.filter((d) => d.stage === "CLOSED");
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const closedPerMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    // Count deals that have a CLOSED activity in this month
    const count = closedDeals.filter((deal) => {
      const closedActivity = deal.activities.find(
        (a) =>
          a.activityType.includes("STAGE") &&
          ((a.metadata as any)?.newStage === "CLOSED" || a.activityType.includes("CLOSED"))
      );
      if (closedActivity) {
        const actDate = new Date(closedActivity.createdAt);
        return (
          actDate.getFullYear() === d.getFullYear() &&
          actDate.getMonth() === d.getMonth()
        );
      }
      // Fallback: use deal updatedAt
      return (
        deal.updatedAt.getFullYear() === d.getFullYear() &&
        deal.updatedAt.getMonth() === d.getMonth()
      );
    }).length;

    closedPerMonth.push({ month: label, count });
  }

  // Average days from SCREENING to CLOSED (for closed deals)
  let totalDaysToClose = 0;
  let closedWithData = 0;
  for (const deal of closedDeals) {
    const daysToClose = Math.floor(
      (deal.updatedAt.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    totalDaysToClose += daysToClose;
    closedWithData += 1;
  }
  const avgDaysToClose = closedWithData > 0 ? Math.round(totalDaysToClose / closedWithData) : 0;

  // 4. Conversion rates
  const totalDeals = deals.length;
  const pastScreening = deals.filter((d) =>
    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage)
  ).length;
  const pastDD = deals.filter((d) =>
    ["IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage)
  ).length;
  const pastIC = deals.filter((d) =>
    ["CLOSING", "CLOSED"].includes(d.stage)
  ).length;

  const screeningToDD = totalDeals > 0 ? Math.min(100, Math.round((pastScreening / totalDeals) * 100)) : 0;
  const ddToIC = pastScreening > 0 ? Math.min(100, Math.round((pastDD / pastScreening) * 100)) : 0;
  const icToClose = pastDD > 0 ? Math.min(100, Math.round((pastIC / pastDD) * 100)) : 0;

  // 5. Deal throughput - entering and exiting per month
  const enteringPerMonth: { month: string; count: number }[] = [];
  const exitingPerMonth: { month: string; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    // Entering: deals created in this month
    const entering = deals.filter((deal) => {
      return (
        deal.createdAt.getFullYear() === d.getFullYear() &&
        deal.createdAt.getMonth() === d.getMonth()
      );
    }).length;

    // Exiting: deals that reached CLOSED or DEAD in this month
    const exiting = deals.filter((deal) => {
      if (!["CLOSED", "DEAD"].includes(deal.stage)) return false;
      return (
        deal.updatedAt.getFullYear() === d.getFullYear() &&
        deal.updatedAt.getMonth() === d.getMonth()
      );
    }).length;

    enteringPerMonth.push({ month: label, count: entering });
    exitingPerMonth.push({ month: label, count: exiting });
  }

  // Conversion funnel data
  const funnelData = [
    { stage: "Screening", count: totalDeals, pct: 100 },
    { stage: "Due Diligence", count: pastScreening, pct: screeningToDD },
    { stage: "IC Review", count: pastDD, pct: ddToIC },
    { stage: "Closing", count: pastIC, pct: icToClose },
    { stage: "Closed", count: closedDeals.length, pct: totalDeals > 0 ? Math.min(100, Math.round((closedDeals.length / totalDeals) * 100)) : 0 },
  ];

  // Total pipeline value (active deals only)
  const totalPipelineValue = deals
    .filter((d) => ACTIVE_STAGES.includes(d.stage))
    .reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0);

  const overallConversion = totalDeals > 0
    ? Math.min(100, Math.round((closedDeals.length / totalDeals) * 100))
    : 0;

  // 6. Kill reason breakdown (dead deals only)
  const deadDeals = deals.filter((d) => d.stage === "DEAD");
  const killReasonMap: Record<string, number> = {};
  for (const deal of deadDeals) {
    const reason = (deal as any).killReason || "Unknown";
    killReasonMap[reason] = (killReasonMap[reason] || 0) + 1;
  }
  const killReasonBreakdown = Object.entries(killReasonMap)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    pipelineValueByStage,
    stageDistribution,
    timeInStage,
    dealVelocity: {
      closedPerMonth,
      avgDaysToClose,
    },
    conversionRates: { screeningToDD, ddToIC, icToClose },
    throughput: { enteringPerMonth, exitingPerMonth },
    funnelData,
    killReasonBreakdown,
    summary: {
      totalPipelineValue,
      activeDeals: deals.filter((d) => ACTIVE_STAGES.includes(d.stage)).length,
      avgDaysToClose,
      overallConversion,
      totalDeadDeals: deadDeals.length,
    },
  });
}
