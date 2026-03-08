"use client";

import useSWR from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { fmt } from "@/lib/utils";
import { useInvestor } from "@/components/providers/investor-provider";
import { PerformanceCharts } from "@/components/features/lp/performance-charts";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

export default function LPDashboardPage() {
  const { investorId } = useInvestor();
  const { data, isLoading } = useSWR(
    investorId ? `/api/lp/${investorId}/dashboard` : null,
    fetcher
  );
  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
        <div className="text-sm opacity-80">Welcome back</div>
        <div className="text-xl font-semibold mt-1">{data.investor?.name}</div>
        <div className="text-sm opacity-70">{data.investor?.commitments?.length} active entity commitments</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Committed" value={fmt(data.totalCommitted)} sub={`Across ${data.investor?.commitments?.length} entities`} />
        <StatCard label="Total Called" value={fmt(data.totalCalled)} />
        <StatCard label="Distributions" value={fmt(data.totalDistributed)} sub={`Income: ${fmt(data.totalIncome)} · Principal: ${fmt(data.totalPrincipal)}`} />
        <StatCard label="Current NAV" value={fmt(data.currentNAV)} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { l: "Net IRR", v: data.irr != null ? `${(data.irr * 100).toFixed(1)}%` : "\u2014" },
          { l: "TVPI", v: data.tvpi != null ? `${data.tvpi.toFixed(2)}x` : "\u2014" },
          { l: "DPI", v: data.dpi != null ? `${data.dpi.toFixed(2)}x` : "\u2014" },
          { l: "RVPI", v: data.rvpi != null ? `${data.rvpi.toFixed(2)}x` : "\u2014" },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 uppercase">{m.l}</div>
            <div className="text-2xl font-semibold mt-1">{m.v}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">Your Commitments by Entity</h3>
        {data.investor?.commitments?.map((c: { entity: { id: string; name: string }; amount: number; calledAmount: number }) => (
          <div key={c.entity.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div className="text-sm font-medium">{c.entity.name}</div>
            <div className="flex gap-6 text-xs">
              <div className="text-right w-20">
                <div className="text-gray-500">Committed</div>
                <div className="font-medium">{fmt(c.amount)}</div>
              </div>
              <div className="text-right w-16">
                <div className="text-gray-500">Called</div>
                <div className="font-medium">{fmt(c.calledAmount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PerformanceCharts investorId={investorId} />
    </div>
  );
}
