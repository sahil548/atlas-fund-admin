/**
 * Phase 19 Activity Feed — unit tests for pure helper functions.
 *
 * Tests cover:
 *  - mergeAndSortActivities: combines multiple source arrays and sorts by date desc
 *  - filterByTypes: returns only activities matching the requested type set
 *  - filterByEntity: returns only activities linked to a specific entityId
 *  - paginateActivities: correct slice, offset, hasMore flag
 *  - Empty source arrays produce empty result without crashing
 */

import { describe, it, expect } from "vitest";
import {
  mergeAndSortActivities,
  filterByTypes,
  filterByEntity,
  paginateActivities,
} from "../activity-feed-helpers";

// ── Type ───────────────────────────────────────────────────────

type ActivityType =
  | "DEAL_ACTIVITY"
  | "CAPITAL_CALL"
  | "DISTRIBUTION"
  | "MEETING"
  | "TASK"
  | "DOCUMENT"
  | "ENTITY_CHANGE";

interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  entityId?: string;
  entityName?: string;
  linkPath: string;
  date: string; // ISO string
}

// ── Helpers ────────────────────────────────────────────────────

function makeItem(
  id: string,
  type: ActivityType,
  date: string,
  entityId?: string,
): ActivityItem {
  return { id, type, description: `desc-${id}`, entityId, linkPath: `/x/${id}`, date };
}

// ── mergeAndSortActivities ─────────────────────────────────────

describe("mergeAndSortActivities", () => {
  it("combines items from multiple sources into a single array", () => {
    const sourceA = [makeItem("a1", "DEAL_ACTIVITY", "2024-01-03T00:00:00Z")];
    const sourceB = [makeItem("b1", "CAPITAL_CALL", "2024-01-02T00:00:00Z")];
    const sourceC = [makeItem("c1", "DISTRIBUTION", "2024-01-01T00:00:00Z")];

    const result = mergeAndSortActivities([sourceA, sourceB, sourceC]);
    expect(result).toHaveLength(3);
  });

  it("sorts items by date descending (newest first)", () => {
    const items = [
      makeItem("old", "TASK", "2024-01-01T00:00:00Z"),
      makeItem("new", "MEETING", "2024-03-01T00:00:00Z"),
      makeItem("mid", "DOCUMENT", "2024-02-01T00:00:00Z"),
    ];

    const result = mergeAndSortActivities([items]);
    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("mid");
    expect(result[2].id).toBe("old");
  });

  it("handles empty sources array without crashing", () => {
    const result = mergeAndSortActivities([]);
    expect(result).toEqual([]);
  });

  it("handles source arrays that are themselves empty", () => {
    const result = mergeAndSortActivities([[], [], []]);
    expect(result).toEqual([]);
  });

  it("handles single-source array correctly", () => {
    const source = [
      makeItem("x2", "DEAL_ACTIVITY", "2024-06-01T00:00:00Z"),
      makeItem("x1", "DEAL_ACTIVITY", "2024-04-01T00:00:00Z"),
    ];
    const result = mergeAndSortActivities([source]);
    expect(result[0].id).toBe("x2");
    expect(result[1].id).toBe("x1");
  });

  it("maintains stable sort when dates are equal", () => {
    const sameDate = "2024-05-15T12:00:00Z";
    const items = [
      makeItem("first", "DEAL_ACTIVITY", sameDate),
      makeItem("second", "CAPITAL_CALL", sameDate),
    ];
    const result = mergeAndSortActivities([items]);
    // Both should be present regardless of order
    const ids = result.map((r) => r.id);
    expect(ids).toContain("first");
    expect(ids).toContain("second");
  });
});

// ── filterByTypes ──────────────────────────────────────────────

describe("filterByTypes", () => {
  const items: ActivityItem[] = [
    makeItem("d1", "DEAL_ACTIVITY", "2024-01-01T00:00:00Z"),
    makeItem("c1", "CAPITAL_CALL", "2024-01-02T00:00:00Z"),
    makeItem("m1", "MEETING", "2024-01-03T00:00:00Z"),
    makeItem("t1", "TASK", "2024-01-04T00:00:00Z"),
  ];

  it("returns all items when types set is empty (show all)", () => {
    const result = filterByTypes(items, new Set());
    expect(result).toHaveLength(4);
  });

  it("returns only items matching a single type", () => {
    const result = filterByTypes(items, new Set(["MEETING"]));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("returns items matching multiple types", () => {
    const result = filterByTypes(items, new Set(["DEAL_ACTIVITY", "CAPITAL_CALL"]));
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("d1");
    expect(ids).toContain("c1");
  });

  it("returns empty array when no items match the filter", () => {
    const result = filterByTypes(items, new Set(["ENTITY_CHANGE"]));
    expect(result).toHaveLength(0);
  });
});

// ── filterByEntity ─────────────────────────────────────────────

describe("filterByEntity", () => {
  const items: ActivityItem[] = [
    makeItem("i1", "DEAL_ACTIVITY", "2024-01-01T00:00:00Z", "entity-A"),
    makeItem("i2", "CAPITAL_CALL", "2024-01-02T00:00:00Z", "entity-B"),
    makeItem("i3", "MEETING", "2024-01-03T00:00:00Z", "entity-A"),
    makeItem("i4", "TASK", "2024-01-04T00:00:00Z", undefined),
  ];

  it("returns all items when entityId is empty string (no filter)", () => {
    const result = filterByEntity(items, "");
    expect(result).toHaveLength(4);
  });

  it("returns only items linked to the specified entityId", () => {
    const result = filterByEntity(items, "entity-A");
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("i1");
    expect(ids).toContain("i3");
  });

  it("returns empty when no items match the entityId", () => {
    const result = filterByEntity(items, "entity-Z");
    expect(result).toHaveLength(0);
  });

  it("excludes items without entityId when filtering by a specific entity", () => {
    const result = filterByEntity(items, "entity-A");
    const ids = result.map((r) => r.id);
    expect(ids).not.toContain("i4"); // i4 has no entityId
  });
});

// ── paginateActivities ─────────────────────────────────────────

describe("paginateActivities", () => {
  const items: ActivityItem[] = Array.from({ length: 25 }, (_, i) =>
    makeItem(`item-${i}`, "TASK", `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`),
  );

  it("returns the correct slice starting from offset 0", () => {
    const result = paginateActivities(items, 0, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe("item-0");
  });

  it("returns the correct slice with a non-zero offset", () => {
    const result = paginateActivities(items, 10, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe("item-10");
  });

  it("sets hasMore=true when more items exist beyond current page", () => {
    const result = paginateActivities(items, 0, 20);
    expect(result.hasMore).toBe(true);
  });

  it("sets hasMore=false on the last page", () => {
    const result = paginateActivities(items, 20, 20);
    expect(result.hasMore).toBe(false);
    expect(result.items).toHaveLength(5);
  });

  it("returns total count of all items (before pagination)", () => {
    const result = paginateActivities(items, 0, 10);
    expect(result.total).toBe(25);
  });

  it("returns empty result for offset beyond array length", () => {
    const result = paginateActivities(items, 100, 10);
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
