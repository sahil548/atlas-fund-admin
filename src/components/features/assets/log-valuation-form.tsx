"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { CreateValuationSchema } from "@/lib/schemas";

const METHODS = [
  { value: "COMPARABLE_MULTIPLES", label: "Comparable Multiples" },
  { value: "LAST_ROUND", label: "Last Round" },
  { value: "DCF", label: "DCF" },
  { value: "APPRAISAL", label: "Appraisal" },
  { value: "GP_REPORTED_NAV", label: "GP Reported NAV" },
  { value: "COST", label: "Cost" },
];

interface Props { open: boolean; onClose: () => void; assetId: string }

export function LogValuationForm({ open, onClose, assetId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${assetId}/valuations`, { revalidateKeys: [`/api/assets/${assetId}`] });
  const [form, setForm] = useState({ valuationDate: "", method: "COMPARABLE_MULTIPLES", fairValue: "", moic: "", notes: "", status: "DRAFT" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload = { ...form, assetId, fairValue: Number(form.fairValue) || 0, moic: form.moic ? Number(form.moic) : undefined };
    const result = CreateValuationSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Valuation logged");
      setForm({ valuationDate: "", method: "COMPARABLE_MULTIPLES", fairValue: "", moic: "", notes: "", status: "DRAFT" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to log valuation"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Valuation" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Log Valuation</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valuation Date" required error={errors.valuationDate}><Input type="date" value={form.valuationDate} onChange={(e) => set("valuationDate", e.target.value)} error={!!errors.valuationDate} /></FormField>
          <FormField label="Method" required><Select value={form.method} onChange={(e) => set("method", e.target.value)} options={METHODS} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fair Value ($)" required error={errors.fairValue}><CurrencyInput value={form.fairValue} onChange={(v) => set("fairValue", v)} error={!!errors.fairValue} placeholder="e.g. 50,000,000" /></FormField>
          <FormField label="MOIC"><Input type="number" step="0.01" value={form.moic} onChange={(e) => set("moic", e.target.value)} placeholder="e.g. 2.5" /></FormField>
        </div>
        <FormField label="Notes"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Valuation notes..." /></FormField>
        <FormField label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "DRAFT", label: "Draft" }, { value: "APPROVED", label: "Approved" }]} /></FormField>
      </div>
    </Modal>
  );
}
