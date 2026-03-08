"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const ATLAS_BUCKETS = [
  { value: "CASH", label: "Cash" },
  { value: "INVESTMENTS_AT_COST", label: "Investments at Cost" },
  { value: "OTHER_ASSETS", label: "Other Assets" },
  { value: "LIABILITIES", label: "Liabilities" },
  { value: "EQUITY_PARTNERS_CAPITAL", label: "Equity / Partners' Capital" },
] as const;

type AtlasBucketValue = (typeof ATLAS_BUCKETS)[number]["value"];

interface AccountEntry {
  accountId: string;
  accountName: string;
  accountType: string;
  classification: string;
  currentBalance: number;
  suggestedBucket: AtlasBucketValue | null;
  currentMapping: AtlasBucketValue | null;
  isMapped: boolean;
}

interface ChartOfAccountsData {
  accounts: AccountEntry[];
  unmappedCount: number;
  totalAccounts: number;
}

interface Props {
  connectionId: string;
  entityName: string;
  onClose: () => void;
}

export function AccountMappingPanel({ connectionId, entityName, onClose }: Props) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  // Local state: accountId -> selected bucket value ("" means "Unmapped")
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, error } = useSWR<ChartOfAccountsData>(
    `/api/accounting/connections/${connectionId}/chart-of-accounts`,
    fetcher,
    {
      onSuccess(d) {
        if (!initialized) {
          // Pre-populate local state with current or suggested mappings
          const initial: Record<string, string> = {};
          for (const acct of d.accounts) {
            initial[acct.accountId] = acct.currentMapping ?? acct.suggestedBucket ?? "";
          }
          setLocalMappings(initial);
          setInitialized(true);
        }
      },
    }
  );

  // Group accounts by classification
  const grouped = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, AccountEntry[]> = {};
    for (const acct of data.accounts) {
      const key = acct.classification || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(acct);
    }
    return groups;
  }, [data]);

  // Count unmapped balance-sheet accounts in local state
  const localUnmappedCount = useMemo(() => {
    if (!data) return 0;
    return data.accounts.filter(
      (acct) => acct.suggestedBucket !== null && !localMappings[acct.accountId]
    ).length;
  }, [data, localMappings]);

  function handleApplyAllSuggestions() {
    if (!data) return;
    const updated = { ...localMappings };
    for (const acct of data.accounts) {
      if (acct.suggestedBucket) {
        updated[acct.accountId] = acct.suggestedBucket;
      }
    }
    setLocalMappings(updated);
  }

  async function handleSaveMappings() {
    if (!data) return;
    setIsSaving(true);

    try {
      // Only include balance-sheet accounts that have a mapping selected
      const mappingsToSave = data.accounts
        .filter((acct) => acct.suggestedBucket !== null && localMappings[acct.accountId])
        .map((acct) => ({
          providerAccountId: acct.accountId,
          providerAccountName: acct.accountName,
          atlasAccountType: localMappings[acct.accountId] as AtlasBucketValue,
          isAutoDetected: localMappings[acct.accountId] === acct.suggestedBucket,
        }));

      const res = await fetch(
        `/api/accounting/connections/${connectionId}/mappings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: mappingsToSave }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        const msg = typeof body.error === "string" ? body.error : "Failed to save mappings";
        toast.error(msg);
        return;
      }

      toast.success("Account mappings saved");
      onClose();
    } catch {
      toast.error("Failed to save mappings");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-6 text-sm text-gray-400">Loading chart of accounts...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">
        Failed to load chart of accounts. {error.message}
      </div>
    );
  }

  const classificationOrder = ["Asset", "Liability", "Equity", "Revenue", "Expense", "Other"];
  const sortedGroups = classificationOrder.filter((g) => grouped[g]);

  return (
    <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Account Mapping — {entityName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Map QBO accounts to Atlas's 5 financial categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleApplyAllSuggestions}>
            Apply All Suggestions
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveMappings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Mappings"}
          </Button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Warning banner */}
      {localUnmappedCount > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs text-amber-700 font-medium">
            {localUnmappedCount} unmapped balance sheet account{localUnmappedCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.map((classification) => (
          <div key={classification}>
            {/* Section header */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {classification}
              </span>
            </div>

            {/* Account rows */}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium">Account Name</th>
                  <th className="text-left px-4 py-2 font-medium">QBO Type</th>
                  <th className="text-right px-4 py-2 font-medium">Balance</th>
                  <th className="text-left px-4 py-2 font-medium w-52">Atlas Bucket</th>
                </tr>
              </thead>
              <tbody>
                {grouped[classification].map((acct) => {
                  const isBalanceSheet = acct.suggestedBucket !== null;
                  const currentValue = localMappings[acct.accountId] ?? "";
                  const isMissingMapping = isBalanceSheet && !currentValue;

                  return (
                    <tr
                      key={acct.accountId}
                      className={cn(
                        "border-b border-gray-50 hover:bg-gray-50",
                        isMissingMapping && "bg-amber-50/40"
                      )}
                    >
                      <td className="px-4 py-2 font-medium text-gray-800">{acct.accountName}</td>
                      <td className="px-4 py-2 text-gray-500">{acct.accountType}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {acct.currentBalance.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-4 py-2">
                        {isBalanceSheet ? (
                          <select
                            value={currentValue}
                            onChange={(e) =>
                              setLocalMappings((prev) => ({
                                ...prev,
                                [acct.accountId]: e.target.value,
                              }))
                            }
                            className={cn(
                              "w-full text-xs rounded border py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400",
                              isMissingMapping
                                ? "border-amber-300 text-amber-700"
                                : "border-gray-200 text-gray-700"
                            )}
                          >
                            <option value="">-- Unmapped --</option>
                            {ATLAS_BUCKETS.map((b) => (
                              <option key={b.value} value={b.value}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">
                            N/A — balance sheet only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {data.totalAccounts} total accounts
          {localUnmappedCount > 0 && (
            <span className="text-amber-600 ml-2">· {localUnmappedCount} unmapped</span>
          )}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveMappings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Mappings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
