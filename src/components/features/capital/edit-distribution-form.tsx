"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props {
  open: boolean;
  onClose: () => void;
  distribution: {
    id: string;
    distributionDate: string;
    grossAmount: number;
    source: string | null;
    returnOfCapital: number;
    income: number;
    longTermGain: number;
    shortTermGain: number;
    carriedInterest: number;
    netToLPs: number;
    status: string;
    distributionType: string | null;
    memo: string | null;
  };
}

export function EditDistributionForm({ open, onClose, distribution }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/distributions/${distribution.id}`, {
    method: "PATCH",
    revalidateKeys: ["/api/distributions", `/api/distributions/${distribution.id}`],
  });

  const [form, setForm] = useState({
    distributionDate: "",
    grossAmount: "",
    source: "",
    returnOfCapital: "",
    income: "",
    longTermGain: "",
    shortTermGain: "",
    carriedInterest: "",
    netToLPs: "",
    distributionType: "",
    memo: "",
  });

  const isDraft = distribution.status === "DRAFT";

  useEffect(() => {
    if (open) {
      setForm({
        distributionDate: distribution.distributionDate ? distribution.distributionDate.slice(0, 10) : "",
        grossAmount: String(distribution.grossAmount || ""),
        source: distribution.source || "",
        returnOfCapital: String(distribution.returnOfCapital || "0"),
        income: String(distribution.income || "0"),
        longTermGain: String(distribution.longTermGain || "0"),
        shortTermGain: String(distribution.shortTermGain || "0"),
        carriedInterest: String(distribution.carriedInterest || "0"),
        netToLPs: String(distribution.netToLPs || "0"),
        distributionType: distribution.distributionType || "",
        memo: distribution.memo || "",
      });
    }
  }, [open, distribution]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload: Record<string, unknown> = {};

    if (isDraft) {
      if (form.distributionDate !== distribution.distributionDate?.slice(0, 10)) payload.distributionDate = form.distributionDate;
      if (form.source !== (distribution.source || "")) payload.source = form.source;
      const ga = Number(form.grossAmount);
      if (ga && ga !== distribution.grossAmount) payload.grossAmount = ga;
      const roc = Number(form.returnOfCapital);
      if (roc !== distribution.returnOfCapital) payload.returnOfCapital = roc;
      const inc = Number(form.income);
      if (inc !== distribution.income) payload.income = inc;
      const ltg = Number(form.longTermGain);
      if (ltg !== distribution.longTermGain) payload.longTermGain = ltg;
      const stg = Number(form.shortTermGain);
      if (stg !== distribution.shortTermGain) payload.shortTermGain = stg;
      const ci = Number(form.carriedInterest);
      if (ci !== distribution.carriedInterest) payload.carriedInterest = ci;
      const net = Number(form.netToLPs);
      if (net !== distribution.netToLPs) payload.netToLPs = net;
      if (form.distributionType !== (distribution.distributionType || "")) payload.distributionType = form.distributionType;
      if (form.memo !== (distribution.memo || "")) payload.memo = form.memo;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await trigger(payload);
      toast.success("Distribution updated");
      onClose();
    } catch {
      toast.error("Failed to update distribution");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Distribution"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Distribution Date">
            <Input type="date" value={form.distributionDate} onChange={(e) => set("distributionDate", e.target.value)} disabled={!isDraft} />
          </FormField>
          <FormField label="Gross Amount">
            <CurrencyInput value={form.grossAmount} onChange={(v) => set("grossAmount", v)} disabled={!isDraft} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Source">
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} disabled={!isDraft} placeholder="e.g., Asset exit proceeds" />
          </FormField>
          <FormField label="Distribution Type">
            <Input value={form.distributionType} onChange={(e) => set("distributionType", e.target.value)} disabled={!isDraft} />
          </FormField>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tax Breakdown</div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Return of Capital">
              <CurrencyInput value={form.returnOfCapital} onChange={(v) => set("returnOfCapital", v)} disabled={!isDraft} />
            </FormField>
            <FormField label="Income">
              <CurrencyInput value={form.income} onChange={(v) => set("income", v)} disabled={!isDraft} />
            </FormField>
            <FormField label="LT Gain">
              <CurrencyInput value={form.longTermGain} onChange={(v) => set("longTermGain", v)} disabled={!isDraft} />
            </FormField>
            <FormField label="ST Gain">
              <CurrencyInput value={form.shortTermGain} onChange={(v) => set("shortTermGain", v)} disabled={!isDraft} />
            </FormField>
            <FormField label="Carried Interest">
              <CurrencyInput value={form.carriedInterest} onChange={(v) => set("carriedInterest", v)} disabled={!isDraft} />
            </FormField>
            <FormField label="Net to LPs">
              <CurrencyInput value={form.netToLPs} onChange={(v) => set("netToLPs", v)} disabled={!isDraft} />
            </FormField>
          </div>
        </div>

        <FormField label="Memo">
          <Input value={form.memo} onChange={(e) => set("memo", e.target.value)} disabled={!isDraft} />
        </FormField>

        {!isDraft && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Distribution fields can only be edited while the distribution is in DRAFT status.
          </p>
        )}
      </div>
    </Modal>
  );
}
