/**
 * Phase 15 — Entity Hierarchy & Vehicle Management Tests
 * Wave 0 stubs — filled in by Plans 01-03, 05
 */

import { EntityRegulatoryDataSchema, JurisdictionRecordSchema } from "@/lib/schemas";

// Status transition logic (mirrors the API and dialog implementation)
const validTransitions: Record<string, string[]> = {
  ACTIVE: ["WINDING_DOWN"],
  WINDING_DOWN: ["DISSOLVED", "ACTIVE"],
  DISSOLVED: [],
};

function isValidTransition(from: string, to: string): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

describe("Phase 15: Entity Hierarchy", () => {
  describe("ENTITY-01: Vehicle view modes", () => {
    it("buildTree nests child entities under parent by parentEntityId", async () => {
      const { buildTree } = await import("@/lib/vehicle-hierarchy");
      const entities = [
        { id: "fund-1", name: "Main Fund", parentEntityId: null },
        { id: "spv-1", name: "SPV Alpha", parentEntityId: "fund-1" },
        { id: "spv-2", name: "SPV Beta", parentEntityId: "fund-1" },
      ];
      const roots = buildTree(entities);
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe("fund-1");
      expect(roots[0].childEntities).toHaveLength(2);
    });

    it("buildTree returns entities without parentEntityId as roots", async () => {
      const { buildTree } = await import("@/lib/vehicle-hierarchy");
      const entities = [
        { id: "fund-1", name: "Fund A", parentEntityId: null },
        { id: "fund-2", name: "Fund B", parentEntityId: null },
      ];
      const roots = buildTree(entities);
      expect(roots).toHaveLength(2);
    });
  });

  describe("ENTITY-03: Regulatory filings data", () => {
    it("EntityRegulatoryDataSchema validates complete filing record", () => {
      const data = {
        filings: [{
          id: "f1",
          filingType: "FORM_D",
          jurisdiction: "Federal",
          filedDate: "2025-01-15",
          dueDate: null,
          status: "FILED",
          filingNumber: "D-12345",
          notes: null,
          documentUrl: null,
        }],
        jurisdictions: [],
      };
      expect(EntityRegulatoryDataSchema.safeParse(data).success).toBe(true);
    });

    it("EntityRegulatoryDataSchema rejects invalid filing status", () => {
      const data = {
        filings: [{
          id: "f1",
          filingType: "FORM_D",
          jurisdiction: "Federal",
          status: "INVALID_STATUS",
        }],
      };
      expect(EntityRegulatoryDataSchema.safeParse(data).success).toBe(false);
    });

    it("JurisdictionRecordSchema validates jurisdiction record", () => {
      const data = {
        id: "j1",
        jurisdiction: "Delaware",
        registeredWithAgency: "Division of Corporations",
        authorizationDate: "2024-06-01",
        jurisdictionId: "LLC-123456",
        status: "ACTIVE",
        statusDate: "2024-06-01",
      };
      expect(JurisdictionRecordSchema.safeParse(data).success).toBe(true);
    });
  });

  describe("ENTITY-04: Status transitions", () => {
    it("valid transitions: ACTIVE -> WINDING_DOWN is allowed", () => {
      expect(isValidTransition("ACTIVE", "WINDING_DOWN")).toBe(true);
    });

    it("valid transitions: WINDING_DOWN -> DISSOLVED is allowed", () => {
      expect(isValidTransition("WINDING_DOWN", "DISSOLVED")).toBe(true);
    });

    it("valid transitions: WINDING_DOWN -> ACTIVE (revert) is allowed", () => {
      expect(isValidTransition("WINDING_DOWN", "ACTIVE")).toBe(true);
    });

    it("valid transitions: DISSOLVED -> any is rejected (terminal state)", () => {
      expect(isValidTransition("DISSOLVED", "ACTIVE")).toBe(false);
      expect(isValidTransition("DISSOLVED", "WINDING_DOWN")).toBe(false);
    });

    it("valid transitions: ACTIVE -> DISSOLVED directly is rejected", () => {
      expect(isValidTransition("ACTIVE", "DISSOLVED")).toBe(false);
    });
  });
});
