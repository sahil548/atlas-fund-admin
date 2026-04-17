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

const LEASE_TYPES = [
  { value: "GROSS", label: "Gross" },
  { value: "NET", label: "Net" },
  { value: "NNN", label: "NNN (Triple Net)" },
  { value: "MODIFIED_GROSS", label: "Modified Gross" },
  { value: "PERCENTAGE", label: "Percentage" },
];

const LEASE_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "MONTH_TO_MONTH", label: "Month-to-Month" },
  { value: "TERMINATED", label: "Terminated" },
];

interface Props {
  lease: any | null;
  open: boolean;
  onClose: () => void;
  assetId: string;
}

export function EditLeaseForm({ lease, open, onClose, assetId }: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    tenantName: "",
    tenantEntity: "",
    unitOrSuite: "",
    squareFootage: "",
    leaseType: "NNN",
    baseRentMonthly: "",
    baseRentAnnual: "",
    camCharges: "",
    leaseStartDate: "",
    leaseEndDate: "",
    securityDeposit: "",
    freeRentMonths: "",
    tenantImprovementAllowance: "",
    currentStatus: "ACTIVE",
    rentPercentOfTotal: "",
    notes: "",
  });

  useEffect(() => {
    if (open && lease) {
      const toDateStr = (val: string | null | undefined): string => {
        if (!val) return "";
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10);
      };

      setForm({
        tenantName: lease.tenantName || "",
        tenantEntity: lease.tenantEntity || "",
        unitOrSuite: lease.unitOrSuite || "",
        squareFootage: lease.squareFootage || "",
        leaseType: lease.leaseType || "NNN",
        baseRentMonthly: lease.baseRentMonthly != null ? String(lease.baseRentMonthly) : "",
        baseRentAnnual: lease.baseRentAnnual != null ? String(lease.baseRentAnnual) : "",
        camCharges: lease.camCharges != null ? String(lease.camCharges) : "",
        leaseStartDate: toDateStr(lease.leaseStartDate),
        leaseEndDate: toDateStr(lease.leaseEndDate),
        securityDeposit: lease.securityDeposit != null ? String(lease.securityDeposit) : "",
        freeRentMonths: lease.freeRentMonths != null ? String(lease.freeRentMonths) : "",
        tenantImprovementAllowance: lease.tenantImprovementAllowance != null ? String(lease.tenantImprovementAllowance) : "",
        currentStatus: lease.currentStatus || "ACTIVE",
        rentPercentOfTotal: lease.rentPercentOfTotal || "",
        notes: lease.notes || "",
      });
    }
  }, [open, lease]);

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!lease) return;
    setIsLoading(true);

    const payload: Record<string, unknown> = {};
    if (form.tenantName) payload.tenantName = form.tenantName;
    if (form.tenantEntity) payload.tenantEntity = form.tenantEntity;
    if (form.unitOrSuite) payload.unitOrSuite = form.unitOrSuite;
    if (form.squareFootage) payload.squareFootage = form.squareFootage;
    if (form.leaseType) payload.leaseType = form.leaseType;
    if (form.baseRentMonthly) payload.baseRentMonthly = Number(form.baseRentMonthly);
    if (form.baseRentAnnual) payload.baseRentAnnual = Number(form.baseRentAnnual);
    if (form.camCharges) payload.camCharges = Number(form.camCharges);
    if (form.leaseStartDate) payload.leaseStartDate = new Date(form.leaseStartDate).toISOString();
    if (form.leaseEndDate) payload.leaseEndDate = new Date(form.leaseEndDate).toISOString();
    if (form.securityDeposit) payload.securityDeposit = Number(form.securityDeposit);
    if (form.freeRentMonths) payload.freeRentMonths = Number(form.freeRentMonths);
    if (form.tenantImprovementAllowance) payload.tenantImprovementAllowance = Number(form.tenantImprovementAllowance);
    if (form.currentStatus) payload.currentStatus = form.currentStatus;
    if (form.rentPercentOfTotal) payload.rentPercentOfTotal = form.rentPercentOfTotal;
    if (form.notes) payload.notes = form.notes;

    try {
      const res = await fetch(`/api/assets/${assetId}/leases/${lease.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to update lease";
        toast.error(msg);
        return;
      }

      toast.success("Lease updated");
      mutate(`/api/assets/${assetId}`);
      onClose();
    } catch {
      toast.error("Failed to update lease");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Lease"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={isLoading} onClick={handleSubmit}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tenant Name">
            <Input value={form.tenantName} onChange={(e) => setF("tenantName", e.target.value)} placeholder="e.g. Acme Corp" />
          </FormField>
          <FormField label="Tenant Entity">
            <Input value={form.tenantEntity} onChange={(e) => setF("tenantEntity", e.target.value)} placeholder="e.g. Acme Corp LLC" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Unit / Suite">
            <Input value={form.unitOrSuite} onChange={(e) => setF("unitOrSuite", e.target.value)} placeholder="e.g. Suite 200" />
          </FormField>
          <FormField label="Square Footage">
            <Input value={form.squareFootage} onChange={(e) => setF("squareFootage", e.target.value)} placeholder="e.g. 5,000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Lease Type">
            <Select value={form.leaseType} onChange={(e) => setF("leaseType", e.target.value)} options={LEASE_TYPES} />
          </FormField>
          <FormField label="Status">
            <Select value={form.currentStatus} onChange={(e) => setF("currentStatus", e.target.value)} options={LEASE_STATUSES} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Monthly Rent ($)">
            <Input type="number" value={form.baseRentMonthly} onChange={(e) => setF("baseRentMonthly", e.target.value)} placeholder="e.g. 15000" />
          </FormField>
          <FormField label="Annual Rent ($)">
            <Input type="number" value={form.baseRentAnnual} onChange={(e) => setF("baseRentAnnual", e.target.value)} placeholder="e.g. 180000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Lease Start Date">
            <Input type="date" value={form.leaseStartDate} onChange={(e) => setF("leaseStartDate", e.target.value)} />
          </FormField>
          <FormField label="Lease End Date">
            <Input type="date" value={form.leaseEndDate} onChange={(e) => setF("leaseEndDate", e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="CAM Charges ($)">
            <Input type="number" value={form.camCharges} onChange={(e) => setF("camCharges", e.target.value)} placeholder="e.g. 2000" />
          </FormField>
          <FormField label="Security Deposit ($)">
            <Input type="number" value={form.securityDeposit} onChange={(e) => setF("securityDeposit", e.target.value)} placeholder="e.g. 30000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Free Rent Months">
            <Input type="number" value={form.freeRentMonths} onChange={(e) => setF("freeRentMonths", e.target.value)} placeholder="e.g. 2" />
          </FormField>
          <FormField label="TI Allowance ($)">
            <Input type="number" value={form.tenantImprovementAllowance} onChange={(e) => setF("tenantImprovementAllowance", e.target.value)} placeholder="e.g. 50000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Rent % of Total">
            <Input value={form.rentPercentOfTotal} onChange={(e) => setF("rentPercentOfTotal", e.target.value)} placeholder="e.g. 35%" />
          </FormField>
        </div>
        <FormField label="Notes">
          <Input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Lease notes..." />
        </FormField>
      </div>
    </Modal>
  );
}
