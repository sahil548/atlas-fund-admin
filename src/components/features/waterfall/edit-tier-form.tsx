"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props {
  open: boolean;
  onClose: () => void;
  templateId: string;
  tier: { id: string; name: string; description?: string; splitLP?: number; splitGP?: number; hurdleRate?: number };
  entityId?: string;
}

export function EditTierForm({ open, onClose, templateId, tier, entityId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/waterfall-templates/${templateId}/tiers`, { method: "PUT", revalidateKeys: ["/api/waterfall-templates", ...(entityId ? [`/api/entities/${entityId}`] : [])] });
  const [form, setForm] = useState({ name: "", description: "", splitLP: "", splitGP: "", hurdleRate: "" });

  useEffect(() => {
    if (open) setForm({
      name: tier.name,
      description: tier.description || "",
      splitLP: tier.splitLP != null ? String(tier.splitLP) : "",
      splitGP: tier.splitGP != null ? String(tier.splitGP) : "",
      hurdleRate: tier.hurdleRate != null ? String(tier.hurdleRate) : "",
    });
  }, [open, tier]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    try {
      await trigger({
        id: tier.id,
        name: form.name || undefined,
        description: form.description || undefined,
        splitLP: form.splitLP ? Number(form.splitLP) : undefined,
        splitGP: form.splitGP ? Number(form.splitGP) : undefined,
        hurdleRate: form.hurdleRate ? Number(form.hurdleRate) : undefined,
      });
      toast.success("Tier updated");
      onClose();
    } catch { toast.error("Failed to update tier"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Waterfall Tier" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">
        <FormField label="Tier Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></FormField>
        <FormField label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} /></FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="LP Split %"><Input type="number" value={form.splitLP} onChange={(e) => set("splitLP", e.target.value)} /></FormField>
          <FormField label="GP Split %"><Input type="number" value={form.splitGP} onChange={(e) => set("splitGP", e.target.value)} /></FormField>
          <FormField label="Hurdle %"><Input type="number" step="0.1" value={form.hurdleRate} onChange={(e) => set("hurdleRate", e.target.value)} /></FormField>
        </div>
      </div>
    </Modal>
  );
}
