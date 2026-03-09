"use client";

import { useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/ui/toast";
import { cn, fmt } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface AccountEntry {
  accountId: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
  atlasAccountType: string;
}

interface BucketData {
  accounts: AccountEntry[];
  total: number;
}

interface TrialBalanceData {
  periodDate: string | null;
  syncedAt: string | null;
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  buckets: Record<string, BucketData>;
  availablePeriods: string[];
}

const BUCKET_LABELS: Record<string, string> = {
  CASH: "Cash",
  INVESTMENTS_AT_COST: "Investments at Cost",
  OTHER_ASSETS: "Other Assets",
  LIABILITIES: "Liabilities",
  EQUITY_PARTNERS_CAPITAL: "Equity / Partners' Capital",
  UNMAPPED: "Unmapped Accounts",
};

const BUCKET_ORDER = [
  "CASH",
  "INVESTMENTS_AT_COST",
  "OTHER_ASSETS",
  "LIABILITIES",
  "EQUITY_PARTNERS_CAPITAL",
  "UNMAPPED",
];

function formatPeriodLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  connectionId: string;
}

export function TrialBalanceView({ connectionId }: Props) {
  const toast = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set(["CASH"]));
  const [isSyncing, setIsSyncing] = useState(false);

  const swrKey = selectedPeriod
    ? `/api/accounting/connections/${connectionId}/trial-balance?periodDate=${selectedPeriod}`
    : `/api/accounting/connections/${connectionId}/trial-balance`;

  const { data, isLoading, error, mutate } = useSWR<TrialBalanceData>(swrKey, fetcher);

  function toggleBucket(key: string) {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      const res = await fetch(
        `/api/accounting/connections/${connectionId}/sync`,
        { method: "POST" }
      );

      if (!res.ok) {
        const body = await res.json();
        const msg = typeof body.error === "string" ? body.error : "Sync failed";
        toast.error(msg);
        return;
      }

      const result = await res.json();
      // Set period to the newly synced one
      setSelectedPeriod(result.asOfDate ?? "");
      await mutate();
      toast.success("Trial balance synced successfully");
    } catch {
      toast.error("Failed to sync trial balance");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-gray-400">Loading trial balance...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">
        Failed to load trial balance. {error.message}
      </div>
    );
  }

  const hasData = data.periodDate !== null;
  const imbalanceAmount = Math.abs(data.totalDebits - data.totalCredits);
  const hasUnmapped = (data.buckets?.UNMAPPED?.accounts?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Header row: period selector + sync button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data.availablePeriods.length > 0 && (
            <select
              value={selectedPeriod || (data.periodDate ?? "")}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {data.availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          )}
          {data.syncedAt && (
            <span className="text-[10px] text-gray-400">
              Last synced: {timeAgo(data.syncedAt)}
            </span>
          )}
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
            isSyncing
              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {isSyncing ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>

      {/* Not balanced warning */}
      {hasData && !data.isBalanced && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-red-800">Trial balance is out of balance</p>
            <p className="text-xs text-red-700 mt-0.5">
              Difference: {fmt(imbalanceAmount)}. Check with your bookkeeper.
            </p>
          </div>
        </div>
      )}

      {/* Unmapped warning */}
      {hasUnmapped && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs text-amber-700">
            {data.buckets.UNMAPPED.accounts.length} unmapped account{data.buckets.UNMAPPED.accounts.length !== 1 ? "s" : ""} — configure mappings to include these in NAV
          </span>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="text-center py-12 text-sm text-gray-400">
          No trial balance data. Click Sync Now to pull from QBO.
        </div>
      )}

      {/* Bucket sections */}
      {hasData && (
        <div className="space-y-2">
          {BUCKET_ORDER.map((bucketKey) => {
            const bucket = data.buckets?.[bucketKey];
            if (!bucket) return null;
            const label = BUCKET_LABELS[bucketKey] ?? bucketKey;
            const isExpanded = expandedBuckets.has(bucketKey);
            const isUnmapped = bucketKey === "UNMAPPED";
            const isEmpty = bucket.accounts.length === 0;

            return (
              <div
                key={bucketKey}
                className={cn(
                  "rounded-lg border overflow-hidden",
                  isUnmapped
                    ? "border-amber-200"
                    : "border-gray-200"
                )}
              >
                {/* Bucket header */}
                <button
                  onClick={() => toggleBucket(bucketKey)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isUnmapped
                      ? "bg-amber-50 hover:bg-amber-100"
                      : "bg-white hover:bg-gray-50",
                    isEmpty && "cursor-default"
                  )}
                  disabled={isEmpty}
                >
                  <div className="flex items-center gap-2">
                    {isUnmapped && (
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    <span className={cn(
                      "text-xs font-semibold",
                      isUnmapped ? "text-amber-800" : "text-gray-800"
                    )}>
                      {label}
                    </span>
                    {!isEmpty && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        isUnmapped
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {bucket.accounts.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs font-medium",
                      isUnmapped ? "text-amber-700" : "text-gray-700"
                    )}>
                      {fmt(bucket.total)}
                    </span>
                    {!isEmpty && (
                      <svg
                        className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          isUnmapped ? "text-amber-500" : "text-gray-400",
                          isExpanded && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Expanded account table */}
                {isExpanded && !isEmpty && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                          <th className="text-left px-4 py-2 font-medium">Account</th>
                          <th className="text-right px-4 py-2 font-medium">Debit</th>
                          <th className="text-right px-4 py-2 font-medium">Credit</th>
                          <th className="text-right px-4 py-2 font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.accounts.map((acct) => (
                          <tr
                            key={acct.accountId}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 text-gray-700">{acct.accountName}</td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {acct.debit > 0 ? fmt(acct.debit) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {acct.credit > 0 ? fmt(acct.credit) : "—"}
                            </td>
                            <td className={cn(
                              "px-4 py-2 text-right font-medium",
                              acct.balance < 0 ? "text-red-600" : "text-gray-800"
                            )}>
                              {fmt(acct.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary row */}
      {hasData && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Debits</div>
              <div className="text-sm font-semibold text-gray-800">{fmt(data.totalDebits)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Credits</div>
              <div className="text-sm font-semibold text-gray-800">{fmt(data.totalCredits)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.isBalanced ? (
              <>
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-emerald-700">Balanced</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs font-medium text-red-700">
                  Out of balance by {fmt(imbalanceAmount)}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
