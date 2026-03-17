"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  open: boolean;
  onClose: () => void;
  entityId: string;
  onCreated?: () => void;
}

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "OPEN", label: "Open" },
  { value: "FINAL_CLOSE", label: "Final Close" },
  { value: "CLOSED", label: "Closed" },
];

export function CreateRoundForm({ open, onClose, entityId, onCreated }: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    status: "PLANNING",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Round name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fundraising", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          name: form.name,
          targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to create round";
        toast.error(msg);
        return;
      }
      toast.success("Fundraising round created");
      setForm({ name: "", targetAmount: "", status: "PLANNING" });
      onCreated?.();
      onClose();
    } catch {
      toast.error("Failed to create round");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Fundraising Round"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>Create Round</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Round Name" required>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Fund IV — First Close"
          />
        </FormField>
        <FormField label="Target Amount ($)">
          <Input
            type="number"
            value={form.targetAmount}
            onChange={(e) => set("targetAmount", e.target.value)}
            placeholder="e.g. 300000000"
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            options={STATUS_OPTIONS}
          />
        </FormField>
      </div>
    </Modal>
  );
}
