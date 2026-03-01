"use client";

import { use } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TC: Record<string, string> = { DIRECT_EQUITY: "indigo", PRIVATE_CREDIT: "orange", REAL_ESTATE_DIRECT: "green", FUND_LP_POSITION: "purple", CO_INVESTMENT: "blue" };
const TL: Record<string, string> = { DIRECT_EQUITY: "Equity", PRIVATE_CREDIT: "Credit", REAL_ESTATE_DIRECT: "Real Estate", FUND_LP_POSITION: "Fund LP", CO_INVESTMENT: "Co-Invest" };

const stageOrder = ["SOURCING", "SCREENING", "AI_SCREEN", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "ACTIVE"];
const stageLabel: Record<string, string> = { SOURCING: "Sourcing", SCREENING: "Screening", AI_SCREEN: "AI Screen", DUE_DILIGENCE: "Due Diligence", IC_REVIEW: "IC Review", CLOSING: "Closing", ACTIVE: "Active Asset" };

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: deal, isLoading } = useSWR(`/api/deals/${id}`, fetcher);
  if (isLoading || !deal) return <div className="text-sm text-gray-400">Loading...</div>;

  const currentIdx = stageOrder.indexOf(deal.stage);

  return (
    <div className="space-y-4">
      <Link href="/deals" className="text-xs text-indigo-600 hover:underline">&larr; Back to pipeline</Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{deal.name}</h2>
              <Badge color={TC[deal.dealType]}>{TL[deal.dealType]}</Badge>
              <Badge color="yellow">{deal.stage.replace(/_/g, " ")}</Badge>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {deal.sector} · Target: {deal.targetSize} · Lead: {deal.leadPartner}
            </div>
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="flex items-center gap-1 mb-5">
          {stageOrder.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center">
              <div className={`w-full h-1.5 rounded-full ${
                i <= currentIdx
                  ? i === currentIdx ? "bg-amber-400" : "bg-emerald-400"
                  : "bg-gray-200"
              }`} />
              <span className={`text-[9px] mt-1 ${
                i === currentIdx ? "text-amber-700 font-semibold"
                : i < currentIdx ? "text-emerald-600"
                : "text-gray-400"
              }`}>{stageLabel[s]}</span>
            </div>
          ))}
        </div>

        {/* AI Screening */}
        {deal.screeningResult && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-purple-900">AI Screening Summary</div>
              <div className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                Score: {deal.screeningResult.score}/100
              </div>
            </div>
            {deal.aiFlag && <div className="text-xs text-purple-900">{deal.aiFlag}</div>}
          </div>
        )}

        {/* DD Workstreams */}
        <div className="text-xs font-semibold text-gray-700 mb-2">DD Workstreams</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {deal.workstreams?.map((w: { id: string; name: string; status: string; completedTasks: number; totalTasks: number; hasAI: boolean }) => (
            <div key={w.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  w.status === "COMPLETE" ? "bg-emerald-400"
                  : w.status === "IN_PROGRESS" ? "bg-amber-400"
                  : "bg-gray-300"
                }`} />
                <span className="text-xs font-medium">
                  {w.name} {w.hasAI && <span className="text-purple-500">AI</span>}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">{w.completedTasks}/{w.totalTasks}</span>
            </div>
          ))}
        </div>

        {/* IC Vote (for IC_REVIEW stage) */}
        {deal.stage === "IC_REVIEW" && deal.icProcess && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="text-sm font-semibold text-blue-900 mb-2">Slack IC Vote</div>
            <div className="text-xs text-blue-800">
              IC vote posted to #investment-committee. Awaiting reactions. Deadline: {deal.icProcess.deadline ? new Date(deal.icProcess.deadline).toLocaleDateString() : "TBD"}
            </div>
            {deal.icProcess.votes?.length > 0 && (
              <div className="mt-2 flex gap-2">
                {deal.icProcess.votes.map((v: { id: string; user: { initials: string }; vote: string }) => (
                  <span key={v.id} className="text-xs bg-white border border-blue-200 px-2 py-1 rounded-lg">
                    {v.user?.initials || "?"}: {v.vote}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
