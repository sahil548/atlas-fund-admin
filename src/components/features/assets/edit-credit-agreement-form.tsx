"use client";

import { useState, useEffect } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const AGREEMENT_TYPES = [
  { value: "LOAN_AGREEMENT", label: "Loan Agreement" },
  { value: "NOTE_PURCHASE", label: "Note Purchase" },
  { value: "PARTICIPATION", label: "Participation" },
  { value: "CREDIT_FACILITY", label: "Credit Facility" },
  { value: "INDENTURE", label: "Indenture" },
  { value: "BRIDGE_LOAN", label: "Bridge Loan" },
];

const INTEREST_RATE_TYPES = [
  { value: "FIXED", label: "Fixed" },
  { value: "FLOATING", label: "Floating" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "PIK", label: "PIK" },
];

const CREDIT_STATUSES = [
  { value: "PERFORMING", label: "Performing" },
  { value: "WATCH", label: "Watch" },
  { value: "DEFAULT", label: "Default" },
  { value: "WORKOUT", label: "Workout" },
];

const SUBORDINATIONS = [
  { value: "SENIOR", label: "Senior" },
  { value: "MEZZANINE", label: "Mezzanine" },
  { value: "SUBORDINATED", label: "Subordinated" },
];

interface Props {
  agreement: any | null;
  open: boolean;
  onClose: () => void;
  assetId: string;
}

export function EditCreditAgreementForm({ agreement, open, onClose, assetId }: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    borrowerName: "",
    borrowerEntity: "",
    agreementType: "LOAN_AGREEMENT",
    originalPrincipal: "",
    currentPrincipal: "",
    commitmentAmount: "",
    drawnAmount: "",
    interestRateType: "FIXED",
    fixedRate: "",
    referenceRate: "",
    spreadBps: "",
    maturityDate: "",
    subordination: "SENIOR",
    currentStatus: "PERFORMING",
    amortization: "",
  });

  useEffect(() => {
    if (open && agreement) {
      const toDateStr = (val: string | null | undefined): string => {
        if (!val) return "";
        const d = new Date(val);
        return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      };

      setForm({
        borrowerName: agreement.borrowerName || "",
        borrowerEntity: agreement.borrowerEntity || "",
        agreementType: agreement.agreementType || "LOAN_AGREEMENT",
        originalPrincipal: agreement.originalPrincipal != null ? String(agreement.originalPrincipal) : "",
        currentPrincipal: agreement.currentPrincipal != null ? String(agreement.currentPrincipal) : "",
        commitmentAmount: agreement.commitmentAmount != null ? String(agreement.commitmentAmount) : "",
        drawnAmount: agreement.drawnAmount != null ? String(agreement.drawnAmount) : "",
        interestRateType: agreement.interestRateType || "FIXED",
        fixedRate: agreement.fixedRate != null ? String(agreement.fixedRate) : "",
        referenceRate: agreement.referenceRate || "",
        spreadBps: agreement.spreadBps != null ? String(agreement.spreadBps) : "",
        maturityDate: toDateStr(agreement.maturityDate),
        subordination: agreement.subordination || "SENIOR",
        currentStatus: agreement.currentStatus || "PERFORMING",
        amortization: agreement.amortization || "",
      });
    }
  }, [open, agreement]);

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!agreement) return;
    setIsLoading(true);

    const payload: Record<string, unknown> = {};
    if (form.borrowerName) payload.borrowerName = form.borrowerName;
    if (form.borrowerEntity) payload.borrowerEntity = form.borrowerEntity;
    if (form.agreementType) payload.agreementType = form.agreementType;
    if (form.originalPrincipal) payload.originalPrincipal = Number(form.originalPrincipal);
    if (form.currentPrincipal) payload.currentPrincipal = Number(form.currentPrincipal);
    if (form.commitmentAmount) payload.commitmentAmount = Number(form.commitmentAmount);
    if (form.drawnAmount) payload.drawnAmount = Number(form.drawnAmount);
    if (form.interestRateType) payload.interestRateType = form.interestRateType;
    if (form.fixedRate) payload.fixedRate = Number(form.fixedRate);
    if (form.referenceRate) payload.referenceRate = form.referenceRate;
    if (form.spreadBps) payload.spreadBps = Number(form.spreadBps);
    if (form.maturityDate) payload.maturityDate = new Date(form.maturityDate).toISOString();
    if (form.subordination) payload.subordination = form.subordination;
    if (form.currentStatus) payload.currentStatus = form.currentStatus;
    if (form.amortization) payload.amortization = form.amortization;

    try {
      const res = await fetch(`/api/assets/${assetId}/credit-agreements/${agreement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to update credit agreement";
        toast.error(msg);
        return;
      }

      toast.success("Credit agreement updated");
      mutate(`/api/assets/${assetId}`);
      onClose();
    } catch {
      toast.error("Failed to update credit agreement");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Credit Agreement"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Borrower Name">
            <Input value={form.borrowerName} onChange={(e) => setF("borrowerName", e.target.value)} placeholder="e.g. Meridian Corp" />
          </FormField>
          <FormField label="Borrower Entity">
            <Input value={form.borrowerEntity} onChange={(e) => setF("borrowerEntity", e.target.value)} placeholder="e.g. Meridian Corp LLC" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Agreement Type">
            <Select value={form.agreementType} onChange={(e) => setF("agreementType", e.target.value)} options={AGREEMENT_TYPES} />
          </FormField>
          <FormField label="Status">
            <Select value={form.currentStatus} onChange={(e) => setF("currentStatus", e.target.value)} options={CREDIT_STATUSES} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Original Principal ($)">
            <Input type="number" value={form.originalPrincipal} onChange={(e) => setF("originalPrincipal", e.target.value)} placeholder="e.g. 15000000" />
          </FormField>
          <FormField label="Current Principal ($)">
            <Input type="number" value={form.currentPrincipal} onChange={(e) => setF("currentPrincipal", e.target.value)} placeholder="e.g. 15000000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Commitment Amount ($)">
            <Input type="number" value={form.commitmentAmount} onChange={(e) => setF("commitmentAmount", e.target.value)} placeholder="e.g. 20000000" />
          </FormField>
          <FormField label="Drawn Amount ($)">
            <Input type="number" value={form.drawnAmount} onChange={(e) => setF("drawnAmount", e.target.value)} placeholder="e.g. 15000000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Interest Rate Type">
            <Select value={form.interestRateType} onChange={(e) => setF("interestRateType", e.target.value)} options={INTEREST_RATE_TYPES} />
          </FormField>
          <FormField label="Fixed Rate (decimal)">
            <Input type="number" step="0.001" value={form.fixedRate} onChange={(e) => setF("fixedRate", e.target.value)} placeholder="e.g. 0.08 for 8%" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Reference Rate">
            <Input value={form.referenceRate} onChange={(e) => setF("referenceRate", e.target.value)} placeholder="e.g. SOFR" />
          </FormField>
          <FormField label="Spread (bps)">
            <Input type="number" value={form.spreadBps} onChange={(e) => setF("spreadBps", e.target.value)} placeholder="e.g. 450" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Maturity Date">
            <Input type="date" value={form.maturityDate} onChange={(e) => setF("maturityDate", e.target.value)} />
          </FormField>
          <FormField label="Subordination">
            <Select value={form.subordination} onChange={(e) => setF("subordination", e.target.value)} options={SUBORDINATIONS} />
          </FormField>
        </div>
        <FormField label="Amortization">
          <Input value={form.amortization} onChange={(e) => setF("amortization", e.target.value)} placeholder="e.g. Interest-only" />
        </FormField>
      </div>
    </Modal>
  );
}
