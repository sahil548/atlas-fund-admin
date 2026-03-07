"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props { open: boolean; onClose: () => void; entities: { id: string; name: string }[] }

interface WaterfallTemplate {
  id: string; name: string;
}

interface PerInvestorAllocation {
  investorId: string;
  investorName: string;
  proRataShare: number;
  lpAllocation: number;
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
  const [hasUnfundedWarning, setHasUnfundedWarning] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Fetch waterfall template for selected entity
  const { data: templates = [] } = useSWR<WaterfallTemplate[]>(
    form.entityId ? "/api/waterfall-templates" : null,
    fetcher
  );

  async function handleRunWaterfall() {
    if (!form.entityId || !form.grossAmount) {
      toast.error("Select an entity and enter amount first");
      return;
    }
    setWaterfallLoading(true);
    try {
      // Find the template associated with this entity
      const entityTemplates = templates.filter(() => true); // all templates, will try first one
      if (entityTemplates.length === 0) {
        toast.error("No waterfall template found. Create a template first.");
        setWaterfallLoading(false);
        return;
      }
      // Use the first template (entity may have one linked)
      const template = entityTemplates[0];

      const res = await fetch(`/api/waterfall-templates/${template.id}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: form.entityId,
          distributableAmount: Number(form.grossAmount),
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
      // GP carry = totalGP, ROC from ROC tier, remainder is gain/income
      const totalGP = data.totalGP ?? 0;
      const totalLP = data.totalLP ?? 0;
      const rocTier = data.tiers?.find((t: any) => t.name?.toLowerCase().includes("return of capital"));
      const roc = rocTier?.allocatedLP ?? 0;
      const lpProfits = totalLP - roc;
      // Split LP profits into income and LT gain roughly (income = pref, gain = rest)
      const prefTier = data.tiers?.find((t: any) => t.name?.toLowerCase().includes("preferred"));
      const prefAmount = prefTier?.allocatedLP ?? 0;
      const income = prefAmount;
      const ltGain = Math.max(0, lpProfits - prefAmount);

      set("returnOfCapital", roc.toFixed(2));
      set("income", income.toFixed(2));
      set("longTermGain", ltGain.toFixed(2));
      set("shortTermGain", "0");
      set("carriedInterest", totalGP.toFixed(2));
      set("netToLPs", totalLP.toFixed(2));

      // Build per-investor allocation list
      const breakdown: PerInvestorAllocation[] = (data.perInvestorBreakdown ?? []).map((b: any) => ({
        investorId: b.investorId,
        investorName: b.investorName,
        proRataShare: b.proRataShare,
        lpAllocation: b.lpAllocation,
        overrideAmount: b.lpAllocation.toFixed(2),
      }));
      setPerInvestorAllocations(breakdown);
      setShowPerInvestor(breakdown.length > 0);
      setWaterfallRan(true);
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
      onClose();
    } catch {
      toast.error("Failed to create distribution");
    }
  }

  const grossNum = Number(form.grossAmount) || 0;
  const totalDecomposed = (Number(form.returnOfCapital) || 0) + (Number(form.income) || 0) + (Number(form.longTermGain) || 0) + (Number(form.shortTermGain) || 0) + (Number(form.carriedInterest) || 0);
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
            <Input type="number" value={form.grossAmount} onChange={(e) => set("grossAmount", e.target.value)} error={!!errors.grossAmount} />
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
          <FormField label="Return of Capital"><Input type="number" value={form.returnOfCapital} onChange={(e) => set("returnOfCapital", e.target.value)} /></FormField>
          <FormField label="Income"><Input type="number" value={form.income} onChange={(e) => set("income", e.target.value)} /></FormField>
          <FormField label="LT Gains"><Input type="number" value={form.longTermGain} onChange={(e) => set("longTermGain", e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="ST Gains"><Input type="number" value={form.shortTermGain} onChange={(e) => set("shortTermGain", e.target.value)} /></FormField>
          <FormField label="Carry"><Input type="number" value={form.carriedInterest} onChange={(e) => set("carriedInterest", e.target.value)} /></FormField>
          <FormField label="Net to LPs"><Input type="number" value={form.netToLPs} onChange={(e) => set("netToLPs", e.target.value)} /></FormField>
        </div>

        {/* Per-Investor Allocation Preview (editable) */}
        {showPerInvestor && perInvestorAllocations.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">Per-Investor LP Allocation Preview</div>
            <p className="text-[10px] text-gray-500">Override individual amounts below for side letter arrangements.</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 font-medium text-gray-600">Investor</th>
                  <th className="text-right py-1 font-medium text-gray-600">Pro-Rata</th>
                  <th className="text-right py-1 font-medium text-gray-600">Calculated</th>
                  <th className="text-right py-1 font-medium text-gray-600">Override ($)</th>
                </tr>
              </thead>
              <tbody>
                {perInvestorAllocations.map((a) => (
                  <tr key={a.investorId} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-900">{a.investorName}</td>
                    <td className="py-1.5 text-right text-gray-500">{(a.proRataShare * 100).toFixed(1)}%</td>
                    <td className="py-1.5 text-right text-gray-600">{fmt(a.lpAllocation)}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={a.overrideAmount ?? a.lpAllocation.toFixed(2)}
                        onChange={(e) => handleOverrideChange(a.investorId, e.target.value)}
                        className="w-24 border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
