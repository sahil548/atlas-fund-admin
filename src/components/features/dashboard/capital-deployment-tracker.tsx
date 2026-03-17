"use client";

import { fmt } from "@/lib/utils";

interface EntityDeployment {
  entityId: string;
  entityName: string;
  entityType: string;
  totalCommitted: number;
  totalCalled: number;
  totalDeployed: number;
  dryPowder: number;
  uncalled: number;
  deploymentPct: number;
}

interface Aggregate {
  totalCommitted: number;
  totalCalled: number;
  totalDeployed: number;
  totalDryPowder: number;
  totalUncalled: number;
}

interface CapitalDeploymentTrackerProps {
  entities: EntityDeployment[];
  aggregate: Aggregate;
}

export function CapitalDeploymentTracker({
  entities,
  aggregate,
}: CapitalDeploymentTrackerProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Capital Deployment</h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Committed vs called vs deployed per entity</p>
      </div>

      <div className="p-3 space-y-2.5">
        {entities.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            No entity data available
          </div>
        ) : (
          (entities.filter(e => e.totalDeployed > 0 || e.totalCalled > 0).length > 0
            ? entities.filter(e => e.totalDeployed > 0 || e.totalCalled > 0)
            : entities
          ).map((entity) => {
            const deployedPct = entity.totalCommitted > 0
              ? Math.min(100, (entity.totalDeployed / entity.totalCommitted) * 100)
              : 0;
            const dryPowderPct = entity.totalCommitted > 0
              ? Math.min(100 - deployedPct, (entity.dryPowder / entity.totalCommitted) * 100)
              : 0;

            return (
              <div key={entity.entityId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[60%]">
                    {entity.entityName}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                    {fmt(entity.totalCommitted)} committed
                  </span>
                </div>
                {/* Stacked bar: deployed (indigo) + dry powder (emerald) + uncalled (gray bg) */}
                <div
                  className="relative h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
                  title={`Committed: ${fmt(entity.totalCommitted)} | Called: ${fmt(entity.totalCalled)} | Deployed: ${fmt(entity.totalDeployed)} | Dry Powder: ${fmt(entity.dryPowder)} | Uncalled: ${fmt(entity.uncalled)}`}
                >
                  {/* Dry powder bar (emerald, behind deployed) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${deployedPct + dryPowderPct}%` }}
                  />
                  {/* Deployed bar (indigo, overlaid on top) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${deployedPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 flex-wrap">
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-0.5 align-middle" />
                    {fmt(entity.totalDeployed)}
                  </span>
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-0.5 align-middle" />
                    {fmt(entity.dryPowder)} dry powder
                  </span>
                  <span className="ml-auto text-gray-400 dark:text-gray-500">
                    {fmt(entity.uncalled)} uncalled
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Aggregate totals */}
        {entities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Portfolio Aggregate
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Committed</div>
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{fmt(aggregate.totalCommitted)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Called</div>
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">{fmt(aggregate.totalCalled)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Deployed</div>
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{fmt(aggregate.totalDeployed)}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2 border border-emerald-100 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Dry Powder</div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{fmt(aggregate.totalDryPowder)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 col-span-2">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Uncalled</div>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{fmt(aggregate.totalUncalled)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-3 pb-3 flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Deployed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Dry Powder</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span>Uncalled</span>
        </div>
      </div>
    </div>
  );
}
