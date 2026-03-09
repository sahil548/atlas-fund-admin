"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useFirm } from "@/components/providers/firm-provider";
import { LeaseExpiryView } from "@/components/features/assets/lease-expiry-view";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertTriangle, Clock, AlertCircle, Calendar } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface CovenantBreach {
  id: string;
  name: string;
  agreement: {
    asset: { id: string; name: string };
  };
}

interface LeaseExpiry {
  id: string;
  tenantName: string;
  leaseEndDate: string | null;
  asset: { id: string; name: string };
}

interface LoanMaturity {
  id: string;
  borrowerName: string;
  maturityDate: string | null;
  asset: { id: string; name: string };
}

interface OverdueReview {
  id: string;
  name: string;
  nextReview: string | null;
}

interface MonitoringData {
  covenantBreaches: CovenantBreach[];
  leaseExpirations: LeaseExpiry[];
  loanMaturities: LoanMaturity[];
  overdueReviews: OverdueReview[];
  totalAlerts: number;
}

function getDaysUntil(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.floor((end.getTime() - now.getTime()) / 86400000);
}

function getSeverityForLease(leaseEndDate: string | null): "critical" | "warning" | "upcoming" {
  const days = getDaysUntil(leaseEndDate);
  if (days < 0) return "critical"; // expired
  if (days < 90) return "warning";
  return "upcoming";
}

function getSeverityForMaturity(maturityDate: string | null): "warning" | "upcoming" {
  const days = getDaysUntil(maturityDate);
  if (days < 90) return "warning";
  return "upcoming";
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-l-red-500",
    icon: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
  },
  warning: {
    border: "border-l-amber-500",
    icon: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
  upcoming: {
    border: "border-l-blue-500",
    icon: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
};

interface AlertRowProps {
  severity: "critical" | "warning" | "upcoming";
  icon: React.ReactNode;
  description: string;
  assetId: string;
  assetName: string;
}

function AlertRow({ severity, icon, description, assetId, assetName }: AlertRowProps) {
  const styles = SEVERITY_STYLES[severity];
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 border-l-4 rounded-r",
        styles.border,
        styles.bg,
      )}
    >
      <span className={cn("shrink-0", styles.icon)}>{icon}</span>
      <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{description}</span>
      <Link
        href={`/assets/${assetId}`}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-medium text-indigo-600 hover:underline shrink-0"
      >
        {assetName}
      </Link>
    </div>
  );
}

export function AssetMonitoringPanel() {
  const { firmId } = useFirm();
  const [expanded, setExpanded] = useState(false);
  const [showLeaseDetail, setShowLeaseDetail] = useState(false);

  const { data } = useSWR<MonitoringData>(
    firmId ? `/api/assets/monitoring?firmId=${firmId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Don't render until we have data
  if (!data) return null;

  // Disappear entirely when no alerts
  if (data.totalAlerts === 0) return null;

  const { covenantBreaches, leaseExpirations, loanMaturities, overdueReviews } = data;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Needs Attention
          </span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            {data.totalAlerts}
          </span>
          <span className="text-xs text-gray-500">
            {data.totalAlerts === 1
              ? "1 item needs attention"
              : `${data.totalAlerts} items need attention`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-4">
          {/* Covenant Breaches — Critical */}
          {covenantBreaches.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Covenant Breaches ({covenantBreaches.length})
              </div>
              {covenantBreaches.map((c) => (
                <AlertRow
                  key={c.id}
                  severity="critical"
                  icon={<AlertCircle className="h-3.5 w-3.5" />}
                  description={`Covenant "${c.name}" is in breach`}
                  assetId={c.agreement.asset.id}
                  assetName={c.agreement.asset.name}
                />
              ))}
            </div>
          )}

          {/* Loan Maturities */}
          {loanMaturities.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Loan Maturities ({loanMaturities.length})
              </div>
              {loanMaturities.map((m) => {
                const severity = getSeverityForMaturity(m.maturityDate);
                const days = getDaysUntil(m.maturityDate);
                return (
                  <AlertRow
                    key={m.id}
                    severity={severity}
                    icon={<Clock className="h-3.5 w-3.5" />}
                    description={`Loan for ${m.borrowerName} matures in ${days === Infinity ? "—" : `${days} days`}`}
                    assetId={m.asset.id}
                    assetName={m.asset.name}
                  />
                );
              })}
            </div>
          )}

          {/* Overdue Reviews */}
          {overdueReviews.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Overdue Reviews ({overdueReviews.length})
              </div>
              {overdueReviews.map((r) => (
                <AlertRow
                  key={r.id}
                  severity="upcoming"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  description={`Review overdue${r.nextReview ? ` since ${new Date(r.nextReview).toLocaleDateString()}` : ""}`}
                  assetId={r.id}
                  assetName={r.name}
                />
              ))}
            </div>
          )}

          {/* Lease Expirations */}
          {leaseExpirations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Lease Expirations ({leaseExpirations.length})
                </div>
                <button
                  onClick={() => setShowLeaseDetail((v) => !v)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {showLeaseDetail ? "Hide detail" : "View detail"}
                </button>
              </div>

              {/* Quick alert rows (visible when detail collapsed) */}
              {!showLeaseDetail &&
                leaseExpirations.slice(0, 3).map((l) => {
                  const severity = getSeverityForLease(l.leaseEndDate);
                  const days = getDaysUntil(l.leaseEndDate);
                  return (
                    <AlertRow
                      key={l.id}
                      severity={severity}
                      icon={<Clock className="h-3.5 w-3.5" />}
                      description={`${l.tenantName} lease expires in ${days === Infinity ? "—" : `${days} days`}`}
                      assetId={l.asset.id}
                      assetName={l.asset.name}
                    />
                  );
                })}
              {!showLeaseDetail && leaseExpirations.length > 3 && (
                <div className="text-xs text-gray-400 pl-2">
                  +{leaseExpirations.length - 3} more leases expiring
                </div>
              )}

              {/* Detailed lease expiry view */}
              {showLeaseDetail && (
                <div className="mt-2 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <LeaseExpiryView leases={leaseExpirations} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
