"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { fmt, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { CreateSideLetterForm } from "@/components/features/side-letters/create-side-letter-form";
import { SideLetterRulesPanel } from "@/components/features/side-letters/side-letter-rules-panel";
import { CreateUnitClassForm } from "@/components/features/entities/create-unit-class-form";
import { IssueUnitsForm } from "@/components/features/entities/issue-units-form";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CLASS_TYPE_LABELS: Record<string, string> = {
  LP_UNIT: "LP",
  GP_UNIT: "GP",
  CARRIED_INTEREST: "Carry",
  MANAGEMENT: "Mgmt",
};

const CLASS_TYPE_COLORS: Record<string, string> = {
  LP_UNIT: "indigo",
  GP_UNIT: "purple",
  CARRIED_INTEREST: "amber",
  MANAGEMENT: "blue",
};

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

export function EntityCapTableTab({ entity, entityId }: { entity: any; entityId: string }) {
  const toast = useToast();
  const { firmId } = useFirm();
  const e = entity;

  // Fetch all investors for the add commitment dropdown
  const { data: investorsData } = useSWR(`/api/investors?firmId=${firmId}&limit=100`, fetcher);
  const allInvestors: any[] = investorsData?.data ?? [];

  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAddCommitment, setShowAddCommitment] = useState(false);
  const [commitForm, setCommitForm] = useState({ investorId: "", amount: "" });
  const [commitSaving, setCommitSaving] = useState(false);
  const [issueTarget, setIssueTarget] = useState<{ id: string; name: string; unitPrice: number } | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [showCreateSideLetter, setShowCreateSideLetter] = useState(false);
  const [selectedSideLetterId, setSelectedSideLetterId] = useState<string | null>(null);

  const unitClasses: any[] = e.unitClasses || [];
  const commitments: any[] = e.commitments || [];

  // Aggregate unit classes stats
  const activeClasses = unitClasses.filter((uc: any) => uc.status === "ACTIVE");
  const totalUnitsOutstanding = unitClasses.reduce((sum: number, uc: any) => sum + uc.totalIssued, 0);
  const allActiveUnits = unitClasses.flatMap((uc: any) =>
    (uc.ownershipUnits || []).filter((ou: any) => ou.status === "ACTIVE")
  );
  const uniqueInvestorIds = new Set(allActiveUnits.map((ou: any) => ou.investorId));

  // Build ownership summary: aggregate across all classes per investor
  const investorMap = new Map<string, { name: string; investorType: string; kycStatus: string; commitment: number; unitsByClass: Record<string, number>; totalUnits: number }>();

  // Seed from commitments
  for (const c of commitments) {
    if (!investorMap.has(c.investor.id)) {
      investorMap.set(c.investor.id, {
        name: c.investor.name,
        investorType: c.investor.investorType,
        kycStatus: c.investor.kycStatus,
        commitment: 0,
        unitsByClass: {},
        totalUnits: 0,
      });
    }
    const inv = investorMap.get(c.investor.id)!;
    inv.commitment += c.amount;
  }

  // Add unit ownership
  for (const uc of unitClasses) {
    for (const ou of (uc.ownershipUnits || []).filter((u: any) => u.status === "ACTIVE")) {
      if (!investorMap.has(ou.investorId)) {
        investorMap.set(ou.investorId, {
          name: ou.investor.name,
          investorType: ou.investor.investorType,
          kycStatus: ou.investor.kycStatus,
          commitment: 0,
          unitsByClass: {},
          totalUnits: 0,
        });
      }
      const inv = investorMap.get(ou.investorId)!;
      inv.unitsByClass[uc.id] = (inv.unitsByClass[uc.id] || 0) + ou.unitsIssued;
      inv.totalUnits += ou.unitsIssued;
    }
  }

  const grandTotalUnits = Array.from(investorMap.values()).reduce((sum, inv) => sum + inv.totalUnits, 0);

  // Investors from commitments for the issue units dropdown
  const committedInvestors = commitments.map((c: any) => ({ id: c.investor.id, name: c.investor.name }));
  // Deduplicate
  const investorOptions = Array.from(new Map(committedInvestors.map((i: any) => [i.id, i])).values());

  async function handleDeleteClass(classId: string) {
    if (!confirm("Delete this unit class? This cannot be undone.")) return;
    const res = await fetch(`/api/unit-classes/${classId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      const msg = typeof data.error === "string" ? data.error : "Failed to delete";
      toast.error(msg);
      return;
    }
    toast.success("Unit class deleted");
    mutate(`/api/entities/${entityId}`);
  }

  async function handleAddCommitment() {
    if (!commitForm.investorId || !commitForm.amount) { toast.error("Investor and amount are required"); return; }
    setCommitSaving(true);
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: commitForm.investorId,
          entityId,
          amount: Number(commitForm.amount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : "Failed to add commitment");
        return;
      }
      toast.success("Commitment added");
      mutate(`/api/entities/${entityId}`);
      setShowAddCommitment(false);
      setCommitForm({ investorId: "", amount: "" });
    } catch {
      toast.error("Failed to add commitment");
    } finally {
      setCommitSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Unit Classes</div>
          <div className="text-xl font-bold mt-1">{activeClasses.length}</div>
          <div className="text-[10px] text-gray-400">{unitClasses.length} total</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Units Outstanding</div>
          <div className="text-xl font-bold mt-1">{totalUnitsOutstanding.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">across all classes</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Unique Investors</div>
          <div className="text-xl font-bold mt-1">{uniqueInvestorIds.size}</div>
          <div className="text-[10px] text-gray-400">holding units</div>
        </div>
      </div>

      {/* Unit Classes Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Unit Classes ({unitClasses.length})</h3>
          <Button size="sm" onClick={() => setShowCreateClass(true)}>+ Add Class</Button>
        </div>

        {unitClasses.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No unit classes defined. Add one to track ownership.</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {unitClasses.map((uc: any) => {
              const isExpanded = expandedClass === uc.id;
              const activeUnits = (uc.ownershipUnits || []).filter((ou: any) => ou.status === "ACTIVE");
              const available = uc.totalAuthorized ? uc.totalAuthorized - uc.totalIssued : null;
              const utilizationPct = uc.totalAuthorized ? Math.round((uc.totalIssued / uc.totalAuthorized) * 100) : null;

              return (
                <div key={uc.id}>
                  {/* Class Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setExpandedClass(isExpanded ? null : uc.id)}
                  >
                    <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{uc.name}</span>
                        <Badge color={CLASS_TYPE_COLORS[uc.classType] || "gray"}>{CLASS_TYPE_LABELS[uc.classType] || uc.classType}</Badge>
                        <Badge color={uc.status === "ACTIVE" ? "green" : uc.status === "FROZEN" ? "amber" : "gray"}>{uc.status}</Badge>
                        {uc.votingRights && <Badge color="blue">Voting</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400">Price</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">${uc.unitPrice.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400">Issued</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{uc.totalIssued.toLocaleString()}</div>
                      </div>
                      {uc.totalAuthorized && (
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Authorized</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{uc.totalAuthorized.toLocaleString()}</div>
                        </div>
                      )}
                      {uc.preferredReturnRate != null && (
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Pref Return</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{(uc.preferredReturnRate * 100).toFixed(1)}%</div>
                        </div>
                      )}
                      {uc.managementFeeRate != null && (
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Mgmt Fee</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{(uc.managementFeeRate * 100).toFixed(1)}%</div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400">Holders</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{activeUnits.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: ownership units table + utilization bar */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                      {/* Utilization bar */}
                      {utilizationPct !== null && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${utilizationPct > 90 ? "bg-red-500" : utilizationPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {utilizationPct}% utilized · {available?.toLocaleString()} available
                          </span>
                        </div>
                      )}

                      {uc.description && (
                        <p className="text-xs text-gray-500 mb-3">{uc.description}</p>
                      )}

                      {activeUnits.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left">
                              {["Investor", "Type", "Units", "Cost/Unit", "Cost Basis", "Acquired", "Status"].map((h) => (
                                <th key={h} className="px-2 py-1.5 font-semibold text-gray-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(uc.ownershipUnits || []).map((ou: any) => (
                              <tr key={ou.id} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="px-2 py-2">
                                  <Link href={`/investors/${ou.investor.id}`} className="text-indigo-700 hover:underline font-medium">{ou.investor.name}</Link>
                                </td>
                                <td className="px-2 py-2"><Badge color="blue">{ou.investor.investorType}</Badge></td>
                                <td className="px-2 py-2 font-medium">{ou.unitsIssued.toLocaleString()}</td>
                                <td className="px-2 py-2">${ou.unitCost.toLocaleString()}</td>
                                <td className="px-2 py-2 font-medium">{fmt(ou.unitsIssued * ou.unitCost)}</td>
                                <td className="px-2 py-2 text-gray-500">{formatDate(ou.acquisitionDate)}</td>
                                <td className="px-2 py-2">
                                  <Badge color={ou.status === "ACTIVE" ? "green" : ou.status === "REDEEMED" ? "amber" : "gray"}>
                                    {ou.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-xs text-gray-400 py-3 text-center">No units issued in this class yet.</div>
                      )}

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          size="sm"
                          onClick={(ev) => { ev.stopPropagation(); setIssueTarget({ id: uc.id, name: uc.name, unitPrice: uc.unitPrice }); }}
                          disabled={uc.status !== "ACTIVE"}
                        >
                          Issue Units
                        </Button>
                        {activeUnits.length === 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteClass(uc.id); }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Delete Class
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ownership Summary */}
      {investorMap.size > 0 && unitClasses.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold">Ownership Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Investor</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Type</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Commitment</th>
                  {unitClasses.map((uc: any) => (
                    <th key={uc.id} className="text-right px-3 py-2 font-semibold text-gray-600">{uc.name}</th>
                  ))}
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Total Units</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Ownership %</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">KYC</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(investorMap.entries()).map(([invId, inv]) => (
                  <tr key={invId} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2.5">
                      <Link href={`/investors/${invId}`} className="text-indigo-700 hover:underline font-medium">{inv.name}</Link>
                    </td>
                    <td className="px-3 py-2.5"><Badge color="blue">{inv.investorType}</Badge></td>
                    <td className="px-3 py-2.5 text-right font-medium">{inv.commitment > 0 ? fmt(inv.commitment) : "—"}</td>
                    {unitClasses.map((uc: any) => (
                      <td key={uc.id} className="px-3 py-2.5 text-right">
                        {inv.unitsByClass[uc.id] ? inv.unitsByClass[uc.id].toLocaleString() : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-semibold">{inv.totalUnits > 0 ? inv.totalUnits.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {grandTotalUnits > 0 && inv.totalUnits > 0
                        ? `${((inv.totalUnits / grandTotalUnits) * 100).toFixed(1)}%`
                        : inv.commitment > 0 && e.totalCommitments
                          ? `${((inv.commitment / e.totalCommitments) * 100).toFixed(1)}%`
                          : "—"}
                    </td>
                    <td className="px-3 py-2.5"><Badge color={inv.kycStatus === "Verified" ? "green" : "red"}>{inv.kycStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
              {investorMap.size > 1 && (
                <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200">
                  <tr className="font-semibold text-gray-700 dark:text-gray-300">
                    <td className="px-3 py-2" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right">{fmt(Array.from(investorMap.values()).reduce((s, i) => s + i.commitment, 0))}</td>
                    {unitClasses.map((uc: any) => (
                      <td key={uc.id} className="px-3 py-2 text-right">{uc.totalIssued.toLocaleString()}</td>
                    ))}
                    <td className="px-3 py-2 text-right">{grandTotalUnits.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{grandTotalUnits > 0 ? "100.0%" : "—"}</td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Commitments Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Commitments ({commitments.length})</h3>
          <Button size="sm" onClick={() => setShowAddCommitment(true)}>+ Add Commitment</Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{["Investor", "Type", "Commitment", "Called", "Uncalled", "KYC"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {commitments.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2.5"><Link href={`/investors/${c.investor.id}`} className="text-indigo-700 hover:underline font-medium">{c.investor.name}</Link></td>
                <td className="px-3 py-2.5"><Badge color="blue">{c.investor.investorType}</Badge></td>
                <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                <td className="px-3 py-2.5"><Badge color={c.investor.kycStatus === "Verified" ? "green" : "red"}>{c.investor.kycStatus}</Badge></td>
              </tr>
            ))}
            {commitments.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No committed investors.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Side Letters Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Side Letters ({(e.sideLetters || []).length})</h3>
          <Button size="sm" onClick={() => setShowCreateSideLetter(true)}>+ Add Side Letter</Button>
        </div>
        {(e.sideLetters || []).length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No side letters. Add one to track investor-specific terms.</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {(e.sideLetters || []).map((sl: any) => (
              <div key={sl.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/investors/${sl.investor.id}`} className="text-xs font-medium text-indigo-700 hover:underline">{sl.investor.name}</Link>
                      {(sl.rules || []).filter((r: any) => r.isActive).length > 0 && (
                        <Badge color="blue">{(sl.rules || []).filter((r: any) => r.isActive).length} rule{(sl.rules || []).filter((r: any) => r.isActive).length !== 1 ? "s" : ""}</Badge>
                      )}
                    </div>
                    {sl.terms && <p className="text-xs text-gray-500 line-clamp-2">{sl.terms}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedSideLetterId(selectedSideLetterId === sl.id ? null : sl.id)}
                  >
                    {selectedSideLetterId === sl.id ? "Hide Rules" : "Manage Rules"}
                  </Button>
                </div>
                {selectedSideLetterId === sl.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <SideLetterRulesPanel
                      sideLetterId={sl.id}
                      investorName={sl.investor.name}
                      entityName={sl.entity.name}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUnitClassForm
        open={showCreateClass}
        onClose={() => setShowCreateClass(false)}
        onCreated={() => mutate(`/api/entities/${entityId}`)}
        entityId={entityId}
      />

      {issueTarget && (
        <IssueUnitsForm
          open={!!issueTarget}
          onClose={() => setIssueTarget(null)}
          onCreated={() => mutate(`/api/entities/${entityId}`)}
          unitClassId={issueTarget.id}
          unitClassName={issueTarget.name}
          unitPrice={issueTarget.unitPrice}
          investors={investorOptions}
        />
      )}

      <CreateSideLetterForm
        open={showCreateSideLetter}
        onClose={() => setShowCreateSideLetter(false)}
        onCreated={() => mutate(`/api/entities/${entityId}`)}
      />

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
          <FormField label="Investor" required>
            <Select
              value={commitForm.investorId}
              onChange={(ev) => setCommitForm((p) => ({ ...p, investorId: ev.target.value }))}
              options={[
                { value: "", label: "\u2014 Select an investor \u2014" },
                ...allInvestors.map((inv: any) => ({
                  value: inv.id,
                  label: `${inv.name} (${inv.investorType})`,
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
    </div>
  );
}
