/**
 * Phase 19 Plan 03 — Dashboard Components render smoke tests.
 *
 * Tests cover:
 *  - EntityCard: exports correctly as a function
 *  - EntityCard: source includes correct href patterns for quick action links
 *  - SummaryBar, NeedsAttentionPanel, DealPipelineFunnel: module exports verify
 *  - Correct SWR key patterns in each component source
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const DASHBOARD_DIR = path.resolve(
  __dirname,
  "../../components/features/dashboard"
);

// ── EntityCard module ────────────────────────────────────────────────────────

describe("EntityCard", () => {
  it("exports EntityCard as a function", async () => {
    const mod = await import("@/components/features/dashboard/entity-card");
    expect(typeof mod.EntityCard).toBe("function");
  });

  it("source contains href for View Entity (/entities/{entityId})", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    expect(src).toContain("/entities/${entityId}");
  });

  it("source contains href for Create Capital Call (/capital?entityId={entityId})", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    expect(src).toContain("/capital?entityId=${entityId}");
  });

  it("source contains href for Generate Report (/reports?entityId={entityId})", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    expect(src).toContain("/reports?entityId=${entityId}");
  });

  it("source contains Eye, DollarSign, FileText quick action icons", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    expect(src).toContain("Eye");
    expect(src).toContain("DollarSign");
    expect(src).toContain("FileText");
  });

  it("source does NOT contain expand/collapse pattern (no expanded state)", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    // Compact card — no more expand/collapse
    expect(src).not.toContain("setExpanded");
    expect(src).not.toContain("perAssetBreakdown");
  });

  it("source contains dark mode classes", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "entity-card.tsx"),
      "utf-8"
    );
    expect(src).toContain("dark:bg-gray-900");
    expect(src).toContain("dark:border-gray-700");
  });
});

// ── SummaryBar module ────────────────────────────────────────────────────────

describe("SummaryBar", () => {
  it("exports SummaryBar as a function", async () => {
    const mod = await import("@/components/features/dashboard/summary-bar");
    expect(typeof mod.SummaryBar).toBe("function");
  });

  it("source fetches from /api/dashboard/stats", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "summary-bar.tsx"),
      "utf-8"
    );
    expect(src).toContain("/api/dashboard/stats");
  });

  it("source uses SWR for stats and entity-cards", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "summary-bar.tsx"),
      "utf-8"
    );
    expect(src).toContain("useSWR");
    expect(src).toContain("entity-cards");
  });

  it("source contains the 5 expected metric labels", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "summary-bar.tsx"),
      "utf-8"
    );
    expect(src).toContain("Total NAV");
    expect(src).toContain("Portfolio IRR");
    expect(src).toContain("TVPI");
    expect(src).toContain("Active Deals");
    expect(src).toContain("Dry Powder");
  });
});

// ── NeedsAttentionPanel module ────────────────────────────────────────────────

describe("NeedsAttentionPanel", () => {
  it("exports NeedsAttentionPanel as a function", async () => {
    const mod = await import(
      "@/components/features/dashboard/needs-attention-panel"
    );
    expect(typeof mod.NeedsAttentionPanel).toBe("function");
  });

  it("source fetches from /api/dashboard/alerts", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "needs-attention-panel.tsx"),
      "utf-8"
    );
    expect(src).toContain("/api/dashboard/alerts");
  });

  it("source has all-clear message for zero alerts", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "needs-attention-panel.tsx"),
      "utf-8"
    );
    expect(src).toContain("All clear");
  });

  it("source shows high severity before medium (sort order)", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "needs-attention-panel.tsx"),
      "utf-8"
    );
    const highIdx = src.indexOf('"high"');
    const mediumIdx = src.indexOf('"medium"');
    // high appears in the sort filter before medium
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(mediumIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeLessThan(mediumIdx);
  });
});

// ── DealPipelineFunnel module ─────────────────────────────────────────────────

describe("DealPipelineFunnel", () => {
  it("exports DealPipelineFunnel as a function", async () => {
    const mod = await import(
      "@/components/features/dashboard/deal-pipeline-funnel"
    );
    expect(typeof mod.DealPipelineFunnel).toBe("function");
  });

  it("source fetches from /api/dashboard/pipeline-summary", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "deal-pipeline-funnel.tsx"),
      "utf-8"
    );
    expect(src).toContain("/api/dashboard/pipeline-summary");
  });

  it("source has all 4 pipeline stages", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "deal-pipeline-funnel.tsx"),
      "utf-8"
    );
    expect(src).toContain("SCREENING");
    expect(src).toContain("DUE_DILIGENCE");
    expect(src).toContain("IC_REVIEW");
    expect(src).toContain("CLOSING");
  });

  it("source links each stage to /deals?stage=STAGE_NAME", () => {
    const src = fs.readFileSync(
      path.join(DASHBOARD_DIR, "deal-pipeline-funnel.tsx"),
      "utf-8"
    );
    expect(src).toContain("/deals?stage=");
  });
});

// ── Dashboard page: LP Comparison removed ────────────────────────────────────

describe("Dashboard page", () => {
  it("does NOT import LPComparisonView", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/(gp)/dashboard/page.tsx"),
      "utf-8"
    );
    expect(src).not.toContain("LPComparisonView");
    expect(src).not.toContain("lp-comparison-view");
  });

  it("imports all three new components", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/(gp)/dashboard/page.tsx"),
      "utf-8"
    );
    expect(src).toContain("SummaryBar");
    expect(src).toContain("NeedsAttentionPanel");
    expect(src).toContain("DealPipelineFunnel");
  });

  it("uses compact grid with 4+ columns", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../app/(gp)/dashboard/page.tsx"),
      "utf-8"
    );
    // Should have xl:grid-cols-4 (or more) for compact entity card layout
    expect(src).toContain("xl:grid-cols-4");
  });
});
