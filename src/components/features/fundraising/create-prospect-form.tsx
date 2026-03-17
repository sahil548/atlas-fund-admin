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
  roundId: string;
  onCreated?: () => void;
}

const INVESTOR_TYPES = [
  { value: "Pension", label: "Pension" },
  { value: "Endowment", label: "Endowment" },
  { value: "Sovereign Wealth", label: "Sovereign Wealth" },
  { value: "Family Office", label: "Family Office" },
  { value: "Insurance", label: "Insurance" },
  { value: "Fund of Funds", label: "Fund of Funds" },
  { value: "Other", label: "Other" },
];

export function CreateProspectForm({ open, onClose, roundId, onCreated }: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investorName: "",
    investorType: "",
    targetAmount: "",
    contactName: "",
    contactEmail: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.investorName.trim()) {
      toast.error("Investor name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fundraising/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          investorName: form.investorName,
          investorType: form.investorType || undefined,
          targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
          contactName: form.contactName || undefined,
          contactEmail: form.contactEmail || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to add prospect";
        toast.error(msg);
        return;
      }
      toast.success("Prospect added");
      setForm({ investorName: "", investorType: "", targetAmount: "", contactName: "", contactEmail: "", notes: "" });
      onCreated?.();
      onClose();
    } catch {
      toast.error("Failed to add prospect");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Prospect"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>Add Prospect</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Investor Name" required>
          <Input
            value={form.investorName}
            onChange={(e) => set("investorName", e.target.value)}
            placeholder="e.g. CalPERS"
          />
        </FormField>
        <FormField label="Investor Type">
          <Select
            value={form.investorType}
            onChange={(e) => set("investorType", e.target.value)}
            options={INVESTOR_TYPES}
            placeholder="Select type..."
          />
        </FormField>
        <FormField label="Target Amount ($)">
          <Input
            type="number"
            value={form.targetAmount}
            onChange={(e) => set("targetAmount", e.target.value)}
            placeholder="e.g. 50000000"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Contact Name">
            <Input
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Jane Smith"
            />
          </FormField>
          <FormField label="Contact Email">
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="jane@example.com"
            />
          </FormField>
        </div>
        <FormField label="Notes">
          <textarea
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:bg-gray-800 dark:text-gray-100 min-h-[80px] resize-none"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Additional notes..."
          />
        </FormField>
      </div>
    </Modal>
  );
}
