"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AccountingPage() {
  const { data: entities, isLoading } = useSWR("/api/accounting/connections", fetcher);
  if (isLoading || !entities) return <div className="text-sm text-gray-400">Loading...</div>;

  const connected = entities.filter((e: { accountingConnection: { syncStatus: string } | null }) => e.accountingConnection?.syncStatus === "CONNECTED");
  const qboCount = entities.filter((e: { accountingConnection: { provider: string } | null }) => e.accountingConnection?.provider === "QBO").length;
  const xeroCount = entities.filter((e: { accountingConnection: { provider: string } | null }) => e.accountingConnection?.provider === "XERO").length;
  const unrec = entities.reduce((s: number, e: { accountingConnection: { unreconciledItems: number } | null }) => s + (e.accountingConnection?.unreconciledItems || 0), 0);
  const errorEntity = entities.find((e: { accountingConnection: { syncStatus: string } | null }) => e.accountingConnection?.syncStatus === "ERROR");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Connected Entities" value={String(entities.length)} sub={`${qboCount} QBO + ${xeroCount} Xero`} small />
        <StatCard label="Last Full Sync" value="15m ago" sub="All entities" small />
        <StatCard label="Unreconciled" value={`${unrec} items`} sub={`Across ${entities.filter((e: { accountingConnection: { unreconciledItems: number } | null }) => (e.accountingConnection?.unreconciledItems || 0) > 0).length} entities`} small />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Entity Accounting Connections</h3>
          <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ Connect Entity</button>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {errorEntity && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-800">{errorEntity.name} — QBO connection error</div>
          <div className="text-xs text-red-700 mt-1">OAuth token expired. Re-authenticate to resume syncing.</div>
          <button className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded-lg">Reconnect</button>
        </div>
      )}
    </div>
  );
}
