"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InvestorsPage() {
  const { data: investors, isLoading } = useSWR("/api/investors", fetcher);
  const { data: sideLetters } = useSWR("/api/side-letters", fetcher);
  if (isLoading || !investors) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Investors ({investors.length})</h3>
          <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ Add Investor</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Investor", "Type", "Total Committed", "Entities", "KYC", "Advisory", "Pref. Contact"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {investors.map((inv: { id: string; name: string; investorType: string; totalCommitted: number; commitments: { entity: { name: string } }[]; kycStatus: string; advisoryBoard: boolean; contactPreference: string }) => (
              <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                <td className="px-3 py-2.5 font-medium text-indigo-700">{inv.name}</td>
                <td className="px-3 py-2.5"><Badge>{inv.investorType}</Badge></td>
                <td className="px-3 py-2.5 font-medium">{fmt(inv.totalCommitted)}</td>
                <td className="px-3 py-2.5">
                  {inv.commitments?.map((c) => (
                    <span key={c.entity.name} className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">{c.entity.name}</span>
                  ))}
                </td>
                <td className="px-3 py-2.5"><Badge color={inv.kycStatus === "Verified" ? "green" : "red"}>{inv.kycStatus}</Badge></td>
                <td className="px-3 py-2.5">{inv.advisoryBoard ? <Badge color="indigo">Yes</Badge> : <span className="text-gray-400">—</span>}</td>
                <td className="px-3 py-2.5"><Badge color={inv.contactPreference === "text" ? "purple" : "blue"}>{inv.contactPreference === "text" ? "Text" : "Email"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">Side Letter Tracker</h3>
        <div className="space-y-2">
          {sideLetters?.map((sl: { id: string; investor: { name: string }; entity: { name: string }; terms: string }) => (
            <div key={sl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm font-medium">{sl.investor.name} — <span className="text-indigo-600">{sl.entity.name}</span></div>
                <div className="text-xs text-gray-500 mt-0.5">{sl.terms}</div>
              </div>
              <Badge color="purple">Side Letter</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
