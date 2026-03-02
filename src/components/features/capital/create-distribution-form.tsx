"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; entities: { id: string; name: string }[] }

export function CreateDistributionForm({ open, onClose, entities }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/distributions", { revalidateKeys: ["/api/distributions"] });
  const [form, setForm] = useState({ entityId: "", distributionDate: "", grossAmount: "", source: "", returnOfCapital: "", income: "", longTermGain: "", shortTermGain: "", carriedInterest: "", netToLPs: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload = {
      entityId: form.entityId, distributionDate: form.distributionDate, grossAmount: Number(form.grossAmount) || 0,
      source: form.source || undefined, returnOfCapital: Number(form.returnOfCapital) || 0, income: Number(form.income) || 0,
      longTermGain: Number(form.longTermGain) || 0, shortTermGain: Number(form.shortTermGain) || 0,
      carriedInterest: Number(form.carriedInterest) || 0, netToLPs: Number(form.netToLPs) || 0,
    };
    if (!payload.entityId || !payload.distributionDate || !payload.grossAmount) {
      setErrors({ entityId: !payload.entityId ? "Required" : "", distributionDate: !payload.distributionDate ? "Required" : "", grossAmount: !payload.grossAmount ? "Required" : "" });
      return;
    }
    try {
      await trigger(payload);
      toast.success("Distribution created");
      setForm({ entityId: "", distributionDate: "", grossAmount: "", source: "", returnOfCapital: "", income: "", longTermGain: "", shortTermGain: "", carriedInterest: "", netToLPs: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to create distribution"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Distribution" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create Distribution</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Entity" required error={errors.entityId}>
            <Select value={form.entityId} onChange={(e) => set("entityId", e.target.value)} options={entities.map(e => ({ value: e.id, label: e.name }))} placeholder="Select entity..." />
          </FormField>
          <FormField label="Date" required error={errors.distributionDate}>
            <Input type="date" value={form.distributionDate} onChange={(e) => set("distributionDate", e.target.value)} error={!!errors.distributionDate} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Gross Amount ($)" required error={errors.grossAmount}>
            <Input type="number" value={form.grossAmount} onChange={(e) => set("grossAmount", e.target.value)} error={!!errors.grossAmount} />
          </FormField>
          <FormField label="Source">
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Exit — Acme Corp" />
          </FormField>
        </div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2">Decomposition</div>
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
      </div>
    </Modal>
  );
}
