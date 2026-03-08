import { describe, it, expect } from "vitest";
import { APP_ROUTES, getSidebarNav } from "@/lib/routes";

// ── Analytics Route Registration (DEAL-10) ───────────────────
// Requirement: Analytics page registered in routes.ts
// Requirement: Analytics route appears in sidebar navigation

describe("Analytics route registration in APP_ROUTES", () => {
  it("has an /analytics route registered in APP_ROUTES", () => {
    const analyticsRoute = APP_ROUTES.find((r) => r.path === "/analytics");
    expect(analyticsRoute).toBeDefined();
  });

  it("analytics route is in the GP portal (not LP)", () => {
    const analyticsRoute = APP_ROUTES.find((r) => r.path === "/analytics");
    expect(analyticsRoute?.portal).toBe("gp");
  });

  it("analytics route has descriptive label", () => {
    const analyticsRoute = APP_ROUTES.find((r) => r.path === "/analytics");
    expect(analyticsRoute?.label).toBe("Analytics");
  });

  it("analytics route has pipeline-related keywords for command bar discoverability", () => {
    const analyticsRoute = APP_ROUTES.find((r) => r.path === "/analytics");
    const keywords = analyticsRoute?.keywords ?? [];
    expect(keywords).toContain("analytics");
    expect(keywords).toContain("pipeline");
  });

  it("analytics route has a priority value between Accounting (82) and Meetings (80)", () => {
    const analyticsRoute = APP_ROUTES.find((r) => r.path === "/analytics");
    const accountingRoute = APP_ROUTES.find((r) => r.path === "/accounting");
    const meetingsRoute = APP_ROUTES.find((r) => r.path === "/meetings");

    expect(analyticsRoute).toBeDefined();
    expect(accountingRoute).toBeDefined();
    expect(meetingsRoute).toBeDefined();

    const analyticsPriority = analyticsRoute!.priority;
    const accountingPriority = accountingRoute!.priority;
    const meetingsPriority = meetingsRoute!.priority;

    expect(analyticsPriority).toBeLessThan(accountingPriority);
    expect(analyticsPriority).toBeGreaterThan(meetingsPriority);
  });

  it("analytics route appears in the GP sidebar nav", () => {
    const sidebarNav = getSidebarNav("gp");
    const analyticsInSidebar = sidebarNav.find((item) => item.key === "/analytics");
    expect(analyticsInSidebar).toBeDefined();
  });

  it("analytics route does NOT appear in the LP sidebar nav", () => {
    const lpSidebarNav = getSidebarNav("lp");
    const analyticsInLP = lpSidebarNav.find((item) => item.key === "/analytics");
    expect(analyticsInLP).toBeUndefined();
  });
});

// ── Core GP Routes presence (sanity check) ───────────────────

describe("Core GP deal desk routes are registered", () => {
  it("/deals route is registered for deal pipeline", () => {
    const route = APP_ROUTES.find((r) => r.path === "/deals");
    expect(route).toBeDefined();
    expect(route?.portal).toBe("gp");
  });

  it("/assets route is registered for portfolio", () => {
    const route = APP_ROUTES.find((r) => r.path === "/assets");
    expect(route).toBeDefined();
    expect(route?.portal).toBe("gp");
  });

  it("/settings route is registered for configuration", () => {
    const route = APP_ROUTES.find((r) => r.path === "/settings");
    expect(route).toBeDefined();
    expect(route?.portal).toBe("gp");
  });
});
