import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    investor: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/investors/[id]/profile/route";

function makeParams(id: string) {
  return Promise.resolve({ id });
}

const mockInvestor = {
  id: "inv-1",
  name: "Acme Capital LP",
  phone: "555-0101",
  mailingAddress: "123 Main St, New York, NY 10001",
  taxId: "12-3456789",
  commitments: [
    {
      amount: 5000000,
      entity: { id: "ent-1", name: "Atlas Fund I" },
    },
  ],
  notificationPreference: {
    emailAddress: "lp@acme.com",
    phoneNumber: null,
  },
  contact: {
    firstName: "John",
    lastName: "Smith",
    email: "john@acme.com",
    phone: null,
  },
};

describe("LP Profile API (LP-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/investors/{id}/profile returns investor profile with legalName, email, phone, mailingAddress, taxId, entityAffiliations", async () => {
    vi.mocked(prisma.investor.findUnique).mockResolvedValue(mockInvestor as never);

    const req = new Request("http://localhost/api/investors/inv-1/profile");
    const response = await GET(req, { params: makeParams("inv-1") });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.investorId).toBe("inv-1");
    expect(body.legalName).toBe("Acme Capital LP");
    expect(body.email).toBe("lp@acme.com"); // from notificationPreference
    expect(body.phone).toBe("555-0101");
    expect(body.mailingAddress).toBe("123 Main St, New York, NY 10001");
    expect(body.taxId).toBe("12-3456789");
    expect(Array.isArray(body.entityAffiliations)).toBe(true);
    expect(body.entityAffiliations).toHaveLength(1);
    expect(body.entityAffiliations[0].entityId).toBe("ent-1");
    expect(body.entityAffiliations[0].entityName).toBe("Atlas Fund I");
    expect(body.entityAffiliations[0].commitment).toBe(5000000);
  });

  it("GET returns 404 for non-existent investor", async () => {
    vi.mocked(prisma.investor.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/investors/nonexistent/profile");
    const response = await GET(req, { params: makeParams("nonexistent") });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  it("PUT /api/investors/{id}/profile updates mailingAddress, taxId, phone", async () => {
    const updatedInvestor = {
      ...mockInvestor,
      mailingAddress: "456 Oak Ave, Los Angeles, CA 90001",
      taxId: "98-7654321",
      phone: "555-0200",
    };

    vi.mocked(prisma.investor.update).mockResolvedValue(updatedInvestor as never);

    const req = new Request("http://localhost/api/investors/inv-1/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mailingAddress: "456 Oak Ave, Los Angeles, CA 90001",
        taxId: "98-7654321",
        phone: "555-0200",
      }),
    });

    const response = await PUT(req, { params: makeParams("inv-1") });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mailingAddress).toBe("456 Oak Ave, Los Angeles, CA 90001");
    expect(body.taxId).toBe("98-7654321");
    expect(body.phone).toBe("555-0200");

    // Verify update was called with correct data
    expect(prisma.investor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({
          mailingAddress: "456 Oak Ave, Los Angeles, CA 90001",
          taxId: "98-7654321",
          phone: "555-0200",
        }),
      })
    );
  });

  it("PUT validates input with Zod schema and rejects invalid data", async () => {
    const req = new Request("http://localhost/api/investors/inv-1/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // mailingAddress must be string, sending a number triggers Zod validation error
      body: JSON.stringify({ mailingAddress: 12345 }),
    });

    const response = await PUT(req, { params: makeParams("inv-1") });
    expect(response.status).toBe(400);
    expect(prisma.investor.update).not.toHaveBeenCalled();
  });
});
