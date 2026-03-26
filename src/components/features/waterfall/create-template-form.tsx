"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const DISTRIBUTION_TYPES = [
  { value: "", label: "Custom" },
  { value: "Income", label: "Income Distribution" },
  { value: "Return of Capital", label: "Return of Capital" },
  { value: "Capital Gains", label: "Capital Gains" },
  { value: "Liquidation", label: "Liquidation / Wind-Down" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  entityId?: string;
}

export function CreateTemplateForm({ open, onClose, entityId }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", distType: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleDistTypeChange(value: string) {
    setForm(p => ({
      ...p,
      distType: value,
      // Auto-fill name if empty or was previously auto-filled
      name: !p.name || DISTRIBUTION_TYPES.some(dt => dt.value && p.name === `${dt.value} Waterfall`)
        ? (value ? `${value} Waterfall` : p.name)
        : p.name,
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setIsLoading(true);
    try {
      const description = [form.distType ? `Type: ${form.distType}` : "", form.description].filter(Boolean).join(" — ");

      // Create the template
      const res = await fetch("/api/waterfall-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: description || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to create template");
        return;
      }
      const template = await res.json();

      // If we have an entityId, link the template to the entity
      // Always set the FK — each new template becomes the "active" one
      // The waterfall tab fetches all templates linked to the entity
      if (entityId) {
        const linkRes = await fetch(`/api/entities/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waterfallTemplateId: template.id }),
        });
        if (!linkRes.ok) {
          toast.error("Template created but failed to link to vehicle.");
        }
        mutate(`/api/entities/${entityId}`);
      }

      mutate("/api/waterfall-templates");
      toast.success("Waterfall template created");
      setForm({ name: "", description: "", distType: "" });
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
        <FormField label="Distribution Type">
          <Select
            value={form.distType}
            onChange={(e) => handleDistTypeChange(e.target.value)}
            options={DISTRIBUTION_TYPES}
          />
        </FormField>
        <FormField label="Template Name" required error={error}>
          <Input value={form.name} onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setError(""); }} error={!!error} placeholder="e.g. Income Waterfall" />
        </FormField>
        <FormField label="Description">
          <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 8% Pref → 100% GP Catch-Up → 80/20 Split" />
        </FormField>
      </div>
    </Modal>
  );
}
