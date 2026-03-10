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
import { useFirm } from "@/components/providers/firm-provider";
import useSWR from "swr";
import {
  ASSET_CLASS_LABELS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
} from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ASSET_CLASS_OPTIONS = Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => ({ value, label }));
const INSTRUMENT_OPTIONS = [{ value: "", label: "None" }, ...Object.entries(CAPITAL_INSTRUMENT_LABELS).map(([value, label]) => ({ value, label }))];
const PARTICIPATION_OPTIONS = [{ value: "", label: "None" }, ...Object.entries(PARTICIPATION_LABELS).map(([value, label]) => ({ value, label }))];
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXITED", label: "Exited" },
  { value: "WRITTEN_OFF", label: "Written Off" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAssetForm({ open, onClose }: Props) {
  const toast = useToast();
  const { firmId } = useFirm();
  const { trigger, isLoading } = useMutation("/api/assets", {
    method: "POST",
    revalidateKeys: ["/api/assets"],
  });

  const { data: entitiesData } = useSWR(
    open ? `/api/entities?firmId=${firmId}&limit=100` : null,
    fetcher,
  );

  const entities = entitiesData?.data ?? [];

  const [form, setForm] = useState({
    name: "",
    assetClass: "OPERATING_BUSINESS",
    capitalInstrument: "",
    participationStructure: "",
    sector: "",
    status: "ACTIVE",
    costBasis: "",
    fairValue: "",
    incomeType: "",
    entityId: "",
    allocationPercent: "100",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        assetClass: "OPERATING_BUSINESS",
        capitalInstrument: "",
        participationStructure: "",
        sector: "",
        status: "ACTIVE",
        costBasis: "",
        fairValue: "",
        incomeType: "",
        entityId: "",
        allocationPercent: "100",
      });
      setErrors({});
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.costBasis) newErrors.costBasis = "Cost basis is required";
    if (!form.fairValue) newErrors.fairValue = "Fair value is required";
    if (!form.entityId) newErrors.entityId = "Entity is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await trigger({
        name: form.name.trim(),
        assetClass: form.assetClass,
        capitalInstrument: form.capitalInstrument || undefined,
        participationStructure: form.participationStructure || undefined,
        sector: form.sector || undefined,
        status: form.status,
        costBasis: Number(form.costBasis),
        fairValue: Number(form.fairValue),
        incomeType: form.incomeType || undefined,
        entityId: form.entityId,
        allocationPercent: Number(form.allocationPercent) || 100,
        firmId,
      });
      toast.success("Asset created");
      onClose();
    } catch {
      toast.error("Failed to create asset");
    }
  }

  const entityOptions = entities.map((e: { id: string; name: string }) => ({
    value: e.id,
    label: e.name,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Asset"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Create Asset</Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Asset Name" error={errors.name} required>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. NovaTech AI"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Asset Class" required>
            <Select value={form.assetClass} onChange={(e) => set("assetClass", e.target.value)} options={ASSET_CLASS_OPTIONS} />
          </FormField>
          <FormField label="Entity" error={errors.entityId} required>
            <Select
              value={form.entityId}
              onChange={(e) => set("entityId", e.target.value)}
              options={[{ value: "", label: "Select entity..." }, ...entityOptions]}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cost Basis ($)" error={errors.costBasis} required>
            <CurrencyInput value={form.costBasis} onChange={(v) => set("costBasis", v)} error={!!errors.costBasis} placeholder="0" />
          </FormField>
          <FormField label="Fair Value ($)" error={errors.fairValue} required>
            <CurrencyInput value={form.fairValue} onChange={(v) => set("fairValue", v)} error={!!errors.fairValue} placeholder="0" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Instrument">
            <Select value={form.capitalInstrument} onChange={(e) => set("capitalInstrument", e.target.value)} options={INSTRUMENT_OPTIONS} />
          </FormField>
          <FormField label="Participation">
            <Select value={form.participationStructure} onChange={(e) => set("participationStructure", e.target.value)} options={PARTICIPATION_OPTIONS} />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Sector">
            <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Technology" />
          </FormField>
          <FormField label="Income Type">
            <Input value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)} placeholder="e.g. Dividends" />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)} options={STATUS_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Allocation %">
          <Input type="number" value={form.allocationPercent} onChange={(e) => set("allocationPercent", e.target.value)} placeholder="100" />
        </FormField>
      </div>
    </Modal>
  );
}
