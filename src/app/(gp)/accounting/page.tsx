"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { fmt, cn } from "@/lib/utils";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { AccountMappingPanel } from "@/components/features/accounting/account-mapping-panel";
import { TrialBalanceView } from "@/components/features/accounting/trial-balance-view";
import { useToast } from "@/components/ui/toast";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface AccountingConnection {
  id: string;
  provider: string;
  syncStatus: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  unreconciledItems: number;
  chartOfAccountsMapped: boolean;
}

interface EntityRow {
  id: string;
  name: string;
  entityType: string;
  totalCommitments: number;
  accountingConnection: AccountingConnection | null;
}

type DrillInTab = "mapping" | "trial-balance";

export default function AccountingPage() {
  const toast = useToast();
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);
  const [drillInTab, setDrillInTab] = useState<DrillInTab>("mapping");
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);

  const { data: entities, isLoading, mutate } = useSWR<EntityRow[]>(
    "/api/accounting/connections",
    fetcher
  );

  if (isLoading || !entities) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  const connected = entities.filter(
    (e) => e.accountingConnection?.syncStatus === "CONNECTED"
  );
  const qboCount = entities.filter(
    (e) => e.accountingConnection?.provider === "QBO"
  ).length;
  const xeroCount = entities.filter(
    (e) => e.accountingConnection?.provider === "XERO"
  ).length;
  const unrec = entities.reduce(
    (s, e) => s + (e.accountingConnection?.unreconciledItems || 0),
    0
  );

  const latestSyncTime = entities
    .filter((e) => e.accountingConnection?.lastSyncAt)
    .map((e) => new Date(e.accountingConnection!.lastSyncAt!).getTime())
    .sort((a, b) => b - a)[0];
  const lastSyncLabel = latestSyncTime
    ? timeAgo(new Date(latestSyncTime).toISOString())
    : "never";

  function toggleExpand(entityId: string) {
    if (expandedEntityId === entityId) {
      setExpandedEntityId(null);
    } else {
      setExpandedEntityId(entityId);
      setDrillInTab("mapping");
    }
  }

  async function handleSyncNow(connectionId: string) {
    setSyncingConnectionId(connectionId);
    try {
      const res = await fetch(
        `/api/accounting/connections/${connectionId}/sync`,
        { method: "POST" }
      );

      if (!res.ok) {
        const body = await res.json();
        const msg =
          typeof body.error === "string" ? body.error : "Sync failed";
        toast.error(msg);
        return;
      }

      toast.success("Sync complete");
      mutate();
      globalMutate(`/api/accounting/connections/${connectionId}/trial-balance`);
    } catch {
      toast.error("Failed to sync");
    } finally {
      setSyncingConnectionId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Connected Entities"
          value={String(connected.length)}
          sub={`${qboCount} QBO + ${xeroCount} Xero`}
          small
        />
        <StatCard
          label="Last Full Sync"
          value={lastSyncLabel}
          sub={`${connected.length} entities synced`}
          small
        />
        <StatCard
          label="Unreconciled"
          value={`${unrec} items`}
          sub={`Across ${entities.filter((e) => (e.accountingConnection?.unreconciledItems || 0) > 0).length} entities`}
          small
        />
      </div>

      {/* Entity list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">Entity Accounting Connections</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {entities.map((e) => {
            const conn = e.accountingConnection;
            const isExpanded = expandedEntityId === e.id;
            const isSyncing = syncingConnectionId === conn?.id;

            return (
              <div key={e.id}>
                {/* Entity row */}
                <div
                  className={cn(
                    "flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors",
                    isExpanded && "bg-indigo-50/30"
                  )}
                  onClick={() => toggleExpand(e.id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        conn?.syncStatus === "CONNECTED"
                          ? "bg-emerald-400"
                          : conn?.syncStatus === "ERROR"
                          ? "bg-red-400"
                          : conn?.syncStatus === "SYNCING"
                          ? "bg-blue-400"
                          : "bg-gray-300"
                      )}
                    />
                    <div>
                      <div className="text-sm font-medium">{e.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {conn && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium",
                              conn.provider === "QBO"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {conn.provider}
                          </span>
                        )}
                        <Badge color="gray">
                          {e.entityType.replace(/_/g, " ")}
                        </Badge>
                        {conn && !conn.chartOfAccountsMapped && conn.syncStatus === "CONNECTED" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                            Mappings needed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {(conn?.unreconciledItems || 0) > 0 && (
                      <span className="text-xs text-amber-600">
                        {conn?.unreconciledItems} unreconciled
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {fmt(e.totalCommitments || 0)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {conn?.lastSyncAt
                          ? `Synced ${timeAgo(conn.lastSyncAt)}`
                          : "Never synced"}
                      </div>
                    </div>
                    <Badge
                      color={
                        conn?.syncStatus === "CONNECTED"
                          ? "green"
                          : conn?.syncStatus === "ERROR"
                          ? "red"
                          : conn?.syncStatus === "SYNCING"
                          ? "blue"
                          : "gray"
                      }
                    >
                      {conn?.syncStatus || "Not connected"}
                    </Badge>

                    {/* Actions */}
                    <div
                      className="flex gap-1"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {!conn ? (
                        // No connection — show Connect button
                        <a
                          href={`/api/integrations/qbo/connect?entityId=${e.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                          Connect to QBO
                        </a>
                      ) : conn.syncStatus === "ERROR" ||
                        conn.syncStatus === "DISCONNECTED" ? (
                        // Error/disconnected — show Reconnect button
                        <a
                          href={`/api/integrations/qbo/connect?entityId=${e.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Reconnect
                        </a>
                      ) : (
                        // Connected — show Sync Now button
                        <button
                          onClick={() => handleSyncNow(conn.id)}
                          disabled={isSyncing || conn.syncStatus === "SYNCING"}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                            isSyncing || conn.syncStatus === "SYNCING"
                              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {isSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                      )}
                    </div>

                    {/* Expand/collapse chevron */}
                    <svg
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Drill-in section */}
                {isExpanded && (
                  <div className="border-t border-indigo-100 bg-gray-50/50 px-5 py-4">
                    {!conn ? (
                      <div className="text-sm text-gray-500 py-4 text-center">
                        No QBO connection for this entity.{" "}
                        <a
                          href={`/api/integrations/qbo/connect?entityId=${e.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Connect to QBO
                        </a>{" "}
                        to start syncing.
                      </div>
                    ) : (
                      <div>
                        {/* Drill-in tabs */}
                        <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 p-1 w-fit">
                          <button
                            onClick={() => setDrillInTab("mapping")}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                              drillInTab === "mapping"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            )}
                          >
                            Account Mapping
                          </button>
                          <button
                            onClick={() => setDrillInTab("trial-balance")}
                            disabled={!conn.chartOfAccountsMapped}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                              drillInTab === "trial-balance"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : !conn.chartOfAccountsMapped
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700"
                            )}
                            title={
                              !conn.chartOfAccountsMapped
                                ? "Map accounts first before viewing trial balance"
                                : undefined
                            }
                          >
                            Trial Balance
                            {!conn.chartOfAccountsMapped && (
                              <span className="ml-1 text-[9px] text-amber-400">
                                (map first)
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Tab content */}
                        <SectionErrorBoundary>
                          {drillInTab === "mapping" ? (
                            <AccountMappingPanel
                              connectionId={conn.id}
                              entityName={e.name}
                              onClose={() => {
                                mutate();
                                setExpandedEntityId(null);
                              }}
                            />
                          ) : conn.chartOfAccountsMapped ? (
                            <TrialBalanceView connectionId={conn.id} />
                          ) : (
                            <div className="text-sm text-gray-500 py-4 text-center">
                              Please map accounts before viewing trial balance.
                            </div>
                          )}
                        </SectionErrorBoundary>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error entity banner */}
      {entities.some((e) => e.accountingConnection?.syncStatus === "ERROR") && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          {entities
            .filter((e) => e.accountingConnection?.syncStatus === "ERROR")
            .map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-red-800">
                    {e.name} — QBO connection error
                  </div>
                  <div className="text-xs text-red-700 mt-0.5">
                    {e.accountingConnection?.lastSyncError ||
                      "OAuth token expired. Re-authenticate to resume syncing."}
                  </div>
                </div>
                <a
                  href={`/api/integrations/qbo/connect?entityId=${e.id}`}
                  className="ml-4 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Reconnect
                </a>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
