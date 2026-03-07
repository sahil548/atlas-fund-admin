"use client";

import { useState, useEffect } from "react";
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

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  type: string;
  companyId: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contact: ContactRow;
}

export function EditContactForm({ open, onClose, contact }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation(`/api/contacts/${contact.id}`, {
    method: "PUT",
    revalidateKeys: [`/api/contacts?firmId=${firmId}`],
  });
  const { data: companies } = useSWR(`/api/companies?firmId=${firmId}`, fetcher);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    type: "EXTERNAL",
    companyId: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        title: contact.title || "",
        type: contact.type || "EXTERNAL",
        companyId: contact.companyId || "",
        notes: contact.notes || "",
      });
    }
  }, [open, contact]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    try {
      await trigger({
        ...form,
        companyId: form.companyId || null,
      });
      toast.success("Contact updated");
      onClose();
    } catch {
      toast.error("Failed to update contact");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Contact"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" required>
            <Input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="First name"
            />
          </FormField>
          <FormField label="Last Name" required>
            <Input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Last name"
            />
          </FormField>
        </div>
        <FormField label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@company.com"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </FormField>
          <FormField label="Title">
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Managing Director"
            />
          </FormField>
        </div>
        <FormField label="Company">
          <Select
            value={form.companyId}
            onChange={(e) => set("companyId", e.target.value)}
            options={[
              { value: "", label: "\u2014 No company \u2014" },
              ...(companies || []).map((c: any) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FormField>
        <FormField label="Type">
          <Select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            options={[
              { value: "EXTERNAL", label: "External" },
              { value: "INTERNAL", label: "Internal" },
            ]}
          />
        </FormField>
        <FormField label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Notes about this contact..."
            rows={2}
          />
        </FormField>
      </div>
    </Modal>
  );
}
