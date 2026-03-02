"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "capital-account", label: "Capital Account" },
  { key: "commitments", label: "Commitments" },
  { key: "activity", label: "Activity" },
  { key: "documents", label: "Documents" },
];

export default function InvestorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: investor, isLoading } = useSWR(id ? `/api/investors/${id}` : null, fetcher);
  const { data: capitalAccount } = useSWR(id ? `/api/investors/${id}/capital-account` : null, fetcher);
  const { data: docs } = useSWR(id ? `/api/investors/${id}/documents` : null, fetcher);
  const [tab, setTab] = useState("overview");

  if (isLoading || !investor) return <div className="text-sm text-gray-400">Loading...</div>;

  const inv = investor;
  const totalCommitted = (inv.commitments || []).reduce((s: number, c: { amount: number }) => s + c.amount, 0);
  const totalCalled = (inv.commitments || []).reduce((s: number, c: { calledAmount: number }) => s + c.calledAmount, 0);
  const totalDistributed = (inv.distributionLineItems || []).reduce((s: number, d: { netAmount: number }) => s + d.netAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href="/investors" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">← All Investors</Link>
        <h2 className="text-lg font-bold">{inv.name}</h2>
        <div className="flex gap-2 mt-1">
          <Badge color="blue">{inv.investorType}</Badge>
          <Badge color={inv.kycStatus === "Verified" ? "green" : "red"}>{inv.kycStatus}</Badge>
          {inv.advisoryBoard && <Badge color="purple">Advisory Board</Badge>}
          <Badge color="gray">Contact: {inv.contactPreference}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${tab === t.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Committed", value: fmt(totalCommitted) },
              { label: "Total Called", value: fmt(totalCalled) },
              { label: "Total Distributed", value: fmt(totalDistributed) },
              { label: "Uncalled", value: fmt(totalCommitted - totalCalled) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
                <div className="text-lg font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Commitments by Entity</h3>
            <div className="space-y-2">
              {(inv.commitments || []).map((c: { id: string; amount: number; calledAmount: number; entity: { id: string; name: string } }) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <Link href={`/entities/${c.entity.id}`} className="text-sm text-indigo-700 hover:underline font-medium">{c.entity.name}</Link>
                  <div className="text-sm">
                    <span className="font-medium">{fmt(c.amount)}</span>
                    <span className="text-gray-400 ml-2">({fmt(c.calledAmount)} called)</span>
                  </div>
                </div>
              ))}
              {(!inv.commitments || inv.commitments.length === 0) && <div className="text-sm text-gray-400 text-center py-4">No commitments.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Capital Account Tab */}
      {tab === "capital-account" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Capital Account Statement</h3>
          {capitalAccount && capitalAccount.length > 0 ? (
            <div className="space-y-1 text-sm font-mono">
              {(() => {
                const latest = capitalAccount[0];
                const rows = [
                  { l: "Beginning Balance", v: fmt(latest.beginningBalance), b: true },
                  { l: "Contributions", v: fmt(latest.contributions) },
                  { l: "Income Allocations", v: fmt(latest.incomeAllocations), g: true },
                  { l: "Capital Allocations", v: fmt(latest.capitalAllocations), c: "text-indigo-700" },
                  { l: "Distributions", v: `(${fmt(Math.abs(latest.distributions))})`, d: true },
                  { l: "Fees & Expenses", v: `(${fmt(Math.abs(latest.fees))})`, d: true },
                  { l: "Ending Balance", v: fmt(latest.endingBalance), b: true, h: "bg-indigo-50 text-indigo-900" },
                ];
                return rows.map((r, i) => (
                  <div key={i} className={`flex justify-between py-1 px-3 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-2 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""} ${r.c || ""}`}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ));
              })()}
              <div className="mt-2 text-right">
                <Badge color="indigo">Computed from ledger</Badge>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">No capital account data available.</div>
          )}
        </div>
      )}

      {/* Commitments Tab */}
      {tab === "commitments" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Commitments</h3></div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Entity", "Committed", "Called", "Uncalled", "% Called"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(inv.commitments || []).map((c: { id: string; amount: number; calledAmount: number; entity: { id: string; name: string } }) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Link href={`/entities/${c.entity.id}`} className="text-indigo-700 hover:underline font-medium">{c.entity.name}</Link></td>
                    <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                    <td className="px-3 py-2.5">{c.amount > 0 ? `${((c.calledAmount / c.amount) * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inv.sideLetters && inv.sideLetters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Side Letters</h3></div>
              <div className="divide-y divide-gray-50">
                {inv.sideLetters.map((s: { id: string; terms: string; entity: { name: string } }) => (
                  <div key={s.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge color="purple">Side Letter</Badge>
                      <span className="text-xs text-gray-500">{s.entity.name}</span>
                    </div>
                    <div className="text-sm mt-1">{s.terms}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Capital Calls</h3></div>
            <div className="divide-y divide-gray-50">
              {(inv.capitalCallLineItems || []).map((item: { id: string; amount: number; status: string; capitalCall: { callNumber: string; callDate: string; dueDate: string; purpose?: string; status: string; entity: { name: string } } }) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.capitalCall.callNumber}</span>
                      <Badge color={item.capitalCall.status === "FUNDED" ? "green" : item.capitalCall.status === "ISSUED" ? "amber" : "gray"}>{item.capitalCall.status}</Badge>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.amount)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.capitalCall.entity.name} · Due {new Date(item.capitalCall.dueDate).toLocaleDateString()}
                    {item.capitalCall.purpose && ` · ${item.capitalCall.purpose}`}
                  </div>
                </div>
              ))}
              {(!inv.capitalCallLineItems || inv.capitalCallLineItems.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No capital calls.</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Distributions</h3></div>
            <div className="divide-y divide-gray-50">
              {(inv.distributionLineItems || []).map((item: { id: string; netAmount: number; income: number; returnOfCapital: number; distribution: { distributionDate: string; source?: string; entity: { name: string } } }) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.distribution.source || "Distribution"}</span>
                      <Badge color="green">Received</Badge>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.netAmount)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.distribution.entity.name} · {new Date(item.distribution.distributionDate).toLocaleDateString()}
                    {item.income > 0 && <span className="text-emerald-600 ml-2">Income: {fmt(item.income)}</span>}
                    {item.returnOfCapital > 0 && <span className="text-blue-600 ml-2">ROC: {fmt(item.returnOfCapital)}</span>}
                  </div>
                </div>
              ))}
              {(!inv.distributionLineItems || inv.distributionLineItems.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No distributions.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Documents</h3></div>
          <div className="divide-y divide-gray-50">
            {(docs || []).map((d: { id: string; name: string; category: string; uploadDate: string }) => (
              <div key={d.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Badge color="indigo">PDF</Badge>
                  <span className="text-sm font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="gray">{d.category}</Badge>
                  <span className="text-xs text-gray-400">{new Date(d.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!docs || docs.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No documents.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
