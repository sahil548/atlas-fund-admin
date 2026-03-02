"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const CATEGORIES = [
  { value: "BOARD", label: "Board" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEGAL", label: "Legal" },
  { value: "GOVERNANCE", label: "Governance" },
  { value: "VALUATION", label: "Valuation" },
  { value: "STATEMENT", label: "Statement" },
  { value: "TAX", label: "Tax" },
  { value: "REPORT", label: "Report" },
  { value: "NOTICE", label: "Notice" },
  { value: "OTHER", label: "Other" },
];

interface Props { open: boolean; onClose: () => void; assetId: string; entityId?: string }

export function UploadDocumentForm({ open, onClose, assetId, entityId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${assetId}/documents`, { revalidateKeys: [`/api/assets/${assetId}`] });
  const [form, setForm] = useState({ name: "", category: "FINANCIAL" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    try {
      await trigger({ ...form, assetId, entityId });
      toast.success("Document added");
      setForm({ name: "", category: "FINANCIAL" });
      setError("");
      onClose();
    } catch { toast.error("Failed to add document"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Document" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Add Document</Button></>}>
      <div className="space-y-3">
        <FormField label="Document Name" required error={error}><Input value={form.name} onChange={(e) => { set("name", e.target.value); setError(""); }} error={!!error} placeholder="e.g. Q4 2024 Financials" /></FormField>
        <FormField label="Category"><Select value={form.category} onChange={(e) => set("category", e.target.value)} options={CATEGORIES} /></FormField>
      </div>
    </Modal>
  );
}
