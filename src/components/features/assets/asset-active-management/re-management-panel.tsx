"use client";

import { Badge } from "@/components/ui/badge";
import { fmt, cn, formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function leaseStatusColor(status: string | null | undefined, days: number | null): string {
  if (status === "EXPIRED" || (days !== null && days <= 0)) return "red";
  if (status === "TERMINATED") return "gray";
  if (status === "MONTH_TO_MONTH") return "yellow";
  if (days !== null && days <= 90) return "red";
  if (days !== null && days <= 180) return "yellow";
  return "green";
}

function leaseStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

// Parse a numeric-ish string to a number
function parseNum(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Safely read escalation rate from a rentEscalation JSON blob
function getEscalationRate(rentEscalation: any): number | null {
  if (!rentEscalation) return null;
  if (typeof rentEscalation === "number") return rentEscalation;
  if (typeof rentEscalation === "object") {
    return parseNum(rentEscalation.rate ?? rentEscalation.escalationRate ?? rentEscalation.annualIncreasePct);
  }
  return parseNum(rentEscalation);
}

function getEscalationType(rentEscalation: any): string | null {
  if (!rentEscalation || typeof rentEscalation !== "object") return null;
  return rentEscalation.type ?? rentEscalation.escalationType ?? null;
}

export function REManagementPanel({ asset: a }: Props) {
  const re = a.realEstateDetails;
  const leases: any[] = a.leases ?? [];

  const noi = parseNum(re?.noi);
  const occupancy = parseNum(re?.occupancy);
  const sqftVal = parseNum(re?.squareFeet);

  // Sort leases by expiry date ascending (soonest first)
  const sortedLeases = [...leases].sort((x, y) => {
    const dx = x.leaseEndDate ? new Date(x.leaseEndDate).getTime() : Infinity;
    const dy = y.leaseEndDate ? new Date(y.leaseEndDate).getTime() : Infinity;
    return dx - dy;
  });

  // Upcoming escalation events (active leases with escalation data)
  const escalationEvents = sortedLeases.filter(
    (l) =>
      l.rentEscalation &&
      getEscalationRate(l.rentEscalation) != null &&
      l.leaseEndDate &&
      new Date(l.leaseEndDate).getTime() > Date.now() &&
      l.currentStatus !== "EXPIRED" &&
      l.currentStatus !== "TERMINATED",
  );

  return (
    <div className="space-y-4">
      {/* Financial Performance */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Financial Performance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">NOI</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {noi != null ? fmt(noi) : re?.noi ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Cap Rate</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {re?.capRate ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Occupancy</div>
            <div
              className={cn(
                "text-base font-bold",
                occupancy != null && occupancy >= 95
                  ? "text-emerald-700 dark:text-emerald-400"
                  : occupancy != null && occupancy >= 80
                  ? "text-amber-600 dark:text-amber-400"
                  : occupancy != null
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-gray-100",
              )}
            >
              {re?.occupancy ?? "---"}
            </div>
          </div>
        </div>

        {/* Vacancy callout */}
        {occupancy != null && occupancy < 100 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <span className="font-medium">
              {(100 - occupancy).toFixed(1)}% vacant
            </span>
            {sqftVal && (
              <>
                <span className="text-gray-400">|</span>
                <span>
                  ~{Math.round((sqftVal * (100 - occupancy)) / 100).toLocaleString()} sq ft unoccupied
                </span>
              </>
            )}
          </div>
        )}
        {re?.propertyType && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {re.propertyType}
            {re.squareFeet && <span> · {re.squareFeet} sq ft</span>}
          </div>
        )}
        {re?.rentPerSqft && (
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Rent/sq ft: {re.rentPerSqft}
          </div>
        )}
        {(re?.debt || re?.debtDscr) && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            {re.debt && <span>Debt: {re.debt}</span>}
            {re.debtDscr && <span>DSCR: {re.debtDscr}</span>}
          </div>
        )}
      </div>

      {/* Lease Roll Schedule */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lease Roll Schedule</h3>
          <span className="text-xs text-gray-400">
            {sortedLeases.length} lease{sortedLeases.length !== 1 ? "s" : ""}
          </span>
        </div>
        {sortedLeases.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            No leases configured for this asset
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Tenant</th>
                  <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Lease Period</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Monthly Rent</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Days to Expiry</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeases.map((l: any) => {
                  const days = daysUntil(l.leaseEndDate);
                  const statusColor = leaseStatusColor(l.currentStatus, days);
                  const isExpiringSoon = days !== null && days <= 90 && days > 0 && l.currentStatus !== "TERMINATED";
                  const isExpiringWarning = days !== null && days > 90 && days <= 180 && l.currentStatus !== "TERMINATED";
                  const monthlyRent = l.baseRentMonthly;
                  return (
                    <tr
                      key={l.id}
                      className={cn(
                        "border-b border-gray-50 dark:border-gray-800 last:border-0",
                        isExpiringSoon && "bg-red-50 dark:bg-red-900/10",
                        isExpiringWarning && "bg-amber-50 dark:bg-amber-900/10",
                      )}
                    >
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                        {l.tenantName || "Unknown Tenant"}
                        {l.unitOrSuite && (
                          <span className="ml-1 text-[10px] text-gray-400">({l.unitOrSuite})</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">
                        {l.leaseStartDate ? formatDate(l.leaseStartDate) : "---"}
                        {" – "}
                        {l.leaseEndDate ? formatDate(l.leaseEndDate) : "---"}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-gray-100">
                        {monthlyRent != null ? fmt(monthlyRent) : "---"}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                        {l.leaseType ?? "---"}
                      </td>
                      <td className="py-2 text-right">
                        {days !== null ? (
                          <span
                            className={cn(
                              "font-semibold",
                              days <= 0
                                ? "text-red-600 dark:text-red-400"
                                : days <= 90
                                ? "text-red-600 dark:text-red-400"
                                : days <= 180
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-700 dark:text-gray-300",
                            )}
                          >
                            {days <= 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                          </span>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <Badge color={statusColor}>
                          {leaseStatusLabel(l.currentStatus)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rent Escalation Timeline */}
      {escalationEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Rent Escalation Timeline
          </h3>
          <div className="space-y-2">
            {escalationEvents.map((l: any) => {
              const monthlyRent = l.baseRentMonthly;
              const escalationRate = getEscalationRate(l.rentEscalation);
              const escalationType = getEscalationType(l.rentEscalation);
              const newMonthly =
                monthlyRent != null && escalationRate != null
                  ? monthlyRent * (1 + escalationRate / 100)
                  : null;
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 text-xs"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{l.tenantName || "Unknown"}</span>
                    <span className="text-gray-400 ml-2">
                      {escalationType || "annual"} escalation
                      {escalationRate != null ? ` @ ${escalationRate}%` : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    {newMonthly != null && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {fmt(newMonthly)}/mo
                      </span>
                    )}
                    <span className="text-gray-400 ml-1">(at renewal)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
