import { describe, it, expect } from "vitest";
import { xirr } from "@/lib/computations/irr";
import { computeMetrics } from "@/lib/computations/metrics";

describe("Per-Entity Performance Metrics (LP-07)", () => {
  it("computes per-entity TVPI from entity-scoped called/distributed/NAV", () => {
    const result = computeMetrics(100000, 30000, 80000);
    expect(result.tvpi).toBeCloseTo(1.10, 2);
    expect(result.dpi).toBeCloseTo(0.30, 2);
    expect(result.rvpi).toBeCloseTo(0.80, 2);
  });

  it("computes per-entity IRR from entity-scoped cash flows", () => {
    const cashFlows = [
      { date: new Date("2024-01-01"), amount: -100000 },
      { date: new Date("2024-07-01"), amount: 20000 },
      { date: new Date("2024-12-31"), amount: 90000 },
    ];
    const irr = xirr(cashFlows);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(0);
  });

  it.todo("dashboard API returns entityMetrics[] array with per-entity IRR/TVPI/DPI/RVPI");
  it.todo("entitySnapshotHistory is grouped by entityId for sparkline rendering");
});
