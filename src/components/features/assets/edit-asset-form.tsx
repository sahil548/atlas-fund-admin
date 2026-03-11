"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXITED", label: "Exited" },
  { value: "WRITTEN_OFF", label: "Written Off" },
];

interface Props { open: boolean; onClose: () => void; asset: { id: string; fairValue: number; status: string; sector?: string; incomeType?: string } }

export function EditAssetForm({ open, onClose, asset }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${asset.id}`, { method: "PUT", revalidateKeys: ["/api/assets", `/api/assets/${asset.id}`] });
  const [form, setForm] = useState({ fairValue: "", status: "", sector: "", incomeType: "" });

  useEffect(() => {
    if (open) setForm({ fairValue: String(asset.fairValue || ""), status: asset.status || "ACTIVE", sector: asset.sector || "", incomeType: asset.incomeType || "" });
  }, [open, asset]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload: Record<string, unknown> = {};
    if (form.fairValue) payload.fairValue = Number(form.fairValue);
    if (form.status) payload.status = form.status;
    if (form.sector) payload.sector = form.sector;
    if (form.incomeType) payload.incomeType = form.incomeType;
    try {
      await trigger(payload);
      toast.success("Asset updated");
      onClose();
    } catch { toast.error("Failed to update asset"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Asset" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">
        <FormField label="Fair Value"><CurrencyInput value={form.fairValue} onChange={(v) => set("fairValue", v)} /></FormField>
        <FormField label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={STATUSES} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sector"><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} /></FormField>
          <FormField label="Income Type"><Input value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)} /></FormField>
        </div>
      </div>
    </Modal>
  );
}
