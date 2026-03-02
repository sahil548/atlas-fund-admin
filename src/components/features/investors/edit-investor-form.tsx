"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const TYPES = [
  { value: "Pension", label: "Pension" },
  { value: "Endowment", label: "Endowment" },
  { value: "Family Office", label: "Family Office" },
  { value: "Fund of Funds", label: "Fund of Funds" },
  { value: "Sovereign Wealth", label: "Sovereign Wealth" },
  { value: "Insurance", label: "Insurance" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  investor: { id: string; name: string; investorType: string; totalCommitted: number; kycStatus: string; advisoryBoard: boolean; contactPreference: string };
}

export function EditInvestorForm({ open, onClose, investor }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/investors/${investor.id}`, { method: "PUT", revalidateKeys: ["/api/investors"] });
  const [form, setForm] = useState({ name: "", investorType: "", totalCommitted: "", kycStatus: "", advisoryBoard: false, contactPreference: "" });

  useEffect(() => {
    if (open) setForm({
      name: investor.name,
      investorType: investor.investorType,
      totalCommitted: String(investor.totalCommitted),
      kycStatus: investor.kycStatus,
      advisoryBoard: investor.advisoryBoard,
      contactPreference: investor.contactPreference || "Email",
    });
  }, [open, investor]);

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    try {
      await trigger({ ...form, totalCommitted: Number(form.totalCommitted) || 0 });
      toast.success("Investor updated");
      onClose();
    } catch { toast.error("Failed to update investor"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Investor" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">
        <FormField label="Investor Name" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type"><Select value={form.investorType} onChange={(e) => set("investorType", e.target.value)} options={TYPES} /></FormField>
          <FormField label="Total Committed ($)"><Input type="number" value={form.totalCommitted} onChange={(e) => set("totalCommitted", e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="KYC Status"><Select value={form.kycStatus} onChange={(e) => set("kycStatus", e.target.value)} options={[{ value: "Pending", label: "Pending" }, { value: "Verified", label: "Verified" }, { value: "Expiring", label: "Expiring" }]} /></FormField>
          <FormField label="Contact Preference"><Select value={form.contactPreference} onChange={(e) => set("contactPreference", e.target.value)} options={[{ value: "Email", label: "Email" }, { value: "Text", label: "Text" }]} /></FormField>
        </div>
        <FormField label="Advisory Board">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.advisoryBoard} onChange={(e) => set("advisoryBoard", e.target.checked)} className="rounded border-gray-300" />
            Member of advisory board
          </label>
        </FormField>
      </div>
    </Modal>
  );
}
