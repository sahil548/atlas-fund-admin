import { describe, it, expect, vi, beforeEach } from "vitest";

// LP-01 (P01-T1): Dashboard API computes metrics from real data + fire-and-forget snapshot save
// Requirement: metrics computation logic called on every GET,
// fire-and-forget upsert pattern (not awaited — never blocks response),
// response shape includes tvpi, dpi, rvpi, irr, investor, totalCalled, etc.

// Mock prisma before importing the route to avoid real DB connections.
// distributionLineItem needs both aggregate (for totals) and findMany (for IRR cashflows).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    investor: {
      findUnique: vi.fn(),
    },
    distributionLineItem: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    capitalAccount: {
      findMany: vi.fn(),
    },
    capitalCallLineItem: {
      findMany: vi.fn(),
    },
    metricSnapshot: {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock computations to return controllable values
vi.mock("@/lib/computations/metrics", () => ({
  computeMetrics: vi.fn().mockReturnValue({
    tvpi: 1.5,
    dpi: 0.4,
    rvpi: 1.1,
    moic: null,
  }),
}));

vi.mock("@/lib/computations/irr", () => ({
  xirr: vi.fn().mockReturnValue(0.12),
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/lp/[investorId]/dashboard/route";

// Minimal investor shape returned by the mocked prisma.investor.findUnique
function makeMockInvestor(investorId: string) {
  return {
    id: investorId,
    name: "Test LP",
    firmId: "firm-1",
    commitments: [
      {
        id: "com-1",
        amount: 1_000_000,
        calledAmount: 600_000,
        entity: {
          id: "entity-1",
          name: "Fund I",
          navComputations: [],
        },
      },
    ],
    capitalAccounts: [],
  };
}

// Setup all mocks needed for a successful GET response
function setupSuccessMocks(investorId: string) {
  vi.mocked(prisma.investor.findUnique).mockResolvedValue(
    makeMockInvestor(investorId) as never
  );
  vi.mocked(prisma.distributionLineItem.aggregate).mockResolvedValue({
    _sum: { netAmount: 400_000, income: 50_000, returnOfCapital: 350_000 },
  } as never);
  vi.mocked(prisma.capitalAccount.findMany).mockResolvedValue([
    { entityId: "entity-1", endingBalance: 1_100_000, periodDate: new Date() },
  ] as never);
  vi.mocked(prisma.capitalCallLineItem.findMany).mockResolvedValue([
    {
      amount: 600_000,
      capitalCall: { callDate: new Date("2024-01-15T12:00:00Z") },
    },
  ] as never);
  vi.mocked(prisma.distributionLineItem.findMany).mockResolvedValue([
    {
      netAmount: 400_000,
      distribution: { distributionDate: new Date("2024-06-15T12:00:00Z") },
    },
  ] as never);
  vi.mocked(prisma.metricSnapshot.upsert).mockResolvedValue({} as never);
}

describe("Dashboard API GET — response shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessMocks("investor-abc");
  });

  it("returns 200 with investor and computed metrics in response body", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    const response = await GET(req, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("investor");
    expect(body).toHaveProperty("tvpi");
    expect(body).toHaveProperty("dpi");
    expect(body).toHaveProperty("rvpi");
    expect(body).toHaveProperty("irr");
    expect(body).toHaveProperty("totalCalled");
    expect(body).toHaveProperty("totalDistributed");
    expect(body).toHaveProperty("currentNAV");
  });

  it("returns computed tvpi, dpi, rvpi values from computeMetrics engine", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    const response = await GET(req, { params });
    const body = await response.json();

    expect(body.tvpi).toBe(1.5);
    expect(body.dpi).toBe(0.4);
    expect(body.rvpi).toBe(1.1);
  });

  it("returns totalCommitted aggregated from investor commitments", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    const response = await GET(req, { params });
    const body = await response.json();

    expect(body.totalCommitted).toBe(1_000_000);
  });
});

describe("Dashboard API GET — fire-and-forget snapshot save", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.investor.findUnique).mockResolvedValue(
      makeMockInvestor("investor-abc") as never
    );
    vi.mocked(prisma.distributionLineItem.aggregate).mockResolvedValue({
      _sum: { netAmount: 0, income: 0, returnOfCapital: 0 },
    } as never);
    vi.mocked(prisma.capitalAccount.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.capitalCallLineItem.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.distributionLineItem.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.metricSnapshot.upsert).mockResolvedValue({} as never);
  });

  it("calls metricSnapshot.upsert at least once per GET request (once for aggregate + once per entity)", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    await GET(req, { params });

    // Allow microtasks to flush so the fire-and-forget promises initiate
    await new Promise((r) => setTimeout(r, 0));

    // Route upserts once for the aggregate (__AGGREGATE__) + once per entity commitment.
    // makeMockInvestor has 1 commitment (entity-1), so total = 2 upsert calls.
    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledTimes(2);
  });

  it("upsert is called with the investor's ID in the where clause", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    await GET(req, { params });
    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          investorId_entityId_periodDate: expect.objectContaining({
            investorId: "investor-abc",
          }),
        }),
      })
    );
  });

  it("upsert uses '__AGGREGATE__' sentinel for the aggregate snapshot (not a real entity ID)", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    await GET(req, { params });
    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          investorId_entityId_periodDate: expect.objectContaining({
            entityId: "__AGGREGATE__",
          }),
        }),
      })
    );
  });

  it("upsert create payload includes tvpi, dpi, rvpi from computeMetrics", async () => {
    const req = new Request("http://localhost/api/lp/investor-abc/dashboard");
    const params = Promise.resolve({ investorId: "investor-abc" });

    // Use the full success mock to have metrics computed
    vi.clearAllMocks();
    setupSuccessMocks("investor-abc");

    await GET(req, { params });
    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tvpi: 1.5,
          dpi: 0.4,
          rvpi: 1.1,
        }),
      })
    );
  });
});

describe("Dashboard API GET — 404 when investor not found", () => {
  it("returns 404 status when investorId does not exist", async () => {
    vi.mocked(prisma.investor.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/lp/nonexistent/dashboard");
    const params = Promise.resolve({ investorId: "nonexistent" });

    const response = await GET(req, { params });
    expect(response.status).toBe(404);
  });
});
