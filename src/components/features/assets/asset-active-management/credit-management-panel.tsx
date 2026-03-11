"use client";

import { Badge } from "@/components/ui/badge";
import { fmt, pct, cn, formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

function maturityColor(days: number | null): string {
  if (days === null) return "gray";
  if (days <= 0) return "red";
  if (days <= 90) return "red";
  if (days <= 180) return "yellow";
  return "green";
}

function covenantStatusColor(status: string | null | undefined): string {
  if (!status) return "gray";
  const s = status.toUpperCase();
  if (s === "COMPLIANT") return "green";
  if (s === "BREACH") return "red";
  if (s === "WAIVED") return "gray";
  if (s === "WATCH") return "yellow";
  if (s === "CURE_PERIOD") return "orange";
  return "gray";
}

function creditStatusColor(status: string | null | undefined): string {
  if (!status) return "gray";
  const s = status.toUpperCase();
  if (s === "PERFORMING") return "green";
  if (s === "WATCH") return "yellow";
  if (s === "DEFAULT") return "red";
  if (s === "WORKOUT") return "orange";
  return "gray";
}

export function CreditManagementPanel({ asset: a }: Props) {
  const agreements: any[] = a.creditAgreements ?? [];

  if (agreements.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Credit / Loan Management
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
          No credit agreements configured for this asset
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agreements.map((ag: any) => {
        const maturityDays =
          ag.maturityDate
            ? Math.floor(
                (new Date(ag.maturityDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : null;

        const covenants: any[] = ag.covenants ?? [];
        const breachedCount = covenants.filter(
          (c) => c.currentStatus?.toUpperCase() === "BREACH",
        ).length;

        // Effective interest rate: fixedRate or referenceRate + spreadBps
        const interestRateLabel =
          ag.interestRateType === "FLOATING" && ag.referenceRate
            ? `${ag.referenceRate}${ag.spreadBps ? ` + ${ag.spreadBps}bps` : ""}`
            : ag.fixedRate != null
            ? pct(ag.fixedRate / 100)
            : "---";

        // Collateral and guarantors may be Json (string or object)
        const collateralDisplay =
          typeof ag.collateral === "string"
            ? ag.collateral
            : ag.collateral
            ? JSON.stringify(ag.collateral)
            : null;
        const guarantorsDisplay =
          typeof ag.guarantors === "string"
            ? ag.guarantors
            : ag.guarantors
            ? JSON.stringify(ag.guarantors)
            : null;

        return (
          <div
            key={ag.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
          >
            {/* Agreement Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {ag.borrowerName || "Credit Agreement"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {ag.agreementType && (
                    <Badge color="indigo">
                      {ag.agreementType.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {ag.currentStatus && (
                    <Badge color={creditStatusColor(ag.currentStatus)}>
                      {ag.currentStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {ag.subordination && (
                    <Badge color="gray">{ag.subordination}</Badge>
                  )}
                  {breachedCount > 0 && (
                    <Badge color="red">
                      {breachedCount} covenant{breachedCount !== 1 ? "s" : ""} in breach
                    </Badge>
                  )}
                </div>
              </div>
              {/* Maturity Countdown */}
              {maturityDays !== null && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mb-1">
                    Maturity
                  </div>
                  <Badge color={maturityColor(maturityDays)}>
                    {maturityDays <= 0
                      ? `Matured ${Math.abs(maturityDays)}d ago`
                      : `${maturityDays}d remaining`}
                  </Badge>
                  {ag.maturityDate && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(ag.maturityDate)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Key financials */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Original Principal
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {ag.originalPrincipal != null ? fmt(ag.originalPrincipal) : "---"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Current Principal
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {ag.currentPrincipal != null ? fmt(ag.currentPrincipal) : "---"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Interest Rate
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {interestRateLabel}
                </div>
              </div>
            </div>

            {/* Rate reset info for floating rate loans */}
            {ag.interestRateType === "FLOATING" && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2">
                <span className="font-medium text-amber-700 dark:text-amber-400">Floating Rate:</span>{" "}
                {ag.referenceRate || "N/A"}{ag.spreadBps ? ` + ${ag.spreadBps}bps` : ""}
                {ag.floorRate != null && (
                  <span> · Floor: {pct(ag.floorRate / 100)}</span>
                )}
              </div>
            )}

            {/* Collateral / Guarantors */}
            {(collateralDisplay || guarantorsDisplay) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 space-y-1">
                {collateralDisplay && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Collateral:</span>{" "}
                    {collateralDisplay}
                  </div>
                )}
                {guarantorsDisplay && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Guarantors:</span>{" "}
                    {guarantorsDisplay}
                  </div>
                )}
              </div>
            )}

            {/* Covenant Compliance Dashboard */}
            {covenants.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Covenant Compliance
                </h4>
                <div className="space-y-2">
                  {covenants.map((c: any) => (
                    <div
                      key={c.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-xs",
                        c.currentStatus?.toUpperCase() === "BREACH"
                          ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800"
                          : c.currentStatus?.toUpperCase() === "COMPLIANT"
                          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700",
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {c.name || (c.covenantType
                            ? c.covenantType.replace(/_/g, " ")
                            : "Covenant")}
                        </div>
                        {c.covenantType && (
                          <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                            {c.covenantType.replace(/_/g, " ")}
                            {c.metric ? ` — ${c.metric}` : ""}
                          </div>
                        )}
                        {(c.thresholdValue != null || c.thresholdValueUpper != null) && (
                          <div className="text-gray-400 dark:text-gray-500 mt-0.5">
                            Threshold:{" "}
                            {c.thresholdValue != null ? `${c.thresholdValue}` : ""}
                            {c.thresholdValueUpper != null
                              ? ` – ${c.thresholdValueUpper}`
                              : ""}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1">
                        <Badge color={covenantStatusColor(c.currentStatus)}>
                          {c.currentStatus
                            ? c.currentStatus.replace(/_/g, " ")
                            : "Unknown"}
                        </Badge>
                        {c.lastTestedDate && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            Tested: {formatDate(c.lastTestedDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Tracking */}
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                Payment Tracking
              </h4>
              {ag.payments && ag.payments.length > 0 ? (
                <div className="space-y-1">
                  {ag.payments.slice(0, 5).map((p: any) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {p.date ? formatDate(p.date) : "---"}
                        </span>
                        {p.paymentType && (
                          <Badge color="gray">{p.paymentType}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {p.amount != null ? fmt(p.amount) : "---"}
                        </span>
                        {p.status && (
                          <Badge color={p.status === "Received" ? "green" : "yellow"}>
                            {p.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No payment tracking configured
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
