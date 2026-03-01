"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TC: Record<string, string> = {
  DIRECT_EQUITY: "indigo", PRIVATE_CREDIT: "orange", REAL_ESTATE_DIRECT: "green",
  FUND_LP_POSITION: "purple", CO_INVESTMENT: "blue",
};
const TL: Record<string, string> = {
  DIRECT_EQUITY: "Equity", PRIVATE_CREDIT: "Credit", REAL_ESTATE_DIRECT: "Real Estate",
  FUND_LP_POSITION: "Fund LP", CO_INVESTMENT: "Co-Invest",
};

const stages = [
  { k: "SCREENING", l: "Screening", c: "bg-gray-100" },
  { k: "DUE_DILIGENCE", l: "Due Diligence", c: "bg-blue-50" },
  { k: "IC_REVIEW", l: "IC Review", c: "bg-amber-50" },
];

export default function DealsPage() {
  const { data: deals, isLoading } = useSWR("/api/deals", fetcher);
  if (isLoading || !deals) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Kanban Pipeline */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((s) => {
          const items = deals.filter((p: { stage: string }) => p.stage === s.k);
          return (
            <div key={s.k} className={`${s.c} rounded-xl p-3 min-w-[220px] flex-1`}>
              <div className="text-xs font-semibold text-gray-700 mb-2 flex justify-between">
                {s.l} <span className="text-gray-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p: { id: string; name: string; dealType: string; sector: string; aiScore: number | null; aiFlag: string | null; targetSize: string; leadPartner: string }) => (
                  <Link key={p.id} href={`/deals/${p.id}`} className="block bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge color={TC[p.dealType]}>{TL[p.dealType]}</Badge>
                      <span className="text-[10px] text-gray-500">{p.sector}</span>
                    </div>
                    {p.aiScore && (
                      <div className="mt-2 p-2 bg-purple-50 rounded-lg">
                        <div className="text-[10px] text-purple-700 font-medium">AI Score: {p.aiScore}/100</div>
                        <div className="text-[10px] text-purple-600 mt-0.5">{p.aiFlag}</div>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                      <span>{p.targetSize}</span>
                      <span>{p.leadPartner}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Screening Engine Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">AI Screening Engine</div>
            <div className="text-xs opacity-80 mt-1">Upload documents → auto-extract metrics → flag risks → categorize DD workstreams</div>
          </div>
          <button className="text-xs bg-white text-indigo-700 px-4 py-2 rounded-lg font-semibold">+ New Deal</button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            { l: "Docs Processed", v: "47 this qtr" },
            { l: "Avg Screen Time", v: "< 3 min" },
            { l: "Deals Screened", v: "12 this qtr" },
            { l: "Pass Rate", v: "33% to DD" },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-[10px] opacity-70">{s.l}</div>
              <div className="text-sm font-semibold">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
