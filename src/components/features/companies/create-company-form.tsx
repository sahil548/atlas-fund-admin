"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";
import { CreateCompanySchema } from "@/lib/schemas";

const COMPANY_TYPES = [
  { value: "OTHER", label: "Other" },
  { value: "GP", label: "GP" },
  { value: "LP", label: "LP" },
  { value: "COUNTERPARTY", label: "Counterparty" },
  { value: "SERVICE_PROVIDER", label: "Service Provider" },
  { value: "OPERATING_COMPANY", label: "Operating Co." },
];

interface Props { open: boolean; onClose: () => void }

export function CreateCompanyForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/companies", { revalidateKeys: ["/api/companies"] });
  const [form, setForm] = useState({ name: "", type: "OTHER", industry: "", website: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload = { ...form, firmId };
    const result = CreateCompanySchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Company created");
      setForm({ name: "", type: "OTHER", industry: "", website: "", notes: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to create company"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Company" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create</Button></>}>
      <div className="space-y-3">
        <FormField label="Company Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} error={!!errors.name} placeholder="e.g. Acme Capital" />
        </FormField>
        <FormField label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)} options={COMPANY_TYPES} />
        </FormField>
        <FormField label="Industry">
          <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Financial Services" />
        </FormField>
        <FormField label="Website">
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="e.g. https://acme.com" />
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes about this company..." rows={2} />
        </FormField>
      </div>
    </Modal>
  );
}
