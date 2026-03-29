"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

interface Props {
  open: boolean;
  onClose: () => void;
  capitalCall: {
    id: string;
    callNumber: string;
    callDate: string;
    dueDate: string;
    amount: number;
    purpose: string | null;
    status: string;
  };
}

export function EditCapitalCallForm({ open, onClose, capitalCall }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/capital-calls/${capitalCall.id}`, {
    method: "PATCH",
    revalidateKeys: ["/api/capital-calls", `/api/capital-calls/${capitalCall.id}`],
  });

  const [form, setForm] = useState({
    callNumber: "",
    callDate: "",
    dueDate: "",
    amount: "",
    purpose: "",
  });

  const isDraft = capitalCall.status === "DRAFT";

  useEffect(() => {
    if (open) {
      setForm({
        callNumber: capitalCall.callNumber || "",
        callDate: capitalCall.callDate ? capitalCall.callDate.slice(0, 10) : "",
        dueDate: capitalCall.dueDate ? capitalCall.dueDate.slice(0, 10) : "",
        amount: String(capitalCall.amount || ""),
        purpose: capitalCall.purpose || "",
      });
    }
  }, [open, capitalCall]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload: Record<string, unknown> = {};
    if (form.purpose !== (capitalCall.purpose || "")) payload.purpose = form.purpose;
    if (form.dueDate !== capitalCall.dueDate?.slice(0, 10)) payload.dueDate = form.dueDate;
    if (isDraft) {
      if (form.callNumber !== capitalCall.callNumber) payload.callNumber = form.callNumber;
      if (form.callDate !== capitalCall.callDate?.slice(0, 10)) payload.callDate = form.callDate;
      const newAmount = Number(form.amount);
      if (newAmount && newAmount !== capitalCall.amount) payload.amount = newAmount;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await trigger(payload);
      toast.success("Capital call updated");
      onClose();
    } catch {
      toast.error("Failed to update capital call");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Capital Call"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Call Number">
            <Input value={form.callNumber} onChange={(e) => set("callNumber", e.target.value)} disabled={!isDraft} />
          </FormField>
          <FormField label="Amount">
            <CurrencyInput value={form.amount} onChange={(v) => set("amount", v)} disabled={!isDraft} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Call Date">
            <Input type="date" value={form.callDate} onChange={(e) => set("callDate", e.target.value)} disabled={!isDraft} />
          </FormField>
          <FormField label="Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </FormField>
        </div>
        <FormField label="Purpose">
          <Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="e.g., Initial capital call for fund deployment" />
        </FormField>
        {!isDraft && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Amount, call number, and call date can only be edited while the capital call is in DRAFT status.
          </p>
        )}
      </div>
    </Modal>
  );
}
