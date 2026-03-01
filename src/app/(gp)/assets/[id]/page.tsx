"use client";

import { use, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { fmt, pct } from "@/lib/utils";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TC: Record<string, string> = {
  DIRECT_EQUITY: "indigo", PRIVATE_CREDIT: "orange", REAL_ESTATE_DIRECT: "green",
  FUND_LP_POSITION: "purple", CO_INVESTMENT: "blue",
};
const TL: Record<string, string> = {
  DIRECT_EQUITY: "Equity", PRIVATE_CREDIT: "Credit", REAL_ESTATE_DIRECT: "Real Estate",
  FUND_LP_POSITION: "Fund LP", CO_INVESTMENT: "Co-Invest",
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: a, isLoading } = useSWR(`/api/assets/${id}`, fetcher);
  const [tab, setTab] = useState("overview");

  if (isLoading || !a) return <div className="text-sm text-gray-400">Loading...</div>;

  const ur = a.fairValue - a.costBasis;
  const allTabs = ["overview"];
  if (a.creditDetails || a.creditAgreements?.length) allTabs.push("loan");
  if (a.realEstateDetails) allTabs.push("property");
  if (a.fundLPDetails) allTabs.push("fund");
  allTabs.push("valuation", "documents", "meetings", "tasks", "governance");

  return (
    <div className="space-y-4">
      <Link href="/assets" className="text-xs text-indigo-600 hover:underline">&larr; Back to Assets</Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{a.name}</h2>
              <Badge color={TC[a.assetType]}>{TL[a.assetType]}</Badge>
              <Badge color={a.status === "ACTIVE" ? "green" : "purple"}>{a.status.toLowerCase()}</Badge>
              {a.hasBoardSeat && <Badge color="indigo">Board Seat</Badge>}
            </div>
            <div className="text-xs text-gray-500">
              {a.sector} · Entered {a.entryDate ? new Date(a.entryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"} ·{" "}
              {a.entityAllocations?.map((ea: { entity: { name: string } }) => ea.entity.name).join(", ")}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700">+ Log Income</button>
            <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700">+ Task</button>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">Mark Valuation</button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[
            { l: "Fair Value", v: fmt(a.fairValue) },
            { l: "Cost Basis", v: fmt(a.costBasis) },
            { l: "Unrealized", v: `${ur > 0 ? "+" : ""}${fmt(ur)}`, c: ur > 0 ? "text-emerald-700" : "text-red-600" },
            { l: "MOIC", v: `${(a.moic || 0).toFixed(2)}x`, c: (a.moic || 0) >= 2 ? "text-emerald-700" : "" },
            { l: "Gross IRR", v: a.irr ? pct(a.irr) : "—", c: "text-emerald-700" },
            { l: "Income", v: a.incomeType || "—" },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">{s.l}</div>
              <div className={`text-lg font-bold ${s.c || "text-gray-900"}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs tabs={allTabs} active={tab} onChange={setTab} />

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {a.equityDetails && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Company Dashboard</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries({
                  Instrument: a.equityDetails.instrument,
                  Ownership: a.equityDetails.ownership,
                  Revenue: a.equityDetails.revenue,
                  EBITDA: a.equityDetails.ebitda,
                  Growth: a.equityDetails.growth,
                  Employees: a.equityDetails.employees,
                }).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.valuations?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Valuation History</h3>
              {a.valuations.map((v: { id: string; valuationDate: string; method: string; fairValue: number; moic: number; status: string }, i: number) => (
                <div key={v.id} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-400 w-20">{new Date(v.valuationDate).toLocaleDateString()}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(v.fairValue / a.valuations[0].fairValue) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-16 text-right">{fmt(v.fairValue)}</span>
                  <Badge color={v.status === "APPROVED" ? "green" : "yellow"}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {a.incomeEvents?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Cash Flows</h3>
              {a.incomeEvents.map((cf: { id: string; date: string; incomeType: string; amount: number; isPrincipal: boolean }) => (
                <div key={cf.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cf.isPrincipal ? "bg-blue-400" : "bg-emerald-400"}`} />
                    <span className="text-xs text-gray-600">{new Date(cf.date).toLocaleDateString()}</span>
                    <span className="text-xs">{cf.incomeType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${cf.amount > 0 ? "text-emerald-700" : ""}`}>
                      {cf.amount > 0 ? "+" : ""}{fmt(cf.amount)}
                    </span>
                    <Badge color={cf.isPrincipal ? "blue" : "green"}>{cf.isPrincipal ? "Principal" : "Income"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {a.activityEvents?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
              {a.activityEvents.map((e: { id: string; eventDate: string; description: string; eventType: string }) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] text-gray-400 w-16">{new Date(e.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <Badge color={e.eventType === "meeting" ? "purple" : e.eventType === "task" ? "green" : e.eventType === "document" ? "blue" : "orange"}>
                    {e.eventType}
                  </Badge>
                  <span className="text-xs text-gray-700">{e.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loan Tab */}
      {tab === "loan" && a.creditDetails && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Principal" value={a.creditDetails.principal || "—"} small />
            <StatCard label="Rate" value={a.creditDetails.rate || "—"} small />
            <StatCard label="Maturity" value={a.creditDetails.maturity || "—"} small />
            <StatCard label="Accrued" value={a.creditDetails.accruedInterest || "—"} small />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Covenant Monitor</h3>
              {a.creditAgreements?.flatMap((ag: { covenants: { id: string; name: string; thresholdOperator: string; thresholdValue: number; lastTestedValue: string; currentStatus: string }[] }) => ag.covenants).map((c: { id: string; name: string; thresholdOperator: string; thresholdValue: number; lastTestedValue: string; currentStatus: string }) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">Threshold: {c.thresholdOperator} {c.thresholdValue}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.lastTestedValue}</span>
                    <Badge color={c.currentStatus === "COMPLIANT" ? "green" : "red"}>
                      {c.currentStatus === "COMPLIANT" ? "Compliant" : "Breach"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold mb-3">Payment Schedule</h3>
              {a.creditAgreements?.flatMap((ag: { payments: { id: string; date: string; paymentType: string; amount: number; status: string }[] }) => ag.payments).map((p: { id: string; date: string; paymentType: string; amount: number; status: string }) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString()}</span>
                    <span className="text-xs">{p.paymentType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{fmt(p.amount)}</span>
                    <Badge color={p.status === "Received" ? "green" : "yellow"}>{p.status}</Badge>
                  </div>
                </div>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500">LTV</div>
                  <div className="text-sm font-semibold">{a.creditDetails.ltv}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500">DSCR</div>
                  <div className="text-sm font-semibold">{a.creditDetails.dscr}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Tab */}
      {tab === "property" && a.realEstateDetails && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="NOI" value={a.realEstateDetails.noi || "—"} sub="Annual" small />
            <StatCard label="Occupancy" value={a.realEstateDetails.occupancy || "—"} small />
            <StatCard label="Cap Rate" value={a.realEstateDetails.capRate || "—"} small />
            <StatCard label="Debt" value={a.realEstateDetails.debt || "—"} small />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Tenant Roll — Contract Detail</h3>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {["Tenant", "Sq Ft", "Annual Rent", "Lease Term", "% of Rent"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.leases?.map((t: { id: string; tenantName: string; squareFootage: string; baseRentAnnual: number; leaseStartDate: string; leaseEndDate: string; rentPercentOfTotal: string; currentStatus: string }) => (
                  <tr key={t.id} className="border-t border-gray-50">
                    <td className={`px-3 py-2.5 font-medium ${t.currentStatus === "TERMINATED" || t.tenantName === "Vacant" ? "text-red-600" : ""}`}>{t.tenantName}</td>
                    <td className="px-3 py-2.5">{t.squareFootage}</td>
                    <td className="px-3 py-2.5">{t.baseRentAnnual ? fmt(t.baseRentAnnual) : "—"}</td>
                    <td className="px-3 py-2.5">
                      {t.leaseStartDate && t.leaseEndDate
                        ? `${new Date(t.leaseStartDate).getFullYear()}-${new Date(t.leaseEndDate).getFullYear()}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">{t.rentPercentOfTotal || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fund LP Tab */}
      {tab === "fund" && a.fundLPDetails && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Commitment" value={a.fundLPDetails.commitment || "—"} sub={`Called: ${a.fundLPDetails.calledAmount}`} small />
            <StatCard label="GP-Reported NAV" value={fmt(a.fairValue)} sub={`As of ${a.fundLPDetails.navDate}`} small />
            <StatCard label="Distributions" value={a.fundLPDetails.distributions || "—"} small />
            <StatCard label="Uncalled" value={a.fundLPDetails.uncalledAmount || "—"} small />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">GP Summary — {a.fundLPDetails.gpName}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                {[
                  ["Strategy", a.fundLPDetails.strategy],
                  ["Vintage", a.fundLPDetails.vintage],
                  ["GP IRR", a.fundLPDetails.gpIrr],
                  ["GP TVPI", a.fundLPDetails.gpTvpi],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-amber-800">Valuation Note</div>
                <div className="text-xs text-amber-700 mt-1">
                  Fair value = GP-reported NAV. Last statement: {a.fundLPDetails.navDate}
                </div>
                {a.nextReview && (
                  <div className="text-xs text-amber-600 mt-2">
                    Next review: {new Date(a.nextReview).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings Tab */}
      {tab === "meetings" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Meetings & Notes</h3>
          {a.meetings?.length > 0 ? a.meetings.map((m: { id: string; meetingDate: string; title: string; hasTranscript: boolean; actionItems: number }) => (
            <div key={m.id} className="p-3 border border-gray-100 rounded-lg mb-2 hover:border-indigo-200 cursor-pointer">
              <div className="flex justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(m.meetingDate).toLocaleDateString()}</span>
                  <span className="text-sm font-medium">{m.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                  <span className="text-xs text-gray-500">{m.actionItems} actions</span>
                </div>
              </div>
            </div>
          )) : <div className="text-xs text-gray-400 text-center py-6">No meetings recorded</div>}
        </div>
      )}

      {/* Tasks Tab */}
      {tab === "tasks" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Tasks</h3>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium">+ New Task</button>
          </div>
          {a.tasks?.length > 0 ? a.tasks.map((t: { id: string; title: string; status: string; dueDate: string; assigneeName: string }) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${t.status === "DONE" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>
                  {t.status === "DONE" ? "\u2713" : ""}
                </span>
                <div>
                  <div className={`text-sm ${t.status === "DONE" ? "text-gray-400 line-through" : ""}`}>{t.title}</div>
                  <div className="text-[10px] text-gray-500">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"} · {t.assigneeName}</div>
                </div>
              </div>
              <Badge color={t.status === "DONE" ? "green" : t.status === "IN_PROGRESS" ? "yellow" : "gray"}>
                {t.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          )) : <div className="text-xs text-gray-400 text-center py-6">No tasks yet</div>}
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Documents</h3>
            <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg">+ Upload</button>
          </div>
          {a.documents?.length > 0 ? a.documents.map((d: { id: string; name: string; uploadDate: string; category: string }) => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-100 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-gray-400">📄</span>
                <div>
                  <div className="text-sm">{d.name}</div>
                  <div className="text-[10px] text-gray-500">{new Date(d.uploadDate).toLocaleDateString()}</div>
                </div>
              </div>
              <Badge>{d.category}</Badge>
            </div>
          )) : <div className="text-xs text-gray-400 text-center py-6">No documents uploaded</div>}
        </div>
      )}

      {/* Valuation Tab */}
      {tab === "valuation" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Valuation History</h3>
          {a.valuations?.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Method", "Fair Value", "MOIC", "Status"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.valuations.map((v: { id: string; valuationDate: string; method: string; fairValue: number; moic: number; status: string }) => (
                  <tr key={v.id} className="border-t border-gray-50">
                    <td className="px-3 py-2.5">{new Date(v.valuationDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{v.method.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(v.fairValue)}</td>
                    <td className="px-3 py-2.5">{v.moic?.toFixed(2)}x</td>
                    <td className="px-3 py-2.5"><Badge color={v.status === "APPROVED" ? "green" : "yellow"}>{v.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-xs text-gray-400 text-center py-6">No valuations recorded</div>}
        </div>
      )}

      {/* Governance Tab */}
      {tab === "governance" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Governance & Rights</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Board Seat", a.hasBoardSeat ? "Yes — JK represents" : "None"],
              ["Information Rights", "Quarterly financials + annual audit"],
              ["Review Schedule", a.nextReview ? new Date(a.nextReview).toLocaleDateString() : "Not scheduled"],
              ["Holding Type", a.holdingType?.replace(/_/g, " ")],
              ["Entities", a.entityAllocations?.map((ea: { entity: { name: string } }) => ea.entity.name).join(", ")],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
