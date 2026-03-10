import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { xirr } from "@/lib/computations/irr";
import { computeMetrics } from "@/lib/computations/metrics";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      commitments: {
        include: {
          entity: {
            include: {
              navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
            },
          },
        },
      },
      capitalAccounts: { orderBy: { periodDate: "desc" }, take: 1 },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalCommitted = investor.commitments.reduce((s, c) => s + c.amount, 0);
  const totalCalled = investor.commitments.reduce((s, c) => s + c.calledAmount, 0);

  // Aggregate distribution line items for this investor
  const distributionAgg = await prisma.distributionLineItem.aggregate({
    where: { investorId },
    _sum: {
      netAmount: true,
      income: true,
      returnOfCapital: true,
    },
  });

  const totalDistributed = distributionAgg._sum.netAmount ?? 0;
  const totalIncome = distributionAgg._sum.income ?? 0;
  const totalPrincipal = distributionAgg._sum.returnOfCapital ?? 0;

  // Compute current NAV: sum of endingBalance from the latest capital account per entity
  const allCapitalAccounts = await prisma.capitalAccount.findMany({
    where: { investorId },
    orderBy: { periodDate: "desc" },
    select: { entityId: true, endingBalance: true, periodDate: true },
  });

  // Keep only the latest record per entity
  const latestByEntity = new Map<string, number>();
  for (const ca of allCapitalAccounts) {
    if (!latestByEntity.has(ca.entityId)) {
      latestByEntity.set(ca.entityId, ca.endingBalance);
    }
  }
  const currentNAV = Array.from(latestByEntity.values()).reduce((s, v) => s + v, 0);

  // ── Performance Metrics (using computation engines) ──
  const metrics = computeMetrics(totalCalled, totalDistributed, currentNAV);

  // ── IRR Calculation ──
  // Build cash flow array from capital call and distribution line items
  const callLineItems = await prisma.capitalCallLineItem.findMany({
    where: { investorId },
    include: { capitalCall: { select: { callDate: true } } },
  });
  const distLineItems = await prisma.distributionLineItem.findMany({
    where: { investorId },
    include: { distribution: { select: { distributionDate: true } } },
  });

  const cashFlows: { date: Date; amount: number }[] = [];

  // Capital calls are outflows (negative)
  for (const cli of callLineItems) {
    if (cli.capitalCall.callDate && cli.amount > 0) {
      cashFlows.push({ date: cli.capitalCall.callDate, amount: -cli.amount });
    }
  }

  // Distributions are inflows (positive)
  for (const dli of distLineItems) {
    if (dli.distribution.distributionDate && dli.netAmount > 0) {
      cashFlows.push({ date: dli.distribution.distributionDate, amount: dli.netAmount });
    }
  }

  // Terminal value: current NAV as of today (positive inflow)
  if (currentNAV > 0) {
    cashFlows.push({ date: new Date(), amount: currentNAV });
  }

  const irr = cashFlows.length >= 2 ? xirr(cashFlows) : null;

  // Fire-and-forget: save metric snapshot (don't block response)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prisma.metricSnapshot.upsert({
    where: {
      investorId_entityId_periodDate: {
        investorId,
        entityId: "__AGGREGATE__",
        periodDate: today,
      },
    },
    create: {
      investorId,
      entityId: "__AGGREGATE__",
      periodDate: today,
      irr,
      tvpi: metrics.tvpi,
      dpi: metrics.dpi,
      rvpi: metrics.rvpi,
      nav: currentNAV,
      totalCalled,
      totalDistributed,
    },
    update: {
      irr,
      tvpi: metrics.tvpi,
      dpi: metrics.dpi,
      rvpi: metrics.rvpi,
      nav: currentNAV,
      totalCalled,
      totalDistributed,
    },
  }).catch((err: unknown) => console.error("[metric-snapshot] save failed:", err));

  // ── Per-Entity Metrics for LP-07 ──
  const entityMetrics: {
    entityId: string;
    entityName: string;
    commitment: number;
    calledAmount: number;
    irr: number | null;
    tvpi: number | null;
    dpi: number | null;
    rvpi: number | null;
    nav: number;
    totalCalled: number;
    totalDistributed: number;
  }[] = [];

  for (const commitment of investor.commitments) {
    const entityId = commitment.entityId;

    // Entity-scoped capital call line items
    const entityCallItems = await prisma.capitalCallLineItem.findMany({
      where: {
        investorId,
        capitalCall: { entityId },
      },
      include: {
        capitalCall: { select: { callDate: true } },
      },
    });

    // Entity-scoped distribution line items
    const entityDistItems = await prisma.distributionLineItem.findMany({
      where: {
        investorId,
        distribution: { entityId },
      },
      include: {
        distribution: { select: { distributionDate: true } },
      },
    });

    const entityCalled = entityCallItems.reduce((s, cli) => s + cli.amount, 0);
    const entityDistributed = entityDistItems.reduce((s, dli) => s + dli.netAmount, 0);

    // Entity NAV from latest capital account
    const entityNAV = latestByEntity.get(entityId) ?? 0;

    const entityMetricsCalc = computeMetrics(entityCalled, entityDistributed, entityNAV);

    // Entity IRR from entity-scoped cash flows
    const entityCashFlows: { date: Date; amount: number }[] = [];
    for (const cli of entityCallItems) {
      if (cli.capitalCall.callDate && cli.amount > 0) {
        entityCashFlows.push({ date: cli.capitalCall.callDate, amount: -cli.amount });
      }
    }
    for (const dli of entityDistItems) {
      if (dli.distribution.distributionDate && dli.netAmount > 0) {
        entityCashFlows.push({ date: dli.distribution.distributionDate, amount: dli.netAmount });
      }
    }
    if (entityNAV > 0) {
      entityCashFlows.push({ date: new Date(), amount: entityNAV });
    }
    const entityIRR = entityCashFlows.length >= 2 ? xirr(entityCashFlows) : null;

    entityMetrics.push({
      entityId,
      entityName: commitment.entity.name,
      commitment: commitment.amount,
      calledAmount: commitment.calledAmount,
      irr: entityIRR,
      tvpi: entityMetricsCalc.tvpi,
      dpi: entityMetricsCalc.dpi,
      rvpi: entityMetricsCalc.rvpi,
      nav: entityNAV,
      totalCalled: entityCalled,
      totalDistributed: entityDistributed,
    });

    // Fire-and-forget: per-entity metric snapshot
    prisma.metricSnapshot.upsert({
      where: {
        investorId_entityId_periodDate: { investorId, entityId, periodDate: today },
      },
      create: {
        investorId,
        entityId,
        periodDate: today,
        irr: entityIRR,
        tvpi: entityMetricsCalc.tvpi,
        dpi: entityMetricsCalc.dpi,
        rvpi: entityMetricsCalc.rvpi,
        nav: entityNAV,
        totalCalled: entityCalled,
        totalDistributed: entityDistributed,
      },
      update: {
        irr: entityIRR,
        tvpi: entityMetricsCalc.tvpi,
        dpi: entityMetricsCalc.dpi,
        rvpi: entityMetricsCalc.rvpi,
        nav: entityNAV,
        totalCalled: entityCalled,
        totalDistributed: entityDistributed,
      },
    }).catch((err: unknown) => console.error("[metric-snapshot-entity] save failed:", err));
  }

  // Fetch recent MetricSnapshot history for sparklines (per-entity, excludes aggregate)
  const snapshotHistoryRaw = await prisma.metricSnapshot.findMany({
    where: { investorId, entityId: { not: "__AGGREGATE__" } },
    orderBy: { periodDate: "asc" },
    take: 100,
  });

  // Group by entityId
  const snapshotMap = new Map<string, { periodDate: string; irr: number | null; tvpi: number | null }[]>();
  for (const snap of snapshotHistoryRaw) {
    const existing = snapshotMap.get(snap.entityId) ?? [];
    existing.push({
      periodDate: snap.periodDate.toISOString(),
      irr: snap.irr ?? null,
      tvpi: snap.tvpi ?? null,
    });
    snapshotMap.set(snap.entityId, existing);
  }

  const entitySnapshotHistory = Array.from(snapshotMap.entries()).map(([entityId, snapshots]) => ({
    entityId,
    snapshots,
  }));

  return NextResponse.json({
    investor,
    totalCommitted,
    totalCalled,
    totalDistributed,
    totalIncome,
    totalPrincipal,
    currentNAV,
    tvpi: metrics.tvpi,
    dpi: metrics.dpi,
    rvpi: metrics.rvpi,
    irr,
    commitments: investor.commitments,
    entityMetrics,
    entitySnapshotHistory,
  });
}
