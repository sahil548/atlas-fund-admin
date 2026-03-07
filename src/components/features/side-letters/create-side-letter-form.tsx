"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";
import { CreateSideLetterSchema } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props { open: boolean; onClose: () => void }

export function CreateSideLetterForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/side-letters", { revalidateKeys: ["/api/side-letters"] });
  const { data: investors } = useSWR(open ? `/api/investors?firmId=${firmId}` : null, fetcher);
  const { data: entities } = useSWR(open ? `/api/entities?firmId=${firmId}` : null, fetcher);
  const [form, setForm] = useState({ investorId: "", entityId: "", terms: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const result = CreateSideLetterSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Side letter created");
      setForm({ investorId: "", entityId: "", terms: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to create side letter"); }
  }

  const investorOptions = [
    { value: "", label: "Select investor..." },
    ...(investors || []).map((i: any) => ({ value: i.id, label: i.name })),
  ];
  const entityOptions = [
    { value: "", label: "Select entity..." },
    ...(entities || []).map((e: any) => ({ value: e.id, label: e.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Add Side Letter" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create</Button></>}>
      <div className="space-y-3">
        <FormField label="Investor" required error={errors.investorId}>
          <Select value={form.investorId} onChange={(e) => set("investorId", e.target.value)} options={investorOptions} />
        </FormField>
        <FormField label="Entity" required error={errors.entityId}>
          <Select value={form.entityId} onChange={(e) => set("entityId", e.target.value)} options={entityOptions} />
        </FormField>
        <FormField label="Terms" required error={errors.terms}>
          <Textarea value={form.terms} onChange={(e) => set("terms", e.target.value)} placeholder="Side letter terms..." rows={4} />
        </FormField>
      </div>
    </Modal>
  );
}
