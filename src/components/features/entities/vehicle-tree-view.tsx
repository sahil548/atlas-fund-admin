"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { buildTree } from "@/lib/vehicle-hierarchy";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Re-export buildTree for external use
export { buildTree };

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

interface VehicleTreeNodeProps {
  entity: any;
  depth: number;
}

function VehicleTreeNode({ entity, depth }: VehicleTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = entity.childEntities && entity.childEntities.length > 0;

  const latestNav = entity.navComputations?.[0]?.nav ?? null;
  const navDisplay = latestNav !== null ? fmt(latestNav) : entity.nav ? fmt(entity.nav) : "—";

  return (
    <>
      <tr className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
        <td className="px-3 py-2.5">
          <div className="flex items-center" style={{ paddingLeft: depth * 24 }}>
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mr-1.5 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="mr-1.5 w-3.5 inline-block flex-shrink-0" />
            )}
            <Link
              href={`/entities/${entity.id}`}
              className="font-medium text-indigo-700 hover:underline dark:text-indigo-400 text-xs"
            >
              {entity.name}
            </Link>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <Badge color={ENTITY_TYPE_COLORS[entity.entityType] ?? "gray"}>
            {entity.entityType?.replace(/_/g, " ")}
          </Badge>
        </td>
        <td className="px-3 py-2.5">
          <Badge color={STATUS_COLORS[entity.status] ?? "gray"}>
            {entity.status?.replace(/_/g, " ")}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300">{navDisplay}</td>
        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
          {entity.vintageYear ?? "—"}
        </td>
        <td className="px-3 py-2.5">
          <Link href={`/entities/${entity.id}`}>
            <Button variant="secondary" size="sm">View</Button>
          </Link>
        </td>
      </tr>
      {expanded && hasChildren &&
        entity.childEntities.map((child: any) => (
          <VehicleTreeNode key={child.id} entity={child} depth={depth + 1} />
        ))
      }
    </>
  );
}

interface VehicleTreeViewProps {
  entities: any[];
}

export function VehicleTreeView({ entities }: VehicleTreeViewProps) {
  const roots = buildTree(entities);

  if (roots.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
        No vehicles to display
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {["Vehicle", "Type", "Status", "NAV", "Vintage", ""].map((h) => (
            <th
              key={h}
              className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {roots.map((entity: any) => (
          <VehicleTreeNode key={entity.id} entity={entity} depth={0} />
        ))}
      </tbody>
    </table>
  );
}
