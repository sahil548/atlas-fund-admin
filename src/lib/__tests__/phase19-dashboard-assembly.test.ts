/**
 * Phase 19 Dashboard Assembly Verification Tests
 *
 * These are file-content assertion tests (grep-as-test pattern).
 * They verify that the final dashboard wiring is correct without
 * needing DOM rendering or a browser environment.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

const ROOT = join(__dirname, "../../..");

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

describe("Phase 19 Dashboard Assembly", () => {
  describe("Dashboard page.tsx — all 7 sections wired", () => {
    const dashboardPage = readFile("src/app/(gp)/dashboard/page.tsx");

    it("imports SummaryBar", () => {
      expect(dashboardPage).toMatch(/import.*SummaryBar.*from/);
    });

    it("imports NeedsAttentionPanel", () => {
      expect(dashboardPage).toMatch(/import.*NeedsAttentionPanel.*from/);
    });

    it("imports DealPipelineFunnel", () => {
      expect(dashboardPage).toMatch(/import.*DealPipelineFunnel.*from/);
    });

    it("imports EntityCard", () => {
      expect(dashboardPage).toMatch(/import.*EntityCard.*from/);
    });

    it("imports PortfolioAggregates", () => {
      expect(dashboardPage).toMatch(/import.*PortfolioAggregates.*from/);
    });

    it("imports ActivityFeedSection", () => {
      expect(dashboardPage).toMatch(/import.*ActivityFeedSection.*from/);
    });

    it("renders ActivityFeedSection in JSX", () => {
      expect(dashboardPage).toMatch(/<ActivityFeedSection/);
    });
  });

  describe("asset-allocation-chart.tsx — clean single-ring donut (no nested pie)", () => {
    const assetChart = readFile(
      "src/components/features/dashboard/asset-allocation-chart.tsx"
    );

    it("does NOT render innerRing data", () => {
      expect(assetChart).not.toMatch(/data\.innerRing/);
    });

    it("does NOT reference PARTICIPATION_HEX (inner ring removed)", () => {
      expect(assetChart).not.toMatch(/PARTICIPATION_HEX/);
    });

    it("does NOT reference PARTICIPATION_LABELS (inner ring removed)", () => {
      expect(assetChart).not.toMatch(/PARTICIPATION_LABELS/);
    });

    it("uses a single Pie component with innerRadius (donut shape)", () => {
      expect(assetChart).toMatch(/innerRadius/);
    });

    it("uses the outerRing data", () => {
      expect(assetChart).toMatch(/outerRing/);
    });

    it("uses the /api/dashboard/asset-allocation endpoint", () => {
      expect(assetChart).toMatch(/useSWR.*asset-allocation/s);
    });
  });

  describe("portfolio-aggregates.tsx — RecentActivityFeed removed", () => {
    const portfolioAggregates = readFile(
      "src/components/features/dashboard/portfolio-aggregates.tsx"
    );

    it("does NOT import RecentActivityFeed", () => {
      expect(portfolioAggregates).not.toMatch(/import.*RecentActivityFeed/);
    });

    it("does NOT render RecentActivityFeed", () => {
      expect(portfolioAggregates).not.toMatch(/<RecentActivityFeed/);
    });

    it("still imports AssetAllocationChart", () => {
      expect(portfolioAggregates).toMatch(/import.*AssetAllocationChart/);
    });

    it("still imports TopBottomPerformers", () => {
      expect(portfolioAggregates).toMatch(/import.*TopBottomPerformers/);
    });

    it("still imports CapitalDeploymentTracker", () => {
      expect(portfolioAggregates).toMatch(/import.*CapitalDeploymentTracker/);
    });
  });

  describe("dashboard page.tsx — LP Comparison removed", () => {
    const dashboardPage = readFile("src/app/(gp)/dashboard/page.tsx");

    it("does NOT contain LPComparison", () => {
      expect(dashboardPage).not.toMatch(/LPComparison/);
    });
  });
});
