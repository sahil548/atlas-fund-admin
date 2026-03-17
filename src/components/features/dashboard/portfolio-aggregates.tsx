"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { UpcomingCapitalActivity } from "./upcoming-capital-activity";
import { ConcentrationRisk } from "./concentration-risk";
import { TopBottomPerformers } from "./top-bottom-performers";
import { ValuationChanges } from "./valuation-changes";
import { CapitalDeploymentTracker } from "./capital-deployment-tracker";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

export function PortfolioAggregates() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR(
    `/api/dashboard/portfolio-aggregates?firmId=${firmId}`,
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Col 1: Top Holdings + Upcoming Capital Activity stacked */}
      <div className="space-y-2">
        <SectionErrorBoundary>
          <ConcentrationRisk />
        </SectionErrorBoundary>
        <SectionErrorBoundary>
          <UpcomingCapitalActivity />
        </SectionErrorBoundary>
      </div>

      {/* Col 2: Performers + Valuation Changes stacked */}
      <div className="space-y-2">
        <SectionErrorBoundary>
          <TopBottomPerformers
            topPerformers={data.topPerformers ?? []}
            bottomPerformers={data.bottomPerformers ?? []}
          />
        </SectionErrorBoundary>
        <SectionErrorBoundary>
          <ValuationChanges />
        </SectionErrorBoundary>
      </div>

      {/* Col 3: Capital Deployment */}
      <div>
        <SectionErrorBoundary>
          <CapitalDeploymentTracker
            entities={data.capitalDeployment?.entities ?? []}
            aggregate={data.capitalDeployment?.aggregate ?? {
              totalCommitted: 0,
              totalCalled: 0,
              totalDeployed: 0,
              totalDryPowder: 0,
              totalUncalled: 0,
            }}
          />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
