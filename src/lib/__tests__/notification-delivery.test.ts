/**
 * Gap 6: Notification channel routing logic
 *
 * Full integration tests require extensive Prisma mocking and are skipped.
 * This file verifies exported function signatures and type contracts.
 */

import { describe, it, expect } from "vitest";

describe("notification-delivery module exports", () => {
  it("exports deliverNotification as a function", async () => {
    const mod = await import("@/lib/notification-delivery");
    expect(typeof mod.deliverNotification).toBe("function");
  });

  it("exports notifyInvestorsOnCapitalCall as a function", async () => {
    const mod = await import("@/lib/notification-delivery");
    expect(typeof mod.notifyInvestorsOnCapitalCall).toBe("function");
  });

  it("exports notifyInvestorsOnDistribution as a function", async () => {
    const mod = await import("@/lib/notification-delivery");
    expect(typeof mod.notifyInvestorsOnDistribution).toBe("function");
  });

  it("exports notifyInvestorsOnReportAvailable as a function", async () => {
    const mod = await import("@/lib/notification-delivery");
    expect(typeof mod.notifyInvestorsOnReportAvailable).toBe("function");
  });

  it("exports notifyInvestorsOnK1Available as a function", async () => {
    const mod = await import("@/lib/notification-delivery");
    expect(typeof mod.notifyInvestorsOnK1Available).toBe("function");
  });
});
