"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { UpdateDealSchema } from "@/lib/schemas";
import useSWR from "swr";

const fetcherFn = (url: string) => fetch(url).then((r) => r.json());

const ASSET_CLASS_OPTIONS = [
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "PUBLIC_SECURITIES", label: "Public Securities" },
  { value: "VENTURE_CAPITAL", label: "Venture Capital" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "COMMODITIES", label: "Commodities" },
  { value: "DIVERSIFIED", label: "Diversified" },
  { value: "NON_CORRELATED", label: "Non-Correlated" },
  { value: "CASH_AND_EQUIVALENTS", label: "Cash & Equivalents" },
];
const CAPITAL_INSTRUMENT_OPTIONS = [
  { value: "DEBT", label: "Debt" },
  { value: "EQUITY", label: "Equity" },
];
const PARTICIPATION_OPTIONS = [
  { value: "DIRECT_GP", label: "Direct / GP" },
  { value: "CO_INVEST_JV_PARTNERSHIP", label: "Co-Invest / JV / Partnership" },
  { value: "LP_STAKE_SILENT_PARTNER", label: "LP Stake / Silent Partner" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  deal: {
    id: string;
    name: string;
    sector?: string;
    targetSize?: string;
    targetCheckSize?: string;
    targetReturn?: string;
    dealLeadId?: string;
    assetClass?: string;
    capitalInstrument?: string;
    participationStructure?: string;
    gpName?: string;
    source?: string;
    counterparty?: string;
    description?: string;
    thesisNotes?: string;
    investmentRationale?: string;
    additionalContext?: string;
  };
}

export function EditDealForm({ open, onClose, deal }: Props) {
  const toast = useToast();
  const { trigger, isLoading } = useMutation(`/api/deals/${deal.id}`, {
    method: "PUT",
    revalidateKeys: ["/api/deals", `/api/deals/${deal.id}`],
  });
  const { data: users } = useSWR("/api/users?firmId=firm-1", fetcherFn);
  const [form, setForm] = useState({
    name: "",
    sector: "",
    targetSize: "",
    targetCheckSize: "",
    targetReturn: "",
    dealLeadId: "",
    assetClass: "",
    capitalInstrument: "",
    participationStructure: "",
    gpName: "",
    source: "",
    counterparty: "",
    description: "",
    thesisNotes: "",
    investmentRationale: "",
    additionalContext: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open)
      setForm({
        name: deal.name || "",
        sector: deal.sector || "",
        targetSize: deal.targetSize || "",
        targetCheckSize: deal.targetCheckSize || "",
        targetReturn: deal.targetReturn || "",
        dealLeadId: deal.dealLeadId || "",
        assetClass: deal.assetClass || "",
        capitalInstrument: deal.capitalInstrument || "",
        participationStructure: deal.participationStructure || "",
        gpName: deal.gpName || "",
        source: deal.source || "",
        counterparty: deal.counterparty || "",
        description: deal.description || "",
        thesisNotes: deal.thesisNotes || "",
        investmentRationale: deal.investmentRationale || "",
        additionalContext: deal.additionalContext || "",
      });
  }, [open, deal]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    const result = UpdateDealSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0] || ""]),
        ),
      );
      return;
    }
    try {
      await trigger(result.data);
      toast.success("Deal updated");
      onClose();
    } catch {
      toast.error("Failed to update deal");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Deal"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoading} onClick={handleSubmit}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Deal Name" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={!!errors.name}
          />
        </FormField>

        {/* Asset Classification */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Asset Classification
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Asset Class">
              <Select
                value={form.assetClass}
                onChange={(e) => set("assetClass", e.target.value)}
                options={[{ value: "", label: "— Select —" }, ...ASSET_CLASS_OPTIONS]}
              />
            </FormField>
            <FormField label="Capital Instrument">
              <Select
                value={form.capitalInstrument}
                onChange={(e) => set("capitalInstrument", e.target.value)}
                options={[{ value: "", label: "— Select —" }, ...CAPITAL_INSTRUMENT_OPTIONS]}
              />
            </FormField>
            <FormField label="Participation Structure">
              <Select
                value={form.participationStructure}
                onChange={(e) => set("participationStructure", e.target.value)}
                options={[{ value: "", label: "— Select —" }, ...PARTICIPATION_OPTIONS]}
              />
            </FormField>
          </div>
        </div>

        {/* Deal Size & Return */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Deal Size & Return
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Total Raise">
              <Input
                value={form.targetSize}
                onChange={(e) => set("targetSize", e.target.value)}
                placeholder="e.g. $25-50M"
              />
            </FormField>
            <FormField label="Target Check Size">
              <Input
                value={form.targetCheckSize}
                onChange={(e) => set("targetCheckSize", e.target.value)}
                placeholder="e.g. $5-10M"
              />
            </FormField>
            <FormField label="Target Return">
              <Input
                value={form.targetReturn}
                onChange={(e) => set("targetReturn", e.target.value)}
                placeholder="e.g. 2.5-3x MOIC"
              />
            </FormField>
          </div>
        </div>

        {/* Parties */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Parties
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Deal Lead">
              <Select
                value={form.dealLeadId}
                onChange={(e) => set("dealLeadId", e.target.value)}
                options={[
                  { value: "", label: "— Select —" },
                  ...(users || []).map((u: any) => ({ value: u.id, label: u.name })),
                ]}
              />
            </FormField>
            <FormField label="GP Name">
              <Input
                value={form.gpName}
                onChange={(e) => set("gpName", e.target.value)}
                placeholder="e.g. Apex Capital Partners"
              />
            </FormField>
            <FormField label="Source">
              <Input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="e.g. Advisor referral"
              />
            </FormField>
            <FormField label="Counterparty">
              <Input
                value={form.counterparty}
                onChange={(e) => set("counterparty", e.target.value)}
                placeholder="e.g. Apex Industries Inc."
              />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Sector">
              <Input
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
                placeholder="e.g. Healthcare"
              />
            </FormField>
          </div>
        </div>

        {/* Investment Context */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Investment Context
          </div>
          <div className="space-y-3">
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Brief overview of the deal opportunity..."
                rows={2}
              />
            </FormField>
            <FormField label="Investment Rationale">
              <Textarea
                value={form.investmentRationale}
                onChange={(e) => set("investmentRationale", e.target.value)}
                placeholder="Why are we looking at this deal?"
                rows={2}
              />
            </FormField>
            <FormField label="Thesis Notes">
              <Textarea
                value={form.thesisNotes}
                onChange={(e) => set("thesisNotes", e.target.value)}
                placeholder="Investment thesis, key value drivers..."
                rows={2}
              />
            </FormField>
            <FormField label="Additional Context">
              <Textarea
                value={form.additionalContext}
                onChange={(e) => set("additionalContext", e.target.value)}
                placeholder="Anything else the AI should know..."
                rows={2}
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  );
}
