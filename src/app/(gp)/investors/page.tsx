"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { CreateInvestorForm } from "@/components/features/investors/create-investor-form";
import { EditInvestorForm } from "@/components/features/investors/edit-investor-form";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type InvestorRow = { id: string; name: string; investorType: string; totalCommitted: number; commitments: { entity: { name: string } }[]; kycStatus: string; advisoryBoard: boolean; contactPreference: string };

export default function InvestorsPage() {
  const { firmId } = useFirm();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorRow | null>(null);
  const { data: investors, isLoading } = useSWR(`/api/investors?firmId=${firmId}`, fetcher);
  const { data: sideLetters } = useSWR("/api/side-letters", fetcher);
  if (isLoading || !investors) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold">Investors ({investors.length})</h3>
          <Button onClick={() => setShowCreate(true)}>+ Add Investor</Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Investor", "Type", "Total Committed", "Entities", "KYC", "Advisory", "Pref. Contact", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {investors.map((inv: InvestorRow) => (
              <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                <td className="px-3 py-2.5 font-medium"><Link href={`/investors/${inv.id}`} className="text-indigo-700 hover:underline font-medium">{inv.name}</Link></td>
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
                <td className="px-3 py-2.5">
                  <button
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                    onClick={(e) => { e.stopPropagation(); setEditingInvestor(inv); setShowEdit(true); }}
                  >
                    Edit
                  </button>
                </td>
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

      <CreateInvestorForm open={showCreate} onClose={() => setShowCreate(false)} />
      {editingInvestor && (
        <EditInvestorForm
          open={showEdit}
          onClose={() => { setShowEdit(false); setEditingInvestor(null); }}
          investor={editingInvestor}
        />
      )}
    </div>
  );
}
