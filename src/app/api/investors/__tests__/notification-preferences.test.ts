import { describe, it, expect, vi, beforeEach } from "vitest";

// LP-03b (P02-T1): GET/PUT notification preferences API
// Requirement: GET returns defaults when no record exists,
// PUT upserts preferences with Zod validation,
// gpOverrides.capitalCallsAlwaysImmediate always present in response.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    investorNotificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/investors/[id]/notification-preferences/route";

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe("GET /api/investors/[id]/notification-preferences — returns defaults when no record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with default preferences when investor has no stored preferences", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferredChannel).toBe("EMAIL");
    expect(body.digestPreference).toBe("IMMEDIATE");
    expect(body.emailAddress).toBeNull();
    expect(body.phoneNumber).toBeNull();
  });

  it("returns default notificationTypes with all categories enabled when no record exists", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.notificationTypes).toEqual({
      capitalActivity: true,
      reports: true,
      portfolio: true,
    });
  });

  it("always includes gpOverrides.capitalCallsAlwaysImmediate: true when no record exists", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.gpOverrides).toBeDefined();
    expect(body.gpOverrides.capitalCallsAlwaysImmediate).toBe(true);
  });

  it("returns stored preferences when a record exists for the investor", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "SMS",
      emailAddress: "lp@example.com",
      phoneNumber: "5551234567",
      digestPreference: "WEEKLY_DIGEST",
      notificationTypes: { capitalActivity: true, reports: false, portfolio: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.preferredChannel).toBe("SMS");
    expect(body.emailAddress).toBe("lp@example.com");
    expect(body.digestPreference).toBe("WEEKLY_DIGEST");
    expect(body.notificationTypes.reports).toBe(false);
  });

  it("always includes gpOverrides.capitalCallsAlwaysImmediate: true when a record exists", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "PORTAL_ONLY",
      emailAddress: null,
      phoneNumber: null,
      digestPreference: "IMMEDIATE",
      notificationTypes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.gpOverrides).toBeDefined();
    expect(body.gpOverrides.capitalCallsAlwaysImmediate).toBe(true);
  });

  it("falls back to default notificationTypes when stored value is null", async () => {
    vi.mocked(prisma.investorNotificationPreference.findUnique).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "EMAIL",
      emailAddress: null,
      phoneNumber: null,
      digestPreference: "IMMEDIATE",
      notificationTypes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences");
    const response = await GET(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.notificationTypes.capitalActivity).toBe(true);
    expect(body.notificationTypes.reports).toBe(true);
    expect(body.notificationTypes.portfolio).toBe(true);
  });
});

describe("PUT /api/investors/[id]/notification-preferences — upserts preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts with the provided channel and returns updated record", async () => {
    vi.mocked(prisma.investorNotificationPreference.upsert).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "SMS",
      emailAddress: null,
      phoneNumber: "5551234567",
      digestPreference: "IMMEDIATE",
      notificationTypes: { capitalActivity: true, reports: true, portfolio: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredChannel: "SMS",
        phoneNumber: "5551234567",
      }),
    });

    const response = await PUT(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferredChannel).toBe("SMS");
    expect(prisma.investorNotificationPreference.upsert).toHaveBeenCalledTimes(1);
  });

  it("always includes gpOverrides.capitalCallsAlwaysImmediate: true in PUT response", async () => {
    vi.mocked(prisma.investorNotificationPreference.upsert).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "EMAIL",
      emailAddress: "lp@example.com",
      phoneNumber: null,
      digestPreference: "DAILY_DIGEST",
      notificationTypes: { capitalActivity: true, reports: true, portfolio: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestPreference: "DAILY_DIGEST" }),
    });

    const response = await PUT(req, { params: makeParams("investor-1") });
    const body = await response.json();

    expect(body.gpOverrides).toBeDefined();
    expect(body.gpOverrides.capitalCallsAlwaysImmediate).toBe(true);
  });

  it("returns 400 when payload has an invalid email address", async () => {
    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAddress: "not-an-email" }),
    });

    const response = await PUT(req, { params: makeParams("investor-1") });
    expect(response.status).toBe(400);
    expect(prisma.investorNotificationPreference.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when payload has an unknown preferredChannel value", async () => {
    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredChannel: "TELEGRAM" }),
    });

    const response = await PUT(req, { params: makeParams("investor-1") });
    expect(response.status).toBe(400);
  });

  it("accepts a partial update (only digestPreference) without requiring other fields", async () => {
    vi.mocked(prisma.investorNotificationPreference.upsert).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-1",
      preferredChannel: "EMAIL",
      emailAddress: null,
      phoneNumber: null,
      digestPreference: "WEEKLY_DIGEST",
      notificationTypes: { capitalActivity: true, reports: true, portfolio: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestPreference: "WEEKLY_DIGEST" }),
    });

    const response = await PUT(req, { params: makeParams("investor-1") });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.digestPreference).toBe("WEEKLY_DIGEST");
  });

  it("upsert is called with where: { investorId: id } so it creates-or-updates", async () => {
    vi.mocked(prisma.investorNotificationPreference.upsert).mockResolvedValue({
      id: "pref-1",
      investorId: "investor-42",
      preferredChannel: "EMAIL",
      emailAddress: null,
      phoneNumber: null,
      digestPreference: "IMMEDIATE",
      notificationTypes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = new Request("http://localhost/api/investors/investor-42/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredChannel: "EMAIL" }),
    });

    await PUT(req, { params: makeParams("investor-42") });

    expect(prisma.investorNotificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { investorId: "investor-42" },
      })
    );
  });
});
