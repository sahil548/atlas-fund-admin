import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth so the route doesn't call Clerk in tests
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
  forbidden: vi.fn(() => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
}));

// Mock audit to avoid DB calls in tests
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { POST } from "@/app/api/k1/acknowledge/route";

const mockAuthUser = {
  id: "user-gp",
  firmId: "firm-1",
  role: "GP_ADMIN",
  name: "GP Admin",
  email: "gp@example.com",
};

describe("K-1 Acknowledgment API (LP-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser as never);
  });

  it("POST /api/k1/acknowledge batch-updates acknowledgedAt and acknowledgedByInvestorId on matching TAX documents", async () => {
    const documentIds = ["doc-1", "doc-2"];
    const investorId = "inv-1";

    // findMany returns matching TAX docs belonging to investor
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1", investorId } as never,
      { id: "doc-2", investorId } as never,
    ]);

    // updateMany returns count
    vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 2 } as never);

    const req = new Request("http://localhost/api/k1/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, investorId }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.acknowledged).toBe(2);
    expect(typeof body.acknowledgedAt).toBe("string");

    // Verify updateMany was called with correct args
    expect(prisma.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: documentIds },
          investorId,
          category: "TAX",
        }),
        data: expect.objectContaining({
          acknowledgedByInvestorId: investorId,
        }),
      })
    );
  });

  it("rejects request with empty documentIds array", async () => {
    const req = new Request("http://localhost/api/k1/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: [], investorId: "inv-1" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("rejects request when documents do not belong to the specified investor", async () => {
    const documentIds = ["doc-1"];

    // findMany returns docs with a DIFFERENT investorId
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1", investorId: "other-investor" } as never,
    ]);

    const req = new Request("http://localhost/api/k1/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, investorId: "inv-1" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(typeof body.error).toBe("string");
  });

  it("returns count of acknowledged documents and timestamp", async () => {
    const documentIds = ["doc-1", "doc-2", "doc-3"];
    const investorId = "inv-1";

    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1", investorId } as never,
      { id: "doc-2", investorId } as never,
      { id: "doc-3", investorId } as never,
    ]);

    vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 3 } as never);

    const req = new Request("http://localhost/api/k1/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, investorId }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.acknowledged).toBe("number");
    expect(body.acknowledged).toBe(3);
    // acknowledgedAt must be a valid ISO string
    expect(() => new Date(body.acknowledgedAt)).not.toThrow();
    expect(new Date(body.acknowledgedAt).toISOString()).toBe(body.acknowledgedAt);
  });
});
