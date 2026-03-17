"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface IssueUnitsFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  unitClassId: string;
  unitClassName: string;
  unitPrice: number;
  investors: { id: string; name: string }[];
}

export function IssueUnitsForm({ open, onClose, onCreated, unitClassId, unitClassName, unitPrice, investors }: IssueUnitsFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investorId: "",
    unitsIssued: "",
    unitCost: unitPrice.toString(),
    acquisitionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  if (!open) return null;

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const totalCost = (parseFloat(form.unitsIssued) || 0) * (parseFloat(form.unitCost) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/ownership-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitClassId,
          investorId: form.investorId,
          unitsIssued: parseFloat(form.unitsIssued),
          unitCost: parseFloat(form.unitCost),
          acquisitionDate: form.acquisitionDate,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to issue units";
        toast.error(msg);
        return;
      }
      toast.success("Units issued successfully");
      onCreated();
      onClose();
      setForm({ investorId: "", unitsIssued: "", unitCost: unitPrice.toString(), acquisitionDate: new Date().toISOString().split("T")[0], notes: "" });
    } catch {
      toast.error("Failed to issue units");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Issue Units</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{unitClassName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Investor *</label>
            <select
              value={form.investorId}
              onChange={(e) => update("investorId", e.target.value)}
              required
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select investor...</option>
              {investors.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Units to Issue *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.unitsIssued}
                onChange={(e) => update("unitsIssued", e.target.value)}
                required
                placeholder="e.g. 50000"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Cost Per Unit ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitCost}
                onChange={(e) => update("unitCost", e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {totalCost > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
              Total cost basis: <span className="font-semibold text-gray-900 dark:text-gray-100">${totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Acquisition Date *</label>
            <input
              type="date"
              value={form.acquisitionDate}
              onChange={(e) => update("acquisitionDate", e.target.value)}
              required
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Issuing..." : "Issue Units"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
