"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; templateId: string; nextOrder: number }

export function AddTierForm({ open, onClose, templateId, nextOrder }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/waterfall-templates/${templateId}/tiers`, { revalidateKeys: ["/api/waterfall-templates"] });
  const [form, setForm] = useState({ name: "", description: "", splitLP: "", splitGP: "", hurdleRate: "" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    try {
      await trigger({
        templateId, tierOrder: nextOrder, name: form.name,
        description: form.description || undefined,
        splitLP: form.splitLP ? Number(form.splitLP) : undefined,
        splitGP: form.splitGP ? Number(form.splitGP) : undefined,
        hurdleRate: form.hurdleRate ? Number(form.hurdleRate) : undefined,
      });
      toast.success("Tier added");
      setForm({ name: "", description: "", splitLP: "", splitGP: "", hurdleRate: "" });
      setError("");
      onClose();
    } catch { toast.error("Failed to add tier"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Waterfall Tier" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Add Tier</Button></>}>
      <div className="space-y-3">
        <FormField label="Tier Name" required error={error}>
          <Input value={form.name} onChange={(e) => { set("name", e.target.value); setError(""); }} error={!!error} placeholder="e.g. Preferred Return" />
        </FormField>
        <FormField label="Description">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. 8% preferred return to LPs" />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="LP Split %"><Input type="number" value={form.splitLP} onChange={(e) => set("splitLP", e.target.value)} placeholder="80" /></FormField>
          <FormField label="GP Split %"><Input type="number" value={form.splitGP} onChange={(e) => set("splitGP", e.target.value)} placeholder="20" /></FormField>
          <FormField label="Hurdle %"><Input type="number" step="0.1" value={form.hurdleRate} onChange={(e) => set("hurdleRate", e.target.value)} placeholder="8.0" /></FormField>
        </div>
      </div>
    </Modal>
  );
}
