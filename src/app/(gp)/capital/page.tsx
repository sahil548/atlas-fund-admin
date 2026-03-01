"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CapitalActivityPage() {
  const { data: calls, isLoading: cLoading } = useSWR("/api/capital-calls", fetcher);
  const { data: distributions, isLoading: dLoading } = useSWR("/api/distributions", fetcher);
  if (cLoading || dLoading || !calls || !distributions) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Capital Calls</h3>
          <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ New Call</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Call #", "Entity", "Date", "Due", "Amount", "Purpose", "Status", "Funded"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((c: { id: string; callNumber: string; entity: { name: string }; callDate: string; dueDate: string; amount: number; purpose: string; status: string; fundedPercent: number }) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-indigo-700">{c.callNumber}</td>
                <td className="px-3 py-2.5">{c.entity?.name}</td>
                <td className="px-3 py-2.5">{new Date(c.callDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5">{new Date(c.dueDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                <td className="px-3 py-2.5 text-gray-600">{c.purpose}</td>
                <td className="px-3 py-2.5"><Badge color={c.status === "FUNDED" ? "green" : c.status === "ISSUED" ? "yellow" : "gray"}>{c.status}</Badge></td>
                <td className="px-3 py-2.5"><ProgressBar percent={c.fundedPercent} colorClass="bg-amber-500" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Distributions — Income & Principal Decomposition</h3>
          <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ New Distribution</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Entity", "Date", "Source", "Gross", "Return of Capital", "Income", "LT Gains", "Carry", "Net to LPs"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {distributions.map((d: { id: string; entity: { name: string }; distributionDate: string; source: string; grossAmount: number; returnOfCapital: number; income: number; longTermGain: number; carriedInterest: number; netToLPs: number }) => (
              <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium">{d.entity?.name}</td>
                <td className="px-3 py-2.5">{new Date(d.distributionDate).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-gray-600">{d.source}</td>
                <td className="px-3 py-2.5 font-medium">{fmt(d.grossAmount)}</td>
                <td className="px-3 py-2.5 text-blue-700">{fmt(d.returnOfCapital)}</td>
                <td className="px-3 py-2.5 text-emerald-700">{fmt(d.income)}</td>
                <td className="px-3 py-2.5 text-purple-700">{fmt(d.longTermGain)}</td>
                <td className="px-3 py-2.5 text-red-600">{fmt(d.carriedInterest)}</td>
                <td className="px-3 py-2.5 font-semibold">{fmt(d.netToLPs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t flex gap-4">
          {[["bg-blue-500", "Return of Capital"], ["bg-emerald-500", "Income"], ["bg-purple-500", "LT Gains"], ["bg-red-500", "Carry"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${c}`} />
              <span className="text-xs text-gray-600">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
