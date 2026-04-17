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

// Phase 22-10: mirror the Edit Asset form's type-conditional kind detection so Add Asset surfaces
// the right per-type scalar fieldset based on the user's selection at creation time.
type AssetKind = "REAL_ESTATE" | "PRIVATE_CREDIT" | "OPERATING" | "LP_INTEREST" | null;

function deriveKind(assetClass: string, capitalInstrument: string, participationStructure: string): AssetKind {
  if (assetClass === "REAL_ESTATE") return "REAL_ESTATE";
  if (capitalInstrument === "DEBT") return "PRIVATE_CREDIT";
  if (participationStructure === "LP_STAKE_SILENT_PARTNER") return "LP_INTEREST";
  if (assetClass === "OPERATING_BUSINESS") return "OPERATING";
  return null;
}

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
    entryDate: new Date().toISOString().slice(0, 10),
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
    projectedIRR: "",
    projectedMultiple: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Type-conditional detail fields per kind
  const [reForm, setReForm] = useState({ propertyType: "", squareFeet: "", occupancy: "", noi: "", capRate: "", rentPerSqft: "", debt: "", debtDscr: "" });
  const [creditForm, setCreditForm] = useState({ instrument: "", principal: "", rate: "", maturity: "", ltv: "", dscr: "", nextPaymentDate: "", accruedInterest: "" });
  const [equityForm, setEquityForm] = useState({ instrument: "", ownership: "", revenue: "", ebitda: "", growth: "", employees: "" });
  const [lpForm, setLpForm] = useState({ gpName: "", commitment: "", calledAmount: "", uncalledAmount: "", distributions: "", gpNav: "", navDate: "", gpIrr: "", gpTvpi: "", vintage: "", strategy: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        entryDate: new Date().toISOString().slice(0, 10),
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
        projectedIRR: "",
        projectedMultiple: "",
      });
      setReForm({ propertyType: "", squareFeet: "", occupancy: "", noi: "", capRate: "", rentPerSqft: "", debt: "", debtDscr: "" });
      setCreditForm({ instrument: "", principal: "", rate: "", maturity: "", ltv: "", dscr: "", nextPaymentDate: "", accruedInterest: "" });
      setEquityForm({ instrument: "", ownership: "", revenue: "", ebitda: "", growth: "", employees: "" });
      setLpForm({ gpName: "", commitment: "", calledAmount: "", uncalledAmount: "", distributions: "", gpNav: "", navDate: "", gpIrr: "", gpTvpi: "", vintage: "", strategy: "" });
      setErrors({});
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const kind = deriveKind(form.assetClass, form.capitalInstrument, form.participationStructure);

  // Build the typeDetails payload for submit, if any detail field has been filled in for the current kind.
  function buildTypeDetailsPayload(): Record<string, unknown> | undefined {
    if (kind === "REAL_ESTATE") {
      const entries = Object.entries(reForm).filter(([, v]) => v !== "");
      if (entries.length === 0) return undefined;
      return { kind: "REAL_ESTATE", ...Object.fromEntries(entries) };
    }
    if (kind === "PRIVATE_CREDIT") {
      const entries = Object.entries(creditForm).filter(([, v]) => v !== "");
      if (entries.length === 0) return undefined;
      return { kind: "PRIVATE_CREDIT", ...Object.fromEntries(entries) };
    }
    if (kind === "OPERATING") {
      const entries = Object.entries(equityForm).filter(([, v]) => v !== "");
      if (entries.length === 0) return undefined;
      const cleaned: Record<string, string | number> = {};
      for (const [k, v] of entries) cleaned[k] = k === "employees" ? Number(v) : v;
      return { kind: "OPERATING", ...cleaned };
    }
    if (kind === "LP_INTEREST") {
      const entries = Object.entries(lpForm).filter(([, v]) => v !== "");
      if (entries.length === 0) return undefined;
      const cleaned: Record<string, string | number> = {};
      for (const [k, v] of entries) cleaned[k] = k === "vintage" ? Number(v) : v;
      return { kind: "LP_INTEREST", ...cleaned };
    }
    return undefined;
  }

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
      const payload: Record<string, unknown> = {
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
      };
      if (form.entryDate) payload.entryDate = new Date(form.entryDate).toISOString();
      if (form.projectedIRR) payload.projectedIRR = Number(form.projectedIRR);
      if (form.projectedMultiple) payload.projectedMultiple = Number(form.projectedMultiple);
      const typeDetails = buildTypeDetailsPayload();
      if (typeDetails) payload.typeDetails = typeDetails;

      await trigger(payload);
      toast.success("Asset created");
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: string };
      const msg = typeof errObj?.error === "string" ? errObj.error : typeof errObj?.message === "string" ? errObj.message : "Failed to create asset";
      toast.error(msg);
    }
  }

  const entityOptions = entities.map((e: { id: string; name: string }) => ({
    value: e.id,
    label: e.name,
  }));

  const sectionLabel = kind === "REAL_ESTATE" ? "Real Estate Details"
    : kind === "PRIVATE_CREDIT" ? "Credit Facility Details"
    : kind === "OPERATING" ? "Ownership & Financials"
    : kind === "LP_INTEREST" ? "Fund LP Details"
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Asset"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Create Asset</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Asset Name" error={errors.name} required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. NovaTech AI"
            />
          </FormField>
          <FormField label="Entry Date">
            <Input type="date" value={form.entryDate} onChange={(e) => set("entryDate", e.target.value)} />
          </FormField>
        </div>

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

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Projected IRR (%)">
            <Input type="number" step="0.01" value={form.projectedIRR} onChange={(e) => set("projectedIRR", e.target.value)} placeholder="e.g. 15.5" />
          </FormField>
          <FormField label="Projected Multiple (x)">
            <Input type="number" step="0.01" value={form.projectedMultiple} onChange={(e) => set("projectedMultiple", e.target.value)} placeholder="e.g. 2.0" />
          </FormField>
          <FormField label="Allocation %">
            <Input type="number" value={form.allocationPercent} onChange={(e) => set("allocationPercent", e.target.value)} placeholder="100" />
          </FormField>
        </div>

        {/* Phase 22-10: type-conditional section mirrors Edit Asset modal */}
        {kind && sectionLabel && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-2">
            <legend className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 px-1">{sectionLabel}</legend>
            <div className="space-y-3 mt-2">

              {kind === "REAL_ESTATE" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Property Type"><Input value={reForm.propertyType} onChange={(e) => setReForm((p) => ({ ...p, propertyType: e.target.value }))} placeholder="e.g. Industrial Warehouse" /></FormField>
                    <FormField label="Square Feet"><Input value={reForm.squareFeet} onChange={(e) => setReForm((p) => ({ ...p, squareFeet: e.target.value }))} placeholder="e.g. 185,000" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Occupancy"><Input value={reForm.occupancy} onChange={(e) => setReForm((p) => ({ ...p, occupancy: e.target.value }))} placeholder="e.g. 94%" /></FormField>
                    <FormField label="Cap Rate"><Input value={reForm.capRate} onChange={(e) => setReForm((p) => ({ ...p, capRate: e.target.value }))} placeholder="e.g. 6.7%" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="NOI"><Input value={reForm.noi} onChange={(e) => setReForm((p) => ({ ...p, noi: e.target.value }))} placeholder="e.g. $1,920,000" /></FormField>
                    <FormField label="Rent / Sqft"><Input value={reForm.rentPerSqft} onChange={(e) => setReForm((p) => ({ ...p, rentPerSqft: e.target.value }))} placeholder="e.g. $12.50/sqft" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Debt"><Input value={reForm.debt} onChange={(e) => setReForm((p) => ({ ...p, debt: e.target.value }))} placeholder="e.g. $14.2M @ 4.5%" /></FormField>
                    <FormField label="Debt DSCR"><Input value={reForm.debtDscr} onChange={(e) => setReForm((p) => ({ ...p, debtDscr: e.target.value }))} placeholder="e.g. 1.65x" /></FormField>
                  </div>
                </>
              )}

              {kind === "PRIVATE_CREDIT" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Instrument"><Input value={creditForm.instrument} onChange={(e) => setCreditForm((p) => ({ ...p, instrument: e.target.value }))} placeholder="e.g. Senior Secured" /></FormField>
                    <FormField label="Principal"><Input value={creditForm.principal} onChange={(e) => setCreditForm((p) => ({ ...p, principal: e.target.value }))} placeholder="e.g. $15M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Rate"><Input value={creditForm.rate} onChange={(e) => setCreditForm((p) => ({ ...p, rate: e.target.value }))} placeholder="e.g. SOFR+450bps" /></FormField>
                    <FormField label="Maturity"><Input value={creditForm.maturity} onChange={(e) => setCreditForm((p) => ({ ...p, maturity: e.target.value }))} placeholder="e.g. 2028-06-15" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="LTV"><Input value={creditForm.ltv} onChange={(e) => setCreditForm((p) => ({ ...p, ltv: e.target.value }))} placeholder="e.g. 62%" /></FormField>
                    <FormField label="DSCR"><Input value={creditForm.dscr} onChange={(e) => setCreditForm((p) => ({ ...p, dscr: e.target.value }))} placeholder="e.g. 1.8x" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Next Payment Date"><Input value={creditForm.nextPaymentDate} onChange={(e) => setCreditForm((p) => ({ ...p, nextPaymentDate: e.target.value }))} placeholder="e.g. 2025-03-15" /></FormField>
                    <FormField label="Accrued Interest"><Input value={creditForm.accruedInterest} onChange={(e) => setCreditForm((p) => ({ ...p, accruedInterest: e.target.value }))} placeholder="e.g. $187,500" /></FormField>
                  </div>
                </>
              )}

              {kind === "OPERATING" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Instrument"><Input value={equityForm.instrument} onChange={(e) => setEquityForm((p) => ({ ...p, instrument: e.target.value }))} placeholder="e.g. Series B Preferred" /></FormField>
                    <FormField label="Ownership %"><Input value={equityForm.ownership} onChange={(e) => setEquityForm((p) => ({ ...p, ownership: e.target.value }))} placeholder="e.g. 18.4%" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Revenue"><Input value={equityForm.revenue} onChange={(e) => setEquityForm((p) => ({ ...p, revenue: e.target.value }))} placeholder="e.g. $85M" /></FormField>
                    <FormField label="EBITDA"><Input value={equityForm.ebitda} onChange={(e) => setEquityForm((p) => ({ ...p, ebitda: e.target.value }))} placeholder="e.g. $22M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Growth"><Input value={equityForm.growth} onChange={(e) => setEquityForm((p) => ({ ...p, growth: e.target.value }))} placeholder="e.g. +42% YoY" /></FormField>
                    <FormField label="Employees"><Input type="number" value={equityForm.employees} onChange={(e) => setEquityForm((p) => ({ ...p, employees: e.target.value }))} placeholder="e.g. 340" /></FormField>
                  </div>
                </>
              )}

              {kind === "LP_INTEREST" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP Name"><Input value={lpForm.gpName} onChange={(e) => setLpForm((p) => ({ ...p, gpName: e.target.value }))} placeholder="e.g. Sequoia Capital" /></FormField>
                    <FormField label="Commitment"><Input value={lpForm.commitment} onChange={(e) => setLpForm((p) => ({ ...p, commitment: e.target.value }))} placeholder="e.g. $15M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Called Amount"><Input value={lpForm.calledAmount} onChange={(e) => setLpForm((p) => ({ ...p, calledAmount: e.target.value }))} placeholder="e.g. $10M (67%)" /></FormField>
                    <FormField label="Uncalled Amount"><Input value={lpForm.uncalledAmount} onChange={(e) => setLpForm((p) => ({ ...p, uncalledAmount: e.target.value }))} placeholder="e.g. $5M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP NAV"><Input value={lpForm.gpNav} onChange={(e) => setLpForm((p) => ({ ...p, gpNav: e.target.value }))} placeholder="e.g. $14.2M" /></FormField>
                    <FormField label="NAV Date"><Input value={lpForm.navDate} onChange={(e) => setLpForm((p) => ({ ...p, navDate: e.target.value }))} placeholder="e.g. 2024-12-31" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP IRR"><Input value={lpForm.gpIrr} onChange={(e) => setLpForm((p) => ({ ...p, gpIrr: e.target.value }))} placeholder="e.g. 24.5%" /></FormField>
                    <FormField label="GP TVPI"><Input value={lpForm.gpTvpi} onChange={(e) => setLpForm((p) => ({ ...p, gpTvpi: e.target.value }))} placeholder="e.g. 1.63x" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Vintage Year"><Input type="number" value={lpForm.vintage} onChange={(e) => setLpForm((p) => ({ ...p, vintage: e.target.value }))} placeholder="e.g. 2022" /></FormField>
                    <FormField label="Strategy"><Input value={lpForm.strategy} onChange={(e) => setLpForm((p) => ({ ...p, strategy: e.target.value }))} placeholder="e.g. Early-stage VC" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Distributions"><Input value={lpForm.distributions} onChange={(e) => setLpForm((p) => ({ ...p, distributions: e.target.value }))} placeholder="e.g. $2.1M" /></FormField>
                  </div>
                </>
              )}

            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
