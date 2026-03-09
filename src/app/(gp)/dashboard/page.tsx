"use client";

import { useState } from "react";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { EntityCard } from "@/components/features/dashboard/entity-card";
import { PortfolioAggregates } from "@/components/features/dashboard/portfolio-aggregates";
import { LPComparisonView } from "@/components/features/dashboard/lp-comparison-view";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { PageHeader } from "@/components/ui/page-header";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const ENTITY_CARDS_INITIAL = 6;

export default function DashboardPage() {
  const { firmId } = useFirm();
  const { data: entityCards, isLoading: entityLoading } = useSWR(
    `/api/dashboard/entity-cards?firmId=${firmId}`,
    fetcher
  );

  const [showAllEntities, setShowAllEntities] = useState(false);

  // Show first 6 entities by default; "show all" toggle for more
  const entities: any[] = entityCards ?? [];
  const visibleEntities = showAllEntities
    ? entities
    : entities.slice(0, ENTITY_CARDS_INITIAL);
  const hasMore = entities.length > ENTITY_CARDS_INITIAL;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* ── Your Entities section ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Your Entities</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {entityLoading
                ? "Loading..."
                : `${entities.length} active fund${entities.length !== 1 ? "s" : ""} and SPV${entities.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAllEntities(!showAllEntities)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              {showAllEntities
                ? "Show fewer"
                : `Show all ${entities.length}`}
            </button>
          )}
        </div>

        <SectionErrorBoundary>
          {entityLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : entities.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No active entities found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Create entities and allocate assets to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleEntities.map((entity: any) => (
                  <EntityCard
                    key={entity.entityId}
                    entityId={entity.entityId}
                    name={entity.name}
                    entityType={entity.entityType}
                    nav={entity.nav}
                    irr={entity.irr}
                    tvpi={entity.tvpi}
                    dpi={entity.dpi}
                    rvpi={entity.rvpi}
                    capitalDeployed={entity.capitalDeployed}
                    totalCommitted={entity.totalCommitted}
                    deploymentPct={entity.deploymentPct}
                    dryPowder={entity.dryPowder}
                    assetCount={entity.assetCount}
                    topAssets={entity.topAssets ?? []}
                    perAssetBreakdown={entity.perAssetBreakdown ?? []}
                  />
                ))}
              </div>

              {/* Show more/less toggle below the grid */}
              {hasMore && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowAllEntities(!showAllEntities)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {showAllEntities
                      ? "Show fewer"
                      : `Show ${entities.length - ENTITY_CARDS_INITIAL} more`}
                  </button>
                </div>
              )}
            </>
          )}
        </SectionErrorBoundary>
      </section>

      {/* ── Portfolio Overview section ─────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">Portfolio Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Asset allocation, performance, capital deployment, and activity across all entities
          </p>
        </div>

        <SectionErrorBoundary>
          <PortfolioAggregates />
        </SectionErrorBoundary>
      </section>

      {/* ── LP Comparison section ──────────────────────────────── */}
      <section>
        <SectionErrorBoundary>
          <LPComparisonView />
        </SectionErrorBoundary>
      </section>
    </div>
  );
}
