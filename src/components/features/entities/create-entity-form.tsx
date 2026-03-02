"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const entityTypes = [
  { value: "MAIN_FUND", label: "Main Fund" },
  { value: "SIDECAR", label: "Sidecar" },
  { value: "SPV", label: "SPV" },
  { value: "CO_INVEST_VEHICLE", label: "Co-Invest Vehicle" },
  { value: "GP_ENTITY", label: "GP Entity" },
  { value: "HOLDING_COMPANY", label: "Holding Company" },
];

const vehicleStructures = [
  { value: "LLC", label: "LLC" },
  { value: "LP", label: "LP" },
  { value: "CORP", label: "Corp" },
  { value: "TRUST", label: "Trust" },
];

interface Props { open: boolean; onClose: () => void }

export function CreateEntityForm({ open, onClose }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation("/api/entities", { method: "POST", revalidateKeys: ["/api/entities"] });
  const [form, setForm] = useState({
    name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC",
    vintageYear: "", targetSize: "", legalName: "", stateOfFormation: "",
    ein: "", fiscalYearEnd: "", fundTermYears: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit() {
    if (!form.name.trim()) return;
    try {
      await trigger({
        name: form.name,
        entityType: form.entityType,
        vehicleStructure: form.vehicleStructure,
        ...(form.vintageYear ? { vintageYear: Number(form.vintageYear) } : {}),
        ...(form.targetSize ? { targetSize: Number(form.targetSize) } : {}),
        ...(form.legalName ? { legalName: form.legalName } : {}),
        ...(form.stateOfFormation ? { stateOfFormation: form.stateOfFormation } : {}),
        ...(form.ein ? { ein: form.ein } : {}),
        ...(form.fiscalYearEnd ? { fiscalYearEnd: form.fiscalYearEnd } : {}),
        ...(form.fundTermYears ? { fundTermYears: Number(form.fundTermYears) } : {}),
      });
      toast.success("Entity created");
      setForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC", vintageYear: "", targetSize: "", legalName: "", stateOfFormation: "", ein: "", fiscalYearEnd: "", fundTermYears: "" });
      onClose();
    } catch { toast.error("Failed to create entity"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Entity" size="md" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Create</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Entity Name *"><Input value={form.name} onChange={set("name")} placeholder="e.g. Atlas Fund IV" /></FormField>
          <FormField label="Legal Name"><Input value={form.legalName} onChange={set("legalName")} placeholder="e.g. Atlas Fund IV, LLC" /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Entity Type"><Select value={form.entityType} onChange={set("entityType")} options={entityTypes} /></FormField>
          <FormField label="Vehicle Structure"><Select value={form.vehicleStructure} onChange={set("vehicleStructure")} options={vehicleStructures} /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Vintage Year"><Input type="number" value={form.vintageYear} onChange={set("vintageYear")} placeholder="e.g. 2024" /></FormField>
          <FormField label="Target Size ($)"><Input type="number" value={form.targetSize} onChange={set("targetSize")} placeholder="e.g. 50000000" /></FormField>
          <FormField label="Fund Term (years)"><Input type="number" value={form.fundTermYears} onChange={set("fundTermYears")} placeholder="e.g. 10" /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="State of Formation"><Input value={form.stateOfFormation} onChange={set("stateOfFormation")} placeholder="e.g. Delaware" /></FormField>
          <FormField label="EIN"><Input value={form.ein} onChange={set("ein")} placeholder="XX-XXXXXXX" /></FormField>
          <FormField label="Fiscal Year End"><Input value={form.fiscalYearEnd} onChange={set("fiscalYearEnd")} placeholder="e.g. December" /></FormField>
        </div>
      </div>
    </Modal>
  );
}
