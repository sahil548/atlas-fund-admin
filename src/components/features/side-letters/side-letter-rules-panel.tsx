"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const RULE_TYPE_LABELS: Record<string, string> = {
  FEE_DISCOUNT: "Fee Discount",
  CARRY_OVERRIDE: "Carry Override",
  MFN: "MFN",
  CO_INVEST_RIGHTS: "Co-Invest Rights",
  CUSTOM: "Custom",
};

const RULE_TYPE_COLORS: Record<string, string> = {
  FEE_DISCOUNT: "blue",
  CARRY_OVERRIDE: "purple",
  MFN: "green",
  CO_INVEST_RIGHTS: "orange",
  CUSTOM: "gray",
};

interface SideLetterRule {
  id: string;
  sideLetterId: string;
  ruleType: string;
  value: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface MFNGap {
  investorId: string;
  investorName: string;
  currentFeeDiscount: number | null;
  bestFeeDiscount: number | null;
  currentCarryOverride: number | null;
  bestCarryOverride: number | null;
  hasGap: boolean;
}

interface AddRuleForm {
  ruleType: string;
  value: string;
  description: string;
}

interface Props {
  sideLetterId: string;
  investorName: string;
  entityName: string;
}

export function SideLetterRulesPanel({ sideLetterId, investorName, entityName }: Props) {
  const toast = useToast();

  const {
    data: rules,
    isLoading: rulesLoading,
    mutate: mutateRules,
  } = useSWR<SideLetterRule[]>(`/api/side-letters/${sideLetterId}/rules`, fetcher);

  const {
    data: mfnGaps,
    isLoading: mfnLoading,
  } = useSWR<MFNGap[]>(`/api/side-letters/${sideLetterId}/mfn`, fetcher);

  const [showAddRule, setShowAddRule] = useState(false);
  const [addForm, setAddForm] = useState<AddRuleForm>({
    ruleType: "FEE_DISCOUNT",
    value: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // ── Preview fee adjustment calculation ─────────────────────────────────────
  // Use a sample standard management fee of $100,000 for preview
  const SAMPLE_STANDARD_FEE = 100_000;
  const SAMPLE_STANDARD_CARRY_PCT = 20; // 20%

  const activeRules = (rules || []).filter((r) => r.isActive);

  const feeDiscountRule = activeRules.find((r) => r.ruleType === "FEE_DISCOUNT");
  const carryOverrideRule = activeRules.find((r) => r.ruleType === "CARRY_OVERRIDE");

  const feeDiscountAmt = feeDiscountRule?.value
    ? SAMPLE_STANDARD_FEE * (feeDiscountRule.value / 100)
    : 0;
  const netFee = SAMPLE_STANDARD_FEE - feeDiscountAmt;
  const netCarry = carryOverrideRule?.value ?? SAMPLE_STANDARD_CARRY_PCT;

  // ── Add Rule ───────────────────────────────────────────────────────────────
  async function handleAddRule() {
    if (!addForm.ruleType) {
      toast.error("Please select a rule type");
      return;
    }

    const body: any = { ruleType: addForm.ruleType };
    if (addForm.ruleType === "FEE_DISCOUNT" || addForm.ruleType === "CARRY_OVERRIDE") {
      const v = Number(addForm.value);
      if (isNaN(v) || v < 0 || v > 100) {
        toast.error("Value must be a percentage between 0 and 100");
        return;
      }
      body.value = v;
    }
    if (addForm.ruleType === "CUSTOM") {
      if (!addForm.description.trim()) {
        toast.error("Description is required for custom provisions");
        return;
      }
      body.description = addForm.description;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/side-letters/${sideLetterId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to add rule";
        toast.error(msg);
        return;
      }
      toast.success("Rule added");
      setAddForm({ ruleType: "FEE_DISCOUNT", value: "", description: "" });
      setShowAddRule(false);
      mutateRules();
    } catch {
      toast.error("Failed to add rule");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete Rule ────────────────────────────────────────────────────────────
  async function handleDeleteRule(ruleId: string) {
    try {
      const res = await fetch(
        `/api/side-letters/${sideLetterId}/rules?ruleId=${ruleId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed to delete rule");
        return;
      }
      toast.success("Rule removed");
      mutateRules();
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  if (rulesLoading) {
    return <div className="text-sm text-gray-400 p-4">Loading rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Side Letter Rules — {investorName}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{entityName}</p>
      </div>

      {/* Fee Adjustment Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Fee Adjustment Preview (sample $100k fee)
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Standard management fee</span>
            <span className="font-medium text-gray-900">{fmt(SAMPLE_STANDARD_FEE)}</span>
          </div>
          {feeDiscountRule?.value != null && (
            <div className="flex justify-between text-sm">
              <span className="text-green-700">
                Side letter discount ({feeDiscountRule.value}%)
              </span>
              <span className="font-medium text-green-700">
                -{fmt(feeDiscountAmt)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-300 pt-1.5 flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Net management fee</span>
            <span className="text-gray-900">{fmt(netFee)}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
            <span className="text-gray-600">
              Carry rate
              {carryOverrideRule ? " (overridden)" : ""}
            </span>
            <span className="font-medium text-gray-900">{netCarry}%</span>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-700">Active Rules</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddRule((v) => !v)}
          >
            {showAddRule ? "Cancel" : "+ Add Rule"}
          </Button>
        </div>

        {/* Add Rule Form */}
        {showAddRule && (
          <div className="border border-blue-200 rounded-lg p-3 mb-3 bg-blue-50 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rule Type</label>
              <select
                value={addForm.ruleType}
                onChange={(e) => setAddForm((p) => ({ ...p, ruleType: e.target.value, value: "", description: "" }))}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
              >
                <option value="FEE_DISCOUNT">Fee Discount (%)</option>
                <option value="CARRY_OVERRIDE">Carry Override (%)</option>
                <option value="MFN">Most Favored Nation (MFN)</option>
                <option value="CO_INVEST_RIGHTS">Co-Investment Rights</option>
                <option value="CUSTOM">Custom Provision</option>
              </select>
            </div>

            {(addForm.ruleType === "FEE_DISCOUNT" || addForm.ruleType === "CARRY_OVERRIDE") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {addForm.ruleType === "FEE_DISCOUNT" ? "Discount %" : "Override Carry %"}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 10"
                    value={addForm.value}
                    onChange={(e) => setAddForm((p) => ({ ...p, value: e.target.value }))}
                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            )}

            {addForm.ruleType === "CUSTOM" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provision Description</label>
                <textarea
                  placeholder="Describe the custom provision..."
                  value={addForm.description}
                  onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md resize-none"
                />
              </div>
            )}

            <Button size="sm" loading={isSaving} onClick={handleAddRule}>
              Add Rule
            </Button>
          </div>
        )}

        {/* Rules List */}
        {activeRules.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No rules yet. Add structured provisions above.
          </p>
        ) : (
          <div className="space-y-2">
            {activeRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <Badge color={RULE_TYPE_COLORS[rule.ruleType] as any}>
                    {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                  </Badge>
                  <div>
                    {rule.value != null && (
                      <span className="text-sm font-medium text-gray-900">{rule.value}%</span>
                    )}
                    {rule.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MFN Detection Section */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">MFN Gap Detection</p>
        {mfnLoading ? (
          <p className="text-xs text-gray-400">Checking MFN gaps...</p>
        ) : !mfnGaps || mfnGaps.length === 0 ? (
          <p className="text-xs text-gray-400">No MFN rights holders in this entity.</p>
        ) : (
          <div className="space-y-2">
            {mfnGaps.map((gap) => (
              <div
                key={gap.investorId}
                className={`border rounded-lg p-3 ${
                  gap.hasGap
                    ? "border-amber-300 bg-amber-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{gap.investorName}</span>
                  <Badge color={gap.hasGap ? "orange" : "green"}>
                    {gap.hasGap ? "Review Required" : "MFN Satisfied"}
                  </Badge>
                </div>
                {gap.hasGap && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {gap.bestFeeDiscount != null &&
                      (gap.currentFeeDiscount === null ||
                        gap.currentFeeDiscount < gap.bestFeeDiscount) && (
                        <p>
                          Fee discount: {gap.currentFeeDiscount ?? 0}% vs best {gap.bestFeeDiscount}% in entity
                        </p>
                      )}
                    {gap.bestCarryOverride != null &&
                      (gap.currentCarryOverride === null ||
                        gap.currentCarryOverride > gap.bestCarryOverride) && (
                        <p>
                          Carry: {gap.currentCarryOverride ?? "standard"}% vs best {gap.bestCarryOverride}% in entity
                        </p>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
