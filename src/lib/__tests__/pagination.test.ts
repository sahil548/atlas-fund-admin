import { describe, it, expect } from "vitest";
import {
  parsePaginationParams,
  buildPrismaArgs,
  buildPaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

// ── parsePaginationParams ──────────────────────────────────────────────────────

describe("parsePaginationParams", () => {
  it("returns default limit of 50 when no limit is provided", () => {
    const params = new URLSearchParams("firmId=firm-1");
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(50);
  });

  it("parses cursor from URL search params", () => {
    const params = new URLSearchParams("cursor=clxabc123&limit=10");
    const result = parsePaginationParams(params);
    expect(result.cursor).toBe("clxabc123");
  });

  it("parses search string from URL search params", () => {
    const params = new URLSearchParams("search=acme&limit=20");
    const result = parsePaginationParams(params);
    expect(result.search).toBe("acme");
  });

  it("returns undefined cursor when cursor is absent", () => {
    const params = new URLSearchParams("limit=10");
    const result = parsePaginationParams(params);
    expect(result.cursor).toBeUndefined();
  });

  it("returns undefined search when search is absent", () => {
    const params = new URLSearchParams("limit=10");
    const result = parsePaginationParams(params);
    expect(result.search).toBeUndefined();
  });

  it("collects unknown params as filters", () => {
    const params = new URLSearchParams("firmId=firm-1&stage=SCREENING&assetClass=PE");
    const result = parsePaginationParams(params);
    expect(result.filters).toEqual({ stage: "SCREENING", assetClass: "PE" });
  });

  it("does not include known params (firmId, cursor, limit, search) in filters", () => {
    const params = new URLSearchParams("firmId=firm-1&cursor=abc&limit=10&search=foo");
    const result = parsePaginationParams(params);
    expect(result.filters).toEqual({});
  });

  it("clamps limit to a maximum of 100", () => {
    const params = new URLSearchParams("limit=999");
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(100);
  });

  it("falls back to 50 when limit is not a valid number", () => {
    const params = new URLSearchParams("limit=notanumber");
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(50);
  });

  it("falls back to 50 when limit is zero or negative", () => {
    const zeroParams = new URLSearchParams("limit=0");
    expect(parsePaginationParams(zeroParams).limit).toBe(50);

    const negParams = new URLSearchParams("limit=-5");
    expect(parsePaginationParams(negParams).limit).toBe(50);
  });
});

// ── buildPrismaArgs ────────────────────────────────────────────────────────────

describe("buildPrismaArgs", () => {
  it("sets take to limit+1 to detect hasMore", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params);
    expect(args.take).toBe(11);
  });

  it("sets skip to 0 and cursor to undefined when no cursor provided", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params);
    expect(args.skip).toBe(0);
    expect(args.cursor).toBeUndefined();
  });

  it("sets skip to 1 and cursor to { id } when cursor is present", () => {
    const params: PaginationParams = { limit: 10, cursor: "item-abc" };
    const args = buildPrismaArgs(params);
    expect(args.skip).toBe(1);
    expect(args.cursor).toEqual({ id: "item-abc" });
  });

  it("builds OR search condition across provided searchFields", () => {
    const params: PaginationParams = { limit: 10, search: "acme" };
    const args = buildPrismaArgs(params, ["name", "description"]);
    expect(args.where.OR).toEqual([
      { name: { contains: "acme", mode: "insensitive" } },
      { description: { contains: "acme", mode: "insensitive" } },
    ]);
  });

  it("does not add OR condition when searchFields is empty", () => {
    const params: PaginationParams = { limit: 10, search: "acme" };
    const args = buildPrismaArgs(params, []);
    expect(args.where.OR).toBeUndefined();
  });

  it("does not add OR condition when search is absent", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params, ["name"]);
    expect(args.where.OR).toBeUndefined();
  });

  it("merges baseWhere into the resulting where clause", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params, [], { firmId: "firm-1" });
    expect(args.where.firmId).toBe("firm-1");
  });

  it("adds filter key-value pairs directly to where", () => {
    const params: PaginationParams = {
      limit: 10,
      filters: { stage: "SCREENING", assetClass: "PE" },
    };
    const args = buildPrismaArgs(params, [], {});
    expect(args.where.stage).toBe("SCREENING");
    expect(args.where.assetClass).toBe("PE");
  });

  it("orders by createdAt descending by default", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("orders by a custom field when orderByField is provided", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params, [], {}, "name");
    expect(args.orderBy).toEqual({ name: "desc" });
  });
});

// ── buildPaginatedResult ───────────────────────────────────────────────────────

describe("buildPaginatedResult", () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` }));

  it("returns hasMore=false and nextCursor=null when rawData length equals limit", () => {
    const items = makeItems(10);
    const result = buildPaginatedResult(items, 10, 10);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.data).toHaveLength(10);
  });

  it("returns hasMore=true and nextCursor pointing to last item when rawData exceeds limit", () => {
    // API fetches limit+1 = 11 items when limit=10 to detect hasMore
    const items = makeItems(11);
    const result = buildPaginatedResult(items, 10, 100);
    expect(result.hasMore).toBe(true);
    expect(result.data).toHaveLength(10);
    expect(result.nextCursor).toBe("item-9"); // last item in the sliced page
  });

  it("returns hasMore=false and nextCursor=null on empty result", () => {
    const result = buildPaginatedResult([], 10, 0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it("returns hasMore=false when rawData is less than limit (partial page)", () => {
    const items = makeItems(3);
    const result = buildPaginatedResult(items, 10, 3);
    expect(result.hasMore).toBe(false);
    expect(result.data).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it("includes the total count in the result", () => {
    const items = makeItems(5);
    const result = buildPaginatedResult(items, 10, 42);
    expect(result.total).toBe(42);
  });

  it("slices rawData to exactly limit when hasMore is true (does not expose extra item)", () => {
    const items = makeItems(11); // limit+1 over-fetch
    const result = buildPaginatedResult(items, 10, 100);
    // The 11th item (index 10) must NOT be in the returned data
    expect(result.data.find((d) => d.id === "item-10")).toBeUndefined();
  });
});
