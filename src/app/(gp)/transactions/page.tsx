"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { CreateCapitalCallForm } from "@/components/features/capital/create-capital-call-form";
import { CreateDistributionForm } from "@/components/features/capital/create-distribution-form";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";
import { WaterfallPreviewPanel } from "@/components/features/waterfall/waterfall-preview-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fmt, formatDate, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ExportButton } from "@/components/ui/export-button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeftRight } from "lucide-react";
import { isOverdue } from "@/lib/computations/overdue-detection";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Entity { id: string; name: string }
interface CapitalCallLineItemSummary { status: string; }
interface CapitalCall {
  id: string; entityId: string; entity: Entity; callNumber: string;
  callDate: string; dueDate: string; amount: number; purpose: string | null;
  status: string; fundedPercent: number; lineItems: CapitalCallLineItemSummary[];
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
  managementFeeRate: number | null; feeBasis: string | null;
  carryPercent: number | null; prefReturnCompounding: string | null;
}
interface PerInvestorBreakdown {
  investorId: string; investorName: string; proRataShare: number; lpAllocation: number;
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
  const router = useRouter();
  const toast = useToast();
  const { data: capitalCalls = [], isLoading: callsLoading } = useSWR<CapitalCall[]>("/api/capital-calls", fetcher);
  const { data: distributions = [], isLoading: distsLoading } = useSWR<Distribution[]>("/api/distributions", fetcher);
  const { data: templates = [], isLoading: templatesLoading } = useSWR<WaterfallTemplate[]>("/api/waterfall-templates", fetcher);
  const { data: entitiesRaw } = useSWR(
    firmId ? `/api/entities?firmId=${firmId}` : null,
    fetcher,
  );
  const entities: Entity[] = Array.isArray(entitiesRaw) ? entitiesRaw : Array.isArray(entitiesRaw?.data) ? entitiesRaw.data : [];

  const [tab, setTab] = useState<Tab>("calls");
  const [entityFilter, setEntityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateCC, setShowCreateCC] = useState(false);
  const [showCreateDist, setShowCreateDist] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [addTierFor, setAddTierFor] = useState<{ templateId: string; nextOrder: number } | null>(null);
  const [editTier, setEditTier] = useState<{ templateId: string; tier: WaterfallTier } | null>(null);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null); // templateId

  // Waterfall calculation
  const [showCalcModal, setShowCalcModal] = useState<string | null>(null); // templateId
  const [calcForm, setCalcForm] = useState({ entityId: "", distributableAmount: "" });
  const [calcResults, setCalcResults] = useState<Record<string, any>>({}); // templateId -> results
  const [calcLoading, setCalcLoading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null); // for scenario preview panel

  // Edit/delete template state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDesc, setEditTemplateDesc] = useState("");
  const [editTemplateSaving, setEditTemplateSaving] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<WaterfallTemplate | null>(null);
  const [deleteTemplateLoading, setDeleteTemplateLoading] = useState(false);

  function startEditTemplate(t: WaterfallTemplate) {
    setEditingTemplateId(t.id);
    setEditTemplateName(t.name);
    setEditTemplateDesc(t.description || "");
  }

  async function handleSaveTemplate() {
    if (!editingTemplateId) return;
    setEditTemplateSaving(true);
    try {
      const res = await fetch(`/api/waterfall-templates/${editingTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTemplateName, description: editTemplateDesc || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to update");
        return;
      }
      toast.success("Template updated");
      mutate("/api/waterfall-templates");
      setEditingTemplateId(null);
    } finally {
      setEditTemplateSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateTarget) return;
    setDeleteTemplateLoading(true);
    try {
      const res = await fetch(`/api/waterfall-templates/${deleteTemplateTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to delete");
        return;
      }
      toast.success("Template deleted");
      mutate("/api/waterfall-templates");
      // Also revalidate any linked entities
      for (const ent of deleteTemplateTarget.entities) {
        mutate(`/api/entities/${ent.id}`);
      }
    } finally {
      setDeleteTemplateLoading(false);
      setDeleteTemplateTarget(null);
    }
  }

  async function handleCalculateWaterfall(templateId: string) {
    if (!calcForm.entityId || !calcForm.distributableAmount) return;
    setCalcLoading(true);
    try {
      const res = await fetch(`/api/waterfall-templates/${templateId}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: calcForm.entityId,
          distributableAmount: Number(calcForm.distributableAmount),
          saveResults: true, // explicit save
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setCalcResults((prev) => ({ ...prev, [templateId]: data }));
      setShowCalcModal(null);
      setCalcForm({ entityId: "", distributableAmount: "" });
    } catch {
      toast.error?.("Waterfall calculation failed");
    }
    setCalcLoading(false);
  }

  const hasFilters = !!(entityFilter || statusFilter);
  const handleClearFilters = () => { setEntityFilter(""); setStatusFilter(""); };

  // Stats
  const totalCalled = capitalCalls.reduce((s, c) => s + c.amount, 0);
  const totalDistributed = distributions.reduce((s, d) => s + d.grossAmount, 0);
  const netInvested = totalCalled - totalDistributed;
  const pendingCalls = capitalCalls.filter((c) => c.status === "DRAFT" || c.status === "ISSUED").length;
  const overdueCount = capitalCalls.filter(isOverdue).length;

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
      <PageHeader
        title="Capital Activity"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCreateCC(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">+ Capital Call</button>
            <button onClick={() => setShowCreateDist(true)} className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800">+ Distribution</button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total Called" value={fmt(totalCalled)} small />
        <StatCard label="Total Distributed" value={fmt(totalDistributed)} small />
        <StatCard label="Net Invested" value={fmt(netInvested)} small />
        <StatCard label="Pending Calls" value={String(pendingCalls)} sub={pendingCalls > 0 ? "DRAFT + ISSUED" : "All funded"} small />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          sub={overdueCount > 0 ? "Past due date" : "None"}
          small
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setEntityFilter(""); setStatusFilter(""); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label} <span className="text-gray-400 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Capital Calls Tab */}
      {tab === "calls" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Filters + Export */}
          <div className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Entities</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Statuses</option>
              {["DRAFT", "ISSUED", "FUNDED", "PARTIALLY_FUNDED", "OVERDUE"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <ExportButton
              data={filteredCalls.map((c) => ({
                id: c.id,
                callNumber: c.callNumber,
                entity: c.entity?.name ?? "",
                amount: c.amount,
                callDate: formatDate(c.callDate),
                dueDate: formatDate(c.dueDate),
                status: c.status,
                fundedPercent: c.fundedPercent,
              }))}
              fileName="CapitalCalls_Export"
            />
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
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
              {callsLoading && capitalCalls.length === 0 ? (
                <TableSkeleton columns={7} />
              ) : filteredCalls.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={<ArrowLeftRight className="h-10 w-10" />}
                    title={hasFilters ? "No results match your filters" : "No capital calls yet"}
                    description={!hasFilters ? "Issue your first capital call to get started" : undefined}
                    action={!hasFilters ? { label: "+ Capital Call", onClick: () => setShowCreateCC(true) } : undefined}
                    filtered={hasFilters}
                    onClearFilters={hasFilters ? handleClearFilters : undefined}
                  />
                </td></tr>
              ) : (
                filteredCalls.map((c) => {
                  const overdue = isOverdue(c);
                  const funded = c.lineItems.filter((li) => li.status === "Funded").length;
                  const total = c.lineItems.length;
                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        "border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer",
                        overdue && "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                      )}
                      onClick={() => router.push(`/transactions/capital-calls/${c.id}`)}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{c.callNumber}</td>
                      <td className="px-3 py-2 text-gray-600">{c.entity?.name}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(c.amount)}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(c.callDate)}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(c.dueDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge color={CC_STATUS_COLORS[c.status] || "gray"}>{c.status.replace(/_/g, " ")}</Badge>
                          {overdue && c.status !== "OVERDUE" && (
                            <Badge color="red">OVERDUE</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {total > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                            {funded}/{total} funded
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Distributions Tab */}
      {tab === "distributions" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Filters + Export */}
          <div className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Entities</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Statuses</option>
              {["DRAFT", "APPROVED", "PAID"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ExportButton
              data={filteredDists.map((d) => ({
                id: d.id,
                entity: d.entity?.name ?? "",
                distributionDate: formatDate(d.distributionDate),
                grossAmount: d.grossAmount,
                source: d.source ?? "",
                returnOfCapital: d.returnOfCapital,
                income: d.income,
                longTermGain: d.longTermGain,
                shortTermGain: d.shortTermGain,
                carriedInterest: d.carriedInterest,
                netToLPs: d.netToLPs,
                status: d.status,
              }))}
              fileName="Distributions_Export"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
                {distsLoading && distributions.length === 0 ? (
                  <TableSkeleton columns={10} />
                ) : filteredDists.length === 0 ? (
                  <tr><td colSpan={10}>
                    <EmptyState
                      icon={<ArrowLeftRight className="h-10 w-10" />}
                      title={hasFilters ? "No results match your filters" : "No distributions yet"}
                      description={!hasFilters ? "Record your first distribution to get started" : undefined}
                      action={!hasFilters ? { label: "+ Distribution", onClick: () => setShowCreateDist(true) } : undefined}
                      filtered={hasFilters}
                      onClearFilters={hasFilters ? handleClearFilters : undefined}
                    />
                  </td></tr>
                ) : (
                  filteredDists.map((d) => (
                    <tr
                      key={d.id}
                      className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/transactions/distributions/${d.id}`)}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{d.entity?.name}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(d.distributionDate)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(d.grossAmount)}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{d.source || "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{d.returnOfCapital ? fmt(d.returnOfCapital) : "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{d.income ? fmt(d.income) : "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{d.longTermGain ? fmt(d.longTermGain) : "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{d.carriedInterest ? fmt(d.carriedInterest) : "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmt(d.netToLPs)}</td>
                      <td className="px-3 py-2"><Badge color={DIST_STATUS_COLORS[d.status] || "gray"}>{d.status}</Badge></td>
                    </tr>
                  ))
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
              <div key={t.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                    {/* Fee config summary */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {t.managementFeeRate != null && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          Mgmt: {(t.managementFeeRate * 100).toFixed(1)}%
                        </span>
                      )}
                      {t.feeBasis && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {t.feeBasis.replace(/_/g, " ")}
                        </span>
                      )}
                      {t.carryPercent != null && (
                        <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                          Carry: {(t.carryPercent * 100).toFixed(0)}%
                        </span>
                      )}
                      {t.prefReturnCompounding && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {t.prefReturnCompounding} pref
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge color="indigo">{t.tiers.length} tiers</Badge>
                      {t.entities.map((e) => <Badge key={e.id} color="blue">{e.name}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingTemplateId === t.id ? (
                      <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <input
                          value={editTemplateName}
                          onChange={(ev) => setEditTemplateName(ev.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                          onClick={handleSaveTemplate}
                          disabled={editTemplateSaving}
                          className="text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded px-2 py-1 disabled:opacity-50"
                        >
                          {editTemplateSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingTemplateId(null)}
                          className="text-[10px] font-medium text-gray-500 hover:text-gray-700 rounded px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { setEditingTemplateId(null); setDeleteTemplateTarget(t); }}
                          className="text-[10px] font-medium text-red-500 hover:text-red-700 rounded px-2 py-1 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); startEditTemplate(t); }}
                        className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 rounded px-2 py-1 hover:bg-indigo-50 border border-indigo-200"
                      >
                        Edit
                      </button>
                    )}
                    <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-2">
                    {t.tiers
                      .sort((a, b) => a.tierOrder - b.tierOrder)
                      .map((tier) => (
                        <div key={tier.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {tier.tierOrder}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{tier.name}</div>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddTierFor({ templateId: t.id, nextOrder: t.tiers.length + 1 })}
                        className="flex-1 border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                      >
                        + Add Tier
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplateId(previewTemplateId === t.id ? null : t.id);
                        }}
                        className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-50 transition-colors"
                      >
                        {previewTemplateId === t.id ? "Hide Scenarios" : "Run Scenario"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCalcModal(t.id);
                          setCalcForm({ entityId: "", distributableAmount: "" });
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Calculate &amp; Save
                      </button>
                    </div>

                    {/* Waterfall Scenario Preview Panel */}
                    {previewTemplateId === t.id && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <WaterfallPreviewPanel
                          templateId={t.id}
                          templateName={t.name}
                          entities={entities}
                          mode="standalone"
                        />
                      </div>
                    )}

                    {/* Calculation Results */}
                    {calcResults[t.id] && (
                      <div className="mt-3 bg-emerald-50 rounded-lg border border-emerald-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-emerald-900">
                            Waterfall Calculation — {calcResults[t.id].entityName}
                          </h4>
                          <button
                            onClick={() => setCalcResults((prev) => { const next = { ...prev }; delete next[t.id]; return next; })}
                            className="text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            Dismiss
                          </button>
                        </div>
                        <div className="text-[10px] text-emerald-700 mb-2">
                          Distributable: {fmt(calcResults[t.id].distributableAmount)} &middot; Contributed: {fmt(calcResults[t.id].totalContributed)} &middot; Prior Distributions: {fmt(calcResults[t.id].totalDistributedPrior)}
                        </div>

                        {/* Clawback warning */}
                        {calcResults[t.id].clawbackLiability > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[10px] text-red-700">
                            Clawback Liability: {fmt(calcResults[t.id].clawbackLiability)} — GP may owe back this amount if fund underperforms in future periods.
                          </div>
                        )}

                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-emerald-200">
                              <th className="text-left py-1.5 font-semibold text-emerald-800">Tier</th>
                              <th className="text-right py-1.5 font-semibold text-emerald-800">Allocated</th>
                              <th className="text-right py-1.5 font-semibold text-emerald-800">LP Share</th>
                              <th className="text-right py-1.5 font-semibold text-emerald-800">GP Share</th>
                              <th className="text-right py-1.5 font-semibold text-emerald-800">Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(calcResults[t.id].tiers || []).map((tier: any, i: number) => (
                              <tr key={i} className="border-b border-emerald-100">
                                <td className="py-1.5 text-gray-900 dark:text-gray-100">{tier.name}</td>
                                <td className="py-1.5 text-right font-medium">{fmt(tier.totalAllocated)}</td>
                                <td className="py-1.5 text-right text-blue-700">{fmt(tier.allocatedLP)}</td>
                                <td className="py-1.5 text-right text-orange-700">{fmt(tier.allocatedGP)}</td>
                                <td className="py-1.5 text-right text-gray-500">{fmt(tier.remaining)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-emerald-300 font-semibold">
                              <td className="py-2 text-emerald-900">Total</td>
                              <td className="py-2 text-right">{fmt(calcResults[t.id].distributableAmount)}</td>
                              <td className="py-2 text-right text-blue-800">{fmt(calcResults[t.id].totalLP || 0)}</td>
                              <td className="py-2 text-right text-orange-800">{fmt(calcResults[t.id].totalGP || 0)}</td>
                              <td className="py-2 text-right text-gray-400">—</td>
                            </tr>
                          </tfoot>
                        </table>
                        <div className="flex gap-4 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            LP: {calcResults[t.id].summary?.lpPercent?.toFixed(1) ?? (calcResults[t.id].distributableAmount > 0 ? ((calcResults[t.id].totalLP / calcResults[t.id].distributableAmount) * 100).toFixed(1) : "0.0")}%
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            GP: {calcResults[t.id].summary?.gpPercent?.toFixed(1) ?? (calcResults[t.id].distributableAmount > 0 ? ((calcResults[t.id].totalGP / calcResults[t.id].distributableAmount) * 100).toFixed(1) : "0.0")}%
                          </div>
                        </div>

                        {/* Per-Investor Breakdown (expandable) */}
                        {(calcResults[t.id].perInvestorBreakdown?.length ?? 0) > 0 && (
                          <div className="border-t border-emerald-200 pt-2">
                            <button
                              className="text-[10px] text-emerald-700 font-medium hover:text-emerald-900 flex items-center gap-1"
                              onClick={() => setExpandedBreakdown(expandedBreakdown === t.id ? null : t.id)}
                            >
                              {expandedBreakdown === t.id ? "▼" : "▶"} Per-Investor Breakdown ({calcResults[t.id].perInvestorBreakdown.length} investors)
                            </button>
                            {expandedBreakdown === t.id && (
                              <table className="w-full text-xs mt-2">
                                <thead>
                                  <tr className="border-b border-emerald-200">
                                    <th className="text-left py-1 font-semibold text-emerald-800">Investor</th>
                                    <th className="text-right py-1 font-semibold text-emerald-800">Pro-Rata</th>
                                    <th className="text-right py-1 font-semibold text-emerald-800">LP Allocation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {calcResults[t.id].perInvestorBreakdown.map((b: PerInvestorBreakdown) => (
                                    <tr key={b.investorId} className="border-b border-emerald-50">
                                      <td className="py-1 text-gray-900 dark:text-gray-100">{b.investorName}</td>
                                      <td className="py-1 text-right text-gray-500">{(b.proRataShare * 100).toFixed(1)}%</td>
                                      <td className="py-1 text-right font-medium text-blue-700">{fmt(b.lpAllocation)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {templatesLoading && templates.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <EmptyState
                icon={<ArrowLeftRight className="h-10 w-10" />}
                title="No waterfall templates yet"
                description="Create a template to define your distribution waterfall"
                action={{ label: "+ New Template", onClick: () => setShowCreateTemplate(true) }}
              />
            </div>
          ) : null}
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

      {/* Delete Template Confirmation */}
      <ConfirmDialog
        open={!!deleteTemplateTarget}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Waterfall Template"
        message={
          deleteTemplateTarget
            ? `Delete "${deleteTemplateTarget.name}" and all its tiers? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTemplateLoading}
      />

      {/* Waterfall Calculate Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCalcModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Calculate Waterfall Distribution</h3>
            <p className="text-xs text-gray-500">Select an entity and enter the distributable amount to run the waterfall calculation.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entity</label>
                <select
                  value={calcForm.entityId}
                  onChange={(e) => setCalcForm((f) => ({ ...f, entityId: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select entity…</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Distributable Amount ($)</label>
                <input
                  type="number"
                  value={calcForm.distributableAmount}
                  onChange={(e) => setCalcForm((f) => ({ ...f, distributableAmount: e.target.value }))}
                  placeholder="e.g. 5000000"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCalcModal(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCalculateWaterfall(showCalcModal)}
                disabled={calcLoading || !calcForm.entityId || !calcForm.distributableAmount}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {calcLoading ? "Calculating…" : "Calculate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
