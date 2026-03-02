"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void }

export function CreateTemplateForm({ open, onClose }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/waterfall-templates", { revalidateKeys: ["/api/waterfall-templates"] });
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    try {
      await trigger(form);
      toast.success("Template created");
      setForm({ name: "", description: "" });
      setError("");
      onClose();
    } catch { toast.error("Failed to create template"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Waterfall Template" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create Template</Button></>}>
      <div className="space-y-3">
        <FormField label="Template Name" required error={error}>
          <Input value={form.name} onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setError(""); }} error={!!error} placeholder="e.g. European 8/20" />
        </FormField>
        <FormField label="Description">
          <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. ROC → 8% Pref → 100% GP Catch-Up → 80/20 Split" />
        </FormField>
      </div>
    </Modal>
  );
}
