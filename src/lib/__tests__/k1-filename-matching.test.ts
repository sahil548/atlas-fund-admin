import { describe, it, expect } from "vitest";
import {
  normalizeName,
  extractInvestorNameFromFilename,
  matchInvestor,
} from "@/lib/k1-matching";

// ── normalizeName ─────────────────────────────────────────

describe("normalizeName", () => {
  it("replaces underscores with spaces", () => {
    expect(normalizeName("John_Smith")).toBe("john smith");
  });

  it("replaces hyphens with spaces", () => {
    expect(normalizeName("John-Smith")).toBe("john smith");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  John Smith  ")).toBe("john smith");
  });

  it("lowercases the result", () => {
    expect(normalizeName("JOHN SMITH")).toBe("john smith");
  });

  it("handles mixed separators", () => {
    expect(normalizeName("John_Smith-Jr")).toBe("john smith jr");
  });
});

// ── extractInvestorNameFromFilename ───────────────────────

describe("extractInvestorNameFromFilename", () => {
  it("extracts name from K1_John_Smith_2025.pdf pattern", () => {
    expect(extractInvestorNameFromFilename("K1_John_Smith_2025.pdf")).toBe("john smith");
  });

  it("extracts name from K1_JohnSmith.pdf fallback pattern (no year)", () => {
    expect(extractInvestorNameFromFilename("K1_JohnSmith.pdf")).toBe("johnsmith");
  });

  it("returns null for a non-K1 filename", () => {
    expect(extractInvestorNameFromFilename("report_2025.pdf")).toBeNull();
  });

  it("handles lowercase k1 prefix", () => {
    const result = extractInvestorNameFromFilename("k1_Alice_Jones_2024.pdf");
    expect(result).toBe("alice jones");
  });

  it("extracts single-word investor name with year", () => {
    const result = extractInvestorNameFromFilename("K1_Smith_2025.pdf");
    expect(result).toBe("smith");
  });
});

// ── matchInvestor ─────────────────────────────────────────

describe("matchInvestor", () => {
  const investors = [
    { id: "inv-1", name: "John Smith" },
    { id: "inv-2", name: "Acme Capital LLC" },
    { id: "inv-3", name: "Sarah Jones" },
  ];

  it("returns the investor on exact name match (after normalization)", () => {
    const result = matchInvestor("john smith", investors);
    expect(result).toEqual({ id: "inv-1", name: "John Smith" });
  });

  it("returns the investor when investor name contains the extracted name (substring match)", () => {
    // "acme capital llc" contains "acme"
    const result = matchInvestor("acme", investors);
    expect(result).toEqual({ id: "inv-2", name: "Acme Capital LLC" });
  });

  it("returns the investor when extracted name contains the investor name (reverse substring match)", () => {
    // extracted "john smith esq" contains "john smith"
    const result = matchInvestor("john smith esq", investors);
    expect(result).toEqual({ id: "inv-1", name: "John Smith" });
  });

  it("returns null when no investor matches", () => {
    const result = matchInvestor("nonexistent person", investors);
    expect(result).toBeNull();
  });

  it("returns null for an empty investor list", () => {
    const result = matchInvestor("john smith", []);
    expect(result).toBeNull();
  });
});
