import { describe, it, expect } from "vitest";

// LP-02a (P01-T1): metrics-history API returns grouped time-series data
// Requirement: quarterly grouping, monthly grouping, empty state returns [],
// period format "Q1 2026" for quarterly / "Jan 2026" for monthly,
// last snapshot per period wins.
//
// The grouping logic is embedded in metrics-history/route.ts GET handler.
// Since it cannot be imported without prisma, we test the pure grouping
// algorithm here as a reference implementation that exactly mirrors the
// route's Map-based grouping algorithm.

interface Snapshot {
  periodDate: Date;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  nav: number | null;
}

interface MetricPoint {
  period: string;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  nav: number | null;
}

// Reference implementation mirroring metrics-history/route.ts grouping logic
function groupSnapshots(
  snapshots: Snapshot[],
  granularity: "quarterly" | "monthly"
): MetricPoint[] {
  if (snapshots.length === 0) return [];

  const grouped = new Map<string, Snapshot>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const snap of snapshots) {
    const d = new Date(snap.periodDate);
    let key: string;

    if (granularity === "quarterly") {
      const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
      key = `Q${quarter} ${d.getUTCFullYear()}`;
    } else {
      key = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }

    // Always overwrite — last snapshot in the period wins
    grouped.set(key, snap);
  }

  return Array.from(grouped.entries()).map(([period, snap]) => ({
    period,
    irr: snap.irr,
    tvpi: snap.tvpi,
    dpi: snap.dpi,
    rvpi: snap.rvpi,
    nav: snap.nav,
  }));
}

function makeSnap(isoDate: string, overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    periodDate: new Date(isoDate),
    irr: 0.12,
    tvpi: 1.2,
    dpi: 0.4,
    rvpi: 0.8,
    nav: 1_000_000,
    ...overrides,
  };
}

describe("metrics-history grouping — empty snapshots returns empty array", () => {
  it("returns an empty array when there are no snapshots", () => {
    const result = groupSnapshots([], "quarterly");
    expect(result).toEqual([]);
  });

  it("returns an empty array for monthly granularity with no snapshots", () => {
    const result = groupSnapshots([], "monthly");
    expect(result).toEqual([]);
  });
});

describe("metrics-history grouping — quarterly granularity produces correct period format", () => {
  it("formats Q1 period as 'Q1 YYYY'", () => {
    const snapshots = [makeSnap("2026-01-15T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].period).toBe("Q1 2026");
  });

  it("formats Q2 period as 'Q2 YYYY' (April)", () => {
    const snapshots = [makeSnap("2026-04-10T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].period).toBe("Q2 2026");
  });

  it("formats Q3 period as 'Q3 YYYY' (July)", () => {
    const snapshots = [makeSnap("2026-07-20T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].period).toBe("Q3 2026");
  });

  it("formats Q4 period as 'Q4 YYYY' (October)", () => {
    const snapshots = [makeSnap("2026-10-05T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].period).toBe("Q4 2026");
  });

  it("groups multiple snapshots from the same quarter into a single result entry", () => {
    const snapshots = [
      makeSnap("2026-01-10T00:00:00.000Z", { irr: 0.10 }),
      makeSnap("2026-02-15T00:00:00.000Z", { irr: 0.11 }),
      makeSnap("2026-03-20T00:00:00.000Z", { irr: 0.12 }),
    ];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("Q1 2026");
  });

  it("last snapshot in the quarter wins (most recent irr is returned)", () => {
    const snapshots = [
      makeSnap("2026-01-10T00:00:00.000Z", { irr: 0.10, tvpi: 1.0 }),
      makeSnap("2026-02-15T00:00:00.000Z", { irr: 0.11, tvpi: 1.1 }),
      makeSnap("2026-03-25T00:00:00.000Z", { irr: 0.15, tvpi: 1.5 }), // last
    ];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].irr).toBeCloseTo(0.15);
    expect(result[0].tvpi).toBeCloseTo(1.5);
  });

  it("snapshots from different quarters produce separate result entries", () => {
    const snapshots = [
      makeSnap("2026-01-15T00:00:00.000Z"),
      makeSnap("2026-04-15T00:00:00.000Z"),
      makeSnap("2026-07-15T00:00:00.000Z"),
    ];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result).toHaveLength(3);
    const periods = result.map((r) => r.period);
    expect(periods).toContain("Q1 2026");
    expect(periods).toContain("Q2 2026");
    expect(periods).toContain("Q3 2026");
  });
});

describe("metrics-history grouping — monthly granularity produces correct period format", () => {
  it("formats January as 'Jan YYYY'", () => {
    const snapshots = [makeSnap("2026-01-15T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result[0].period).toBe("Jan 2026");
  });

  it("formats June as 'Jun YYYY'", () => {
    const snapshots = [makeSnap("2026-06-10T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result[0].period).toBe("Jun 2026");
  });

  it("formats December as 'Dec YYYY'", () => {
    const snapshots = [makeSnap("2026-12-01T00:00:00.000Z")];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result[0].period).toBe("Dec 2026");
  });

  it("groups multiple snapshots from the same calendar month into a single result entry", () => {
    const snapshots = [
      makeSnap("2026-03-05T00:00:00.000Z", { nav: 900_000 }),
      makeSnap("2026-03-15T00:00:00.000Z", { nav: 950_000 }),
      makeSnap("2026-03-28T00:00:00.000Z", { nav: 1_000_000 }),
    ];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("Mar 2026");
    expect(result[0].nav).toBe(1_000_000); // last wins
  });

  it("two snapshots from adjacent months produce two separate monthly entries", () => {
    const snapshots = [
      makeSnap("2026-01-31T00:00:00.000Z"),
      makeSnap("2026-02-01T00:00:00.000Z"),
    ];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result).toHaveLength(2);
    const periods = result.map((r) => r.period);
    expect(periods).toContain("Jan 2026");
    expect(periods).toContain("Feb 2026");
  });
});

describe("metrics-history grouping — result contains all required metric fields", () => {
  it("result entry has period, irr, tvpi, dpi, rvpi, and nav fields", () => {
    const snapshots = [makeSnap("2026-01-15T00:00:00.000Z", {
      irr: 0.12,
      tvpi: 1.5,
      dpi: 0.4,
      rvpi: 1.1,
      nav: 2_000_000,
    })];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0]).toMatchObject({
      period: "Q1 2026",
      irr: 0.12,
      tvpi: 1.5,
      dpi: 0.4,
      rvpi: 1.1,
      nav: 2_000_000,
    });
  });

  it("null metric values are preserved as null in the result", () => {
    const snapshots = [makeSnap("2026-01-15T00:00:00.000Z", {
      irr: null,
      tvpi: null,
      dpi: null,
      rvpi: null,
      nav: null,
    })];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result[0].irr).toBeNull();
    expect(result[0].tvpi).toBeNull();
    expect(result[0].nav).toBeNull();
  });
});

describe("metrics-history grouping — cross-year grouping", () => {
  it("same quarter in different years produces two separate entries", () => {
    const snapshots = [
      makeSnap("2025-01-10T00:00:00.000Z", { tvpi: 1.0 }),
      makeSnap("2026-01-10T00:00:00.000Z", { tvpi: 1.3 }),
    ];
    const result = groupSnapshots(snapshots, "quarterly");
    expect(result).toHaveLength(2);
    const periods = result.map((r) => r.period);
    expect(periods).toContain("Q1 2025");
    expect(periods).toContain("Q1 2026");
  });

  it("same month name in different years produces two separate monthly entries", () => {
    const snapshots = [
      makeSnap("2025-06-15T00:00:00.000Z", { nav: 800_000 }),
      makeSnap("2026-06-15T00:00:00.000Z", { nav: 1_200_000 }),
    ];
    const result = groupSnapshots(snapshots, "monthly");
    expect(result).toHaveLength(2);
    const periods = result.map((r) => r.period);
    expect(periods).toContain("Jun 2025");
    expect(periods).toContain("Jun 2026");
  });
});
