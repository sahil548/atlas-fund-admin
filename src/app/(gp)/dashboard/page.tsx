"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { fmt, pct } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";
import { AssetAllocationChart } from "@/components/features/dashboard/asset-allocation-chart";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  SCREENING: { label: "Screening", color: "bg-gray-400" },
  DUE_DILIGENCE: { label: "Due Diligence", color: "bg-blue-500" },
  IC_REVIEW: { label: "IC Review", color: "bg-amber-500" },
  CLOSING: { label: "Closing", color: "bg-indigo-500" },
  CLOSED: { label: "Closed", color: "bg-emerald-500" },
};

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: "\u{1F4DD}",
  STATUS_CHANGE: "\u{1F504}",
  DOCUMENT: "\u{1F4C4}",
  MEETING: "\u{1F91D}",
  VALUATION: "\u{1F4C8}",
};

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard/stats", fetcher);
  if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  // Prepare deal pipeline data
  const stageOrder = ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"];
  const stageCounts: Record<string, number> = {};
  (data.dealsByStage || []).forEach((s: { stage: string; _count: number }) => {
    stageCounts[s.stage] = s._count;
  });
  const maxCount = Math.max(...stageOrder.map((s) => stageCounts[s] || 0), 1);
  const stages = stageOrder.map((stage) => ({
    label: STAGE_CONFIG[stage]?.label || stage,
    count: stageCounts[stage] || 0,
    color: STAGE_CONFIG[stage]?.color || "bg-gray-400",
    maxWidth: `${((stageCounts[stage] || 0) / maxCount) * 100}%`,
  }));

  return (
    <div className="space-y-5">
      {/* Row 1: 6 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total AUM (Fair Value)" value={fmt(data.totalFV)} sub={`${data.entities?.filter((e: { status: string }) => e.status === "ACTIVE").length || 0} entities connected`} trend={5.1} />
        <StatCard label="Portfolio Fair Value" value={fmt(data.totalFV)} sub={`Cost basis: ${fmt(data.totalCost)}`} />
        <StatCard label="Unrealized Gain" value={`+${fmt(data.unrealizedGain)}`} sub={`${data.totalCost > 0 ? ((data.totalFV / data.totalCost - 1) * 100).toFixed(0) : 0}% appreciation`} />
        <StatCard label="Pipeline" value={`${data.pipelineCount} deals`} sub={`${data.activeAssetCount} active assets`} />
        <StatCard label="Weighted IRR" value={`${(data.performanceMetrics?.weightedIRR ?? 0).toFixed(1)}%`} sub="Weighted by fair value" />
        <StatCard label="TVPI" value={`${(data.performanceMetrics?.tvpi ?? 0).toFixed(2)}x`} sub="Total value / paid-in" />
      </div>

      {/* Row 2: Asset Allocation + Top Assets + Entity Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Asset Allocation</h3>
          <AssetAllocationChart />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Top Assets by Fair Value</h3>
          {data.topAssets?.map((a: { id: string; name: string; assetClass: string; participationStructure?: string; fairValue: number; moic: number }) => (
            <a key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge color={ASSET_CLASS_COLORS[a.assetClass]}>{ASSET_CLASS_LABELS[a.assetClass]}</Badge>
                {a.participationStructure && (
                  <Badge color={PARTICIPATION_COLORS[a.participationStructure] || "gray"}>
                    {PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}
                  </Badge>
                )}
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

      {/* Row 3: Deal Pipeline + LP Commitments (NEW) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Deal Pipeline</h3>
          <div className="space-y-2">
            {stages.map(({ label, count, color, maxWidth }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-20 text-right">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: maxWidth }} />
                </div>
                <span className="text-[10px] font-semibold w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">LP Commitments</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">Total Committed</span>
              <span className="text-sm font-medium">{fmt(data.lpSummary?.committed ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">Capital Called</span>
              <span className="text-sm font-medium">{fmt(data.lpSummary?.called ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">Distributed</span>
              <span className="text-sm font-medium">{fmt(data.lpSummary?.distributed ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">DPI</span>
              <span className="text-sm font-semibold">{(data.lpSummary?.dpi ?? 0).toFixed(2)}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Activity + Meetings & Capital Calls (NEW layout) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((a: { id: string; activityType: string; description: string; createdAt: string; deal: { id: string; name: string } }) => (
              <div key={a.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm mt-0.5">{ACTIVITY_ICONS[a.activityType] || "\u{1F4CC}"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-indigo-700 truncate">{a.deal?.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(a.createdAt)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{a.description}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 py-4 text-center">No recent activity</div>
          )}
        </div>

        <div className="space-y-4">
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
    </div>
  );
}
