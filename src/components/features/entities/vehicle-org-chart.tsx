"use client";

import Link from "next/link";
import { buildTree } from "@/lib/vehicle-hierarchy";
import { Badge } from "@/components/ui/badge";

/**
 * Org chart view for vehicle hierarchy.
 *
 * NOTE: We implement a custom org chart using CSS flex/grid.
 * react-organizational-chart (npm package) was evaluated and listed as a dependency
 * in package.json but we use a custom implementation for better control over styling.
 * To use react-organizational-chart in the future, install it and replace the
 * custom tree rendering with: import { Tree, TreeNode } from "react-organizational-chart"
 */

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

const STATUS_DOT_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  WINDING_DOWN: "bg-yellow-500",
  DISSOLVED: "bg-red-500",
};

function fmtNav(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

interface OrgNodeCardProps {
  entity: any;
}

function OrgNodeCard({ entity }: OrgNodeCardProps) {
  const latestNav = entity.navComputations?.[0]?.nav ?? null;
  const navDisplay = latestNav !== null ? fmtNav(latestNav) : entity.nav ? fmtNav(entity.nav) : "—";
  const statusDot = STATUS_DOT_COLORS[entity.status] ?? "bg-gray-400";

  return (
    <Link
      href={`/entities/${entity.id}`}
      className="inline-flex flex-col items-start gap-1 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all min-w-[140px] max-w-[180px] text-left"
    >
      <div className="flex items-center gap-1.5 w-full">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
        <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">
          {entity.name}
        </span>
      </div>
      <Badge color={ENTITY_TYPE_COLORS[entity.entityType] ?? "gray"}>
        {entity.entityType?.replace(/_/g, " ")}
      </Badge>
      <span className="text-[10px] text-gray-500 dark:text-gray-400">NAV {navDisplay}</span>
    </Link>
  );
}

interface OrgNodeProps {
  entity: any;
}

function OrgNode({ entity }: OrgNodeProps) {
  const hasChildren = entity.childEntities && entity.childEntities.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <OrgNodeCard entity={entity} />

      {/* Connector line down + children row */}
      {hasChildren && (
        <>
          {/* Vertical line from parent down */}
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

          {/* Horizontal connector spanning children */}
          <div className="relative flex items-start">
            {/* Horizontal bar */}
            {entity.childEntities.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-gray-300 dark:bg-gray-600"
                style={{ width: `calc(100% - 2 * 40px)` }}
              />
            )}
            <div className="flex gap-6 pt-5">
              {entity.childEntities.map((child: any) => (
                <div key={child.id} className="flex flex-col items-center relative">
                  {/* Vertical line from horizontal bar down to child */}
                  {entity.childEntities.length > 1 && (
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 absolute -top-5" />
                  )}
                  <OrgNode entity={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface VehicleOrgChartProps {
  entities: any[];
}

export function VehicleOrgChart({ entities }: VehicleOrgChartProps) {
  const roots = buildTree(entities);

  if (roots.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        No vehicles to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-6">
      <div className="flex gap-12 min-w-max">
        {roots.map((root: any) => (
          <OrgNode key={root.id} entity={root} />
        ))}
      </div>
    </div>
  );
}
