"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, cn, formatDate } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const EXPENSE_CATEGORIES = [
  { value: "management_fee", label: "Management Fee" },
  { value: "legal", label: "Legal" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Taxes" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_COLORS: Record<string, "blue" | "red" | "orange" | "yellow" | "purple" | "gray"> = {
  management_fee: "blue",
  legal: "purple",
  maintenance: "orange",
  insurance: "yellow",
  taxes: "red",
  other: "gray",
};

function categoryLabel(cat: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function AssetExpensesTab({
  assetId,
  entityId,
}: {
  assetId: string;
  entityId: string;
}) {
  const transactionsKey = `/api/assets/${assetId}/transactions`;
  const { data, isLoading } = useSWR(transactionsKey, fetcher);
  const { firmId } = useFirm();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "management_fee",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const expenses: any[] = data?.expenses ?? [];
  const totals = data?.totals ?? { totalExpenses: 0 };

  // Group by category for subtotals
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Amount must be a positive number");
      return;
    }
    if (!form.date) {
      setFormError("Date is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          assetId,
          entityId,
          category: form.category,
          amount,
          date: form.date,
          description: form.description || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to save expense entry";
        setFormError(msg);
        return;
      }

      // Revalidate both transactions and asset (for IRR/MOIC)
      mutate(transactionsKey);
      mutate(`/api/assets/${assetId}`);
      if (firmId) mutate(`/api/assets?firmId=${firmId}`);

      setForm({ category: "management_fee", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Loading expenses data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Running totals header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {expenses.length} entr{expenses.length !== 1 ? "ies" : "y"} recorded
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase">Total Expenses</div>
              <div className="text-lg font-bold text-red-600">{fmt(totals.totalExpenses)}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Cancel" : "+ Add Expense"}
            </Button>
          </div>
        </div>

        {/* Category subtotals */}
        {Object.keys(byCategory).length > 0 && (
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100 mb-4">
            {Object.entries(byCategory).map(([cat, total]) => (
              <div key={cat} className="bg-gray-50 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] text-gray-400">{categoryLabel(cat)}</div>
                <div className="text-xs font-semibold text-gray-700">{fmt(total)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Entry form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-gray-700 mb-3">New Expense Entry</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Q1 property management"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>
            {formError && <p className="text-xs text-red-600 mb-2">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Expense"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setShowForm(false); setFormError(null); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Expense History</h3>
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-400">No expenses recorded yet</div>
            <div className="text-xs text-gray-300 mt-1">
              Add expense entries above to track management fees, legal costs, maintenance and more.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-[10px] text-gray-400 uppercase font-semibold">Date</th>
                  <th className="text-left py-2 pr-4 text-[10px] text-gray-400 uppercase font-semibold">Category</th>
                  <th className="text-right py-2 pr-4 text-[10px] text-gray-400 uppercase font-semibold">Amount</th>
                  <th className="text-left py-2 text-[10px] text-gray-400 uppercase font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 text-gray-600">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge color={CATEGORY_COLORS[e.category] ?? "gray"}>
                        {categoryLabel(e.category)}
                      </Badge>
                    </td>
                    <td className={cn("py-2.5 pr-4 text-right font-semibold text-red-600")}>
                      -{fmt(e.amount)}
                    </td>
                    <td className="py-2.5 text-gray-400">
                      {e.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
