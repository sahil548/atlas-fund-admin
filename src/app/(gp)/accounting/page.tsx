"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { fmt } from "@/lib/utils";
import { ReconnectForm } from "@/components/features/accounting/reconnect-form";
import { TriggerSyncForm } from "@/components/features/accounting/trigger-sync-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export default function AccountingPage() {
  const [showReconnect, setShowReconnect] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string } | null>(null);
  const { data: entities, isLoading } = useSWR("/api/accounting/connections", fetcher);
  if (isLoading || !entities) return <div className="text-sm text-gray-400">Loading...</div>;

  const connected = entities.filter((e: { accountingConnection: { syncStatus: string } | null }) => e.accountingConnection?.syncStatus === "CONNECTED");
  const qboCount = entities.filter((e: { accountingConnection: { provider: string } | null }) => e.accountingConnection?.provider === "QBO").length;
  const xeroCount = entities.filter((e: { accountingConnection: { provider: string } | null }) => e.accountingConnection?.provider === "XERO").length;
  const unrec = entities.reduce((s: number, e: { accountingConnection: { unreconciledItems: number } | null }) => s + (e.accountingConnection?.unreconciledItems || 0), 0);
  const errorEntity = entities.find((e: { accountingConnection: { syncStatus: string } | null }) => e.accountingConnection?.syncStatus === "ERROR");

  const latestSyncTime = entities
    .filter((e: { accountingConnection: { lastSyncAt: string } | null }) => e.accountingConnection?.lastSyncAt)
    .map((e: { accountingConnection: { lastSyncAt: string } }) => new Date(e.accountingConnection.lastSyncAt).getTime())
    .sort((a: number, b: number) => b - a)[0];
  const lastSyncLabel = latestSyncTime ? timeAgo(new Date(latestSyncTime).toISOString()) : "never";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Connected Entities" value={String(entities.length)} sub={`${qboCount} QBO + ${xeroCount} Xero`} small />
        <StatCard label="Last Full Sync" value={lastSyncLabel} sub={`${connected.length} entities synced`} small />
        <StatCard label="Unreconciled" value={`${unrec} items`} sub={`Across ${entities.filter((e: { accountingConnection: { unreconciledItems: number } | null }) => (e.accountingConnection?.unreconciledItems || 0) > 0).length} entities`} small />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Entity Accounting Connections</h3>
        </div>
        <div className="space-y-2">
          {entities.map((e: { id: string; name: string; entityType: string; totalCommitments: number; accountingConnection: { provider: string; syncStatus: string; unreconciledItems: number; lastSyncAt: string } | null }) => (
            <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${e.accountingConnection?.syncStatus === "CONNECTED" ? "bg-emerald-400" : "bg-red-400"}`} />
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.accountingConnection && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${e.accountingConnection.provider === "QBO" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {e.accountingConnection.provider}
                      </span>
                    )}
                    <Badge color="gray">{e.entityType.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(e.accountingConnection?.unreconciledItems || 0) > 0 && (
                  <span className="text-xs text-amber-600">{e.accountingConnection?.unreconciledItems} unreconciled</span>
                )}
                <div className="text-right">
                  <div className="text-sm font-medium">{fmt(e.totalCommitments || 0)}</div>
                  <div className="text-[10px] text-gray-500">
                    Sync: {e.accountingConnection?.lastSyncAt ? new Date(e.accountingConnection.lastSyncAt).toLocaleString() : "—"}
                  </div>
                </div>
                <Badge color={e.accountingConnection?.syncStatus === "CONNECTED" ? "green" : "red"}>
                  {e.accountingConnection?.syncStatus || "—"}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="secondary" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelectedEntity({ id: e.id, name: e.name }); setShowReconnect(true); }}>Reconnect</Button>
                  <Button variant="secondary" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelectedEntity({ id: e.id, name: e.name }); setShowSync(true); }}>Sync</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorEntity && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-800">{errorEntity.name} — QBO connection error</div>
          <div className="text-xs text-red-700 mt-1">OAuth token expired. Re-authenticate to resume syncing.</div>
          <Button variant="danger" size="sm" className="mt-2" onClick={() => { setSelectedEntity({ id: errorEntity.id, name: errorEntity.name }); setShowReconnect(true); }}>Reconnect</Button>
        </div>
      )}

      <ReconnectForm open={showReconnect} onClose={() => setShowReconnect(false)} entityId={selectedEntity?.id ?? ""} entityName={selectedEntity?.name ?? ""} />
      <TriggerSyncForm open={showSync} onClose={() => setShowSync(false)} entityId={selectedEntity?.id ?? ""} entityName={selectedEntity?.name ?? ""} />
    </div>
  );
}
