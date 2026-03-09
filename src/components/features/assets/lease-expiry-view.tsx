"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface LeaseExpiry {
  id: string;
  tenantName: string;
  leaseEndDate: string | null;
  asset: { id: string; name: string };
}

interface LeaseExpiryViewProps {
  leases: LeaseExpiry[];
}

function getDaysUntil(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.floor((end.getTime() - now.getTime()) / 86400000);
}

function getLeaseColor(days: number): "red" | "yellow" | "green" {
  if (days < 90) return "red";
  if (days < 180) return "yellow";
  return "green";
}

function getLeaseBadgeColor(days: number): "red" | "yellow" | "green" {
  return getLeaseColor(days);
}

export function LeaseExpiryView({ leases }: LeaseExpiryViewProps) {
  const [view, setView] = useState<"table" | "timeline">("table");

  const leasesWithDays = leases.map((l) => ({
    ...l,
    daysUntil: getDaysUntil(l.leaseEndDate),
  }));

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setView("table")}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
            view === "table"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          )}
        >
          Table
        </button>
        <button
          onClick={() => setView("timeline")}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
            view === "timeline"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          )}
        >
          Timeline
        </button>
      </div>

      {view === "table" && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Tenant</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Asset</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Lease End Date</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Days Until Expiry</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {leasesWithDays.map((l) => (
              <tr key={l.id} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 px-2 text-gray-700">{l.tenantName}</td>
                <td className="py-1.5 px-2">
                  <Link href={`/assets/${l.asset.id}`} className="text-indigo-600 hover:underline">
                    {l.asset.name}
                  </Link>
                </td>
                <td className="py-1.5 px-2 text-gray-600">
                  {l.leaseEndDate ? formatDate(l.leaseEndDate) : "—"}
                </td>
                <td className="py-1.5 px-2 text-gray-700">
                  {l.daysUntil === Infinity ? "—" : `${l.daysUntil}d`}
                </td>
                <td className="py-1.5 px-2">
                  <Badge color={getLeaseBadgeColor(l.daysUntil)}>
                    {l.daysUntil < 90 ? "Critical" : l.daysUntil < 180 ? "Expiring Soon" : "Upcoming"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "timeline" && (
        <div className="space-y-2">
          {leasesWithDays.map((l) => {
            const color = getLeaseColor(l.daysUntil);
            const widthPct =
              l.daysUntil === Infinity
                ? 100
                : Math.min(100, Math.max(2, (l.daysUntil / 180) * 100));
            const barColor =
              color === "red"
                ? "#ef4444"
                : color === "yellow"
                  ? "#f59e0b"
                  : "#10b981";
            return (
              <div key={l.id} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <Link
                    href={`/assets/${l.asset.id}`}
                    className="text-xs text-indigo-600 hover:underline truncate block"
                  >
                    {l.asset.name}
                  </Link>
                  <div className="text-[10px] text-gray-500 truncate">{l.tenantName}</div>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="w-14 text-right text-[10px] text-gray-500 shrink-0">
                  {l.daysUntil === Infinity ? "—" : `${l.daysUntil}d`}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-36">
            <span>0 days</span>
            <span>90 days</span>
            <span>180 days</span>
          </div>
        </div>
      )}
    </div>
  );
}
