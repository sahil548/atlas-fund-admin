import { describe, it, expect } from "vitest";
import {
  checkPermission,
  validatePermissions,
  DEFAULT_PERMISSIONS,
  PERMISSION_AREAS,
} from "@/lib/permissions-types";
import type { UserPermissions } from "@/lib/permissions-types";

// ── checkPermission tests ──────────────────────────────────

describe("checkPermission", () => {
  const fullPerms: UserPermissions = Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "full"]),
  ) as UserPermissions;

  const readOnlyPerms: UserPermissions = Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "read_only"]),
  ) as UserPermissions;

  const nonePerms: UserPermissions = Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "none"]),
  ) as UserPermissions;

  // Test 1: full satisfies read_only
  it("returns true when user has full and read_only is required", () => {
    expect(checkPermission(fullPerms, "deals", "read_only")).toBe(true);
  });

  // Test 2: read_only does NOT satisfy full
  it("returns false when user has read_only and full is required", () => {
    expect(checkPermission(readOnlyPerms, "deals", "full")).toBe(false);
  });

  // Test 3: none fails all checks
  it("returns false when user has none for any area", () => {
    expect(checkPermission(nonePerms, "deals", "read_only")).toBe(false);
    expect(checkPermission(nonePerms, "entities", "read_only")).toBe(false);
    expect(checkPermission(nonePerms, "capital_activity", "full")).toBe(false);
    expect(checkPermission(nonePerms, "investors", "none")).toBe(true); // none >= none
  });

  it("returns true when user has full and full is required", () => {
    expect(checkPermission(fullPerms, "deals", "full")).toBe(true);
  });

  it("returns true when user has read_only and read_only is required", () => {
    expect(checkPermission(readOnlyPerms, "capital_activity", "read_only")).toBe(true);
  });

  it("returns false when user has none and full is required", () => {
    expect(checkPermission(nonePerms, "reports", "full")).toBe(false);
  });
});

// ── DEFAULT_PERMISSIONS tests ─────────────────────────────

describe("DEFAULT_PERMISSIONS", () => {
  // Test 4: GP_ADMIN gets full for all 7 areas
  it("GP_ADMIN has full permission for all areas", () => {
    const perms = DEFAULT_PERMISSIONS.GP_ADMIN;
    for (const area of PERMISSION_AREAS) {
      expect(perms[area]).toBe("full");
    }
  });

  // Test 5: GP_TEAM defaults to read_only for all 7 areas
  it("GP_TEAM has read_only permission for all areas", () => {
    const perms = DEFAULT_PERMISSIONS.GP_TEAM;
    for (const area of PERMISSION_AREAS) {
      expect(perms[area]).toBe("read_only");
    }
  });

  // Test 6: SERVICE_PROVIDER gets read_only for all areas
  it("SERVICE_PROVIDER has read_only permission for all areas", () => {
    const perms = DEFAULT_PERMISSIONS.SERVICE_PROVIDER;
    for (const area of PERMISSION_AREAS) {
      expect(perms[area]).toBe("read_only");
    }
  });

  // Test 7: LP_INVESTOR gets none for all areas
  it("LP_INVESTOR has none permission for all areas", () => {
    const perms = DEFAULT_PERMISSIONS.LP_INVESTOR;
    for (const area of PERMISSION_AREAS) {
      expect(perms[area]).toBe("none");
    }
  });

  it("covers all 7 permission areas", () => {
    expect(PERMISSION_AREAS).toHaveLength(7);
    expect(PERMISSION_AREAS).toContain("deals");
    expect(PERMISSION_AREAS).toContain("entities");
    expect(PERMISSION_AREAS).toContain("capital_activity");
    expect(PERMISSION_AREAS).toContain("investors");
    expect(PERMISSION_AREAS).toContain("documents");
    expect(PERMISSION_AREAS).toContain("settings");
    expect(PERMISSION_AREAS).toContain("reports");
  });
});

// ── validatePermissions tests ─────────────────────────────

describe("validatePermissions", () => {
  // Test 8: returns null for incomplete permission objects
  it("returns null for incomplete permission objects (missing areas)", () => {
    const incomplete = { deals: "full", entities: "read_only" };
    expect(validatePermissions(incomplete)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(validatePermissions({})).toBeNull();
  });

  it("returns null when some areas have invalid levels", () => {
    const invalid = Object.fromEntries(
      PERMISSION_AREAS.map((area) => [area, "full"]),
    );
    invalid.deals = "superuser"; // invalid level
    expect(validatePermissions(invalid)).toBeNull();
  });

  // Test 9: returns valid UserPermissions for complete objects
  it("returns valid UserPermissions for complete and valid objects", () => {
    const complete = Object.fromEntries(
      PERMISSION_AREAS.map((area) => [area, "read_only"]),
    );
    const result = validatePermissions(complete);
    expect(result).not.toBeNull();
    for (const area of PERMISSION_AREAS) {
      expect(result![area]).toBe("read_only");
    }
  });

  it("returns valid UserPermissions for mixed level objects", () => {
    const mixed: Record<string, unknown> = {
      deals: "full",
      entities: "read_only",
      capital_activity: "none",
      investors: "full",
      documents: "read_only",
      settings: "none",
      reports: "full",
    };
    const result = validatePermissions(mixed);
    expect(result).not.toBeNull();
    expect(result!.deals).toBe("full");
    expect(result!.capital_activity).toBe("none");
  });
});
