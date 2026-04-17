"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PostFormationChecklist } from "@/components/features/entities/post-formation-checklist";
import { EntityNavTrendChart } from "@/components/features/entities/entity-nav-trend-chart";
import { EntityCashFlowChart } from "@/components/features/entities/entity-cash-flow-chart";
import { EntityPeriodBreakdown } from "@/components/features/entities/entity-period-breakdown";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const methodLabel: Record<string, string> = {
  COMPARABLE_MULTIPLES: "Multiples",
  LAST_ROUND: "Last round",
  DCF: "DCF",
  APPRAISAL: "Appraisal",
  GP_REPORTED_NAV: "GP NAV",
  COST: "Cost",
};

export function EntityOverviewTab({ entity, entityId, onTabChange }: { entity: any; entityId: string; onTabChange?: (tab: string) => void }) {
  const toast = useToast();
  const e = entity;

  // SWR fetches — lazy, only fire when this tab renders
  const { data: metricsData } = useSWR(`/api/entities/${entityId}/metrics`, fetcher);
  const { data: navData, mutate: mutateNav } = useSWR(`/api/nav/${entityId}`, fetcher);
  const { data: navHistory } = useSWR(`/api/nav/${entityId}/history`, fetcher);
  const { data: attributionData } = useSWR(`/api/entities/${entityId}/attribution`, fetcher);

  const metrics = metricsData?.metrics;
  const inputs = metricsData?.inputs;

  // NAV proxy edit state
  const [proxyEdit, setProxyEdit] = useState<{ cashPercent: string; otherAssetsPercent: string; liabilitiesPercent: string } | null>(null);
  const [savingProxy, setSavingProxy] = useState(false);

  async function handleSaveProxies() {
    if (!proxyEdit) return;
    setSavingProxy(true);
    try {
      const res = await fetch(`/api/entities/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navProxyConfig: {
            cashPercent: parseFloat(proxyEdit.cashPercent) / 100,
            otherAssetsPercent: parseFloat(proxyEdit.otherAssetsPercent) / 100,
            liabilitiesPercent: parseFloat(proxyEdit.liabilitiesPercent) / 100,
          },
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save proxy config");
        return;
      }
      toast.success("NAV proxy config updated");
      setProxyEdit(null);
      mutate(`/api/entities/${entityId}`);
      mutateNav();
    } catch {
      toast.error("Failed to save proxy config");
    } finally {
      setSavingProxy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Post-formation checklist */}
      {(e.formationStatus === "FORMED" || e.formationStatus === "REGISTERED") && (
        <PostFormationChecklist entity={e} onTabChange={onTabChange || (() => {})} />
      )}

      {/* 2. Primary metric cards (6) */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total Commitments", value: fmt(e.totalCommitments || 0) },
          { label: "Called Capital", value: inputs ? fmt(inputs.totalCalled) : "\u2014" },
          { label: "Economic NAV", value: navData ? fmt(navData.economicNAV) : (inputs ? fmt(inputs.currentNAV) : "\u2014") },
          { label: "TVPI", value: metrics?.tvpi != null ? `${metrics.tvpi.toFixed(2)}x` : "N/A" },
          { label: "DPI", value: metrics?.dpi != null ? `${metrics.dpi.toFixed(2)}x` : "N/A" },
          { label: "IRR", value: metrics?.irr != null ? `${(metrics.irr * 100).toFixed(1)}%` : "N/A" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
            {!metricsData && s.label !== "Total Commitments" ? (
              <div className="h-7 mt-1 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <div className="text-lg font-bold mt-1">{s.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* 3. Charts — adaptive grid: both side-by-side, or single full-width, or hidden */}
      {(() => {
        const navValid = (navHistory || []).filter((v: any) => v.periodDate != null && v.economicNAV != null);
        const hasNav = navValid.length >= 2;
        const callDates = (e.capitalCalls || []).filter((c: any) => c.callDate);
        const distDates = (e.distributions || []).filter((d: any) => d.distributionDate);
        const hasCashFlow = (callDates.length + distDates.length) >= 2;
        if (!hasNav && !hasCashFlow) return null;
        const cols = hasNav && hasCashFlow ? "grid-cols-2" : "grid-cols-1";
        return (
          <div className={`grid ${cols} gap-4`}>
            {hasNav && <EntityNavTrendChart navHistory={navHistory || []} />}
            {hasCashFlow && <EntityCashFlowChart capitalCalls={e.capitalCalls || []} distributions={e.distributions || []} />}
          </div>
        );
      })()}

      {/* 4. Two-Layer NAV computation */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Two-Layer NAV &mdash; {e.name}</h3>
          {e.accountingConnection && (
            <div className="flex gap-2">
              <Badge color={e.accountingConnection.syncStatus === "CONNECTED" ? "green" : "gray"}>
                {e.accountingConnection.provider} {e.accountingConnection.syncStatus === "CONNECTED" ? "Synced" : e.accountingConnection.syncStatus}
              </Badge>
            </div>
          )}
        </div>
        {navData ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Layer 1: Cost Basis (from QBO)</div>
              <div className="space-y-1 text-sm font-mono">
                {[
                  { l: "Cash & equivalents", v: fmt(navData.layer1.cashEquivalents) },
                  { l: "Investments at cost", v: fmt(navData.layer1.investmentsAtCost) },
                  { l: "Other assets", v: fmt(navData.layer1.otherAssets) },
                  { l: "Total Assets", v: fmt(navData.layer1.totalAssets), b: true },
                  { l: "Less: Liabilities", v: `(${fmt(navData.layer1.liabilities)})`, d: true },
                  { l: "Cost Basis NAV", v: fmt(navData.layer1.costBasisNAV), b: true, h: "bg-gray-100" },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""}`}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Layer 2: Fair Value Overlay (Atlas)</div>
              <div className="space-y-1 text-sm font-mono">
                {(navData.layer2.assets || []).map((a: { assetName: string; unrealizedGain: number; valuationMethod: string | null }, i: number) => (
                  <div key={i} className="flex justify-between py-0.5 px-2 rounded text-emerald-700">
                    <span>{a.assetName}{a.valuationMethod && <span className="text-gray-400 text-xs ml-1 font-normal">({methodLabel[a.valuationMethod] ?? a.valuationMethod})</span>}</span>
                    <span>{a.unrealizedGain >= 0 ? "+" : ""}{fmt(a.unrealizedGain)}</span>
                  </div>
                ))}
                {[
                  { l: "Total Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, b: true, g: true },
                  { l: "", v: "" },
                  { l: "Cost Basis NAV", v: fmt(navData.costBasisNAV) },
                  { l: "+ Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, g: true },
                  { l: "- Accrued Carry", v: `(${fmt(navData.layer2.accruedCarry)})`, d: true },
                  { l: "Economic NAV", v: fmt(navData.economicNAV), b: true, h: "bg-indigo-50 text-indigo-900" },
                ].map((r, i) => (
                  <div key={`s-${i}`} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""}`}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 py-4">NAV data not available.</div>
        )}
      </div>

      {/* 5. NAV Proxy Configuration */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">NAV Proxy Configuration</h3>
          {!proxyEdit && (
            <Button size="sm" onClick={() => setProxyEdit({
              cashPercent: String(((navData?.navProxyConfig?.cashPercent ?? 0.05) * 100).toFixed(1)),
              otherAssetsPercent: String(((navData?.navProxyConfig?.otherAssetsPercent ?? 0.005) * 100).toFixed(1)),
              liabilitiesPercent: String(((navData?.navProxyConfig?.liabilitiesPercent ?? 0.02) * 100).toFixed(1)),
            })}>Edit Proxies</Button>
          )}
        </div>
        {proxyEdit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "cashPercent", label: "Cash & Equivalents %" },
                { key: "otherAssetsPercent", label: "Other Assets %" },
                { key: "liabilitiesPercent", label: "Liabilities %" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={proxyEdit[key as keyof typeof proxyEdit]}
                    onChange={(ev) => setProxyEdit({ ...proxyEdit, [key]: ev.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveProxies} disabled={savingProxy}>
                {savingProxy ? "Saving..." : "Save Proxies"}
              </Button>
              <Button size="sm" onClick={() => setProxyEdit(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-[10px] text-gray-500">Cash %</div>
              <div className="font-medium">{((navData?.navProxyConfig?.cashPercent ?? 0.05) * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Other Assets %</div>
              <div className="font-medium">{((navData?.navProxyConfig?.otherAssetsPercent ?? 0.005) * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Liabilities %</div>
              <div className="font-medium">{((navData?.navProxyConfig?.liabilitiesPercent ?? 0.02) * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* 6. NAV History table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold">NAV History</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Snapshots stored each time NAV is computed</p>
        </div>
        {navHistory && navHistory.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>{["Date", "Cost Basis NAV", "Economic NAV", "Unrealized Gain", "Accrued Carry"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>
              {navHistory.map((snap: { id: string; periodDate: string; costBasisNAV: number; economicNAV: number; unrealizedGain?: number; accruedCarry?: number }) => (
                <tr key={snap.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2.5">{formatDate(snap.periodDate)}</td>
                  <td className="px-3 py-2.5 font-medium">{fmt(snap.costBasisNAV)}</td>
                  <td className="px-3 py-2.5 font-bold text-indigo-700">{fmt(snap.economicNAV)}</td>
                  <td className="px-3 py-2.5 text-emerald-600">{snap.unrealizedGain != null ? `+${fmt(snap.unrealizedGain)}` : "\u2014"}</td>
                  <td className="px-3 py-2.5 text-red-500">{snap.accruedCarry != null ? fmt(snap.accruedCarry) : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No NAV history yet.</div>
        )}
      </div>

      {/* 7. Asset Allocations table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Asset Allocations</h3>
            <span
              title="Percentage of each asset owned by this fund vehicle."
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold cursor-help select-none"
            >
              ?
            </span>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{["Asset", "Type", "Allocation %", "Cost Basis", "Fair Value"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(e.assetAllocations || []).map((a: { id: string; allocationPercent: number; costBasis: number | null; asset: { id: string; name: string; assetClass: string; fairValue: number; costBasis: number } }) => {
              const derivedCostBasis = a.costBasis ?? ((a.allocationPercent / 100) * (a.asset.costBasis || 0));
              return (
                <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2.5"><Link href={`/assets/${a.asset.id}`} className="text-indigo-700 hover:underline font-medium">{a.asset.name}</Link></td>
                  <td className="px-3 py-2.5"><Badge color="blue">{a.asset.assetClass?.replace(/_/g, " ")}</Badge></td>
                  <td className="px-3 py-2.5">{a.allocationPercent.toFixed(1)}%</td>
                  <td className="px-3 py-2.5">{fmt(derivedCostBasis)}</td>
                  <td className="px-3 py-2.5 font-medium">{fmt((a.allocationPercent / 100) * (a.asset.fairValue || 0))}</td>
                </tr>
              );
            })}
            {(!e.assetAllocations || e.assetAllocations.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No asset allocations.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 8. Performance Attribution */}
      {attributionData && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Performance Attribution</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Asset contributions to fund returns — ranked by weighted IRR contribution
              </p>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              {attributionData.entityMetrics?.totalIRR != null && (
                <span>Fund IRR: <span className="font-semibold text-gray-900 dark:text-gray-100">{(attributionData.entityMetrics.totalIRR * 100).toFixed(1)}%</span></span>
              )}
              {attributionData.entityMetrics?.totalTVPI != null && (
                <span>TVPI: <span className="font-semibold text-gray-900 dark:text-gray-100">{attributionData.entityMetrics.totalTVPI.toFixed(2)}x</span></span>
              )}
            </div>
          </div>
          {attributionData.rankedByContribution && attributionData.rankedByContribution.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Rank", "Asset", "IRR", "MOIC", "Contribution %", "vs Projected"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attributionData.rankedByContribution.map((item: any, idx: number) => (
                  <tr key={item.assetId} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2.5 text-gray-400 font-mono">#{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.assetName}</td>
                    <td className="px-3 py-2.5">
                      {item.irr != null ? `${(item.irr * 100).toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.moic != null ? `${item.moic.toFixed(2)}x` : "N/A"}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.contributionPct != null ? `${item.contributionPct.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.variance?.irrDelta != null ? (
                        <span className={item.variance.irrDelta >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                          {item.variance.irrDelta >= 0 ? "+" : ""}{(item.variance.irrDelta * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No asset allocations to compute attribution for.
            </div>
          )}
        </div>
      )}

      {/* 9. Period Breakdown */}
      {metricsData?.periodBreakdown?.length > 0 && (
        <EntityPeriodBreakdown periodBreakdown={metricsData.periodBreakdown} />
      )}
    </div>
  );
}
