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

// Type-conditional detail payload shape
type TypeDetailsPayload =
  | { kind: "REAL_ESTATE"; propertyType?: string; squareFeet?: string; occupancy?: string; noi?: string; capRate?: string; rentPerSqft?: string; debt?: string; debtDscr?: string }
  | { kind: "PRIVATE_CREDIT"; instrument?: string; principal?: string; rate?: string; maturity?: string; ltv?: string; dscr?: string; nextPaymentDate?: string; accruedInterest?: string; spread?: string }
  | { kind: "OPERATING"; instrument?: string; ownership?: string; revenue?: string; ebitda?: string; growth?: string; employees?: number }
  | { kind: "LP_INTEREST"; gpName?: string; commitment?: string; calledAmount?: string; uncalledAmount?: string; distributions?: string; gpNav?: string; navDate?: string; gpIrr?: string; gpTvpi?: string; vintage?: number; strategy?: string };

interface Props {
  open: boolean;
  onClose: () => void;
  asset: {
    id: string;
    name?: string;
    entryDate?: string | Date | null;
    costBasis?: number;
    fairValue: number;
    status: string;
    sector?: string;
    incomeType?: string;
    assetClass?: string;
    capitalInstrument?: string | null;
    participationStructure?: string | null;
    projectedIRR?: number | null;
    projectedMultiple?: number | null;
    realEstateDetails?: {
      propertyType?: string | null;
      squareFeet?: string | null;
      occupancy?: string | null;
      noi?: string | null;
      capRate?: string | null;
      rentPerSqft?: string | null;
      debt?: string | null;
      debtDscr?: string | null;
    } | null;
    creditDetails?: {
      instrument?: string | null;
      principal?: string | null;
      rate?: string | null;
      maturity?: string | null;
      ltv?: string | null;
      dscr?: string | null;
      nextPaymentDate?: string | null;
      accruedInterest?: string | null;
    } | null;
    equityDetails?: {
      instrument?: string | null;
      ownership?: string | null;
      revenue?: string | null;
      ebitda?: string | null;
      growth?: string | null;
      employees?: number | null;
    } | null;
    fundLPDetails?: {
      gpName?: string | null;
      commitment?: string | null;
      calledAmount?: string | null;
      uncalledAmount?: string | null;
      distributions?: string | null;
      gpNav?: string | null;
      navDate?: string | null;
      gpIrr?: string | null;
      gpTvpi?: string | null;
      vintage?: number | null;
      strategy?: string | null;
    } | null;
  };
}

// Determine which type-conditional section to show.
// Phase 22-10: existing production assets created before the AssetRealEstateDetails /
// AssetCreditDetails / AssetEquityDetails / AssetFundLPDetails child records were populated
// would return null here and silently hide the fieldset. Fall back to the asset's class /
// capital instrument / participation structure so users can populate the detail record on
// first edit. The PUT route upserts, so saving creates the missing detail row.
function detectAssetKind(asset: Props["asset"]): "REAL_ESTATE" | "PRIVATE_CREDIT" | "OPERATING" | "LP_INTEREST" | null {
  if (asset.realEstateDetails) return "REAL_ESTATE";
  if (asset.creditDetails) return "PRIVATE_CREDIT";
  if (asset.equityDetails) return "OPERATING";
  if (asset.fundLPDetails) return "LP_INTEREST";

  // Metadata fallback for existing assets without detail records
  if (asset.assetClass === "REAL_ESTATE") return "REAL_ESTATE";
  if (asset.capitalInstrument === "DEBT") return "PRIVATE_CREDIT";
  if (asset.participationStructure === "LP_STAKE_SILENT_PARTNER") return "LP_INTEREST";
  if (asset.assetClass === "OPERATING_BUSINESS") return "OPERATING";

  return null;
}

export function EditAssetForm({ open, onClose, asset }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/assets/${asset.id}`, { method: "PUT", revalidateKeys: ["/api/assets", `/api/assets/${asset.id}`] });

  const kind = detectAssetKind(asset);

  const [form, setForm] = useState({
    name: "",
    entryDate: "",
    costBasis: "",
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

  // Type-conditional detail fields stored separately so we can track dirtiness
  const [typeDetails, setTypeDetails] = useState<TypeDetailsPayload | null>(null);

  // RE fields
  const [reForm, setReForm] = useState({ propertyType: "", squareFeet: "", occupancy: "", noi: "", capRate: "", rentPerSqft: "", debt: "", debtDscr: "" });
  // Credit fields
  const [creditForm, setCreditForm] = useState({ instrument: "", principal: "", rate: "", maturity: "", ltv: "", dscr: "", nextPaymentDate: "", accruedInterest: "" });
  // Equity fields
  const [equityForm, setEquityForm] = useState({ instrument: "", ownership: "", revenue: "", ebitda: "", growth: "", employees: "" });
  // Fund LP fields
  const [lpForm, setLpForm] = useState({ gpName: "", commitment: "", calledAmount: "", uncalledAmount: "", distributions: "", gpNav: "", navDate: "", gpIrr: "", gpTvpi: "", vintage: "", strategy: "" });

  useEffect(() => {
    if (!open) return;

    // Format entry date for <input type="date">
    let entryDateStr = "";
    if (asset.entryDate) {
      const d = new Date(asset.entryDate);
      if (!isNaN(d.getTime())) {
        entryDateStr = d.toISOString().slice(0, 10);
      }
    }

    setForm({
      name: asset.name || "",
      entryDate: entryDateStr,
      costBasis: asset.costBasis != null ? String(asset.costBasis) : "",
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

    // Pre-fill type-specific detail forms
    const re = asset.realEstateDetails;
    if (re) {
      setReForm({
        propertyType: re.propertyType || "",
        squareFeet: re.squareFeet || "",
        occupancy: re.occupancy || "",
        noi: re.noi || "",
        capRate: re.capRate || "",
        rentPerSqft: re.rentPerSqft || "",
        debt: re.debt || "",
        debtDscr: re.debtDscr || "",
      });
    }

    const cr = asset.creditDetails;
    if (cr) {
      setCreditForm({
        instrument: cr.instrument || "",
        principal: cr.principal || "",
        rate: cr.rate || "",
        maturity: cr.maturity || "",
        ltv: cr.ltv || "",
        dscr: cr.dscr || "",
        nextPaymentDate: cr.nextPaymentDate || "",
        accruedInterest: cr.accruedInterest || "",
      });
    }

    const eq = asset.equityDetails;
    if (eq) {
      setEquityForm({
        instrument: eq.instrument || "",
        ownership: eq.ownership || "",
        revenue: eq.revenue || "",
        ebitda: eq.ebitda || "",
        growth: eq.growth || "",
        employees: eq.employees != null ? String(eq.employees) : "",
      });
    }

    const lp = asset.fundLPDetails;
    if (lp) {
      setLpForm({
        gpName: lp.gpName || "",
        commitment: lp.commitment || "",
        calledAmount: lp.calledAmount || "",
        uncalledAmount: lp.uncalledAmount || "",
        distributions: lp.distributions || "",
        gpNav: lp.gpNav || "",
        navDate: lp.navDate || "",
        gpIrr: lp.gpIrr || "",
        gpTvpi: lp.gpTvpi || "",
        vintage: lp.vintage != null ? String(lp.vintage) : "",
        strategy: lp.strategy || "",
      });
    }

    // Reset typeDetails dirty state on open
    setTypeDetails(null);
  }, [open, asset]);

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Helper to mark RE details as dirty
  const setRe = (k: string, v: string) => {
    setReForm((p) => {
      const next = { ...p, [k]: v };
      setTypeDetails({ kind: "REAL_ESTATE", ...Object.fromEntries(Object.entries(next).filter(([, val]) => val !== "")) } as TypeDetailsPayload);
      return next;
    });
  };
  const setCredit = (k: string, v: string) => {
    setCreditForm((p) => {
      const next = { ...p, [k]: v };
      setTypeDetails({ kind: "PRIVATE_CREDIT", ...Object.fromEntries(Object.entries(next).filter(([, val]) => val !== "")) } as TypeDetailsPayload);
      return next;
    });
  };
  const setEquity = (k: string, v: string) => {
    setEquityForm((p) => {
      const next = { ...p, [k]: v };
      const cleaned: Record<string, string | number> = {};
      for (const [key, val] of Object.entries(next)) {
        if (val !== "") {
          cleaned[key] = key === "employees" ? Number(val) : val;
        }
      }
      setTypeDetails({ kind: "OPERATING", ...cleaned } as TypeDetailsPayload);
      return next;
    });
  };
  const setLP = (k: string, v: string) => {
    setLpForm((p) => {
      const next = { ...p, [k]: v };
      const cleaned: Record<string, string | number> = {};
      for (const [key, val] of Object.entries(next)) {
        if (val !== "") {
          cleaned[key] = key === "vintage" ? Number(val) : val;
        }
      }
      setTypeDetails({ kind: "LP_INTEREST", ...cleaned } as TypeDetailsPayload);
      return next;
    });
  };

  async function handleSubmit() {
    const payload: Record<string, unknown> = {};

    // Common scalars
    if (form.name) payload.name = form.name;
    if (form.entryDate) payload.entryDate = new Date(form.entryDate).toISOString();
    if (form.costBasis !== "") payload.costBasis = Number(form.costBasis);
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

    // Type-conditional details (only include if user edited any detail field)
    if (typeDetails) payload.typeDetails = typeDetails;

    try {
      await trigger(payload);
      toast.success("Asset updated");
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: string };
      const msg = typeof errObj?.error === "string" ? errObj.error : typeof errObj?.message === "string" ? errObj.message : "Failed to update asset";
      toast.error(msg);
    }
  }

  const sectionLabel = kind === "REAL_ESTATE" ? "Real Estate Details"
    : kind === "PRIVATE_CREDIT" ? "Credit Facility Details"
    : kind === "OPERATING" ? "Ownership & Financials"
    : kind === "LP_INTEREST" ? "Fund LP Details"
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Asset" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button></>}>
      <div className="space-y-3">

        {/* ─── A) Common scalar block ─── */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Asset Name">
            <Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. NovaTech AI" />
          </FormField>
          <FormField label="Entry Date">
            <Input type="date" value={form.entryDate} onChange={(e) => setF("entryDate", e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cost Basis ($)">
            <CurrencyInput value={form.costBasis} onChange={(v) => setF("costBasis", v)} placeholder="e.g. 10,000,000" />
          </FormField>
          <FormField label="Fair Value ($)">
            <CurrencyInput value={form.fairValue} onChange={(v) => setF("fairValue", v)} />
          </FormField>
        </div>

        {/* ─── B) Existing 9 fields ─── */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status"><Select value={form.status} onChange={(e) => setF("status", e.target.value)} options={STATUSES} /></FormField>
          <FormField label="Asset Class"><Select value={form.assetClass} onChange={(e) => setF("assetClass", e.target.value)} options={ASSET_CLASSES} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Capital Instrument"><Select value={form.capitalInstrument} onChange={(e) => setF("capitalInstrument", e.target.value)} options={CAPITAL_INSTRUMENTS} /></FormField>
          <FormField label="Participation Structure"><Select value={form.participationStructure} onChange={(e) => setF("participationStructure", e.target.value)} options={PARTICIPATION_STRUCTURES} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sector"><Input value={form.sector} onChange={(e) => setF("sector", e.target.value)} /></FormField>
          <FormField label="Income Type"><Input value={form.incomeType} onChange={(e) => setF("incomeType", e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Projected IRR (%)"><Input type="number" step="0.01" value={form.projectedIRR} onChange={(e) => setF("projectedIRR", e.target.value)} placeholder="e.g., 15.5" /></FormField>
          <FormField label="Projected Multiple (x)"><Input type="number" step="0.01" value={form.projectedMultiple} onChange={(e) => setF("projectedMultiple", e.target.value)} placeholder="e.g., 2.0" /></FormField>
        </div>

        {/* ─── C) Type-conditional section ─── */}
        {kind && sectionLabel && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-2">
            <legend className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 px-1">{sectionLabel}</legend>
            <div className="space-y-3 mt-2">

              {kind === "REAL_ESTATE" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Property Type"><Input value={reForm.propertyType} onChange={(e) => setRe("propertyType", e.target.value)} placeholder="e.g. Industrial Warehouse" /></FormField>
                    <FormField label="Square Feet"><Input value={reForm.squareFeet} onChange={(e) => setRe("squareFeet", e.target.value)} placeholder="e.g. 185,000" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Occupancy"><Input value={reForm.occupancy} onChange={(e) => setRe("occupancy", e.target.value)} placeholder="e.g. 94%" /></FormField>
                    <FormField label="Cap Rate"><Input value={reForm.capRate} onChange={(e) => setRe("capRate", e.target.value)} placeholder="e.g. 6.7%" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="NOI"><Input value={reForm.noi} onChange={(e) => setRe("noi", e.target.value)} placeholder="e.g. $1,920,000" /></FormField>
                    <FormField label="Rent / Sqft"><Input value={reForm.rentPerSqft} onChange={(e) => setRe("rentPerSqft", e.target.value)} placeholder="e.g. $12.50/sqft" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Debt"><Input value={reForm.debt} onChange={(e) => setRe("debt", e.target.value)} placeholder="e.g. $14.2M @ 4.5%" /></FormField>
                    <FormField label="Debt DSCR"><Input value={reForm.debtDscr} onChange={(e) => setRe("debtDscr", e.target.value)} placeholder="e.g. 1.65x" /></FormField>
                  </div>
                </>
              )}

              {kind === "PRIVATE_CREDIT" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Instrument"><Input value={creditForm.instrument} onChange={(e) => setCredit("instrument", e.target.value)} placeholder="e.g. Senior Secured" /></FormField>
                    <FormField label="Principal"><Input value={creditForm.principal} onChange={(e) => setCredit("principal", e.target.value)} placeholder="e.g. $15M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Rate"><Input value={creditForm.rate} onChange={(e) => setCredit("rate", e.target.value)} placeholder="e.g. SOFR+450bps" /></FormField>
                    <FormField label="Maturity"><Input value={creditForm.maturity} onChange={(e) => setCredit("maturity", e.target.value)} placeholder="e.g. 2028-06-15" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="LTV"><Input value={creditForm.ltv} onChange={(e) => setCredit("ltv", e.target.value)} placeholder="e.g. 62%" /></FormField>
                    <FormField label="DSCR"><Input value={creditForm.dscr} onChange={(e) => setCredit("dscr", e.target.value)} placeholder="e.g. 1.8x" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Next Payment Date"><Input value={creditForm.nextPaymentDate} onChange={(e) => setCredit("nextPaymentDate", e.target.value)} placeholder="e.g. 2025-03-15" /></FormField>
                    <FormField label="Accrued Interest"><Input value={creditForm.accruedInterest} onChange={(e) => setCredit("accruedInterest", e.target.value)} placeholder="e.g. $187,500" /></FormField>
                  </div>
                </>
              )}

              {kind === "OPERATING" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Instrument"><Input value={equityForm.instrument} onChange={(e) => setEquity("instrument", e.target.value)} placeholder="e.g. Series B Preferred" /></FormField>
                    <FormField label="Ownership %"><Input value={equityForm.ownership} onChange={(e) => setEquity("ownership", e.target.value)} placeholder="e.g. 18.4%" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Revenue"><Input value={equityForm.revenue} onChange={(e) => setEquity("revenue", e.target.value)} placeholder="e.g. $85M" /></FormField>
                    <FormField label="EBITDA"><Input value={equityForm.ebitda} onChange={(e) => setEquity("ebitda", e.target.value)} placeholder="e.g. $22M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Growth"><Input value={equityForm.growth} onChange={(e) => setEquity("growth", e.target.value)} placeholder="e.g. +42% YoY" /></FormField>
                    <FormField label="Employees"><Input type="number" value={equityForm.employees} onChange={(e) => setEquity("employees", e.target.value)} placeholder="e.g. 340" /></FormField>
                  </div>
                </>
              )}

              {kind === "LP_INTEREST" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP Name"><Input value={lpForm.gpName} onChange={(e) => setLP("gpName", e.target.value)} placeholder="e.g. Sequoia Capital" /></FormField>
                    <FormField label="Commitment"><Input value={lpForm.commitment} onChange={(e) => setLP("commitment", e.target.value)} placeholder="e.g. $15M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Called Amount"><Input value={lpForm.calledAmount} onChange={(e) => setLP("calledAmount", e.target.value)} placeholder="e.g. $10M (67%)" /></FormField>
                    <FormField label="Uncalled Amount"><Input value={lpForm.uncalledAmount} onChange={(e) => setLP("uncalledAmount", e.target.value)} placeholder="e.g. $5M" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP NAV"><Input value={lpForm.gpNav} onChange={(e) => setLP("gpNav", e.target.value)} placeholder="e.g. $14.2M" /></FormField>
                    <FormField label="NAV Date"><Input value={lpForm.navDate} onChange={(e) => setLP("navDate", e.target.value)} placeholder="e.g. 2024-12-31" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="GP IRR"><Input value={lpForm.gpIrr} onChange={(e) => setLP("gpIrr", e.target.value)} placeholder="e.g. 24.5%" /></FormField>
                    <FormField label="GP TVPI"><Input value={lpForm.gpTvpi} onChange={(e) => setLP("gpTvpi", e.target.value)} placeholder="e.g. 1.63x" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Vintage Year"><Input type="number" value={lpForm.vintage} onChange={(e) => setLP("vintage", e.target.value)} placeholder="e.g. 2022" /></FormField>
                    <FormField label="Strategy"><Input value={lpForm.strategy} onChange={(e) => setLP("strategy", e.target.value)} placeholder="e.g. Early-stage VC" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Distributions"><Input value={lpForm.distributions} onChange={(e) => setLP("distributions", e.target.value)} placeholder="e.g. $2.1M" /></FormField>
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
