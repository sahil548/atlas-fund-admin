import { describe, it, expect } from "vitest";
import { sortAssets, toggleSortDirection } from "../task-sort-utils";

interface SimpleAsset {
  id: string;
  name: string;
  costBasis: number | null;
}

describe("sortAssets", () => {
  const assets: SimpleAsset[] = [
    { id: "1", name: "Zeta Corp", costBasis: 3_000_000 },
    { id: "2", name: "Alpha Ventures", costBasis: 1_000_000 },
    { id: "3", name: "Omega Ltd", costBasis: 5_000_000 },
    { id: "4", name: "Beta Holdings", costBasis: null },
  ];

  it("sorts ascending by name (A → Z)", () => {
    const sorted = sortAssets(assets, "name", "asc");
    const names = sorted.map((a) => a.name);
    expect(names[0]).toBe("Alpha Ventures");
    expect(names[1]).toBe("Beta Holdings");
    expect(names[2]).toBe("Omega Ltd");
    expect(names[3]).toBe("Zeta Corp");
  });

  it("sorts descending by name (Z → A)", () => {
    const sorted = sortAssets(assets, "name", "desc");
    const names = sorted.map((a) => a.name);
    expect(names[0]).toBe("Zeta Corp");
    expect(names[1]).toBe("Omega Ltd");
    expect(names[2]).toBe("Beta Holdings");
    expect(names[3]).toBe("Alpha Ventures");
  });

  it("sorts ascending by numeric field (costBasis, lowest first)", () => {
    const sorted = sortAssets(assets, "costBasis", "asc");
    // null goes to end, then sorted numerically
    expect(sorted[0].costBasis).toBe(1_000_000);
    expect(sorted[1].costBasis).toBe(3_000_000);
    expect(sorted[2].costBasis).toBe(5_000_000);
    expect(sorted[3].costBasis).toBeNull();
  });

  it("sorts descending by numeric field (costBasis, highest first)", () => {
    const sorted = sortAssets(assets, "costBasis", "desc");
    expect(sorted[0].costBasis).toBe(5_000_000);
    expect(sorted[1].costBasis).toBe(3_000_000);
    expect(sorted[2].costBasis).toBe(1_000_000);
    expect(sorted[3].costBasis).toBeNull();
  });

  it("places null values at the end regardless of sort direction (asc)", () => {
    const sorted = sortAssets(assets, "costBasis", "asc");
    const last = sorted[sorted.length - 1];
    expect(last.costBasis).toBeNull();
  });

  it("places null values at the end regardless of sort direction (desc)", () => {
    const sorted = sortAssets(assets, "costBasis", "desc");
    const last = sorted[sorted.length - 1];
    expect(last.costBasis).toBeNull();
  });

  it("does not mutate the original array", () => {
    const original = [...assets];
    sortAssets(assets, "name", "asc");
    expect(assets).toEqual(original);
  });
});

describe("toggleSortDirection", () => {
  it("toggles asc to desc", () => {
    expect(toggleSortDirection("asc")).toBe("desc");
  });

  it("toggles desc to asc", () => {
    expect(toggleSortDirection("desc")).toBe("asc");
  });
});
