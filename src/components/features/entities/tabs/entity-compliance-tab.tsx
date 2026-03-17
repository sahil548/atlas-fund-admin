"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PostFormationChecklist } from "@/components/features/entities/post-formation-checklist";
import { RegulatoryFilingsTab } from "@/components/features/entities/regulatory-filings-tab";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  entity: any;
  entityId: string;
}

export function EntityComplianceTab({ entity, entityId }: Props) {
  const toast = useToast();
  const e = entity;

  const [editingLegal, setEditingLegal] = useState(false);
  const [legalForm, setLegalForm] = useState({
    stateOfFormation: "",
    ein: "",
    legalCounsel: "",
    taxPreparer: "",
    fiscalYearEnd: "",
    vehicleStructure: "",
    fundTermYears: "",
    extensionOptions: "",
  });

  const showPostFormation = e.formationStatus === "FORMED" || e.formationStatus === "REGISTERED";

  async function handleSaveLegal() {
    try {
      const payload: Record<string, unknown> = {};
      if (legalForm.stateOfFormation !== (e.stateOfFormation || "")) payload.stateOfFormation = legalForm.stateOfFormation || null;
      if (legalForm.ein !== (e.ein || "")) payload.ein = legalForm.ein || null;
      if (legalForm.legalCounsel !== (e.legalCounsel || "")) payload.legalCounsel = legalForm.legalCounsel || null;
      if (legalForm.taxPreparer !== (e.taxPreparer || "")) payload.taxPreparer = legalForm.taxPreparer || null;
      if (legalForm.fiscalYearEnd !== (e.fiscalYearEnd || "")) payload.fiscalYearEnd = legalForm.fiscalYearEnd || null;
      if (legalForm.vehicleStructure !== (e.vehicleStructure || "")) payload.vehicleStructure = legalForm.vehicleStructure || null;
      if (legalForm.fundTermYears !== (e.fundTermYears?.toString() || "")) payload.fundTermYears = legalForm.fundTermYears ? parseInt(legalForm.fundTermYears) : null;
      if (legalForm.extensionOptions !== (e.extensionOptions || "")) payload.extensionOptions = legalForm.extensionOptions || null;
      if (Object.keys(payload).length === 0) {
        setEditingLegal(false);
        return;
      }
      const res = await fetch(`/api/entities/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      mutate(`/api/entities/${entityId}`);
      toast.success("Legal details updated");
      setEditingLegal(false);
    } catch {
      toast.error("Failed to save legal details");
    }
  }

  const inputClass = "w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-4">
      {/* Post Formation Checklist */}
      {showPostFormation && (
        <PostFormationChecklist entity={e} />
      )}

      {/* Legal Details */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Legal Details</h3>
          {!editingLegal ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setLegalForm({
                  stateOfFormation: e.stateOfFormation || "",
                  ein: e.ein || "",
                  legalCounsel: e.legalCounsel || "",
                  taxPreparer: e.taxPreparer || "",
                  fiscalYearEnd: e.fiscalYearEnd || "",
                  vehicleStructure: e.vehicleStructure || "",
                  fundTermYears: e.fundTermYears?.toString() || "",
                  extensionOptions: e.extensionOptions || "",
                });
                setEditingLegal(true);
              }}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditingLegal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveLegal}>Save</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {editingLegal ? (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">State of Formation</label>
                <input className={inputClass} value={legalForm.stateOfFormation} onChange={(ev) => setLegalForm({ ...legalForm, stateOfFormation: ev.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">EIN</label>
                <input className={`${inputClass} font-mono`} value={legalForm.ein} onChange={(ev) => setLegalForm({ ...legalForm, ein: ev.target.value })} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Legal Counsel</label>
                <input className={inputClass} value={legalForm.legalCounsel} onChange={(ev) => setLegalForm({ ...legalForm, legalCounsel: ev.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tax Preparer</label>
                <input className={inputClass} value={legalForm.taxPreparer} onChange={(ev) => setLegalForm({ ...legalForm, taxPreparer: ev.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fiscal Year End</label>
                <input className={inputClass} value={legalForm.fiscalYearEnd} onChange={(ev) => setLegalForm({ ...legalForm, fiscalYearEnd: ev.target.value })} placeholder="e.g. December 31" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Vehicle Structure</label>
                <select className={inputClass} value={legalForm.vehicleStructure} onChange={(ev) => setLegalForm({ ...legalForm, vehicleStructure: ev.target.value })}>
                  <option value="">&mdash;</option>
                  <option value="LLC">LLC</option>
                  <option value="LP">LP</option>
                  <option value="CORP">CORP</option>
                  <option value="TRUST">TRUST</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fund Term (years)</label>
                <input type="number" className={inputClass} value={legalForm.fundTermYears} onChange={(ev) => setLegalForm({ ...legalForm, fundTermYears: ev.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Extension Options</label>
                <input className={inputClass} value={legalForm.extensionOptions} onChange={(ev) => setLegalForm({ ...legalForm, extensionOptions: ev.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div><span className="text-xs text-gray-500">State of Formation</span><div className="font-medium">{e.stateOfFormation || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">EIN</span><div className="font-medium font-mono">{e.ein || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Legal Counsel</span><div className="font-medium">{e.legalCounsel || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Tax Preparer</span><div className="font-medium">{e.taxPreparer || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Fiscal Year End</span><div className="font-medium">{e.fiscalYearEnd || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Vehicle Structure</span><div className="font-medium">{e.vehicleStructure || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Fund Term</span><div className="font-medium">{e.fundTermYears ? `${e.fundTermYears} years` : "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Extension Options</span><div className="font-medium">{e.extensionOptions || "\u2014"}</div></div>
            </>
          )}
        </div>
      </div>

      {/* Regulatory Filings */}
      <RegulatoryFilingsTab entity={e} onUpdate={() => mutate(`/api/entities/${entityId}`)} />
    </div>
  );
}
