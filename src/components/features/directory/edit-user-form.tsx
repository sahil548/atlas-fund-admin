"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";

const ROLES = [
  { value: "GP_ADMIN", label: "GP Admin" },
  { value: "GP_TEAM", label: "GP Team" },
  { value: "LP_INVESTOR", label: "LP Investor" },
  { value: "SERVICE_PROVIDER", label: "Service Provider" },
];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserRow;
}

export function EditUserForm({ open, onClose, user }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation(`/api/users/${user.id}`, {
    method: "PUT",
    revalidateKeys: [`/api/users?firmId=${firmId}`],
  });
  const [form, setForm] = useState({ name: "", email: "", role: "", isActive: true });

  useEffect(() => {
    if (open) {
      setForm({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [open, user]);

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await trigger(form);
      toast.success("User updated");
      onClose();
    } catch {
      toast.error("Failed to update user");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Team Member"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Full Name" required>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>
        <FormField label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </FormField>
        <FormField label="Role">
          <Select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            options={ROLES}
          />
        </FormField>
        <FormField label="Status">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded border-gray-300"
            />
            Active
          </label>
        </FormField>
      </div>
    </Modal>
  );
}
