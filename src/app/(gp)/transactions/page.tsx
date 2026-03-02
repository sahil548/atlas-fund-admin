"use client";

import { useState } from "react";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { CreateCapitalCallForm } from "@/components/features/capital/create-capital-call-form";
import { CreateDistributionForm } from "@/components/features/capital/create-distribution-form";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Entity { id: string; name: string }
interface CapitalCall {
  id: string; entityId: string; entity: Entity; callNumber: string;
  callDate: string; dueDate: string; amount: number; purpose: string | null;
  status: string; fundedPercent: number; lineItems: unknown[];
}
interface Distribution {
  id: string; entityId: string; entity: Entity; distributionDate: string;
  grossAmount: number; source: string | null; returnOfCapital: number;
  income: number; longTermGain: number; shortTermGain: number;
  carriedInterest: number; netToLPs: number; status: string;
}
interface WaterfallTier {
  id: string; templateId: string; tierOrder: number; name: string;
  description: string | null; splitLP: number | null; splitGP: number | null;
  hurdleRate: number | null; appliesTo: string | null;
}
interface WaterfallTemplate {
  id: string; name: string; description: string | null;
  tiers: WaterfallTier[]; entities: Entity[];
}

const CC_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray", ISSUED: "blue", FUNDED: "green", PARTIALLY_FUNDED: "yellow", OVERDUE: "red",
};
const DIST_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray", APPROVED: "blue", PAID: "green",
};

type Tab = "calls" | "distributions" | "waterfall";

export default function TransactionsPage() {
  const { firmId } = useFirm();
  const { data: capitalCalls = [] } = useSWR<CapitalCall[]>("/api/capital-calls", fetcher);
  const { data: distributions = [] } = useSWR<Distribution[]>("/api/distributions", fetcher);
  const { data: templates = [] } = useSWR<WaterfallTemplate[]>("/api/waterfall-templates", fetcher);
  const { data: entities = [] } = useSWR<Entity[]>(`/api/entities?firmId=${firmId}`, fetcher);

  const [tab, setTab] = useState<Tab>("calls");
  const [entityFilter, setEntityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateCC, setShowCreateCC] = useState(false);
  const [showCreateDist, setShowCreateDist] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [addTierFor, setAddTierFor] = useState<{ templateId: string; nextOrder: number } | null>(null);
  const [editTier, setEditTier] = useState<{ templateId: string; tier: WaterfallTier } | null>(null);

  // Stats
  const totalCalled = capitalCalls.reduce((s, c) => s + c.amount, 0);
  const totalDistributed = distributions.reduce((s, d) => s + d.grossAmount, 0);
  const netInvested = totalCalled - totalDistributed;
  const pendingCalls = capitalCalls.filter((c) => c.status === "DRAFT" || c.status === "ISSUED").length;

  // Filtered data
  const filteredCalls = capitalCalls.filter((c) => {
    if (entityFilter && c.entityId !== entityFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });
  const filteredDists = distributions.filter((d) => {
    if (entityFilter && d.entityId !== entityFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "calls", label: "Capital Calls", count: capitalCalls.length },
    { key: "distributions", label: "Distributions", count: distributions.length },
    { key: "waterfall", label: "Waterfall Templates", count: templates.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Transactions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateCC(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">+ Capital Call</button>
          <button onClick={() => setShowCreateDist(true)} className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">+ Distribution</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Called" value={fmt(totalCalled)} small />
        <StatCard label="Total Distributed" value={fmt(totalDistributed)} small />
        <StatCard label="Net Invested" value={fmt(netInvested)} small />
        <StatCard label="Pending Calls" value={String(pendingCalls)} sub={pendingCalls > 0 ? "DRAFT + ISSUED" : "All funded"} small />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setEntityFilter(""); setStatusFilter(""); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label} <span className="text-gray-400 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Capital Calls Tab */}
      {tab === "calls" && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Filters */}
          <div className="flex gap-2 p-3 border-b border-gray-100">
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Entities</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Statuses</option>
              {["DRAFT", "ISSUED", "FUNDED", "PARTIALLY_FUNDED", "OVERDUE"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Call #</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Entity</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Call Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Due Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Funded</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map((c) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{c.callNumber}</td>
                  <td className="px-3 py-2 text-gray-600">{c.entity?.name}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(c.amount)}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(c.callDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(c.dueDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2"><Badge color={CC_STATUS_COLORS[c.status] || "gray"}>{c.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${c.fundedPercent}%` }} />
                      </div>
                      <span className="text-gray-500">{c.fundedPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCalls.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No capital calls found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Distributions Tab */}
      {tab === "distributions" && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Filters */}
          <div className="flex gap-2 p-3 border-b border-gray-100">
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Entities</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Statuses</option>
              {["DRAFT", "APPROVED", "PAID"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Entity</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Date</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Gross</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Source</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">ROC</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Income</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">LT Gain</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Carry</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Net to LPs</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDists.map((d) => (
                  <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{d.entity?.name}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(d.distributionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(d.grossAmount)}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{d.source || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{d.returnOfCapital ? fmt(d.returnOfCapital) : "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{d.income ? fmt(d.income) : "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{d.longTermGain ? fmt(d.longTermGain) : "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{d.carriedInterest ? fmt(d.carriedInterest) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmt(d.netToLPs)}</td>
                    <td className="px-3 py-2"><Badge color={DIST_STATUS_COLORS[d.status] || "gray"}>{d.status}</Badge></td>
                  </tr>
                ))}
                {filteredDists.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">No distributions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waterfall Templates Tab */}
      {tab === "waterfall" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateTemplate(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">+ New Template</button>
          </div>
          {templates.map((t) => {
            const isExpanded = expandedTemplate === t.id;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge color="indigo">{t.tiers.length} tiers</Badge>
                      {t.entities.map((e) => <Badge key={e.id} color="blue">{e.name}</Badge>)}
                    </div>
                  </div>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-2">
                    {t.tiers
                      .sort((a, b) => a.tierOrder - b.tierOrder)
                      .map((tier) => (
                        <div key={tier.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {tier.tierOrder}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900">{tier.name}</div>
                            {tier.description && <div className="text-[10px] text-gray-500 truncate">{tier.description}</div>}
                          </div>
                          {/* LP / GP Split Bar */}
                          <div className="flex items-center gap-2 w-40">
                            <div className="flex-1 h-3 bg-gray-200 rounded-full flex overflow-hidden">
                              {tier.splitLP != null && <div className="bg-blue-500 h-full" style={{ width: `${tier.splitLP}%` }} />}
                              {tier.splitGP != null && <div className="bg-orange-400 h-full" style={{ width: `${tier.splitGP}%` }} />}
                            </div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                              {tier.splitLP ?? 0}/{tier.splitGP ?? 0}
                            </span>
                          </div>
                          {tier.hurdleRate != null && (
                            <Badge color="yellow">{tier.hurdleRate}% hurdle</Badge>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditTier({ templateId: t.id, tier }); }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    <button
                      onClick={() => setAddTierFor({ templateId: t.id, nextOrder: t.tiers.length + 1 })}
                      className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      + Add Tier
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {templates.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              No waterfall templates found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateCapitalCallForm
        open={showCreateCC}
        onClose={() => setShowCreateCC(false)}
        entities={entities}
      />
      <CreateDistributionForm
        open={showCreateDist}
        onClose={() => setShowCreateDist(false)}
        entities={entities}
      />
      <CreateTemplateForm
        open={showCreateTemplate}
        onClose={() => setShowCreateTemplate(false)}
      />
      {addTierFor && (
        <AddTierForm
          open={true}
          onClose={() => setAddTierFor(null)}
          templateId={addTierFor.templateId}
          nextOrder={addTierFor.nextOrder}
        />
      )}
      {editTier && (
        <EditTierForm
          open={true}
          onClose={() => setEditTier(null)}
          templateId={editTier.templateId}
          tier={{
            id: editTier.tier.id,
            name: editTier.tier.name,
            description: editTier.tier.description ?? undefined,
            splitLP: editTier.tier.splitLP ?? undefined,
            splitGP: editTier.tier.splitGP ?? undefined,
            hurdleRate: editTier.tier.hurdleRate ?? undefined,
          }}
        />
      )}
    </div>
  );
}
