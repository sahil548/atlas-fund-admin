"use client";

import { useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountMappingPanel } from "./account-mapping-panel";
import { TrialBalanceView } from "./trial-balance-view";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface ConnectionProp {
  id: string;
  provider: string;
  syncStatus: string;
  lastSyncAt: string | null;
  chartOfAccountsMapped: boolean;
  lastSyncError: string | null;
  providerCompanyName: string | null;
}

interface Props {
  entityId: string;
  entityName: string;
  connection: ConnectionProp | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function syncStatusColor(status: string): "green" | "yellow" | "red" | "gray" {
  if (status === "CONNECTED") return "green";
  if (status === "SYNCING") return "yellow";
  if (status === "ERROR") return "red";
  return "gray";
}

export function EntityAccountingTab({ entityId, entityName, connection: initialConnection }: Props) {
  const toast = useToast();
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // SWR for live connection data (re-fetches after sync/disconnect)
  const { data: navData, mutate: mutateNav } = useSWR<any>(
    `/api/nav/${entityId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Use SWR connection data if available, fall back to initial prop
  const connection: ConnectionProp | null =
    navData?.accountingConnection
      ? {
          id: navData.accountingConnection.id,
          provider: navData.accountingConnection.provider,
          syncStatus: navData.accountingConnection.syncStatus,
          lastSyncAt: navData.accountingConnection.lastSyncAt,
          chartOfAccountsMapped: navData.accountingConnection.chartOfAccountsMapped,
          lastSyncError: navData.accountingConnection.lastSyncError,
          providerCompanyName: navData.accountingConnection.providerCompanyName,
        }
      : initialConnection;

  const isMapped = connection?.chartOfAccountsMapped === true;
  const isConnected = connection != null && connection.syncStatus !== "DISCONNECTED";

  async function handleSyncNow() {
    if (!connection) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/accounting/connections/${connection.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Sync failed";
        toast.error(msg);
        return;
      }
      toast.success("Sync started");
      // Revalidate to get updated connection status
      setTimeout(() => mutateNav(), 3000);
    } catch {
      toast.error("Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this QBO connection? Account mapping history will be preserved.")) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/qbo/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Disconnect failed";
        toast.error(msg);
        return;
      }
      toast.success("Disconnected from QBO");
      mutateNav();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const navSource = navData?.navSource ?? (isMapped && isConnected ? "GL" : "PROXY");
  const glDataAsOf = navData?.glDataAsOf ?? null;

  return (
    <div className="space-y-4">

      {/* 1. Connection Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">Accounting Connection</h3>

        {!connection || connection.syncStatus === "DISCONNECTED" ? (
          /* Not connected */
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">No accounting system connected.</p>
              <p className="text-xs text-gray-400 mt-0.5">Connect to QuickBooks Online to pull real GL data for NAV calculations.</p>
            </div>
            <a
              href={`/api/integrations/qbo/connect?entityId=${entityId}`}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 inline-block"
            >
              Connect to QBO
            </a>
          </div>
        ) : (
          /* Connected */
          <div className="space-y-3">
            {/* ERROR banner */}
            {connection.syncStatus === "ERROR" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-red-700">Sync error</p>
                  {connection.lastSyncError && (
                    <p className="text-xs text-red-600 mt-0.5">{connection.lastSyncError}</p>
                  )}
                </div>
                <a
                  href={`/api/integrations/qbo/connect?entityId=${entityId}`}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 whitespace-nowrap"
                >
                  Reconnect
                </a>
              </div>
            )}

            {/* Connection info row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-xs font-bold">
                  {connection.provider === "QUICKBOOKS" ? "QBO" : connection.provider.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {connection.providerCompanyName || connection.provider}
                    </span>
                    <Badge color={syncStatusColor(connection.syncStatus)}>
                      {connection.syncStatus}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Last synced: {timeAgo(connection.lastSyncAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  variant="secondary"
                  size="sm"
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Account Mapping Section (only if connected) */}
      {isConnected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Account Mapping</h3>
            {!isMapped ? (
              <Badge color="yellow">Setup Required</Badge>
            ) : (
              <Badge color="green">Mapped</Badge>
            )}
          </div>

          {!isMapped ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-3">
                Map your chart of accounts to Atlas categories to enable GL-based NAV calculations.
              </p>
              <Button onClick={() => setShowMappingPanel(true)}>Set Up Account Mapping</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Account mappings configured across 5 categories.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShowMappingPanel(true)}>
                Edit Mappings
              </Button>
            </div>
          )}

          {/* Account Mapping Panel (modal/inline) */}
          {showMappingPanel && connection && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <AccountMappingPanel
                connectionId={connection.id}
                entityName={entityName}
                onClose={() => {
                  setShowMappingPanel(false);
                  mutateNav();
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Trial Balance Section (only if connected AND mapped) */}
      {isConnected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Trial Balance</h3>
          {isMapped ? (
            <TrialBalanceView connectionId={connection!.id} />
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              Complete account mapping first to view trial balance data.
            </p>
          )}
        </div>
      )}

      {/* 4. NAV Source Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">NAV Data Source</h3>
        {navSource === "GL" && glDataAsOf ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-sm text-green-700 font-medium">
              NAV uses real GL data
            </span>
            <span className="text-xs text-gray-400">
              (as of {new Date(glDataAsOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-300 rounded-full" />
            <span className="text-sm text-gray-500">
              NAV uses proxy estimates (5% cash / 0.5% other assets / 2% liabilities).
            </span>
            {!isConnected && (
              <a
                href={`/api/integrations/qbo/connect?entityId=${entityId}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Connect to QBO for real GL data
              </a>
            )}
          </div>
        )}
        {navData?.lastSyncAt && (
          <p className="text-[10px] text-gray-400 mt-1">
            Last sync: {timeAgo(navData.lastSyncAt)}
            {navData?.syncStatus === "ERROR" && (
              <span className="ml-2 text-amber-600 font-medium">
                (showing last good data — sync error occurred)
              </span>
            )}
          </p>
        )}
      </div>

    </div>
  );
}
