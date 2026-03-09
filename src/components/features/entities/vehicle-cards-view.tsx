"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ENTITY_TYPE_COLORS: Record<string, "indigo" | "purple" | "blue" | "teal" | "gray"> = {
  MAIN_FUND: "indigo",
  SIDECAR: "purple",
  SPV: "blue",
  CO_INVEST_VEHICLE: "teal",
  CO_INVEST: "teal",
  GP_ENTITY: "gray",
  HOLDING_COMPANY: "gray",
};

const STATUS_COLORS: Record<string, "green" | "yellow" | "red" | "gray"> = {
  ACTIVE: "green",
  WINDING_DOWN: "yellow",
  DISSOLVED: "red",
};

interface VehicleCardProps {
  entity: any;
}

function VehicleCard({ entity }: VehicleCardProps) {
  // Compute NAV from navComputations or fallback
  const latestNav = entity.navComputations?.[0];
  const nav = latestNav?.nav ?? null;

  // IRR and TVPI from navComputations
  const irr = latestNav?.irr ?? null;
  const tvpi = latestNav?.tvpi ?? null;

  // Capital metrics
  const totalCommitted = entity.totalCommitments ?? entity.commitments?.reduce(
    (sum: number, c: any) => sum + (c.committedAmount ?? 0),
    0,
  ) ?? 0;
  const totalCalled = entity.totalCalled ?? 0;
  const deploymentPct = totalCommitted > 0 ? (totalCalled / totalCommitted) * 100 : 0;

  // Asset count
  const assetCount = entity.assetAllocations?.length ?? 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/entities/${entity.id}`}
              className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-400 truncate block"
            >
              {entity.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge color={ENTITY_TYPE_COLORS[entity.entityType] ?? "gray"}>
                {entity.entityType?.replace(/_/g, " ")}
              </Badge>
              <Badge color={STATUS_COLORS[entity.status] ?? "gray"}>
                {entity.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">NAV</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {nav !== null ? fmt(nav) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">IRR</div>
            <div
              className={`text-sm font-semibold ${
                irr != null
                  ? irr >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {irr != null ? `${(irr * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">TVPI</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {tvpi != null ? `${tvpi.toFixed(2)}x` : <span className="text-gray-400 text-xs">N/A</span>}
            </div>
          </div>
        </div>

        {/* Capital deployment progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Capital Deployed</span>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {fmt(totalCalled)} / {fmt(totalCommitted)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(deploymentPct, 100)}%` }}
            />
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            {deploymentPct.toFixed(0)}% deployed
          </div>
        </div>

        {/* Footer: asset count + vintage + view button */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 space-x-2">
            <span>{assetCount} asset{assetCount !== 1 ? "s" : ""}</span>
            {entity.vintageYear && (
              <span>· Vintage {entity.vintageYear}</span>
            )}
          </div>
          <Link href={`/entities/${entity.id}`}>
            <Button variant="secondary" size="sm">View</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface VehicleCardsViewProps {
  entities: any[];
}

export function VehicleCardsView({ entities }: VehicleCardsViewProps) {
  if (entities.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        No vehicles to display
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      {entities.map((entity: any) => (
        <VehicleCard key={entity.id} entity={entity} />
      ))}
    </div>
  );
}
