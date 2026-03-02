"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; entity: { id: string; name: string; vintageYear?: number } }

export function EditEntityForm({ open, onClose, entity }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/entities/${entity.id}`, { method: "PUT", revalidateKeys: ["/api/entities"] });
  const [form, setForm] = useState({ name: "", vintageYear: "" });

  useEffect(() => {
    if (open) setForm({ name: entity.name, vintageYear: entity.vintageYear ? String(entity.vintageYear) : "" });
  }, [open, entity]);

  async function handleSubmit() {
    try {
      await trigger({ name: form.name || undefined, vintageYear: form.vintageYear ? Number(form.vintageYear) : undefined });
      toast.success("Entity updated");
      onClose();
    } catch { toast.error("Failed to update entity"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Entity" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">
        <FormField label="Entity Name"><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></FormField>
        <FormField label="Vintage Year"><Input type="number" value={form.vintageYear} onChange={(e) => setForm(p => ({ ...p, vintageYear: e.target.value }))} placeholder="e.g. 2019" /></FormField>
      </div>
    </Modal>
  );
}
