"use client";

import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { useFirm } from "@/components/providers/firm-provider";
import { CreateInvestorSchema } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const TYPES = [
  { value: "Individual", label: "Individual" },
  { value: "LLC", label: "LLC" },
  { value: "Disregarded LLC", label: "Disregarded LLC" },
  { value: "Partnership", label: "Partnership" },
  { value: "Trust", label: "Trust" },
  { value: "Pension", label: "Pension" },
  { value: "Endowment", label: "Endowment" },
  { value: "Family Office", label: "Family Office" },
  { value: "Fund of Funds", label: "Fund of Funds" },
  { value: "Sovereign Wealth", label: "Sovereign Wealth" },
  { value: "Insurance", label: "Insurance" },
  { value: "Institutional", label: "Institutional" },
];

interface Props { open: boolean; onClose: () => void }

export function CreateInvestorForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/investors", { revalidateKeys: ["/api/investors"] });
  const { data: companies } = useSWR(open ? `/api/companies?firmId=${firmId}` : null, fetcher);
  const { data: contacts } = useSWR(open ? `/api/contacts?firmId=${firmId}` : null, fetcher);
  const [form, setForm] = useState({
    name: "",
    investorType: "Individual",
    totalCommitted: "",
    kycStatus: "Pending",
    advisoryBoard: false,
    contactPreference: "Email",
    companyId: "",
    contactId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-fill name when company is selected
  function handleCompanyChange(companyId: string) {
    set("companyId", companyId);
    if (companyId && !form.name) {
      const company = (companies || []).find((c: any) => c.id === companyId);
      if (company) set("name", company.name);
    }
  }

  // Auto-fill name when contact is selected (if no company selected)
  function handleContactChange(contactId: string) {
    set("contactId", contactId);
    if (contactId && !form.name && !form.companyId) {
      const contact = (contacts || []).find((c: any) => c.id === contactId);
      if (contact) set("name", `${contact.firstName} ${contact.lastName}`);
    }
  }

  // Build dropdown options
  const companyOptions = [
    { value: "", label: "— None —" },
    ...(companies || []).map((c: any) => ({
      value: c.id,
      label: `${c.name} (${c.type})`,
    })),
  ];

  const contactOptions = [
    { value: "", label: "— None —" },
    ...(contacts || []).map((c: any) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ""}`,
    })),
  ];

  async function handleSubmit() {
    // Client-side validation: at least one of companyId or contactId
    if (!form.companyId && !form.contactId) {
      setErrors({ companyId: "Select a company or contact" });
      toast.error("An investor must be linked to a company or a contact");
      return;
    }

    const payload = {
      ...form,
      totalCommitted: Number(form.totalCommitted) || 0,
      companyId: form.companyId || undefined,
      contactId: form.contactId || undefined,
    };
    const result = CreateInvestorSchema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""])));
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Investor added");
      setForm({ name: "", investorType: "Individual", totalCommitted: "", kycStatus: "Pending", advisoryBoard: false, contactPreference: "Email", companyId: "", contactId: "" });
      setErrors({});
      onClose();
    } catch { toast.error("Failed to add investor"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Investor" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Add Investor</Button></>}>
      <div className="space-y-3">
        <FormField label="Company" error={errors.companyId}>
          <Select
            value={form.companyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            options={companyOptions}
          />
          <p className="text-[10px] text-gray-500 mt-1">The organization this investor represents.</p>
        </FormField>
        <FormField label="Primary Contact">
          <Select
            value={form.contactId}
            onChange={(e) => handleContactChange(e.target.value)}
            options={contactOptions}
          />
        </FormField>
        {!form.companyId && !form.contactId && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            At least one of Company or Contact is required.
          </div>
        )}
        <FormField label="Investor Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} error={!!errors.name} placeholder="Auto-fills from company/contact selection" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type" required>
            <Select value={form.investorType} onChange={(e) => set("investorType", e.target.value)} options={TYPES} />
          </FormField>
          <FormField label="Total Committed ($)">
            <CurrencyInput value={form.totalCommitted} onChange={(v) => set("totalCommitted", v)} placeholder="e.g. 50,000,000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="KYC Status">
            <Select value={form.kycStatus} onChange={(e) => set("kycStatus", e.target.value)} options={[{ value: "Pending", label: "Pending" }, { value: "Verified", label: "Verified" }, { value: "Expiring", label: "Expiring" }]} />
          </FormField>
          <FormField label="Contact Preference">
            <Select value={form.contactPreference} onChange={(e) => set("contactPreference", e.target.value)} options={[{ value: "Email", label: "Email" }, { value: "Text", label: "Text" }]} />
          </FormField>
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
