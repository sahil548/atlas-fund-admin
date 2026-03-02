"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props { open: boolean; onClose: () => void; dealId: string }

export function AddWorkstreamForm({ open, onClose, dealId }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/deals/${dealId}/workstreams`, { revalidateKeys: [`/api/deals/${dealId}`] });
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    try {
      await trigger({ dealId, name: name.trim() });
      toast.success("Workstream added");
      setName("");
      setError("");
      onClose();
    } catch { toast.error("Failed to add workstream"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add DD Workstream" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Add Workstream</Button></>}>
      <FormField label="Workstream Name" required error={error}><Input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} error={!!error} placeholder="e.g. Legal DD" /></FormField>
    </Modal>
  );
}
