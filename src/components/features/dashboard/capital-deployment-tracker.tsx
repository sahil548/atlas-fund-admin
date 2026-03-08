"use client";

import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EntityDeployment {
  entityId: string;
  entityName: string;
  entityType: string;
  totalCommitted: number;
  totalCalled: number;
  totalDeployed: number;
  dryPowder: number;
  deploymentPct: number;
}

interface Aggregate {
  totalCommitted: number;
  totalCalled: number;
  totalDeployed: number;
  totalDryPowder: number;
}

interface CapitalDeploymentTrackerProps {
  entities: EntityDeployment[];
  aggregate: Aggregate;
}

export function CapitalDeploymentTracker({
  entities,
  aggregate,
}: CapitalDeploymentTrackerProps) {
  const maxCommitted = Math.max(...entities.map((e) => e.totalCommitted), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Capital Deployment</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">Committed vs called vs deployed per entity</p>
      </div>

      <div className="p-4 space-y-3">
        {entities.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            No entity data available
          </div>
        ) : (
          entities.map((entity) => {
            const calledPct = entity.totalCommitted > 0
              ? Math.min(100, (entity.totalCalled / entity.totalCommitted) * 100)
              : 0;
            const deployedPct = entity.totalCommitted > 0
              ? Math.min(100, (entity.totalDeployed / entity.totalCommitted) * 100)
              : 0;

            return (
              <div key={entity.entityId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                    {entity.entityName}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">
                    {fmt(entity.totalCommitted)} committed
                  </span>
                </div>
                {/* Stacked bar */}
                <div
                  className="relative h-4 bg-gray-100 rounded-full overflow-hidden"
                  title={`Committed: ${fmt(entity.totalCommitted)} | Called: ${fmt(entity.totalCalled)} | Deployed: ${fmt(entity.totalDeployed)}`}
                >
                  {/* Called bar (blue) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-blue-200 rounded-full transition-all"
                    style={{ width: `${calledPct}%` }}
                  />
                  {/* Deployed bar (green, overlaid on top of called) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${deployedPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-0.5 align-middle" />
                    Deployed {fmt(entity.totalDeployed)}
                  </span>
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-200 mr-0.5 align-middle" />
                    Called {fmt(entity.totalCalled)}
                  </span>
                  <span className="ml-auto text-amber-600 font-medium">
                    {fmt(entity.dryPowder)} dry powder
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Aggregate totals */}
        {entities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Portfolio Aggregate
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-500">Total Committed</div>
                <div className="text-sm font-semibold text-gray-900">{fmt(aggregate.totalCommitted)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-500">Total Deployed</div>
                <div className="text-sm font-semibold text-indigo-700">{fmt(aggregate.totalDeployed)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-500">Total Called</div>
                <div className="text-sm font-semibold text-blue-700">{fmt(aggregate.totalCalled)}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                <div className="text-[10px] text-amber-600">Total Dry Powder</div>
                <div className="text-sm font-semibold text-amber-700">{fmt(aggregate.totalDryPowder)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Funded/Deployed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
          <span>Called (not yet funded)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200" />
          <span>Uncalled commitment</span>
        </div>
      </div>
    </div>
  );
}
