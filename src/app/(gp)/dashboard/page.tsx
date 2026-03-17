"use client";

import { PortfolioAggregates } from "@/components/features/dashboard/portfolio-aggregates";
import { SummaryBar } from "@/components/features/dashboard/summary-bar";
import { NeedsAttentionPanel } from "@/components/features/dashboard/needs-attention-panel";
import { DealPipelineFunnel } from "@/components/features/dashboard/deal-pipeline-funnel";
import { CashFlowTrend } from "@/components/features/dashboard/cash-flow-trend";
import { FundraisingTracker } from "@/components/features/dashboard/fundraising-tracker";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      {/* ── Needs Attention (top priority) ───────────────────── */}
      <SectionErrorBoundary>
        <NeedsAttentionPanel />
      </SectionErrorBoundary>

      {/* ── Summary Bar ────────────────────────────────────────── */}
      <SectionErrorBoundary>
        <SummaryBar />
      </SectionErrorBoundary>

      {/* ── Deal Pipeline (compact) ──────────────────────────── */}
      <SectionErrorBoundary>
        <DealPipelineFunnel />
      </SectionErrorBoundary>

      {/* ── Cash Flow + Fundraising (side by side) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <SectionErrorBoundary>
          <CashFlowTrend />
        </SectionErrorBoundary>
        <SectionErrorBoundary>
          <FundraisingTracker />
        </SectionErrorBoundary>
      </div>

      {/* ── Portfolio Overview ─────────────────────────────────── */}
      <SectionErrorBoundary>
        <PortfolioAggregates />
      </SectionErrorBoundary>
    </div>
  );
}
