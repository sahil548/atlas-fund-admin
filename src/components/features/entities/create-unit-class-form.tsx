"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CLASS_TYPES = [
  { value: "LP_UNIT", label: "LP Unit" },
  { value: "GP_UNIT", label: "GP Unit" },
  { value: "CARRIED_INTEREST", label: "Carried Interest" },
  { value: "MANAGEMENT", label: "Management" },
];

interface CreateUnitClassFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  entityId: string;
}

export function CreateUnitClassForm({ open, onClose, onCreated, entityId }: CreateUnitClassFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    classType: "LP_UNIT",
    unitPrice: "1000",
    totalAuthorized: "",
    preferredReturnRate: "",
    managementFeeRate: "",
    votingRights: true,
    description: "",
  });

  if (!open) return null;

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        entityId,
        name: form.name,
        classType: form.classType,
        unitPrice: parseFloat(form.unitPrice),
        votingRights: form.votingRights,
      };
      if (form.totalAuthorized) payload.totalAuthorized = parseFloat(form.totalAuthorized);
      if (form.preferredReturnRate) payload.preferredReturnRate = parseFloat(form.preferredReturnRate) / 100;
      if (form.managementFeeRate) payload.managementFeeRate = parseFloat(form.managementFeeRate) / 100;
      if (form.description) payload.description = form.description;

      const res = await fetch("/api/unit-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to create unit class";
        toast.error(msg);
        return;
      }
      toast.success("Unit class created");
      onCreated();
      onClose();
      setForm({ name: "", classType: "LP_UNIT", unitPrice: "1000", totalAuthorized: "", preferredReturnRate: "", managementFeeRate: "", votingRights: true, description: "" });
    } catch {
      toast.error("Failed to create unit class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-lg mx-4">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Create Unit Class</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 mb-1 block">Class Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                placeholder="e.g. Class A LP Units"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Type</label>
              <select
                value={form.classType}
                onChange={(e) => update("classType", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CLASS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Unit Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.unitPrice}
                onChange={(e) => update("unitPrice", e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Total Authorized</label>
              <input
                type="number"
                step="1"
                min="1"
                value={form.totalAuthorized}
                onChange={(e) => update("totalAuthorized", e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Preferred Return (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.preferredReturnRate}
                onChange={(e) => update("preferredReturnRate", e.target.value)}
                placeholder="e.g. 8"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Management Fee (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.managementFeeRate}
                onChange={(e) => update("managementFeeRate", e.target.value)}
                placeholder="e.g. 2"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Voting Rights</label>
              <label className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={form.votingRights}
                  onChange={(e) => update("votingRights", e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Has voting rights</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Creating..." : "Create Class"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
