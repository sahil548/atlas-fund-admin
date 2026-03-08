import { describe, it, expect } from "vitest";
import { APP_ROUTES, getSidebarNav } from "@/lib/routes";

// LP-03c (P02-T2): LP settings route registered in routes.ts
// Requirement: /lp-settings route exists with portal: "lp" in APP_ROUTES

describe("LP settings route registration — /lp-settings in APP_ROUTES", () => {
  it("has a /lp-settings route registered in APP_ROUTES", () => {
    const route = APP_ROUTES.find((r) => r.path === "/lp-settings");
    expect(route).toBeDefined();
  });

  it("/lp-settings route is in the LP portal (not GP)", () => {
    const route = APP_ROUTES.find((r) => r.path === "/lp-settings");
    expect(route?.portal).toBe("lp");
  });

  it("/lp-settings route has a Settings-related label", () => {
    const route = APP_ROUTES.find((r) => r.path === "/lp-settings");
    expect(route?.label).toBeDefined();
    expect(route?.label.length).toBeGreaterThan(0);
  });

  it("/lp-settings route has notification-related keywords for discoverability", () => {
    const route = APP_ROUTES.find((r) => r.path === "/lp-settings");
    const keywords = route?.keywords ?? [];
    expect(keywords).toContain("settings");
    expect(keywords).toContain("notifications");
  });

  it("/lp-settings route has a priority number below /lp-documents (priority 62)", () => {
    const settingsRoute = APP_ROUTES.find((r) => r.path === "/lp-settings");
    const documentsRoute = APP_ROUTES.find((r) => r.path === "/lp-documents");
    expect(settingsRoute).toBeDefined();
    expect(documentsRoute).toBeDefined();
    // Settings is lowest priority in LP portal — appears at the bottom of sidebar
    expect(settingsRoute!.priority).toBeLessThan(documentsRoute!.priority);
  });

  it("/lp-settings route appears in the LP sidebar navigation", () => {
    const lpSidebarNav = getSidebarNav("lp");
    const settingsInSidebar = lpSidebarNav.find((item) => item.key === "/lp-settings");
    expect(settingsInSidebar).toBeDefined();
  });

  it("/lp-settings route does NOT appear in the GP sidebar navigation", () => {
    const gpSidebarNav = getSidebarNav("gp");
    const settingsInGP = gpSidebarNav.find((item) => item.key === "/lp-settings");
    expect(settingsInGP).toBeUndefined();
  });
});

describe("All expected LP portal routes are registered", () => {
  const expectedLpPaths = [
    "/lp-dashboard",
    "/lp-account",
    "/lp-portfolio",
    "/lp-activity",
    "/lp-documents",
    "/lp-settings",
  ];

  for (const path of expectedLpPaths) {
    it(`${path} is registered with portal: "lp"`, () => {
      const route = APP_ROUTES.find((r) => r.path === path);
      expect(route).toBeDefined();
      expect(route?.portal).toBe("lp");
    });
  }
});
