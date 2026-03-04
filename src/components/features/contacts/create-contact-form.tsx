"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";
import { CreateContactSchema } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props { open: boolean; onClose: () => void }

export function CreateContactForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/contacts", { revalidateKeys: ["/api/contacts"] });
  const { data: companies } = useSWR(open ? `/api/companies?firmId=${firmId}` : null, fetcher);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", type: "EXTERNAL", companyId: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload = { ...form, firmId, companyId: form.companyId || undefined };
    const result = CreateContactSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Contact created");
      setForm({ firstName: "", lastName: "", email: "", phone: "", title: "", type: "EXTERNAL", companyId: "", notes: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to create contact"); }
  }

  const companyOptions = [
    { value: "", label: "\u2014 No company \u2014" },
    ...(companies || []).map((c: any) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Add Contact" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" required error={errors.firstName}>
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} error={!!errors.firstName} placeholder="First name" />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} error={!!errors.lastName} placeholder="Last name" />
          </FormField>
        </div>
        <FormField label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@company.com" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
          </FormField>
          <FormField label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Managing Director" />
          </FormField>
        </div>
        <FormField label="Company">
          <Select value={form.companyId} onChange={(e) => set("companyId", e.target.value)} options={companyOptions} />
        </FormField>
        <FormField label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)} options={[{ value: "EXTERNAL", label: "External" }, { value: "INTERNAL", label: "Internal" }]} />
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes..." rows={2} />
        </FormField>
      </div>
    </Modal>
  );
}
