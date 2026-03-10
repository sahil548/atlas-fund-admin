import { describe, it, expect } from "vitest";
import { groupPipelineStages } from "../dashboard-pipeline-utils";
import { buildAlerts } from "../dashboard-alerts-utils";

// ---------------------------------------------------------------------------
// Pipeline Summary Tests
// ---------------------------------------------------------------------------

describe("groupPipelineStages", () => {
  it("maps Prisma groupBy output to the correct ordered stage array", () => {
    const raw = [
      { stage: "IC_REVIEW", _count: { stage: 2 }, _sum: { dealValue: 5000000 } },
      { stage: "SCREENING", _count: { stage: 5 }, _sum: { dealValue: 12000000 } },
      { stage: "DUE_DILIGENCE", _count: { stage: 3 }, _sum: { dealValue: 8000000 } },
      { stage: "CLOSING", _count: { stage: 1 }, _sum: { dealValue: 3000000 } },
    ];

    const result = groupPipelineStages(raw);

    expect(result).toHaveLength(4);
    expect(result[0].stage).toBe("SCREENING");
    expect(result[1].stage).toBe("DUE_DILIGENCE");
    expect(result[2].stage).toBe("IC_REVIEW");
    expect(result[3].stage).toBe("CLOSING");
  });

  it("fills missing stages with count=0 and totalValue=0", () => {
    // Only SCREENING is returned from DB (no active deals in other stages)
    const raw = [
      { stage: "SCREENING", _count: { stage: 3 }, _sum: { dealValue: 7000000 } },
    ];

    const result = groupPipelineStages(raw);

    expect(result).toHaveLength(4);

    const dueDiligence = result.find((s) => s.stage === "DUE_DILIGENCE");
    expect(dueDiligence?.count).toBe(0);
    expect(dueDiligence?.totalValue).toBe(0);

    const icReview = result.find((s) => s.stage === "IC_REVIEW");
    expect(icReview?.count).toBe(0);
    expect(icReview?.totalValue).toBe(0);

    const closing = result.find((s) => s.stage === "CLOSING");
    expect(closing?.count).toBe(0);
    expect(closing?.totalValue).toBe(0);
  });

  it("excludes DEAD and CLOSED deals from the result", () => {
    // groupPipelineStages only receives active stages; DEAD/CLOSED should not appear
    const raw = [
      { stage: "SCREENING", _count: { stage: 3 }, _sum: { dealValue: 6000000 } },
      { stage: "DEAD", _count: { stage: 5 }, _sum: { dealValue: 0 } },
      { stage: "CLOSED", _count: { stage: 2 }, _sum: { dealValue: 20000000 } },
    ];

    const result = groupPipelineStages(raw);

    const stageNames = result.map((s) => s.stage);
    expect(stageNames).not.toContain("DEAD");
    expect(stageNames).not.toContain("CLOSED");
    expect(result).toHaveLength(4);
  });

  it("treats null dealValue sums as 0 (not NaN)", () => {
    // When no deals have a dealValue set, Prisma returns null for _sum
    const raw = [
      { stage: "SCREENING", _count: { stage: 2 }, _sum: { dealValue: null } },
      { stage: "DUE_DILIGENCE", _count: { stage: 1 }, _sum: { dealValue: null } },
    ];

    const result = groupPipelineStages(raw);

    for (const stage of result) {
      expect(Number.isNaN(stage.totalValue)).toBe(false);
      expect(stage.totalValue).toBe(0);
    }
  });

  it("returns correct count and totalValue for present stages", () => {
    const raw = [
      { stage: "SCREENING", _count: { stage: 7 }, _sum: { dealValue: 14000000 } },
    ];

    const result = groupPipelineStages(raw);
    const screening = result.find((s) => s.stage === "SCREENING");

    expect(screening?.count).toBe(7);
    expect(screening?.totalValue).toBe(14000000);
  });
});

// ---------------------------------------------------------------------------
// Alerts API Tests
// ---------------------------------------------------------------------------

describe("buildAlerts", () => {
  const baseCapitalCall = {
    id: "cc-1",
    dueDate: new Date("2026-01-01"),
    amount: 500000,
    entity: { id: "entity-1", name: "Atlas Fund I" },
  };

  const baseCovenant = {
    id: "cov-1",
    name: "Debt Service Coverage Ratio",
    agreement: {
      id: "ca-1",
      asset: { id: "asset-1", name: "Office Tower" },
    },
  };

  const baseLease = {
    id: "lease-1",
    tenantName: "Acme Corp",
    leaseEndDate: new Date("2026-06-01"),
    asset: { id: "asset-2", name: "Retail Center" },
  };

  it("groups items by alert type correctly", () => {
    const result = buildAlerts([baseCapitalCall], [baseCovenant], [baseLease]);

    const types = result.alerts.map((a) => a.type);
    expect(types).toContain("OVERDUE_CAPITAL_CALL");
    expect(types).toContain("COVENANT_BREACH");
    expect(types).toContain("LEASE_EXPIRY");
  });

  it("includes linkPath for navigation on each alert item", () => {
    const result = buildAlerts([baseCapitalCall], [baseCovenant], [baseLease]);

    for (const alert of result.alerts) {
      expect(alert.linkPath).toBeDefined();
      expect(typeof alert.linkPath).toBe("string");
      expect(alert.linkPath.length).toBeGreaterThan(0);
    }

    // Overdue capital call links to entity
    const ccAlert = result.alerts.find((a) => a.type === "OVERDUE_CAPITAL_CALL");
    expect(ccAlert?.linkPath).toBe("/entities/entity-1");

    // Covenant breach links to asset
    const covAlert = result.alerts.find((a) => a.type === "COVENANT_BREACH");
    expect(covAlert?.linkPath).toBe("/assets/asset-1");

    // Lease expiry links to asset
    const leaseAlert = result.alerts.find((a) => a.type === "LEASE_EXPIRY");
    expect(leaseAlert?.linkPath).toBe("/assets/asset-2");
  });

  it("tallies each alert type in the counts object", () => {
    const result = buildAlerts([baseCapitalCall], [baseCovenant], [baseLease]);

    expect(result.counts.overdueCapitalCalls).toBe(1);
    expect(result.counts.covenantBreaches).toBe(1);
    expect(result.counts.leaseExpiries).toBe(1);
  });

  it("returns empty alerts and zero counts when all inputs are empty", () => {
    const result = buildAlerts([], [], []);

    expect(result.alerts).toEqual([]);
    expect(result.counts.overdueCapitalCalls).toBe(0);
    expect(result.counts.covenantBreaches).toBe(0);
    expect(result.counts.leaseExpiries).toBe(0);
  });

  it("assigns high severity to overdue capital calls", () => {
    const result = buildAlerts([baseCapitalCall], [], []);
    const ccAlert = result.alerts.find((a) => a.type === "OVERDUE_CAPITAL_CALL");
    expect(ccAlert?.severity).toBe("high");
  });

  it("assigns high severity to covenant breaches", () => {
    const result = buildAlerts([], [baseCovenant], []);
    const covAlert = result.alerts.find((a) => a.type === "COVENANT_BREACH");
    expect(covAlert?.severity).toBe("high");
  });

  it("assigns medium severity to lease expiries", () => {
    const result = buildAlerts([], [], [baseLease]);
    const leaseAlert = result.alerts.find((a) => a.type === "LEASE_EXPIRY");
    expect(leaseAlert?.severity).toBe("medium");
  });

  it("handles multiple items of each type and returns correct counts", () => {
    const cc2 = { ...baseCapitalCall, id: "cc-2", entity: { id: "entity-2", name: "Fund II" } };
    const cov2 = {
      ...baseCovenant,
      id: "cov-2",
      agreement: { id: "ca-2", asset: { id: "asset-3", name: "Warehouse" } },
    };

    const result = buildAlerts([baseCapitalCall, cc2], [baseCovenant, cov2], [baseLease]);

    expect(result.counts.overdueCapitalCalls).toBe(2);
    expect(result.counts.covenantBreaches).toBe(2);
    expect(result.counts.leaseExpiries).toBe(1);
    expect(result.alerts).toHaveLength(5);
  });
});
