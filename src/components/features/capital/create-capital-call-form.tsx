"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { CreateCapitalCallSchema } from "@/lib/schemas";

interface Props { open: boolean; onClose: () => void; entities: { id: string; name: string }[] }

export function CreateCapitalCallForm({ open, onClose, entities }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/capital-calls", { revalidateKeys: ["/api/capital-calls"] });
  const [form, setForm] = useState({ entityId: "", callNumber: "", callDate: "", dueDate: "", amount: "", purpose: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload = { ...form, amount: Number(form.amount) || 0 };
    const result = CreateCapitalCallSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Capital call created");
      setForm({ entityId: "", callNumber: "", callDate: "", dueDate: "", amount: "", purpose: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to create capital call"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Capital Call" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create Call</Button></>}>
      <div className="space-y-3">
        <FormField label="Entity" required error={errors.entityId}>
          <Select value={form.entityId} onChange={(e) => set("entityId", e.target.value)} options={entities.map(e => ({ value: e.id, label: e.name }))} placeholder="Select entity..." />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Call Number" required error={errors.callNumber}>
            <Input value={form.callNumber} onChange={(e) => set("callNumber", e.target.value)} error={!!errors.callNumber} placeholder="e.g. CC-010" />
          </FormField>
          <FormField label="Amount ($)" required error={errors.amount}>
            <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} error={!!errors.amount} placeholder="e.g. 5000000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Call Date" required error={errors.callDate}>
            <Input type="date" value={form.callDate} onChange={(e) => set("callDate", e.target.value)} error={!!errors.callDate} />
          </FormField>
          <FormField label="Due Date" required error={errors.dueDate}>
            <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} error={!!errors.dueDate} />
          </FormField>
        </div>
        <FormField label="Purpose">
          <Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="e.g. New investment — Acme Corp" />
        </FormField>
      </div>
    </Modal>
  );
}
