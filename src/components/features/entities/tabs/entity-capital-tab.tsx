"use client";

import { Fragment, useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { CreateCapitalCallForm } from "@/components/features/capital/create-capital-call-form";
import { CreateDistributionForm } from "@/components/features/capital/create-distribution-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

function toQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} '${String(d.getFullYear()).slice(2)}`;
}

export function EntityCapitalTab({ entity, entityId }: { entity: any; entityId: string }) {
  const toast = useToast();
  const e = entity;

  const [showCapCall, setShowCapCall] = useState(false);
  const [showDist, setShowDist] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [expandedDist, setExpandedDist] = useState<string | null>(null);
  const [distributionToConfirm, setDistributionToConfirm] = useState<string | null>(null);

  // Fee calculation state
  const [calculatingFees, setCalculatingFees] = useState(false);
  const [feeResult, setFeeResult] = useState<{
    managementFee: number;
    carriedInterest: number;
    entityName: string;
    periodDate: string;
    templateName: string | null;
  } | null>(null);
  const [feePeriodDate, setFeePeriodDate] = useState(new Date().toISOString().split("T")[0]);
  const [feeFundExpenses, setFeeFundExpenses] = useState(0);
  const [feePeriodFraction, setFeePeriodFraction] = useState(0.25);

  // Compute summary values
  const totalCalled = e.totalCalled || (e.capitalCalls || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalDistributed = e.totalDistributed || (e.distributions || []).reduce((sum: number, d: any) => sum + (d.grossAmount || 0), 0);
  const unfunded = Math.max(0, (e.totalCommitments || 0) - totalCalled);
  const netCashFlow = totalDistributed - totalCalled;

  // Chart data: per-quarter transaction activity
  const activityData = useMemo(() => {
    const qMap = new Map<string, { calls: number; distributions: number; sortKey: number }>();
    for (const c of e.capitalCalls || []) {
      if (!c.callDate) continue;
      const q = toQuarter(c.callDate);
      const ex = qMap.get(q) || { calls: 0, distributions: 0, sortKey: new Date(c.callDate).getTime() };
      ex.calls -= c.amount || 0; // negative so bars go down
      qMap.set(q, ex);
    }
    for (const d of e.distributions || []) {
      if (!d.distributionDate) continue;
      const q = toQuarter(d.distributionDate);
      const ex = qMap.get(q) || { calls: 0, distributions: 0, sortKey: new Date(d.distributionDate).getTime() };
      ex.distributions += d.grossAmount || 0;
      qMap.set(q, ex);
    }
    return [...qMap.entries()]
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([label, { calls, distributions }]) => ({ label, calls, distributions }));
  }, [e.capitalCalls, e.distributions]);

  // Chart data: distribution composition by quarter
  const compositionData = useMemo(() => {
    const qMap = new Map<string, { roc: number; income: number; ltGain: number; carry: number; sortKey: number }>();
    for (const d of e.distributions || []) {
      if (!d.distributionDate) continue;
      const q = toQuarter(d.distributionDate);
      const ex = qMap.get(q) || { roc: 0, income: 0, ltGain: 0, carry: 0, sortKey: new Date(d.distributionDate).getTime() };
      ex.roc += d.returnOfCapital || 0;
      ex.income += d.income || 0;
      ex.ltGain += d.longTermGain || 0;
      ex.carry += d.carriedInterest || 0;
      qMap.set(q, ex);
    }
    return [...qMap.entries()]
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([label, { roc, income, ltGain, carry }]) => ({ label, roc, income, ltGain, carry }));
  }, [e.distributions]);

  async function handleCallStatusTransition(callId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/capital-calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to update status");
        return;
      }
      toast.success("Status updated");
      mutate(`/api/entities/${entityId}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleFundLineItem(callId: string, lineItemId: string) {
    try {
      const res = await fetch(`/api/capital-calls/${callId}/line-items/${lineItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Funded", paidDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to fund");
        return;
      }
      toast.success("Line item funded");
      mutate(`/api/entities/${entityId}`);
    } catch {
      toast.error("Failed to fund line item");
    }
  }

  async function handleDistStatusTransition(distId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/distributions/${distId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to update status");
        return;
      }
      toast.success("Distribution status updated");
      mutate(`/api/entities/${entityId}`);
    } catch {
      toast.error("Failed to update distribution status");
    }
  }

  async function handleCalculateFees() {
    setCalculatingFees(true);
    setFeeResult(null);
    try {
      const res = await fetch("/api/fees/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          periodDate: feePeriodDate,
          fundExpenses: feeFundExpenses,
          periodFraction: feePeriodFraction,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Fee calculation failed";
        toast.error(msg);
        return;
      }
      const data = await res.json();
      setFeeResult({
        managementFee: data.managementFee,
        carriedInterest: data.carriedInterest,
        entityName: data.entityName,
        periodDate: data.periodDate,
        templateName: data.templateName ?? null,
      });
      toast.success("Fee calculation complete");
    } catch {
      toast.error("Fee calculation failed");
    } finally {
      setCalculatingFees(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Called", value: fmt(totalCalled) },
          { label: "Total Distributed", value: fmt(totalDistributed) },
          { label: "Unfunded", value: fmt(unfunded) },
          { label: "Net Cash Flow", value: fmt(netCashFlow) },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
            <div className="text-lg font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* 2. Charts row */}
      {(activityData.length >= 2 || compositionData.length >= 2) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Per-period transaction activity */}
          {activityData.length >= 2 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Transaction Activity by Quarter</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityData} margin={{ top: 4, right: 8, bottom: 12, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(Math.abs(v))} width={56} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff" }}
                    formatter={(value: any, name: any) => [fmt(Math.abs(Number(value))), name === "calls" ? "Capital Called" : "Distributed"]}
                  />
                  <Bar dataKey="calls" fill="#ef4444" radius={[0, 0, 4, 4]} name="calls" />
                  <Bar dataKey="distributions" fill="#10b981" radius={[4, 4, 0, 0]} name="distributions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div />}

          {/* Right: Distribution composition */}
          {compositionData.length >= 2 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribution Composition</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={compositionData} margin={{ top: 4, right: 8, bottom: 12, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} width={56} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff" }}
                    formatter={(value: any, name: any) => [
                      fmt(Number(value)),
                      name === "roc" ? "Return of Capital" : name === "income" ? "Income" : name === "ltGain" ? "LT Gain" : "Carried Interest",
                    ]}
                  />
                  <Bar dataKey="roc" stackId="comp" fill="#3b82f6" name="roc" />
                  <Bar dataKey="income" stackId="comp" fill="#10b981" name="income" />
                  <Bar dataKey="ltGain" stackId="comp" fill="#8b5cf6" name="ltGain" />
                  <Bar dataKey="carry" stackId="comp" fill="#ef4444" name="carry" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div />}
        </div>
      )}

      {/* 3. Capital Calls */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Capital Calls ({(e.capitalCalls || []).length})</h3>
          <Button size="sm" onClick={() => setShowCapCall(true)}>+ New Call</Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{["Call #", "Call Date", "Due Date", "Amount", "Purpose", "Status", "Funded %", "Actions"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(e.capitalCalls || []).map((c: { id: string; callNumber: string; callDate: string; dueDate: string; amount: number; purpose?: string; status: string; fundedPercent: number; lineItems?: any[] }) => (
              <Fragment key={c.id}>
                <tr className="border-t border-gray-50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setExpandedCall(expandedCall === c.id ? null : c.id)}>
                  <td className="px-3 py-2.5 font-medium text-indigo-700">{c.callNumber}</td>
                  <td className="px-3 py-2.5">{formatDate(c.callDate)}</td>
                  <td className="px-3 py-2.5">{formatDate(c.dueDate)}</td>
                  <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                  <td className="px-3 py-2.5">{c.purpose || "\u2014"}</td>
                  <td className="px-3 py-2.5"><Badge color={c.status === "FUNDED" ? "green" : c.status === "ISSUED" ? "amber" : c.status === "OVERDUE" ? "red" : "gray"}>{c.status}</Badge></td>
                  <td className="px-3 py-2.5">
                    <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.fundedPercent, 100)}%` }} /></div>
                  </td>
                  <td className="px-3 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex gap-1">
                      {c.status === "DRAFT" && (
                        <button onClick={() => handleCallStatusTransition(c.id, "ISSUED")} className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Issue</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedCall === c.id && (
                  <tr key={`${c.id}-exp`}>
                    <td colSpan={8} className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Line Items</div>
                      {(c.lineItems || []).length === 0 ? (
                        <div className="text-xs text-gray-400">No line items.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr>{["Investor", "Amount", "Status", "Paid Date", "Actions"].map((h) => <th key={h} className="text-left py-1 pr-3 text-gray-500 font-medium">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {(c.lineItems || []).map((li: any) => (
                              <tr key={li.id} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="py-1.5 pr-3">{li.investor?.name || li.investorId}</td>
                                <td className="py-1.5 pr-3 font-medium">{fmt(li.amount)}</td>
                                <td className="py-1.5 pr-3"><Badge color={li.status === "Funded" ? "green" : "gray"}>{li.status}</Badge></td>
                                <td className="py-1.5 pr-3">{formatDate(li.paidDate)}</td>
                                <td className="py-1.5">
                                  {li.status !== "Funded" && (
                                    <button onClick={() => handleFundLineItem(c.id, li.id)} className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200">Fund</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(!e.capitalCalls || e.capitalCalls.length === 0) && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No capital calls.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 3. Distributions — simplified top row, detail in expandable */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Distributions ({(e.distributions || []).length})</h3>
          <Button size="sm" onClick={() => setShowDist(true)}>+ New Distribution</Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{["Date", "Type", "Gross", "Net to LPs", "Status", "Actions"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(e.distributions || []).map((d: { id: string; distributionDate: string; source?: string; distributionType?: string; grossAmount: number; returnOfCapital: number; income: number; longTermGain: number; carriedInterest: number; netToLPs: number; status: string; lineItems?: any[] }) => (
              <Fragment key={d.id}>
                <tr className="border-t border-gray-50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setExpandedDist(expandedDist === d.id ? null : d.id)}>
                  <td className="px-3 py-2.5">{formatDate(d.distributionDate)}</td>
                  <td className="px-3 py-2.5"><Badge color="blue">{d.distributionType || d.source || "\u2014"}</Badge></td>
                  <td className="px-3 py-2.5 font-medium">{fmt(d.grossAmount)}</td>
                  <td className="px-3 py-2.5 font-bold">{fmt(d.netToLPs)}</td>
                  <td className="px-3 py-2.5"><Badge color={d.status === "PAID" ? "green" : d.status === "APPROVED" ? "amber" : "gray"}>{d.status}</Badge></td>
                  <td className="px-3 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex gap-1">
                      {d.status === "DRAFT" && (
                        <button onClick={() => handleDistStatusTransition(d.id, "APPROVED")} className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Approve</button>
                      )}
                      {d.status === "APPROVED" && (
                        <button onClick={() => setDistributionToConfirm(d.id)} className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200">Mark Paid</button>
                      )}
                      {d.status !== "DRAFT" && (
                        <button onClick={() => handleDistStatusTransition(d.id, "DRAFT")} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Revert</button>
                      )}
                      <button
                        onClick={() => window.location.href = `/transactions/distributions/${d.id}`}
                        className="px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200"
                      >Edit</button>
                      {d.status === "DRAFT" && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete this ${fmt(d.grossAmount)} distribution? This cannot be undone.`)) return;
                            const res = await fetch(`/api/distributions/${d.id}`, { method: "DELETE" });
                            if (res.ok) {
                              toast.success("Distribution deleted");
                              mutate(`/api/entities/${entityId}`);
                            } else {
                              const json = await res.json();
                              toast.error(json.error || "Failed to delete");
                            }
                          }}
                          className="px-2 py-0.5 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200"
                        >Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedDist === d.id && (
                  <tr key={`${d.id}-exp`}>
                    <td colSpan={6} className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                      {/* Breakdown details */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Return of Capital</div>
                          <div className="text-sm font-medium text-blue-600 mt-0.5">{fmt(d.returnOfCapital)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Income</div>
                          <div className="text-sm font-medium text-emerald-600 mt-0.5">{fmt(d.income)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">LT Gain</div>
                          <div className="text-sm font-medium text-purple-600 mt-0.5">{fmt(d.longTermGain)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Carried Interest</div>
                          <div className="text-sm font-medium text-red-600 mt-0.5">{fmt(d.carriedInterest)}</div>
                        </div>
                      </div>
                      {/* Line Items */}
                      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Line Items</div>
                      {(d.lineItems || []).length === 0 ? (
                        <div className="text-xs text-gray-400">No line items.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr>{["Investor", "Gross Amount", "Net Amount", "Income", "ROC", "Carry"].map((h) => <th key={h} className="text-left py-1 pr-3 text-gray-500 font-medium">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {(d.lineItems || []).map((li: any) => (
                              <tr key={li.id} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="py-1.5 pr-3">{li.investor?.name || li.investorId}</td>
                                <td className="py-1.5 pr-3 font-medium">{fmt(li.grossAmount)}</td>
                                <td className="py-1.5 pr-3 font-bold">{fmt(li.netAmount)}</td>
                                <td className="py-1.5 pr-3 text-emerald-600">{fmt(li.income)}</td>
                                <td className="py-1.5 pr-3 text-blue-600">{fmt(li.returnOfCapital)}</td>
                                <td className="py-1.5 pr-3 text-red-600">{fmt(li.carriedInterest)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(!e.distributions || e.distributions.length === 0) && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No distributions.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 4. Fee Calculation — configurable */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Fee Calculation</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Management fee and carried interest computation
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Period Date</label>
            <input
              type="date"
              value={feePeriodDate}
              onChange={(ev) => setFeePeriodDate(ev.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Fund Expenses</label>
            <input
              type="number"
              value={feeFundExpenses}
              onChange={(ev) => setFeeFundExpenses(Number(ev.target.value))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Period Fraction</label>
            <select
              value={feePeriodFraction}
              onChange={(ev) => setFeePeriodFraction(Number(ev.target.value))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0.25}>Quarterly (0.25)</option>
              <option value={0.5}>Semi-Annual (0.5)</option>
              <option value={1.0}>Annual (1.0)</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={handleCalculateFees}
              disabled={calculatingFees}
              className="w-full"
            >
              {calculatingFees ? "Calculating..." : "Calculate Fees"}
            </Button>
          </div>
        </div>
        {feeResult && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Management Fee</div>
              <div className="text-sm font-bold mt-1">{fmt(feeResult.managementFee)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Carried Interest</div>
              <div className="text-sm font-bold mt-1">{fmt(feeResult.carriedInterest)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Period</div>
              <div className="text-sm font-bold mt-1">{feeResult.periodDate}</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCapitalCallForm open={showCapCall} onClose={() => setShowCapCall(false)} entities={[{ id: entityId, name: e.name }]} />
      <CreateDistributionForm open={showDist} onClose={() => setShowDist(false)} entities={[{ id: entityId, name: e.name }]} />

      {/* Distribution paid confirmation dialog */}
      <ConfirmDialog
        open={distributionToConfirm !== null}
        onClose={() => setDistributionToConfirm(null)}
        onConfirm={async () => {
          if (distributionToConfirm) {
            await handleDistStatusTransition(distributionToConfirm, "PAID");
          }
          setDistributionToConfirm(null);
        }}
        title="Mark Distribution as Paid"
        message="Mark this distribution as paid? This action cannot be undone."
        confirmLabel="Mark Paid"
        variant="danger"
      />
    </div>
  );
}
