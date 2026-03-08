"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface RuleInput {
  ruleType: "FEE_DISCOUNT" | "CARRY_OVERRIDE" | "MFN" | "CO_INVEST_RIGHTS" | "CUSTOM";
  enabled: boolean;
  value: string; // percentage string for FEE_DISCOUNT/CARRY_OVERRIDE
  description: string; // for CUSTOM
}

const DEFAULT_RULES: RuleInput[] = [
  { ruleType: "FEE_DISCOUNT", enabled: false, value: "", description: "" },
  { ruleType: "CARRY_OVERRIDE", enabled: false, value: "", description: "" },
  { ruleType: "MFN", enabled: false, value: "", description: "" },
  { ruleType: "CO_INVEST_RIGHTS", enabled: false, value: "", description: "" },
  { ruleType: "CUSTOM", enabled: false, value: "", description: "" },
];

const RULE_LABELS: Record<string, string> = {
  FEE_DISCOUNT: "Fee Discount (%)",
  CARRY_OVERRIDE: "Carry Override (%)",
  MFN: "Most Favored Nation (MFN)",
  CO_INVEST_RIGHTS: "Co-Investment Rights",
  CUSTOM: "Custom Provision",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSideLetterForm({ open, onClose, onCreated }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { data: investors } = useSWR(open ? `/api/investors?firmId=${firmId}` : null, (url: string) =>
    fetcher(url).then((r: any) => r.data ?? r),
  );
  const { data: entities } = useSWR(open ? `/api/entities?firmId=${firmId}` : null, (url: string) =>
    fetcher(url).then((r: any) => r.data ?? r),
  );

  const [form, setForm] = useState({ investorId: "", entityId: "", terms: "" });
  const [rules, setRules] = useState<RuleInput[]>(DEFAULT_RULES.map((r) => ({ ...r })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function toggleRule(idx: number) {
    setRules((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], enabled: !next[idx].enabled };
      return next;
    });
  }

  function setRuleValue(idx: number, field: "value" | "description", val: string) {
    setRules((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.investorId) errs.investorId = "Investor is required";
    if (!form.entityId) errs.entityId = "Entity is required";
    if (!form.terms) errs.terms = "Terms are required";
    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (
        (rule.ruleType === "FEE_DISCOUNT" || rule.ruleType === "CARRY_OVERRIDE") &&
        (rule.value === "" || isNaN(Number(rule.value)) || Number(rule.value) < 0 || Number(rule.value) > 100)
      ) {
        errs[`rule_${rule.ruleType}`] = "Must be a number between 0 and 100";
      }
    }
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const enabledRules = rules
      .filter((r) => r.enabled)
      .map((r) => {
        const base: any = { ruleType: r.ruleType };
        if (r.ruleType === "FEE_DISCOUNT" || r.ruleType === "CARRY_OVERRIDE") {
          base.value = Number(r.value);
        }
        if (r.ruleType === "CUSTOM" && r.description) {
          base.description = r.description;
        }
        return base;
      });

    setIsLoading(true);
    try {
      const res = await fetch("/api/side-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rules: enabledRules }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body.error === "string" ? body.error : "Failed to create side letter";
        toast.error(msg);
        return;
      }
      toast.success("Side letter created");
      setForm({ investorId: "", entityId: "", terms: "" });
      setRules(DEFAULT_RULES.map((r) => ({ ...r })));
      setErrors({});
      onCreated?.();
      onClose();
    } catch {
      toast.error("Failed to create side letter");
    } finally {
      setIsLoading(false);
    }
  }

  const investorOptions = [
    { value: "", label: "Select investor..." },
    ...(investors || []).map((i: any) => ({ value: i.id, label: i.name })),
  ];
  const entityOptions = [
    { value: "", label: "Select entity..." },
    ...(entities || []).map((e: any) => ({ value: e.id, label: e.name })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Side Letter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoading} onClick={handleSubmit}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Investor" required error={errors.investorId}>
          <Select
            value={form.investorId}
            onChange={(e) => set("investorId", e.target.value)}
            options={investorOptions}
          />
        </FormField>

        <FormField label="Entity" required error={errors.entityId}>
          <Select
            value={form.entityId}
            onChange={(e) => set("entityId", e.target.value)}
            options={entityOptions}
          />
        </FormField>

        <FormField label="Terms" required error={errors.terms}>
          <Textarea
            value={form.terms}
            onChange={(e) => set("terms", e.target.value)}
            placeholder="General side letter terms..."
            rows={3}
          />
        </FormField>

        {/* Structured Rules */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Structured Rules</p>
          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div key={rule.ruleType} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`rule-${rule.ruleType}`}
                    checked={rule.enabled}
                    onChange={() => toggleRule(idx)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`rule-${rule.ruleType}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {RULE_LABELS[rule.ruleType]}
                  </label>
                </div>

                {rule.enabled && (
                  <div className="mt-2 ml-7">
                    {(rule.ruleType === "FEE_DISCOUNT" || rule.ruleType === "CARRY_OVERRIDE") && (
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 10"
                          value={rule.value}
                          onChange={(e) => setRuleValue(idx, "value", e.target.value)}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                        <span className="ml-1 text-xs text-gray-500">%</span>
                        {errors[`rule_${rule.ruleType}`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`rule_${rule.ruleType}`]}</p>
                        )}
                      </div>
                    )}
                    {rule.ruleType === "CUSTOM" && (
                      <textarea
                        placeholder="Describe the custom provision..."
                        value={rule.description}
                        onChange={(e) => setRuleValue(idx, "description", e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md resize-none"
                      />
                    )}
                    {(rule.ruleType === "MFN" || rule.ruleType === "CO_INVEST_RIGHTS") && (
                      <p className="text-xs text-gray-500">This flag will be recorded and monitored.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
