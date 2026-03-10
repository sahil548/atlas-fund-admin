"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const INCOME_TYPES = [
  { value: "INTEREST", label: "Interest" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "RENTAL", label: "Rental" },
  { value: "ROYALTY", label: "Royalty" },
  { value: "FEE", label: "Fee" },
  { value: "OTHER", label: "Other" },
];

interface Props { open: boolean; onClose: () => void; assetId: string; entityId: string }

export function LogIncomeForm({ open, onClose, assetId, entityId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${assetId}/income`, { revalidateKeys: [`/api/assets/${assetId}`] });
  const [form, setForm] = useState({ incomeType: "DIVIDEND", amount: "", date: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.amount || !form.date) { setErrors({ amount: !form.amount ? "Required" : "", date: !form.date ? "Required" : "" }); return; }
    try {
      await trigger({ ...form, assetId, entityId, amount: Number(form.amount) });
      toast.success("Income logged");
      setForm({ incomeType: "DIVIDEND", amount: "", date: "", description: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to log income"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Income Event" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Log Income</Button></>}>
      <div className="space-y-3">
        <FormField label="Income Type"><Select value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)} options={INCOME_TYPES} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount ($)" required error={errors.amount}><CurrencyInput value={form.amount} onChange={(v) => set("amount", v)} error={!!errors.amount} placeholder="e.g. 500,000" /></FormField>
          <FormField label="Date" required error={errors.date}><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} error={!!errors.date} /></FormField>
        </div>
        <FormField label="Description"><Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Q4 dividend payment" /></FormField>
      </div>
    </Modal>
  );
}
