"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const ROLES = [
  { value: "GP_ADMIN", label: "GP Admin" },
  { value: "GP_TEAM", label: "GP Team" },
  { value: "LP_INVESTOR", label: "LP Investor" },
  { value: "SERVICE_PROVIDER", label: "Service Provider" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateUserForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/users", { revalidateKeys: [`/api/users?firmId=${firmId}`] });
  const { data: contacts } = useSWR(
    open ? `/api/contacts?firmId=${firmId}&unlinked=true` : null,
    fetcher
  );
  const [form, setForm] = useState({ contactId: "", role: "GP_TEAM" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Build contact options for dropdown
  const contactOptions = (contacts || []).map((c: any) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ""}${c.company ? ` — ${c.company.name}` : ""}`,
  }));

  async function handleSubmit() {
    if (!form.contactId) {
      toast.error("Please select a contact");
      return;
    }
    try {
      await trigger({ contactId: form.contactId, role: form.role, firmId });
      toast.success("Team member added");
      setForm({ contactId: "", role: "GP_TEAM" });
      onClose();
    } catch {
      toast.error("Failed to add team member");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Team Member"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Add Member</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Person" required>
          <Select
            value={form.contactId}
            onChange={(e) => set("contactId", e.target.value)}
            options={[{ value: "", label: "— Select a contact —" }, ...contactOptions]}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Only contacts without an existing user account are shown.
            Add new contacts in the Contacts tab first.
          </p>
        </FormField>
        <FormField label="Role">
          <Select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            options={ROLES}
          />
        </FormField>
      </div>
    </Modal>
  );
}
