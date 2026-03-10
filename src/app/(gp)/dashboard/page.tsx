"use client";

import { useState } from "react";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { EntityCard } from "@/components/features/dashboard/entity-card";
import { PortfolioAggregates } from "@/components/features/dashboard/portfolio-aggregates";
import { SummaryBar } from "@/components/features/dashboard/summary-bar";
import { NeedsAttentionPanel } from "@/components/features/dashboard/needs-attention-panel";
import { DealPipelineFunnel } from "@/components/features/dashboard/deal-pipeline-funnel";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { PageHeader } from "@/components/ui/page-header";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const ENTITY_CARDS_INITIAL = 12;

export default function DashboardPage() {
  const { firmId } = useFirm();
  const { data: entityCards, isLoading: entityLoading } = useSWR(
    `/api/dashboard/entity-cards?firmId=${firmId}`,
    fetcher
  );

  const [showAllEntities, setShowAllEntities] = useState(false);

  // Show first 12 entities by default (compact cards fit more on screen)
  const entities: any[] = entityCards ?? [];
  const visibleEntities = showAllEntities
    ? entities
    : entities.slice(0, ENTITY_CARDS_INITIAL);
  const hasMore = entities.length > ENTITY_CARDS_INITIAL;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* ── Summary Bar ────────────────────────────────────────── */}
      <SectionErrorBoundary>
        <SummaryBar />
      </SectionErrorBoundary>

      {/* ── Needs Attention ────────────────────────────────────── */}
      <SectionErrorBoundary>
        <NeedsAttentionPanel />
      </SectionErrorBoundary>

      {/* ── Deal Pipeline Funnel ───────────────────────────────── */}
      <SectionErrorBoundary>
        <DealPipelineFunnel />
      </SectionErrorBoundary>

      {/* ── Your Entities section ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Your Entities
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {entityLoading
                ? "Loading..."
                : `${entities.length} active fund${entities.length !== 1 ? "s" : ""} and SPV${entities.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAllEntities(!showAllEntities)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {showAllEntities
                ? "Show fewer"
                : `Show all ${entities.length}`}
            </button>
          )}
        </div>

        <SectionErrorBoundary>
          {entityLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-20 animate-pulse"
                />
              ))}
            </div>
          ) : entities.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No active entities found.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Create entities and allocate assets to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
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
                    assetCount={entity.assetCount}
                  />
                ))}
              </div>

              {/* Show more/less toggle below the grid */}
              {hasMore && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowAllEntities(!showAllEntities)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline"
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Portfolio Overview
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Asset allocation, performance, capital deployment, and activity across all entities
          </p>
        </div>

        <SectionErrorBoundary>
          <PortfolioAggregates />
        </SectionErrorBoundary>
      </section>

      {/* Activity feed will be added in Plan 05 */}
    </div>
  );
}
