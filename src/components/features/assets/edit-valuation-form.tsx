"use client";

import { useState, useEffect } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const METHODS = [
  { value: "COMPARABLE_MULTIPLES", label: "Comparable Multiples" },
  { value: "LAST_ROUND", label: "Last Round" },
  { value: "DCF", label: "DCF" },
  { value: "APPRAISAL", label: "Appraisal" },
  { value: "GP_REPORTED_NAV", label: "GP Reported NAV" },
  { value: "COST", label: "Cost" },
];

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
];

interface Props {
  valuation: any | null;
  open: boolean;
  onClose: () => void;
  assetId: string;
}

export function EditValuationForm({ valuation, open, onClose, assetId }: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    valuationDate: "",
    method: "COMPARABLE_MULTIPLES",
    fairValue: "",
    moic: "",
    notes: "",
    status: "DRAFT",
  });

  useEffect(() => {
    if (open && valuation) {
      const toDateStr = (val: string | null | undefined): string => {
        if (!val) return "";
        const d = new Date(val);
        return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      };

      setForm({
        valuationDate: toDateStr(valuation.valuationDate),
        method: valuation.method || "COMPARABLE_MULTIPLES",
        fairValue: valuation.fairValue != null ? String(valuation.fairValue) : "",
        moic: valuation.moic != null ? String(valuation.moic) : "",
        notes: valuation.notes || "",
        status: valuation.status || "DRAFT",
      });
    }
  }, [open, valuation]);

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!valuation) return;
    setIsLoading(true);

    const payload: Record<string, unknown> = {};
    if (form.valuationDate) payload.valuationDate = new Date(form.valuationDate).toISOString();
    if (form.method) payload.method = form.method;
    if (form.fairValue) payload.fairValue = Number(form.fairValue);
    if (form.moic) payload.moic = Number(form.moic);
    if (form.notes) payload.notes = form.notes;
    if (form.status) payload.status = form.status;

    try {
      const res = await fetch(`/api/assets/${assetId}/valuations/${valuation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to update valuation";
        toast.error(msg);
        return;
      }

      toast.success("Valuation updated");
      mutate(`/api/assets/${assetId}`);
      onClose();
    } catch {
      toast.error("Failed to update valuation");
    } finally {
      setIsLoading(false);
    }
  }

  const isDraft = valuation?.status === "DRAFT" || !valuation?.status;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Valuation"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit} disabled={!isDraft}>
            {isDraft ? "Save Changes" : "Approved (read-only)"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {!isDraft && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            This valuation is approved. Only DRAFT valuations can be edited.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valuation Date">
            <Input type="date" value={form.valuationDate} onChange={(e) => setF("valuationDate", e.target.value)} disabled={!isDraft} />
          </FormField>
          <FormField label="Method">
            <Select value={form.method} onChange={(e) => setF("method", e.target.value)} options={METHODS} disabled={!isDraft} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fair Value ($)">
            <CurrencyInput value={form.fairValue} onChange={(v) => setF("fairValue", v)} disabled={!isDraft} />
          </FormField>
          <FormField label="MOIC">
            <Input type="number" step="0.01" value={form.moic} onChange={(e) => setF("moic", e.target.value)} placeholder="e.g. 2.5" disabled={!isDraft} />
          </FormField>
        </div>
        <FormField label="Notes">
          <Input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Valuation notes..." disabled={!isDraft} />
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => setF("status", e.target.value)} options={STATUSES} />
        </FormField>
      </div>
    </Modal>
  );
}
