"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { fmt } from "@/lib/utils";
import { WaterfallPreviewPanel } from "@/components/features/waterfall/waterfall-preview-panel";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props { open: boolean; onClose: () => void; entities: { id: string; name: string }[] }

interface WaterfallTemplate {
  id: string; name: string;
  entities?: { id: string; name: string }[];
}

interface PerInvestorAllocation {
  investorId: string;
  investorName: string;
  proRataShare: number;
  lpAllocation: number;
  gpCarryAllocation: number;
  totalAllocation: number;
  overrideAmount?: string; // editable override
}

const DISTRIBUTION_TYPES = [
  { value: "INCOME", label: "Income" },
  { value: "RETURN_OF_CAPITAL", label: "Return of Capital" },
  { value: "CAPITAL_GAIN", label: "Capital Gain" },
  { value: "FINAL_LIQUIDATION", label: "Final Liquidation" },
];

export function CreateDistributionForm({ open, onClose, entities }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/distributions", { revalidateKeys: ["/api/distributions"] });
  const [form, setForm] = useState({
    entityId: "",
    distributionType: "",
    distributionDate: "",
    grossAmount: "",
    source: "",
    memo: "",
    returnOfCapital: "",
    income: "",
    longTermGain: "",
    shortTermGain: "",
    carriedInterest: "",
    netToLPs: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [waterfallLoading, setWaterfallLoading] = useState(false);
  const [perInvestorAllocations, setPerInvestorAllocations] = useState<PerInvestorAllocation[]>([]);
  const [showPerInvestor, setShowPerInvestor] = useState(false);
  const [waterfallRan, setWaterfallRan] = useState(false);
  const [showWaterfallPreview, setShowWaterfallPreview] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [waterfallDebug, setWaterfallDebug] = useState<any>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Fetch waterfall template for selected entity
  const { data: templates = [] } = useSWR<WaterfallTemplate[]>(
    form.entityId ? "/api/waterfall-templates" : null,
    fetcher
  );

  // Fetch commitments for selected entity (for manual per-investor allocation)
  const { data: commitments = [] } = useSWR<{ investorId: string; investor: { id: string; name: string }; amount: number }[]>(
    form.entityId ? `/api/commitments?entityId=${form.entityId}` : null,
    fetcher
  );

  // When entity/commitments load, pre-populate per-investor allocations (pro-rata)
  // User can then override individual amounts before submitting
  useEffect(() => {
    if (!form.entityId || commitments.length === 0 || waterfallRan) return;
    const totalCommit = commitments.reduce((s, c) => s + c.amount, 0);
    const gross = Number(form.grossAmount) || 0;
    const allocs: PerInvestorAllocation[] = commitments.map((c) => {
      const share = totalCommit > 0 ? c.amount / totalCommit : 0;
      const amt = gross * share;
      return {
        investorId: c.investorId,
        investorName: c.investor?.name || c.investorId,
        proRataShare: share,
        lpAllocation: amt,
        gpCarryAllocation: 0,
        totalAllocation: amt,
        overrideAmount: amt.toFixed(2),
      };
    });
    setPerInvestorAllocations(allocs);
    setShowPerInvestor(true);
  }, [form.entityId, commitments, waterfallRan]); // intentionally excludes grossAmount to avoid overwriting user edits

  async function handleRunWaterfall() {
    if (!form.entityId || !form.grossAmount) {
      toast.error("Select an entity and enter amount first");
      return;
    }
    if (!form.distributionType) {
      toast.error("Select a distribution type first so the correct waterfall is used");
      return;
    }
    setWaterfallLoading(true);
    try {
      // Match template to distribution type by name, prioritizing templates linked to this entity
      // 1. Try entity-linked templates first for a name match
      // 2. If no match, broaden search to ALL templates (entity may only be linked to one template
      //    but the user may have created separate templates per distribution type)
      const entityTemplates = templates.filter((t) =>
        t.entities?.some((e) => e.id === form.entityId)
      );

      const distTypeNormalized = form.distributionType.toLowerCase().replace(/_/g, " ");

      const nameMatch = (pool: WaterfallTemplate[]) =>
        pool.find((t) => t.name.toLowerCase().includes(distTypeNormalized));
      const aliasMatch = (pool: WaterfallTemplate[]) => {
        if (distTypeNormalized.includes("return of capital")) {
          return pool.find((t) => {
            const n = t.name.toLowerCase();
            return n.includes("roc") || n.includes("return") || n.includes("capital return");
          });
        }
        if (distTypeNormalized.includes("capital gain")) {
          return pool.find((t) => {
            const n = t.name.toLowerCase();
            return n.includes("gain") || n.includes("appreciation");
          });
        }
        return undefined;
      };

      // Search entity templates first, then all templates
      let template = nameMatch(entityTemplates) || aliasMatch(entityTemplates)
        || nameMatch(templates) || aliasMatch(templates);

      // Final fallback: use first entity template, then first any template
      if (!template && entityTemplates.length > 0) {
        template = entityTemplates[0];
        toast.success(`No "${form.distributionType}" waterfall found — using "${template.name}" template`);
      }
      if (!template && templates.length > 0) {
        template = templates[0];
        toast.success(`No "${form.distributionType}" waterfall found — using "${template.name}" template`);
      }
      if (!template) {
        const available = templates.map((t) => t.name).join(", ");
        toast.error(available
          ? `No waterfall matching "${form.distributionType}" found. Available: ${available}`
          : "No waterfall templates found. Create a template first."
        );
        setWaterfallLoading(false);
        return;
      }

      const res = await fetch(`/api/waterfall-templates/${template.id}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: form.entityId,
          distributableAmount: Number(form.grossAmount),
          distributionDate: form.distributionDate || undefined,
          saveResults: false,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = typeof errData.error === "string" ? errData.error : "Waterfall calculation failed";
        toast.error(msg);
        setWaterfallLoading(false);
        return;
      }
      const data = await res.json();

      // Auto-populate decomposition fields from waterfall results
      const totalGP = data.totalGP ?? 0;
      const totalLP = data.totalLP ?? 0;

      // Determine ROC amount:
      // 1. If distribution type is ROC, ALL LP allocation is return of capital
      // 2. Otherwise, look for ROC-named tiers
      const isROCDistribution = distTypeNormalized.includes("return of capital") ||
        distTypeNormalized.includes("roc");

      let roc: number;
      let income: number;
      if (isROCDistribution) {
        // Entire LP allocation is return of capital
        roc = totalLP;
        income = 0;
      } else {
        // Find ROC tiers by name or appliesTo
        const rocTierTotal = (data.tiers || [])
          .filter((t: any) => {
            const n = (t.name || "").toLowerCase();
            return n.includes("return of capital") || n.includes("roc");
          })
          .reduce((s: number, t: any) => s + (t.allocatedLP ?? 0), 0);
        roc = rocTierTotal;
        income = totalLP - roc;
      }

      set("returnOfCapital", roc.toFixed(2));
      set("income", income.toFixed(2));
      set("longTermGain", "0");
      set("shortTermGain", "0");
      set("carriedInterest", totalGP.toFixed(2));
      set("netToLPs", totalLP.toFixed(2));

      // Build per-investor allocation list (includes GP carry for GP investors)
      const breakdown: PerInvestorAllocation[] = (data.perInvestorBreakdown ?? []).map((b: any) => ({
        investorId: b.investorId,
        investorName: b.investorName,
        proRataShare: b.proRataShare,
        lpAllocation: b.lpAllocation ?? 0,
        gpCarryAllocation: b.gpCarryAllocation ?? 0,
        totalAllocation: b.totalAllocation ?? b.lpAllocation ?? 0,
        overrideAmount: (b.totalAllocation ?? b.lpAllocation ?? 0).toFixed(2),
      }));
      setPerInvestorAllocations(breakdown);
      setShowPerInvestor(breakdown.length > 0);
      setWaterfallRan(true);
      setPreviewTemplateId(template.id);
      setShowWaterfallPreview(true);
      setWaterfallDebug(data._debug ?? null);
      toast.success?.("Waterfall calculated — review decomposition below");
    } catch {
      toast.error("Waterfall calculation failed");
    }
    setWaterfallLoading(false);
  }

  function handleOverrideChange(investorId: string, value: string) {
    setPerInvestorAllocations((prev) =>
      prev.map((a) => a.investorId === investorId ? { ...a, overrideAmount: value } : a)
    );
  }

  async function handleSubmit() {
    // Always send per-investor overrides when allocations exist (manual or waterfall)
    const overrides = perInvestorAllocations.length > 0
      ? perInvestorAllocations.map((a) => {
          const amt = a.overrideAmount !== undefined && a.overrideAmount !== ""
            ? Number(a.overrideAmount)
            : a.totalAllocation;
          return {
            investorId: a.investorId,
            amount: amt,
            gpCarryAmount: amt === 0 ? 0 : a.gpCarryAllocation,
          };
        })
      : undefined;

    const payload = {
      entityId: form.entityId,
      distributionDate: form.distributionDate,
      grossAmount: Number(form.grossAmount) || 0,
      source: form.source || undefined,
      memo: form.memo || undefined,
      distributionType: form.distributionType || undefined,
      returnOfCapital: Number(form.returnOfCapital) || 0,
      income: Number(form.income) || 0,
      longTermGain: Number(form.longTermGain) || 0,
      shortTermGain: Number(form.shortTermGain) || 0,
      carriedInterest: Number(form.carriedInterest) || 0,
      netToLPs: Number(form.netToLPs) || 0,
      ...(overrides ? { perInvestorOverrides: overrides } : {}),
      ...(previewTemplateId ? { waterfallTemplateId: previewTemplateId } : {}),
    };
    if (!payload.entityId || !payload.distributionDate || !payload.grossAmount) {
      setErrors({
        entityId: !payload.entityId ? "Required" : "",
        distributionDate: !payload.distributionDate ? "Required" : "",
        grossAmount: !payload.grossAmount ? "Required" : "",
      });
      return;
    }
    try {
      await trigger(payload);
      toast.success("Distribution created");
      // Reset form
      setForm({ entityId: "", distributionType: "", distributionDate: "", grossAmount: "", source: "", memo: "", returnOfCapital: "", income: "", longTermGain: "", shortTermGain: "", carriedInterest: "", netToLPs: "" });
      setErrors({});
      setPerInvestorAllocations([]);
      setShowPerInvestor(false);
      setWaterfallRan(false);
      setShowWaterfallPreview(false);
      setPreviewTemplateId(null);
      onClose();
    } catch {
      toast.error("Failed to create distribution");
    }
  }

  const grossNum = Number(form.grossAmount) || 0;
  const totalDecomposed = (Number(form.returnOfCapital) || 0) + (Number(form.income) || 0) + (Number(form.carriedInterest) || 0);
  const decompositionDiff = Math.abs(grossNum - totalDecomposed);

  return (
    <Modal open={open} onClose={onClose} title="New Distribution" size="lg" footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={isLoading} onClick={handleSubmit}>Create Distribution</Button>
      </div>
    }>
      <div className="space-y-3">
        {/* Distribution Type */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Distribution Type">
            <Select
              value={form.distributionType}
              onChange={(e) => set("distributionType", e.target.value)}
              options={DISTRIBUTION_TYPES}
              placeholder="Select type…"
            />
          </FormField>
          <FormField label="Date" required error={errors.distributionDate}>
            <Input type="date" value={form.distributionDate} onChange={(e) => set("distributionDate", e.target.value)} error={!!errors.distributionDate} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Entity" required error={errors.entityId}>
            <Select value={form.entityId} onChange={(e) => set("entityId", e.target.value)} options={entities.map(e => ({ value: e.id, label: e.name }))} placeholder="Select entity..." />
          </FormField>
          <FormField label="Gross Amount ($)" required error={errors.grossAmount}>
            <CurrencyInput value={form.grossAmount} onChange={(v) => set("grossAmount", v)} error={!!errors.grossAmount} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Source">
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Exit — Acme Corp" />
          </FormField>
          <FormField label="Memo">
            <Input value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="Optional memo" />
          </FormField>
        </div>

        {/* Waterfall Integration */}
        {form.entityId && form.grossAmount && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-indigo-800">Waterfall Auto-Decomposition</div>
              <Button
                variant="secondary"
                loading={waterfallLoading}
                onClick={handleRunWaterfall}
              >
                {waterfallRan ? "Re-run Waterfall" : "Run Waterfall"}
              </Button>
            </div>
            {waterfallRan && (
              <p className="text-[10px] text-indigo-600">
                Decomposition auto-populated from waterfall results. You can override individual fields below.
              </p>
            )}
            {!waterfallRan && (
              <p className="text-[10px] text-indigo-500">
                Run the waterfall to auto-populate the decomposition fields based on your template configuration.
              </p>
            )}
          </div>
        )}

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-1">Decomposition</div>

        {/* Decomposition balance check */}
        {grossNum > 0 && decompositionDiff > 1 && (
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            Decomposition total ({fmt(totalDecomposed)}) differs from gross amount ({fmt(grossNum)}) by {fmt(decompositionDiff)}.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Return of Capital"><CurrencyInput value={form.returnOfCapital} onChange={(v) => set("returnOfCapital", v)} /></FormField>
          <FormField label="Income"><CurrencyInput value={form.income} onChange={(v) => set("income", v)} /></FormField>
          <FormField label="Carry"><CurrencyInput value={form.carriedInterest} onChange={(v) => set("carriedInterest", v)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Net to LPs"><CurrencyInput value={form.netToLPs} onChange={(v) => set("netToLPs", v)} /></FormField>
        </div>

        {/* Waterfall Calculation Debug */}
        {waterfallDebug && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[10px] text-gray-600 space-y-1">
            <div className="font-semibold text-gray-700">Calculation Inputs</div>
            <div>Months: {waterfallDebug.completedMonths}/12 = {waterfallDebug.yearsOutstanding?.toFixed(4)}</div>
            <div>LP Committed Capital: {fmt(waterfallDebug.lpCommitments?.reduce((s: number, c: any) => s + c.committed, 0) ?? 0)}</div>
            {waterfallDebug.lpCommitments?.map((c: any) => (
              <div key={c.name} className="ml-3">• {c.name}: committed {fmt(c.committed)}, called {fmt(c.called)}</div>
            ))}
            <div>GP: {waterfallDebug.gpCommitments?.map((c: any) => `${c.name} (${fmt(c.committed)})`).join(", ") || "none detected"}</div>
            <div>Pref Before Offset: {fmt(waterfallDebug.prefBeforeOffset ?? 0)}</div>
            <div>Prior LP Distributions (YTD): {fmt(waterfallDebug.priorDistLPTotal ?? 0)} ({waterfallDebug.priorDistCount ?? 0} line items)</div>
            <div>Remaining Pref: {fmt((waterfallDebug.prefBeforeOffset ?? 0) - (waterfallDebug.priorDistLPTotal ?? 0))}</div>
          </div>
        )}

        {/* Per-Investor Allocation Preview (editable) */}
        {showPerInvestor && perInvestorAllocations.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">Per-Investor Allocations</div>
            <p className="text-[10px] text-gray-500">Edit the Override ($) column to assign specific amounts to each investor. Set to 0 for investors not receiving this distribution.</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 font-medium text-gray-600">Investor</th>
                  <th className="text-right py-1 font-medium text-gray-600">Pro-Rata</th>
                  <th className="text-right py-1 font-medium text-gray-600">LP Share</th>
                  <th className="text-right py-1 font-medium text-gray-600">GP Carry</th>
                  <th className="text-right py-1 font-medium text-gray-600">Total</th>
                  <th className="text-right py-1 font-medium text-gray-600">Override ($)</th>
                </tr>
              </thead>
              <tbody>
                {perInvestorAllocations.map((a) => (
                  <tr key={a.investorId} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900">{a.investorName}</td>
                    <td className="py-1.5 text-right text-gray-500">{(a.proRataShare * 100).toFixed(1)}%</td>
                    <td className="py-1.5 text-right text-gray-600">{fmt(a.lpAllocation)}</td>
                    <td className="py-1.5 text-right text-indigo-600">{a.gpCarryAllocation > 0 ? fmt(a.gpCarryAllocation) : "—"}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">{fmt(a.totalAllocation)}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={a.overrideAmount ?? a.totalAllocation.toFixed(2)}
                        onChange={(e) => handleOverrideChange(a.investorId, e.target.value)}
                        className="w-24 border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-1.5 font-semibold text-gray-900">Total</td>
                  <td className="py-1.5 text-right text-gray-500" />
                  <td className="py-1.5 text-right text-gray-500" />
                  <td className="py-1.5 text-right text-gray-500" />
                  <td className="py-1.5 text-right text-gray-500" />
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {fmt(perInvestorAllocations.reduce((s, a) => s + (Number(a.overrideAmount) || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            {Math.abs(perInvestorAllocations.reduce((s, a) => s + (Number(a.overrideAmount) || 0), 0) - (Number(form.grossAmount) || 0)) > 0.01 && (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
                Override total ({fmt(perInvestorAllocations.reduce((s, a) => s + (Number(a.overrideAmount) || 0), 0))}) does not match gross amount ({fmt(Number(form.grossAmount) || 0)}).
              </div>
            )}
          </div>
        )}

        {/* Waterfall Tier-by-Tier Preview */}
        {showWaterfallPreview && previewTemplateId && (
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-700">Waterfall Preview</div>
              <button
                onClick={() => setShowWaterfallPreview(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Hide
              </button>
            </div>
            <WaterfallPreviewPanel
              templateId={previewTemplateId}
              templateName=""
              entities={entities.map((e) => ({ id: e.id, name: e.name }))}
              mode="inline"
              initialEntityId={form.entityId}
              initialAmount={Number(form.grossAmount)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
