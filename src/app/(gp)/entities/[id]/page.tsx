"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { CreateCapitalCallForm } from "@/components/features/capital/create-capital-call-form";
import { CreateDistributionForm } from "@/components/features/capital/create-distribution-form";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "nav", label: "NAV" },
  { key: "capital", label: "Capital" },
  { key: "investors", label: "Investors" },
  { key: "waterfall", label: "Waterfall" },
  { key: "meetings", label: "Meetings" },
  { key: "documents", label: "Documents" },
  { key: "fundraising", label: "Fundraising" },
  { key: "regulatory", label: "Regulatory" },
];

interface Tier { id: string; tierOrder: number; name: string; description?: string; splitLP?: number; splitGP?: number; hurdleRate?: number; appliesTo?: string }

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: entity, isLoading } = useSWR(id ? `/api/entities/${id}` : null, fetcher);
  const { data: navData } = useSWR(id ? `/api/nav/${id}` : null, fetcher);
  const [tab, setTab] = useState("overview");
  const [showCapCall, setShowCapCall] = useState(false);
  const [showDist, setShowDist] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [editTier, setEditTier] = useState<Tier | null>(null);

  if (isLoading || !entity) return <div className="text-sm text-gray-400">Loading...</div>;

  const e = entity;
  const totalCalled = (e.capitalCalls || []).reduce((s: number, c: { amount: number }) => s + c.amount, 0);
  const totalDistributed = (e.distributions || []).reduce((s: number, d: { grossAmount: number }) => s + d.grossAmount, 0);

  const methodLabel: Record<string, string> = { COMPARABLE_MULTIPLES: "Multiples", LAST_ROUND: "Last round", DCF: "DCF", APPRAISAL: "Appraisal", GP_REPORTED_NAV: "GP NAV", COST: "Cost" };
  const tierColors = ["bg-emerald-50 border-emerald-200", "bg-blue-50 border-blue-200", "bg-amber-50 border-amber-200", "bg-orange-50 border-orange-200", "bg-purple-50 border-purple-200"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/entities" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">← All Entities</Link>
          <h2 className="text-lg font-bold">{e.name}</h2>
          <div className="flex gap-2 mt-1">
            <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>{e.entityType?.replace(/_/g, " ")}</Badge>
            <Badge color={e.status === "ACTIVE" ? "green" : e.status === "WINDING_DOWN" ? "amber" : "gray"}>{e.status}</Badge>
            {e.vehicleStructure && <Badge color="gray">{e.vehicleStructure}</Badge>}
            {e.vintageYear && <Badge color="gray">{e.vintageYear}</Badge>}
          </div>
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
              { label: "Total Commitments", value: fmt(e.totalCommitments || 0) },
              { label: "Called Capital", value: fmt(totalCalled) },
              { label: "Economic NAV", value: navData ? fmt(navData.economicNAV) : "—" },
              { label: "Fund Term", value: e.fundTermYears ? `${e.fundTermYears} years` : "—" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
                <div className="text-lg font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Asset Allocations</h3></div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Asset", "Type", "Allocation %", "Cost Basis", "Fair Value"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.assetAllocations || []).map((a: { id: string; allocationPercent: number; costBasis: number; asset: { id: string; name: string; assetClass: string; fairValue: number } }) => (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Link href={`/assets/${a.asset.id}`} className="text-indigo-700 hover:underline font-medium">{a.asset.name}</Link></td>
                    <td className="px-3 py-2.5"><Badge color="blue">{a.asset.assetClass?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-3 py-2.5">{(a.allocationPercent * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2.5">{fmt(a.costBasis || 0)}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(a.asset.fairValue || 0)}</td>
                  </tr>
                ))}
                {(!e.assetAllocations || e.assetAllocations.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No asset allocations.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NAV Tab */}
      {tab === "nav" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Two-Layer NAV — {e.name}</h3>
            {e.accountingConnection && (
              <div className="flex gap-2">
                <Badge color={e.accountingConnection.syncStatus === "CONNECTED" ? "green" : "gray"}>{e.accountingConnection.provider} {e.accountingConnection.syncStatus === "CONNECTED" ? "Synced" : e.accountingConnection.syncStatus}</Badge>
              </div>
            )}
          </div>
          {navData ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Layer 1: Cost Basis (from QBO)</div>
                <div className="space-y-1 text-sm font-mono">
                  {[
                    { l: "Cash & equivalents", v: fmt(navData.layer1.cashEquivalents) },
                    { l: "Investments at cost", v: fmt(navData.layer1.investmentsAtCost) },
                    { l: "Other assets", v: fmt(navData.layer1.otherAssets) },
                    { l: "Total Assets", v: fmt(navData.layer1.totalAssets), b: true },
                    { l: "Less: Liabilities", v: `(${fmt(navData.layer1.liabilities)})`, d: true },
                    { l: "Cost Basis NAV", v: fmt(navData.layer1.costBasisNAV), b: true, h: "bg-gray-100" },
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
                  {(navData.layer2.assets || []).map((a: { assetName: string; unrealizedGain: number; valuationMethod: string | null }, i: number) => (
                    <div key={i} className="flex justify-between py-0.5 px-2 rounded text-emerald-700">
                      <span>{a.assetName}{a.valuationMethod && <span className="text-gray-400 text-xs ml-1 font-normal">({methodLabel[a.valuationMethod] ?? a.valuationMethod})</span>}</span>
                      <span>{a.unrealizedGain >= 0 ? "+" : ""}{fmt(a.unrealizedGain)}</span>
                    </div>
                  ))}
                  {[
                    { l: "Total Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, b: true, g: true },
                    { l: "", v: "" },
                    { l: "Cost Basis NAV", v: fmt(navData.costBasisNAV) },
                    { l: "+ Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, g: true },
                    { l: "- Accrued Carry", v: `(${fmt(navData.layer2.accruedCarry)})`, d: true },
                    { l: "Economic NAV", v: fmt(navData.economicNAV), b: true, h: "bg-indigo-50 text-indigo-900" },
                  ].map((r, i) => (
                    <div key={`s-${i}`} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""}`}>
                      <span>{r.l}</span><span>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-4">NAV data not available.</div>
          )}
        </div>
      )}

      {/* Capital Tab */}
      {tab === "capital" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Capital Calls ({(e.capitalCalls || []).length})</h3>
              <Button size="sm" onClick={() => setShowCapCall(true)}>+ New Call</Button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Call #", "Call Date", "Due Date", "Amount", "Purpose", "Status", "Funded %"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.capitalCalls || []).map((c: { id: string; callNumber: string; callDate: string; dueDate: string; amount: number; purpose?: string; status: string; fundedPercent: number }) => (
                  <tr key={c.id} className="border-t border-gray-50">
                    <td className="px-3 py-2.5 font-medium text-indigo-700">{c.callNumber}</td>
                    <td className="px-3 py-2.5">{new Date(c.callDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{new Date(c.dueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                    <td className="px-3 py-2.5">{c.purpose || "—"}</td>
                    <td className="px-3 py-2.5"><Badge color={c.status === "FUNDED" ? "green" : c.status === "ISSUED" ? "amber" : "gray"}>{c.status}</Badge></td>
                    <td className="px-3 py-2.5">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.fundedPercent, 100)}%` }} /></div>
                    </td>
                  </tr>
                ))}
                {(!e.capitalCalls || e.capitalCalls.length === 0) && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No capital calls.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Distributions ({(e.distributions || []).length})</h3>
              <Button size="sm" onClick={() => setShowDist(true)}>+ New Distribution</Button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Date", "Source", "Gross", "ROC", "Income", "LT Gain", "Carry", "Net to LPs"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.distributions || []).map((d: { id: string; distributionDate: string; source?: string; grossAmount: number; returnOfCapital: number; income: number; longTermGain: number; carriedInterest: number; netToLPs: number }) => (
                  <tr key={d.id} className="border-t border-gray-50">
                    <td className="px-3 py-2.5">{new Date(d.distributionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{d.source || "—"}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(d.grossAmount)}</td>
                    <td className="px-3 py-2.5 text-blue-600">{fmt(d.returnOfCapital)}</td>
                    <td className="px-3 py-2.5 text-emerald-600">{fmt(d.income)}</td>
                    <td className="px-3 py-2.5 text-purple-600">{fmt(d.longTermGain)}</td>
                    <td className="px-3 py-2.5 text-red-600">{fmt(d.carriedInterest)}</td>
                    <td className="px-3 py-2.5 font-bold">{fmt(d.netToLPs)}</td>
                  </tr>
                ))}
                {(!e.distributions || e.distributions.length === 0) && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No distributions.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investors Tab */}
      {tab === "investors" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Committed Investors ({(e.commitments || []).length})</h3></div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{["Investor", "Type", "Commitment", "Called", "Uncalled", "KYC"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(e.commitments || []).map((c: { id: string; amount: number; calledAmount: number; investor: { id: string; name: string; investorType: string; kycStatus: string } }) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5"><Link href={`/investors/${c.investor.id}`} className="text-indigo-700 hover:underline font-medium">{c.investor.name}</Link></td>
                  <td className="px-3 py-2.5"><Badge color="blue">{c.investor.investorType}</Badge></td>
                  <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                  <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                  <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                  <td className="px-3 py-2.5"><Badge color={c.investor.kycStatus === "Verified" ? "green" : "red"}>{c.investor.kycStatus}</Badge></td>
                </tr>
              ))}
              {(!e.commitments || e.commitments.length === 0) && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No committed investors.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Waterfall Tab */}
      {tab === "waterfall" && (
        <div className="space-y-4">
          {e.waterfallTemplate ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{e.waterfallTemplate.name}</h3>
                  {e.waterfallTemplate.description && <p className="text-xs text-gray-500 mt-0.5">{e.waterfallTemplate.description}</p>}
                </div>
                <Button size="sm" onClick={() => setShowAddTier(true)}>+ Tier</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(e.waterfallTemplate.tiers || []).map((t: Tier, i: number) => (
                  <div key={t.id} onClick={() => setEditTier(t)} className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm ${tierColors[i % tierColors.length]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500">TIER {t.tierOrder}</span>
                    </div>
                    <div className="text-sm font-semibold mt-1">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>}
                    <div className="mt-2 text-xs">
                      {t.splitLP != null && t.splitGP != null && <span>LP: {t.splitLP}% · GP: {t.splitGP}%</span>}
                      {t.hurdleRate != null && <span className="ml-2">Hurdle: {t.hurdleRate}%</span>}
                    </div>
                  </div>
                ))}
              </div>
              {(!e.waterfallTemplate.tiers || e.waterfallTemplate.tiers.length === 0) && <div className="text-sm text-gray-400 py-4 text-center">No tiers configured.</div>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className="text-sm text-gray-500 mb-3">No waterfall template assigned to this entity.</div>
              <Button size="sm" onClick={() => setShowTemplate(true)}>+ Create Template</Button>
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {tab === "meetings" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Meetings ({(e.meetings || []).length})</h3>
            <Button size="sm" onClick={() => setShowMeeting(true)}>+ Log Meeting</Button>
          </div>
          <div className="divide-y divide-gray-50">
            {(e.meetings || []).map((m: { id: string; title: string; meetingDate: string; meetingType?: string; source: string; hasTranscript: boolean; actionItems: number; decisions?: string[] }) => (
              <div key={m.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">{new Date(m.meetingDate).toLocaleDateString()}</span>
                    {m.meetingType && <Badge color={m.meetingType === "IC Meeting" ? "amber" : m.meetingType === "DD Session" ? "blue" : "purple"}>{m.meetingType}</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                    {m.actionItems > 0 && <Badge color="gray">{m.actionItems} items</Badge>}
                  </div>
                </div>
                <div className="text-sm font-medium mt-1">{m.title}</div>
              </div>
            ))}
            {(!e.meetings || e.meetings.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No meetings logged.</div>}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <>
        {/* E-Signature Packages */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">E-Signature Packages</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Track signature status for LPAs, side letters, and subscription agreements.</p>
            </div>
            <button
              onClick={() => alert("Send for Signature coming soon. Will integrate with DocuSign/PandaDoc.")}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
            >
              + Send for Signature
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs font-bold">DS</div>
                <div>
                  <div className="text-xs font-medium">LPA Execution</div>
                  <div className="text-[10px] text-gray-500">3 signers &bull; via DocuSign</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">COMPLETED</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">DS</div>
                <div>
                  <div className="text-xs font-medium">Side Letter — CalPERS</div>
                  <div className="text-[10px] text-gray-500">1 signer &bull; via DocuSign</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">SENT</span>
            </div>
            <div className="text-[10px] text-gray-400 text-center py-1">E-Signature integration coming soon — will connect to DocuSign or PandaDoc.</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Documents ({(e.documents || []).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {(e.documents || []).map((d: { id: string; name: string; category: string; uploadDate: string }) => (
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
            {(!e.documents || e.documents.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No documents.</div>}
          </div>
        </div>
        </>
      )}

          {/* Tab: Fundraising */}
          {tab === "fundraising" && (
            <div className="space-y-4">
              {/* Pipeline Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Target Raise</div>
                  <div className="text-lg font-bold mt-1">$300.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Hard Commits</div>
                  <div className="text-lg font-bold text-green-600 mt-1">$40.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Soft Commits</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">$125.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline</div>
                  <div className="text-lg font-bold text-amber-600 mt-1">$245.0M</div>
                </div>
              </div>

              {/* Fundraising Pipeline Kanban */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Fundraising Pipeline</h3>
                  <button
                    onClick={() => alert("Add prospect functionality coming soon.")}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                  >
                    + Add Prospect
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {/* Column: Identified / Contacted */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Identified</div>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-medium">CPP Investments</div>
                        <div className="text-[10px] text-gray-500">Pension</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">$80.0M</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-medium">Singapore GIC</div>
                        <div className="text-[10px] text-gray-500">Sovereign Wealth</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">$100.0M</div>
                      </div>
                    </div>
                  </div>
                  {/* Column: Meeting / DD */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Meeting / DD</div>
                    <div className="space-y-2">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="text-xs font-medium">Yale Endowment</div>
                        <div className="text-[10px] text-gray-500">Endowment</div>
                        <div className="text-xs font-semibold text-amber-700 mt-1">$40.0M</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">DD in progress</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="text-xs font-medium">Sequoia Heritage</div>
                        <div className="text-[10px] text-gray-500">Family Office</div>
                        <div className="text-xs font-semibold text-amber-700 mt-1">$25.0M</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">Meeting scheduled</div>
                      </div>
                    </div>
                  </div>
                  {/* Column: Term Sheet */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Term Sheet</div>
                    <div className="text-[10px] text-gray-400 text-center py-6">No prospects</div>
                  </div>
                  {/* Column: Soft Commit */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Soft Commit</div>
                    <div className="space-y-2">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="text-xs font-medium">Abu Dhabi IA</div>
                        <div className="text-[10px] text-gray-500">Sovereign Wealth</div>
                        <div className="text-xs font-semibold text-blue-700 mt-1">$75.0M</div>
                      </div>
                    </div>
                  </div>
                  {/* Column: Hard Commit */}
                  <div>
                    <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-2">Hard Commit</div>
                    <div className="space-y-2">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="text-xs font-medium">Ontario Teachers</div>
                        <div className="text-[10px] text-gray-500">Pension</div>
                        <div className="text-xs font-semibold text-green-700 mt-1">$40.0M</div>
                        <div className="text-[10px] text-green-600 mt-0.5">Committed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integration Notice */}
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="text-indigo-600 text-sm">💡</div>
                  <div>
                    <div className="text-xs font-medium text-indigo-700">Deal Closing → Vehicle Creation</div>
                    <div className="text-[10px] text-indigo-600">When a deal closes, prospects with hard commitments can be automatically converted to investors in the new entity. This integration is coming soon.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Regulatory Tab */}
      {tab === "regulatory" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Regulatory & Legal</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-xs text-gray-500">State of Formation</span><div className="font-medium">{e.stateOfFormation || "—"}</div></div>
            <div><span className="text-xs text-gray-500">EIN</span><div className="font-medium font-mono">{e.ein || "—"}</div></div>
            <div><span className="text-xs text-gray-500">Legal Counsel</span><div className="font-medium">{e.legalCounsel || "—"}</div></div>
            <div><span className="text-xs text-gray-500">Tax Preparer</span><div className="font-medium">{e.taxPreparer || "—"}</div></div>
            <div><span className="text-xs text-gray-500">Fiscal Year End</span><div className="font-medium">{e.fiscalYearEnd || "—"}</div></div>
            <div><span className="text-xs text-gray-500">Vehicle Structure</span><div className="font-medium">{e.vehicleStructure || "—"}</div></div>
            <div><span className="text-xs text-gray-500">Fund Term</span><div className="font-medium">{e.fundTermYears ? `${e.fundTermYears} years` : "—"}</div></div>
            <div><span className="text-xs text-gray-500">Extension Options</span><div className="font-medium">{e.extensionOptions || "—"}</div></div>
          </div>
          {e.regulatoryFilings && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-2">Regulatory Filings</div>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">{JSON.stringify(e.regulatoryFilings, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateCapitalCallForm open={showCapCall} onClose={() => setShowCapCall(false)} entities={[{ id: e.id, name: e.name }]} />
      <CreateDistributionForm open={showDist} onClose={() => setShowDist(false)} entities={[{ id: e.id, name: e.name }]} />
      <CreateMeetingForm open={showMeeting} onClose={() => setShowMeeting(false)} />
      <CreateTemplateForm open={showTemplate} onClose={() => setShowTemplate(false)} />
      {e.waterfallTemplate && <AddTierForm open={showAddTier} onClose={() => setShowAddTier(false)} templateId={e.waterfallTemplate.id} nextOrder={(e.waterfallTemplate.tiers?.length || 0) + 1} />}
      {editTier && e.waterfallTemplate && <EditTierForm open={!!editTier} onClose={() => setEditTier(null)} templateId={e.waterfallTemplate.id} tier={editTier} />}
    </div>
  );
}
