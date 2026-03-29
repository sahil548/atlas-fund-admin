"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { fmt, formatDate } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "capital-account", label: "Capital Account" },
  { key: "commitments", label: "Commitments" },
  { key: "activity", label: "Activity" },
  { key: "documents", label: "Documents" },
  { key: "access", label: "Portal Access" },
];

export default function InvestorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { firmId } = useFirm();
  const { data: investor, isLoading } = useSWR(id ? `/api/investors/${id}` : null, fetcher);
  const { data: capitalAccount } = useSWR(id ? `/api/investors/${id}/capital-account` : null, fetcher);
  const { data: docs } = useSWR(id ? `/api/investors/${id}/documents` : null, fetcher);
  const { data: access } = useSWR(id ? `/api/investors/${id}/access` : null, fetcher);
  const { data: allUsers } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const [tab, setTab] = useState("overview");
  const toast = useToast();

  // Entities list (for commitment/contribution dropdowns)
  const { data: entities } = useSWR(`/api/entities?firmId=${firmId}&limit=100`, fetcher);
  const entityList: any[] = entities?.data ?? [];

  // Grant access modal
  const [showGrantAccess, setShowGrantAccess] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: "", role: "viewer" });

  // Add commitment modal
  const [showAddCommitment, setShowAddCommitment] = useState(false);
  const [commitForm, setCommitForm] = useState({ entityId: "", amount: "" });
  const [commitSaving, setCommitSaving] = useState(false);

  // Add contribution modal
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [contribForm, setContribForm] = useState({ entityId: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "", type: "capital_call" });
  const [contribSaving, setContribSaving] = useState(false);

  if (isLoading || !investor) return <div className="text-sm text-gray-400">Loading...</div>;

  const inv = investor;
  const totalCommitted = (inv.commitments || []).reduce((s: number, c: { amount: number }) => s + c.amount, 0);
  const totalCalled = (inv.commitments || []).reduce((s: number, c: { calledAmount: number }) => s + c.calledAmount, 0);
  const totalDistributed = (inv.distributionLineItems || []).reduce((s: number, d: { grossAmount?: number; netAmount: number }) => s + (d.grossAmount ?? d.netAmount), 0);

  // Users who already have access (for filtering the grant dropdown)
  const accessUserIds = new Set((access || []).map((a: any) => a.userId));
  const availableUsers = (allUsers || []).filter((u: any) => !accessUserIds.has(u.id) && u.isActive);

  async function handleGrantAccess() {
    if (!grantForm.userId) { toast.error("Select a user"); return; }
    try {
      await fetch(`/api/investors/${id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantForm),
      });
      toast.success("Access granted");
      mutate(`/api/investors/${id}/access`);
      setShowGrantAccess(false);
      setGrantForm({ userId: "", role: "viewer" });
    } catch {
      toast.error("Failed to grant access");
    }
  }

  async function handleRevokeAccess(userId: string, userName: string) {
    try {
      await fetch(`/api/investors/${id}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      toast.success(`Access revoked for ${userName}`);
      mutate(`/api/investors/${id}/access`);
    } catch {
      toast.error("Failed to revoke access");
    }
  }

  async function handleBulkGrantAccess() {
    const lpUsers = availableUsers.filter((u: any) => u.role === "LP_INVESTOR");
    if (lpUsers.length === 0) { toast.error("All LP users already have access"); return; }
    let granted = 0;
    for (const u of lpUsers) {
      try {
        await fetch(`/api/investors/${id}/access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: u.id, role: "viewer" }),
        });
        granted++;
      } catch { /* skip failures */ }
    }
    toast.success(`Granted access to ${granted} LP user${granted !== 1 ? "s" : ""}`);
    mutate(`/api/investors/${id}/access`);
  }

  async function handleAddCommitment() {
    if (!commitForm.entityId || !commitForm.amount) { toast.error("Entity and amount are required"); return; }
    setCommitSaving(true);
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: id,
          entityId: commitForm.entityId,
          amount: Number(commitForm.amount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to add commitment");
        return;
      }
      toast.success("Commitment added");
      mutate(`/api/investors/${id}`);
      setShowAddCommitment(false);
      setCommitForm({ entityId: "", amount: "" });
    } catch {
      toast.error("Failed to add commitment");
    } finally {
      setCommitSaving(false);
    }
  }

  async function handleAddContribution() {
    if (!contribForm.entityId || !contribForm.amount || !contribForm.date) {
      toast.error("Vehicle, amount, and date are required");
      return;
    }
    setContribSaving(true);
    try {
      // Create a capital call or distribution line item depending on type
      const endpoint = contribForm.type === "capital_call" ? "/api/capital-calls" : "/api/distributions";
      const body = contribForm.type === "capital_call"
        ? {
            entityId: contribForm.entityId,
            callDate: contribForm.date,
            dueDate: contribForm.date,
            totalAmount: Number(contribForm.amount),
            purpose: contribForm.description || "Capital contribution",
            lineItems: [{ investorId: id, amount: Number(contribForm.amount) }],
          }
        : {
            entityId: contribForm.entityId,
            distributionDate: contribForm.date,
            totalAmount: Number(contribForm.amount),
            source: contribForm.description || "Distribution",
            lineItems: [{ investorId: id, netAmount: Number(contribForm.amount), income: 0, returnOfCapital: 0 }],
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to add contribution");
        return;
      }
      toast.success(contribForm.type === "capital_call" ? "Capital call recorded" : "Distribution recorded");
      mutate(`/api/investors/${id}`);
      setShowAddContribution(false);
      setContribForm({ entityId: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "", type: "capital_call" });
    } catch {
      toast.error("Failed to add contribution");
    } finally {
      setContribSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href="/directory" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">&larr; All Investors</Link>
        <h2 className="text-lg font-bold">{inv.name}</h2>
        <div className="flex gap-2 mt-1">
          <Badge color="blue">{inv.investorType}</Badge>
          <Badge color={inv.kycStatus === "Verified" ? "green" : "red"}>{inv.kycStatus}</Badge>
          {inv.advisoryBoard && <Badge color="purple">Advisory Board</Badge>}
          <Badge color="gray">Contact: {inv.contactPreference}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${tab === t.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-transparent hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Committed", value: fmt(totalCommitted) },
              { label: "Total Called", value: fmt(totalCalled) },
              { label: "Total Distributed", value: fmt(totalDistributed) },
              { label: "Uncalled", value: fmt(totalCommitted - totalCalled) },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
                <div className="text-lg font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3">Commitments by Entity</h3>
            <div className="space-y-2">
              {(inv.commitments || []).map((c: { id: string; amount: number; calledAmount: number; entity: { id: string; name: string } }) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <Link href={`/entities/${c.entity.id}`} className="text-sm text-indigo-700 hover:underline font-medium">{c.entity.name}</Link>
                  <div className="text-sm">
                    <span className="font-medium">{fmt(c.amount)}</span>
                    <span className="text-gray-400 ml-2">({fmt(c.calledAmount)} called)</span>
                  </div>
                </div>
              ))}
              {(!inv.commitments || inv.commitments.length === 0) && <div className="text-sm text-gray-400 text-center py-4">No commitments.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Capital Account Tab */}
      {tab === "capital-account" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold mb-4">Capital Account Statement</h3>
          {capitalAccount && capitalAccount.length > 0 ? (
            <div className="space-y-1 text-sm font-mono">
              {(() => {
                const latest = capitalAccount[0];
                const rows = [
                  { l: "Beginning Balance", v: fmt(latest.beginningBalance), b: true },
                  { l: "Contributions", v: fmt(latest.contributions) },
                  { l: "Income Allocations", v: fmt(latest.incomeAllocations), g: true },
                  { l: "Capital Allocations", v: fmt(latest.capitalAllocations), c: "text-indigo-700" },
                  { l: "Distributions", v: `(${fmt(Math.abs(latest.distributions))})`, d: true },
                  { l: "Fees & Expenses", v: `(${fmt(Math.abs(latest.fees))})`, d: true },
                  { l: "Ending Balance", v: fmt(latest.endingBalance), b: true, h: "bg-indigo-50 text-indigo-900" },
                ];
                return rows.map((r, i) => (
                  <div key={i} className={`flex justify-between py-1 px-3 rounded ${r.b ? "font-semibold border-t border-gray-200 dark:border-gray-700 pt-2 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""} ${r.c || ""}`}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ));
              })()}
              <div className="mt-2 text-right">
                <Badge color="indigo">Computed from ledger</Badge>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">No capital account data available.</div>
          )}
        </div>
      )}

      {/* Commitments Tab */}
      {tab === "commitments" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Commitments</h3>
              <Button size="sm" onClick={() => setShowAddCommitment(true)}>+ Add Commitment</Button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>{["Entity", "Committed", "Called", "Uncalled", "% Called"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(inv.commitments || []).map((c: { id: string; amount: number; calledAmount: number; entity: { id: string; name: string } }) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2.5"><Link href={`/entities/${c.entity.id}`} className="text-indigo-700 hover:underline font-medium">{c.entity.name}</Link></td>
                    <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                    <td className="px-3 py-2.5">{c.amount > 0 ? `${((c.calledAmount / c.amount) * 100).toFixed(0)}%` : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inv.sideLetters && inv.sideLetters.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold">Side Letters</h3></div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {inv.sideLetters.map((s: { id: string; terms: string; entity: { name: string } }) => (
                  <div key={s.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge color="purple">Side Letter</Badge>
                      <span className="text-xs text-gray-500">{s.entity.name}</span>
                    </div>
                    <div className="text-sm mt-1">{s.terms}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddContribution(true)}>+ Add Contribution</Button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold">Capital Calls</h3></div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {(inv.capitalCallLineItems || []).map((item: { id: string; amount: number; status: string; capitalCall: { callNumber: string; callDate: string; dueDate: string; purpose?: string; status: string; entity: { name: string } } }) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.capitalCall.callNumber}</span>
                      <Badge color={item.capitalCall.status === "FUNDED" ? "green" : item.capitalCall.status === "ISSUED" ? "amber" : "gray"}>{item.capitalCall.status}</Badge>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.amount)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.capitalCall.entity.name} &middot; Due {formatDate(item.capitalCall.dueDate)}
                    {item.capitalCall.purpose && ` \u00B7 ${item.capitalCall.purpose}`}
                  </div>
                </div>
              ))}
              {(!inv.capitalCallLineItems || inv.capitalCallLineItems.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No capital calls.</div>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold">Distributions</h3></div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {(inv.distributionLineItems || [])
                .filter((item: { grossAmount?: number; netAmount: number; carriedInterest?: number }) => (item.grossAmount ?? item.netAmount) !== 0)
                .map((item: { id: string; grossAmount?: number; netAmount: number; income: number; returnOfCapital: number; carriedInterest?: number; distribution: { distributionDate: string; distributionType?: string; source?: string; entity: { name: string } } }) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.distribution.distributionType || item.distribution.source || "Distribution"}</span>
                      <Badge color="green">Received</Badge>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.grossAmount ?? item.netAmount)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.distribution.entity.name} &middot; {formatDate(item.distribution.distributionDate)}
                    {item.income > 0 && <span className="text-emerald-600 ml-2">Income: {fmt(item.income)}</span>}
                    {item.returnOfCapital > 0 && <span className="text-blue-600 ml-2">ROC: {fmt(item.returnOfCapital)}</span>}
                    {(item.carriedInterest ?? 0) > 0 && <span className="text-red-500 ml-2">Carry: {fmt(item.carriedInterest!)}</span>}
                    {(item.carriedInterest ?? 0) > 0 && <span className="text-gray-400 ml-2">Net: {fmt(item.netAmount)}</span>}
                  </div>
                </div>
              ))}
              {(!inv.distributionLineItems || inv.distributionLineItems.filter((item: { grossAmount?: number; netAmount: number }) => (item.grossAmount ?? item.netAmount) !== 0).length === 0) && <div className="p-6 text-center text-sm text-gray-400">No distributions.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="text-sm font-semibold">Documents</h3></div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {(docs || []).map((d: { id: string; name: string; category: string; uploadDate: string }) => (
              <div key={d.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Badge color="indigo">PDF</Badge>
                  <span className="text-sm font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="gray">{d.category}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(d.uploadDate)}</span>
                </div>
              </div>
            ))}
            {(!docs || docs.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No documents.</div>}
          </div>
        </div>
      )}

      {/* Portal Access Tab */}
      {tab === "access" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Portal Access</h3>
              <div className="flex gap-2">
                {availableUsers.filter((u: any) => u.role === "LP_INVESTOR").length > 0 && (
                  <Button size="sm" variant="secondary" onClick={handleBulkGrantAccess}>Grant All LP Users</Button>
                )}
                <Button size="sm" onClick={() => setShowGrantAccess(true)}>+ Grant Access</Button>
              </div>
            </div>
            {access && access.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {["User", "Email", "System Role", "Access Role", "Granted", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {access.map((a: any) => (
                    <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {a.user?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                          </span>
                          {a.user?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.user?.email}</td>
                      <td className="px-4 py-3">
                        <Badge color={a.user?.role === "GP_ADMIN" ? "indigo" : a.user?.role === "LP_INVESTOR" ? "green" : "blue"}>
                          {a.user?.role?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={a.role === "primary" ? "indigo" : a.role === "admin" ? "purple" : "gray"}>
                          {a.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          onClick={() => handleRevokeAccess(a.userId, a.user?.name)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">No users have portal access to this investor.</div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-xs text-gray-500">
            <strong>About Portal Access:</strong> Users with access can view this investor&apos;s data in the LP portal.
            &quot;Primary&quot; users are the main point of contact. &quot;Viewer&quot; users have read-only access.
            &quot;Admin&quot; users can manage settings for this investor.
          </div>
        </div>
      )}

      {/* Add Commitment Modal */}
      <Modal
        open={showAddCommitment}
        onClose={() => setShowAddCommitment(false)}
        title="Add Commitment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddCommitment(false)}>Cancel</Button>
            <Button loading={commitSaving} onClick={handleAddCommitment}>Add Commitment</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Vehicle" required>
            <Select
              value={commitForm.entityId}
              onChange={(e) => setCommitForm((p) => ({ ...p, entityId: e.target.value }))}
              options={[
                { value: "", label: "\u2014 Select a vehicle \u2014" },
                ...entityList.map((ent: any) => ({
                  value: ent.id,
                  label: ent.name,
                })),
              ]}
            />
          </FormField>
          <FormField label="Commitment Amount ($)" required>
            <CurrencyInput
              value={commitForm.amount}
              onChange={(v) => setCommitForm((p) => ({ ...p, amount: v }))}
              placeholder="e.g. 500,000"
            />
          </FormField>
        </div>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal
        open={showAddContribution}
        onClose={() => setShowAddContribution(false)}
        title="Add Contribution"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddContribution(false)}>Cancel</Button>
            <Button loading={contribSaving} onClick={handleAddContribution}>
              {contribForm.type === "capital_call" ? "Record Capital Call" : "Record Distribution"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Type">
            <Select
              value={contribForm.type}
              onChange={(e) => setContribForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { value: "capital_call", label: "Capital Call (money in)" },
                { value: "distribution", label: "Distribution (money out)" },
              ]}
            />
          </FormField>
          <FormField label="Vehicle" required>
            <Select
              value={contribForm.entityId}
              onChange={(e) => setContribForm((p) => ({ ...p, entityId: e.target.value }))}
              options={[
                { value: "", label: "\u2014 Select a vehicle \u2014" },
                ...entityList.map((ent: any) => ({
                  value: ent.id,
                  label: ent.name,
                })),
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount ($)" required>
              <CurrencyInput
                value={contribForm.amount}
                onChange={(v) => setContribForm((p) => ({ ...p, amount: v }))}
                placeholder="e.g. 100,000"
              />
            </FormField>
            <FormField label="Date" required>
              <Input
                type="date"
                value={contribForm.date}
                onChange={(e) => setContribForm((p) => ({ ...p, date: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Input
              value={contribForm.description}
              onChange={(e) => setContribForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={contribForm.type === "capital_call" ? "e.g. Q1 capital call" : "e.g. Q4 distribution"}
            />
          </FormField>
        </div>
      </Modal>

      {/* Grant Access Modal */}
      <Modal
        open={showGrantAccess}
        onClose={() => setShowGrantAccess(false)}
        title="Grant Portal Access"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowGrantAccess(false)}>Cancel</Button>
            <Button onClick={handleGrantAccess}>Grant Access</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="User" required>
            <Select
              value={grantForm.userId}
              onChange={(e) => setGrantForm((p) => ({ ...p, userId: e.target.value }))}
              options={[
                { value: "", label: "\u2014 Select a user \u2014" },
                ...availableUsers.map((u: any) => ({
                  value: u.id,
                  label: `${u.name} (${u.role?.replace(/_/g, " ")})`,
                })),
              ]}
            />
          </FormField>
          <FormField label="Access Role">
            <Select
              value={grantForm.role}
              onChange={(e) => setGrantForm((p) => ({ ...p, role: e.target.value }))}
              options={[
                { value: "viewer", label: "Viewer (read-only)" },
                { value: "primary", label: "Primary (main contact)" },
                { value: "admin", label: "Admin (manage settings)" },
              ]}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
