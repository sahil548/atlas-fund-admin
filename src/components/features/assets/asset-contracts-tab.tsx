"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { fmt, formatDate, cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

type FilterPill = "All" | "Active" | "Expired" | "Draft";
type ViewMode = "card" | "table";

function getLeaseStatus(lease: any): string {
  if (lease.currentStatus) return lease.currentStatus;
  if (!lease.leaseEndDate) return "ACTIVE";
  return new Date(lease.leaseEndDate) < new Date() ? "EXPIRED" : "ACTIVE";
}

function matchesFilter(status: string, filter: FilterPill): boolean {
  if (filter === "All") return true;
  if (filter === "Active") return status === "ACTIVE" || status === "CURRENT";
  if (filter === "Expired") return status === "EXPIRED" || status === "TERMINATED";
  if (filter === "Draft") return status === "DRAFT";
  return true;
}

// ─────────────────────────────────────────────────────────
// Real Estate: Lease Cards
// ─────────────────────────────────────────────────────────

function LeaseCard({ lease }: { lease: any }) {
  const status = getLeaseStatus(lease);
  const isActive = status === "ACTIVE" || status === "CURRENT";
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex">
      {/* Status indicator strip */}
      <div className={cn("w-1 flex-shrink-0", isActive ? "bg-emerald-400" : "bg-gray-300")} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">{lease.tenantName || "Unknown Tenant"}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {lease.leaseStartDate && lease.leaseEndDate
                ? `${new Date(lease.leaseStartDate).getFullYear()} – ${new Date(lease.leaseEndDate).getFullYear()}`
                : "No dates"}
            </div>
          </div>
          <Badge color={isActive ? "green" : "gray"}>{isActive ? "Active" : "Expired"}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs mt-3">
          {lease.squareFootage && (
            <div>
              <div className="text-gray-400">Sq Ft</div>
              <div className="font-medium">{lease.squareFootage}</div>
            </div>
          )}
          {lease.baseRentAnnual != null && (
            <div>
              <div className="text-gray-400">Annual Rent</div>
              <div className="font-medium">{fmt(lease.baseRentAnnual)}</div>
            </div>
          )}
          {lease.rentPercentOfTotal && (
            <div>
              <div className="text-gray-400">% of Rent</div>
              <div className="font-medium">{lease.rentPercentOfTotal}</div>
            </div>
          )}
          {lease.escalation && (
            <div>
              <div className="text-gray-400">Escalation</div>
              <div className="font-medium">{lease.escalation}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaseTable({ leases }: { leases: any[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50">
        <tr>
          {["Tenant", "Sq Ft", "Annual Rent", "Lease Term", "% of Rent", "Status"].map((h) => (
            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leases.map((t: any) => {
          const status = getLeaseStatus(t);
          const isActive = status === "ACTIVE" || status === "CURRENT";
          return (
            <tr key={t.id} className="border-t border-gray-50">
              <td className={cn("px-3 py-2.5 font-medium", !isActive && "text-gray-400")}>
                {t.tenantName}
              </td>
              <td className="px-3 py-2.5">{t.squareFootage || "---"}</td>
              <td className="px-3 py-2.5">{t.baseRentAnnual ? fmt(t.baseRentAnnual) : "---"}</td>
              <td className="px-3 py-2.5">
                {t.leaseStartDate && t.leaseEndDate
                  ? `${new Date(t.leaseStartDate).getFullYear()}–${new Date(t.leaseEndDate).getFullYear()}`
                  : "---"}
              </td>
              <td className="px-3 py-2.5">{t.rentPercentOfTotal || "---"}</td>
              <td className="px-3 py-2.5">
                <Badge color={isActive ? "green" : "gray"}>
                  {isActive ? "Active" : "Expired"}
                </Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────
// Credit: Agreement Cards
// ─────────────────────────────────────────────────────────

function CreditCard({ agreement }: { agreement: any }) {
  const isActive = !agreement.maturityDate || new Date(agreement.maturityDate) >= new Date();
  const covenantBreaches = agreement.covenants?.filter(
    (c: any) => c.currentStatus === "BREACH",
  ).length ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex">
      <div className={cn("w-1 flex-shrink-0", isActive ? "bg-emerald-400" : "bg-gray-300")} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {agreement.lenderName || "Credit Agreement"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Maturity: {agreement.maturityDate ? formatDate(agreement.maturityDate) : "---"}
            </div>
          </div>
          <div className="flex gap-1">
            <Badge color={isActive ? "green" : "gray"}>{isActive ? "Active" : "Matured"}</Badge>
            {covenantBreaches > 0 && <Badge color="red">{covenantBreaches} Breach</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs mt-3">
          {agreement.principal != null && (
            <div>
              <div className="text-gray-400">Principal</div>
              <div className="font-medium">{fmt(agreement.principal)}</div>
            </div>
          )}
          {agreement.rate && (
            <div>
              <div className="text-gray-400">Interest Rate</div>
              <div className="font-medium">{agreement.rate}</div>
            </div>
          )}
          {agreement.loanType && (
            <div>
              <div className="text-gray-400">Type</div>
              <div className="font-medium">{agreement.loanType.replace(/_/g, " ")}</div>
            </div>
          )}
          {agreement.covenants?.length > 0 && (
            <div>
              <div className="text-gray-400">Covenants</div>
              <div className="font-medium">
                {agreement.covenants.length} ({covenantBreaches} breach
                {covenantBreaches !== 1 ? "es" : ""})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Equity: Equity Details Card
// ─────────────────────────────────────────────────────────

function EquityCard({ equityDetails }: { equityDetails: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex">
      <div className="w-1 flex-shrink-0 bg-indigo-400" />
      <div className="flex-1 p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Equity Position</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {equityDetails.instrument && (
            <div>
              <div className="text-gray-400">Instrument</div>
              <div className="font-medium">{equityDetails.instrument}</div>
            </div>
          )}
          {equityDetails.ownership && (
            <div>
              <div className="text-gray-400">Ownership</div>
              <div className="font-medium">{equityDetails.ownership}</div>
            </div>
          )}
          {equityDetails.revenue && (
            <div>
              <div className="text-gray-400">Revenue</div>
              <div className="font-medium">{equityDetails.revenue}</div>
            </div>
          )}
          {equityDetails.ebitda && (
            <div>
              <div className="text-gray-400">EBITDA</div>
              <div className="font-medium">{equityDetails.ebitda}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Fund LP: Fund Commitment Card
// ─────────────────────────────────────────────────────────

function FundLPCard({ fundLPDetails, fairValue }: { fundLPDetails: any; fairValue: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex">
      <div className="w-1 flex-shrink-0 bg-purple-400" />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Fund Commitment — {fundLPDetails.gpName || "Unknown GP"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Vintage: {fundLPDetails.vintage || "---"} · Strategy: {fundLPDetails.strategy || "---"}
            </div>
          </div>
          <Badge color="indigo">Fund LP</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs mt-3">
          {fundLPDetails.commitment && (
            <div>
              <div className="text-gray-400">Commitment</div>
              <div className="font-medium">{fundLPDetails.commitment}</div>
            </div>
          )}
          {fundLPDetails.calledAmount && (
            <div>
              <div className="text-gray-400">Called</div>
              <div className="font-medium">{fundLPDetails.calledAmount}</div>
            </div>
          )}
          {fundLPDetails.uncalledAmount && (
            <div>
              <div className="text-gray-400">Uncalled</div>
              <div className="font-medium">{fundLPDetails.uncalledAmount}</div>
            </div>
          )}
          <div>
            <div className="text-gray-400">NAV</div>
            <div className="font-medium">{fmt(fairValue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────

function ContractsEmpty() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <div className="text-sm text-gray-400">No contracts on record</div>
      <div className="text-xs text-gray-300 mt-1">
        Contracts, leases, and agreements for this asset will display here.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

export function AssetContractsTab({ asset: a }: Props) {
  const [filter, setFilter] = useState<FilterPill>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const FILTER_PILLS: FilterPill[] = ["All", "Active", "Expired", "Draft"];

  // ── Real Estate ──────────────────────────────────────────
  if (a.assetClass === "REAL_ESTATE") {
    const leases: any[] = a.leases ?? [];
    const filtered = leases.filter((lease) =>
      matchesFilter(getLeaseStatus(lease), filter),
    );

    if (leases.length === 0) return <ContractsEmpty />;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => setFilter(pill)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-colors",
                  filter === pill
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300",
                )}
              >
                {pill}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "px-3 py-1 text-xs rounded-lg border transition-colors",
                viewMode === "card"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200",
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1 text-xs rounded-lg border transition-colors",
                viewMode === "table"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200",
              )}
            >
              Table
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No leases match the selected filter
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((lease: any) => (
              <LeaseCard key={lease.id} lease={lease} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <LeaseTable leases={filtered} />
          </div>
        )}
      </div>
    );
  }

  // ── Credit ────────────────────────────────────────────────
  if (a.assetClass === "CREDIT") {
    const agreements: any[] = a.creditAgreements ?? [];
    if (agreements.length === 0) return <ContractsEmpty />;

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setFilter(pill)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                filter === pill
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300",
              )}
            >
              {pill}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agreements.map((ag: any) => (
            <CreditCard key={ag.id} agreement={ag} />
          ))}
        </div>
      </div>
    );
  }

  // ── Equity / Venture ──────────────────────────────────────
  if (
    a.assetClass === "PRIVATE_EQUITY" ||
    a.assetClass === "VENTURE" ||
    a.assetClass === "EQUITY"
  ) {
    if (!a.equityDetails) return <ContractsEmpty />;
    return (
      <div className="space-y-4">
        <EquityCard equityDetails={a.equityDetails} />
      </div>
    );
  }

  // ── Fund LP ───────────────────────────────────────────────
  if (a.assetClass === "FUND_LP" || a.assetClass === "FUND") {
    if (!a.fundLPDetails) return <ContractsEmpty />;
    return (
      <div className="space-y-4">
        <FundLPCard fundLPDetails={a.fundLPDetails} fairValue={a.fairValue} />
      </div>
    );
  }

  // Default fallback for other asset classes
  return <ContractsEmpty />;
}
