"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { AssetAllocationChart } from "./asset-allocation-chart";
import { TopBottomPerformers } from "./top-bottom-performers";
import { CapitalDeploymentTracker } from "./capital-deployment-tracker";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SectionErrorBoundary>
        <AssetAllocationChart />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <TopBottomPerformers
          topPerformers={data.topPerformers ?? []}
          bottomPerformers={data.bottomPerformers ?? []}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <CapitalDeploymentTracker
          entities={data.capitalDeployment?.entities ?? []}
          aggregate={data.capitalDeployment?.aggregate ?? {
            totalCommitted: 0,
            totalCalled: 0,
            totalDeployed: 0,
            totalDryPowder: 0,
          }}
        />
      </SectionErrorBoundary>
    </div>
  );
}
