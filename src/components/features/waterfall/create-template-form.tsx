"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface Props {
  open: boolean;
  onClose: () => void;
  entityId?: string;
}

export function CreateTemplateForm({ open, onClose, entityId }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setIsLoading(true);
    try {
      // Create the template
      const res = await fetch("/api/waterfall-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to create template");
        return;
      }
      const template = await res.json();

      // If we have an entityId, link the template to the entity
      if (entityId) {
        const linkRes = await fetch(`/api/entities/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waterfallTemplateId: template.id }),
        });
        if (!linkRes.ok) {
          toast.error("Template created but failed to link to vehicle. Try assigning it manually.");
        }
        // Revalidate entity data so the waterfall tab updates
        mutate(`/api/entities/${entityId}`);
      }

      mutate("/api/waterfall-templates");
      toast.success("Template created");
      setForm({ name: "", description: "" });
      setError("");
      onClose();
    } catch {
      toast.error("Failed to create template");
    } finally {
      setIsLoading(false);
    }
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
