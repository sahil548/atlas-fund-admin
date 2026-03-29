"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXITED", label: "Exited" },
  { value: "WRITTEN_OFF", label: "Written Off" },
];

const ASSET_CLASSES = [
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "PUBLIC_SECURITIES", label: "Public Securities" },
  { value: "OPERATING_BUSINESS", label: "Operating Business" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "COMMODITIES", label: "Commodities" },
  { value: "DIVERSIFIED", label: "Diversified" },
  { value: "NON_CORRELATED", label: "Non-Correlated" },
  { value: "CASH_AND_EQUIVALENTS", label: "Cash & Equivalents" },
];

const CAPITAL_INSTRUMENTS = [
  { value: "", label: "None" },
  { value: "DEBT", label: "Debt" },
  { value: "EQUITY", label: "Equity" },
];

const PARTICIPATION_STRUCTURES = [
  { value: "", label: "None" },
  { value: "DIRECT_GP", label: "Direct / GP" },
  { value: "CO_INVEST_JV_PARTNERSHIP", label: "Co-Invest / JV / Partnership" },
  { value: "LP_STAKE_SILENT_PARTNER", label: "LP Stake / Silent Partner" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  asset: {
    id: string;
    fairValue: number;
    status: string;
    sector?: string;
    incomeType?: string;
    assetClass?: string;
    capitalInstrument?: string | null;
    participationStructure?: string | null;
    projectedIRR?: number | null;
    projectedMultiple?: number | null;
  };
}

export function EditAssetForm({ open, onClose, asset }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${asset.id}`, { method: "PUT", revalidateKeys: ["/api/assets", `/api/assets/${asset.id}`] });
  const [form, setForm] = useState({
    fairValue: "",
    status: "",
    sector: "",
    incomeType: "",
    assetClass: "",
    capitalInstrument: "",
    participationStructure: "",
    projectedIRR: "",
    projectedMultiple: "",
  });

  useEffect(() => {
    if (open) setForm({
      fairValue: String(asset.fairValue || ""),
      status: asset.status || "ACTIVE",
      sector: asset.sector || "",
      incomeType: asset.incomeType || "",
      assetClass: asset.assetClass || "",
      capitalInstrument: asset.capitalInstrument || "",
      participationStructure: asset.participationStructure || "",
      projectedIRR: asset.projectedIRR != null ? String(asset.projectedIRR) : "",
      projectedMultiple: asset.projectedMultiple != null ? String(asset.projectedMultiple) : "",
    });
  }, [open, asset]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const payload: Record<string, unknown> = {};
    if (form.fairValue) payload.fairValue = Number(form.fairValue);
    if (form.status) payload.status = form.status;
    if (form.sector) payload.sector = form.sector;
    if (form.incomeType) payload.incomeType = form.incomeType;
    if (form.assetClass) payload.assetClass = form.assetClass;
    payload.capitalInstrument = form.capitalInstrument || null;
    payload.participationStructure = form.participationStructure || null;
    if (form.projectedIRR) payload.projectedIRR = Number(form.projectedIRR);
    else payload.projectedIRR = null;
    if (form.projectedMultiple) payload.projectedMultiple = Number(form.projectedMultiple);
    else payload.projectedMultiple = null;
    try {
      await trigger(payload);
      toast.success("Asset updated");
      onClose();
    } catch { toast.error("Failed to update asset"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Asset" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fair Value"><CurrencyInput value={form.fairValue} onChange={(v) => set("fairValue", v)} /></FormField>
          <FormField label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={STATUSES} /></FormField>
        </div>
        <FormField label="Asset Class">
          <Select value={form.assetClass} onChange={(e) => set("assetClass", e.target.value)} options={ASSET_CLASSES} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Capital Instrument"><Select value={form.capitalInstrument} onChange={(e) => set("capitalInstrument", e.target.value)} options={CAPITAL_INSTRUMENTS} /></FormField>
          <FormField label="Participation Structure"><Select value={form.participationStructure} onChange={(e) => set("participationStructure", e.target.value)} options={PARTICIPATION_STRUCTURES} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sector"><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} /></FormField>
          <FormField label="Income Type"><Input value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Projected IRR (%)"><Input type="number" step="0.01" value={form.projectedIRR} onChange={(e) => set("projectedIRR", e.target.value)} placeholder="e.g., 15.5" /></FormField>
          <FormField label="Projected Multiple (x)"><Input type="number" step="0.01" value={form.projectedMultiple} onChange={(e) => set("projectedMultiple", e.target.value)} placeholder="e.g., 2.0" /></FormField>
        </div>
      </div>
    </Modal>
  );
}
