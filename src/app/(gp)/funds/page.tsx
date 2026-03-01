"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt, pct } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FundsPage() {
  const { data: entities, isLoading } = useSWR("/api/entities", fetcher);
  if (isLoading || !entities) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">All Entities ({entities.length})</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Entity", "Type", "Vintage", "Committed", "Called", "Distributed", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((e: { id: string; name: string; entityType: string; vintageYear: number; totalCommitments: number; status: string; accountingConnection?: { provider: string; syncStatus: string } }) => (
              <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-indigo-700">{e.name}</td>
                <td className="px-3 py-2.5">
                  <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>
                    {e.entityType.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">{e.vintageYear}</td>
                <td className="px-3 py-2.5">{fmt(e.totalCommitments || 0)}</td>
                <td className="px-3 py-2.5">—</td>
                <td className="px-3 py-2.5">—</td>
                <td className="px-3 py-2.5">
                  <Badge color={e.accountingConnection?.syncStatus === "CONNECTED" ? "green" : e.accountingConnection?.syncStatus === "ERROR" ? "red" : "gray"}>
                    {e.accountingConnection?.syncStatus || "—"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Two-Layer NAV */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Two-Layer NAV — Atlas Fund I, LLC</h3>
          <div className="flex gap-2">
            <Badge color="green">QBO Synced</Badge>
            <Badge color="indigo">Valuations Current</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Layer 1: Cost Basis (from QBO)</div>
            <div className="space-y-1 text-sm font-mono">
              {[
                { l: "Cash & equivalents", v: "$32,100,000" },
                { l: "Investments at cost", v: "$115,000,000" },
                { l: "Less: Depreciation", v: "($2,200,000)", d: true },
                { l: "Accrued interest", v: "$380,000" },
                { l: "Other assets", v: "$420,000" },
                { l: "Total Assets", v: "$145,700,000", b: true },
                { l: "AP + Accrued fees", v: "($2,700,000)", d: true },
                { l: "Cost Basis NAV", v: "$143,000,000", b: true, h: "bg-gray-100" },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""}`}>
                  <span>{r.l}</span><span>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Layer 2: Fair Value Overlay (Atlas)</div>
            <div className="space-y-1 text-sm font-mono">
              {[
                { l: "NovaTech AI", v: "+$44.6M", g: true, n: "Multiples" },
                { l: "Helix Therapeutics", v: "+$24.0M", g: true, n: "Last round" },
                { l: "123 Industrial Blvd", v: "+$6.5M", g: true, n: "Appraisal" },
                { l: "Total Unrealized", v: "+$75.1M", b: true, g: true },
                { l: "", v: "" },
                { l: "Cost Basis NAV", v: "$143.0M" },
                { l: "+ Unrealized", v: "+$75.1M", g: true },
                { l: "- Accrued Carry", v: "($4.3M)", d: true },
                { l: "Economic NAV", v: "$213.8M", b: true, h: "bg-indigo-50 text-indigo-900" },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""}`}>
                  <span>{r.l}{r.n && <span className="text-gray-400 text-xs ml-1 font-normal">({r.n})</span>}</span>
                  <span>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          123 Industrial Blvd appraisal is 8 months old. Next appraisal due June 2025.
        </div>
      </div>
    </div>
  );
}
