"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { fmt, pct } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
} from "@/lib/constants";

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard/stats", fetcher);
  if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total AUM (Fair Value)" value={fmt(data.totalFV)} sub={`${data.entities?.filter((e: { status: string }) => e.status === "ACTIVE").length || 0} entities connected`} trend={5.1} />
        <StatCard label="Portfolio Fair Value" value={fmt(data.totalFV)} sub={`Cost basis: ${fmt(data.totalCost)}`} />
        <StatCard label="Unrealized Gain" value={`+${fmt(data.unrealizedGain)}`} sub={`${data.totalCost > 0 ? ((data.totalFV / data.totalCost - 1) * 100).toFixed(0) : 0}% appreciation`} />
        <StatCard label="Pipeline" value={`${data.pipelineCount} deals`} sub={`${data.activeAssetCount} active assets`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Top Assets by Fair Value</h3>
          {data.topAssets?.map((a: { id: string; name: string; assetClass: string; fairValue: number; moic: number }) => (
            <a key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
              <div className="flex items-center gap-2">
                <Badge color={ASSET_CLASS_COLORS[a.assetClass]}>{ASSET_CLASS_LABELS[a.assetClass]}</Badge>
                <span className="text-sm font-medium text-indigo-700">{a.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{fmt(a.fairValue)}</div>
                <div className="text-[10px] text-gray-500">{a.moic?.toFixed(2)}x</div>
              </div>
            </a>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Entity Overview</h3>
          {data.entities?.slice(0, 5).map((e: { id: string; name: string; entityType: string; accountingConnection?: { provider: string }; status: string; totalCommitments: number | null }) => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium">{e.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {e.accountingConnection && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${e.accountingConnection.provider === "QBO" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                      {e.accountingConnection.provider}
                    </span>
                  )}
                  <Badge color="gray">{e.entityType.replace(/_/g, " ")}</Badge>
                </div>
              </div>
              <div className="text-right">
                {e.status === "ACTIVE" ? (
                  <div className="text-sm font-medium">{fmt(e.totalCommitments || 0)}</div>
                ) : (
                  <Badge color="red">Error</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Recent Meetings</h3>
          {data.recentMeetings?.map((m: { id: string; title: string; meetingDate: string; hasTranscript: boolean; decisions: string[] | null }) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm">{m.title}</div>
                <div className="text-[10px] text-gray-500">{new Date(m.meetingDate).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {m.hasTranscript && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Transcript</span>}
                {m.decisions && (m.decisions as string[]).length > 0 && <Badge color="green">Decision</Badge>}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Pending Capital Calls</h3>
          {data.capitalCalls?.map((c: { id: string; callNumber: string; entity: { name: string }; amount: number; status: string; purpose: string }) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium">{c.callNumber} — {c.entity?.name}</div>
                <div className="text-[10px] text-gray-500">{c.purpose}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{fmt(c.amount)}</div>
                <Badge color={c.status === "ISSUED" ? "yellow" : "gray"}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
