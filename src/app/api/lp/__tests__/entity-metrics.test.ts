import { describe, it, expect, vi, beforeEach } from "vitest";
import { xirr } from "@/lib/computations/irr";
import { computeMetrics } from "@/lib/computations/metrics";

// Mock prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    investor: { findUnique: vi.fn() },
    distributionLineItem: { aggregate: vi.fn(), findMany: vi.fn() },
    capitalAccount: { findMany: vi.fn() },
    capitalCallLineItem: { findMany: vi.fn() },
    metricSnapshot: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/lp/[investorId]/dashboard/route";

function makeInvestorWithCommitments(investorId: string) {
  return {
    id: investorId,
    name: "Test LP",
    firmId: "firm-1",
    commitments: [
      {
        id: "com-1",
        investorId,
        entityId: "entity-1",
        amount: 500000,
        calledAmount: 300000,
        entity: {
          id: "entity-1",
          name: "Fund I",
          navComputations: [],
        },
      },
      {
        id: "com-2",
        investorId,
        entityId: "entity-2",
        amount: 750000,
        calledAmount: 400000,
        entity: {
          id: "entity-2",
          name: "Fund II",
          navComputations: [],
        },
      },
    ],
    capitalAccounts: [],
  };
}

function setupMocksForEntityMetrics(investorId: string) {
  vi.mocked(prisma.investor.findUnique).mockResolvedValue(
    makeInvestorWithCommitments(investorId) as never
  );
  vi.mocked(prisma.distributionLineItem.aggregate).mockResolvedValue({
    _sum: { netAmount: 100000, income: 20000, returnOfCapital: 80000 },
  } as never);
  vi.mocked(prisma.capitalAccount.findMany).mockResolvedValue([
    { entityId: "entity-1", endingBalance: 350000, periodDate: new Date() },
    { entityId: "entity-2", endingBalance: 500000, periodDate: new Date() },
  ] as never);

  // Global call line items (for aggregate IRR)
  const globalCallItems = [
    { amount: 300000, capitalCall: { callDate: new Date("2024-01-15") } },
    { amount: 400000, capitalCall: { callDate: new Date("2024-02-20") } },
  ];

  // Global dist line items (for aggregate IRR)
  const globalDistItems = [
    { netAmount: 50000, distribution: { distributionDate: new Date("2024-07-01") } },
    { netAmount: 50000, distribution: { distributionDate: new Date("2024-09-01") } },
  ];

  // Entity-1 specific call items (first call for entity-1)
  const entity1CallItems = [
    { amount: 300000, capitalCall: { callDate: new Date("2024-01-15") } },
  ];
  // Entity-1 specific dist items
  const entity1DistItems = [
    { netAmount: 50000, distribution: { distributionDate: new Date("2024-07-01") } },
  ];
  // Entity-2 specific call items
  const entity2CallItems = [
    { amount: 400000, capitalCall: { callDate: new Date("2024-02-20") } },
  ];
  // Entity-2 specific dist items
  const entity2DistItems = [
    { netAmount: 50000, distribution: { distributionDate: new Date("2024-09-01") } },
  ];

  // metricSnapshot history for sparklines
  const snapshots = [
    { entityId: "entity-1", periodDate: new Date("2024-06-30"), irr: 0.08, tvpi: 1.1 },
    { entityId: "entity-1", periodDate: new Date("2024-09-30"), irr: 0.10, tvpi: 1.15 },
    { entityId: "entity-2", periodDate: new Date("2024-06-30"), irr: 0.05, tvpi: 1.05 },
  ];

  // Setup the findMany mock to return different values based on call order
  // Call sequence: 1) global callLineItems, 2) global distLineItems,
  //   3) entity-1 calls, 4) entity-1 dists, 5) entity-2 calls, 6) entity-2 dists,
  //   7) metricSnapshot history
  vi.mocked(prisma.capitalCallLineItem.findMany)
    .mockResolvedValueOnce(globalCallItems as never)
    .mockResolvedValueOnce(entity1CallItems as never)
    .mockResolvedValueOnce(entity2CallItems as never);

  vi.mocked(prisma.distributionLineItem.findMany)
    .mockResolvedValueOnce(globalDistItems as never)
    .mockResolvedValueOnce(entity1DistItems as never)
    .mockResolvedValueOnce(entity2DistItems as never);

  vi.mocked(prisma.metricSnapshot.upsert).mockResolvedValue({} as never);

  // The final findMany is for snapshotHistory (metricSnapshot.findMany)
  // We need to add findMany to the metricSnapshot mock
  (prisma.metricSnapshot as Record<string, unknown>).findMany = vi.fn().mockResolvedValue(snapshots as never);
}

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

  it("dashboard API returns entityMetrics[] array with per-entity IRR/TVPI/DPI/RVPI", async () => {
    vi.clearAllMocks();
    setupMocksForEntityMetrics("investor-xyz");

    const req = new Request("http://localhost/api/lp/investor-xyz/dashboard");
    const params = Promise.resolve({ investorId: "investor-xyz" });

    const response = await GET(req, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("entityMetrics");
    expect(Array.isArray(body.entityMetrics)).toBe(true);
    expect(body.entityMetrics.length).toBeGreaterThan(0);

    // Verify shape of each entity metric entry
    const em = body.entityMetrics[0];
    expect(em).toHaveProperty("entityId");
    expect(em).toHaveProperty("entityName");
    expect(em).toHaveProperty("irr");
    expect(em).toHaveProperty("tvpi");
    expect(em).toHaveProperty("dpi");
    expect(em).toHaveProperty("rvpi");
    expect(em).toHaveProperty("nav");
    expect(em).toHaveProperty("totalCalled");
    expect(em).toHaveProperty("totalDistributed");

    // At least one entity should have non-null tvpi (has called capital)
    const hasMetrics = body.entityMetrics.some(
      (m: EntityMetric) => m.tvpi !== null
    );
    expect(hasMetrics).toBe(true);
  });

  it("entitySnapshotHistory is grouped by entityId for sparkline rendering", async () => {
    vi.clearAllMocks();
    setupMocksForEntityMetrics("investor-xyz");

    const req = new Request("http://localhost/api/lp/investor-xyz/dashboard");
    const params = Promise.resolve({ investorId: "investor-xyz" });

    const response = await GET(req, { params });
    const body = await response.json();

    expect(body).toHaveProperty("entitySnapshotHistory");
    expect(Array.isArray(body.entitySnapshotHistory)).toBe(true);

    // Each entry should have entityId and snapshots array
    for (const entry of body.entitySnapshotHistory) {
      expect(entry).toHaveProperty("entityId");
      expect(entry).toHaveProperty("snapshots");
      expect(Array.isArray(entry.snapshots)).toBe(true);

      // Each snapshot should have periodDate, irr, tvpi
      for (const snap of entry.snapshots) {
        expect(snap).toHaveProperty("periodDate");
        expect(snap).toHaveProperty("irr");
        expect(snap).toHaveProperty("tvpi");
      }
    }
  });
});

// Type helper for test assertions
interface EntityMetric {
  entityId: string;
  entityName: string;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  nav: number;
  totalCalled: number;
  totalDistributed: number;
}
