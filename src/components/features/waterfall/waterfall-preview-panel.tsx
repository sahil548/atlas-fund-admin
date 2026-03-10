"use client";

import { useState, useEffect } from "react";
import { fmt, pct, cn } from "@/lib/utils";
import { WaterfallScenarioChart } from "./waterfall-scenario-chart";

interface WaterfallTierResult {
  name: string;
  totalAllocated: number;
  allocatedLP: number;
  allocatedGP: number;
  remaining: number;
}

interface PerInvestorBreakdown {
  investorId: string;
  investorName: string;
  proRataShare: number;
  lpAllocation: number;
}

interface WaterfallResult {
  templateName: string;
  entityName: string;
  distributableAmount: number;
  totalContributed: number;
  totalDistributedPrior: number;
  tiers: WaterfallTierResult[];
  summary: {
    totalLP: number;
    totalGP: number;
    lpPercent: number;
    gpPercent: number;
    clawbackLiability: number;
  };
  totalLP: number;
  totalGP: number;
  clawbackLiability: number;
  perInvestorBreakdown: PerInvestorBreakdown[];
}

interface ScenarioState {
  amount: string;
  entityId: string;
  result: WaterfallResult | null;
  loading: boolean;
}

interface Props {
  templateId: string;
  templateName: string;
  entities: Array<{ id: string; name: string }>;
  mode?: "standalone" | "inline";
  initialEntityId?: string;
  initialAmount?: number;
}

export function WaterfallPreviewPanel({
  templateId,
  templateName,
  entities,
  mode = "standalone",
  initialEntityId,
  initialAmount,
}: Props) {
  const [scenarios, setScenarios] = useState<ScenarioState[]>([
    {
      amount: initialAmount?.toString() || "",
      entityId: initialEntityId || (entities[0]?.id ?? ""),
      result: null,
      loading: false,
    },
  ]);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Set<number>>(new Set());

  // Auto-run on mount in inline mode when both values provided
  useEffect(() => {
    if (mode === "inline" && initialAmount && initialEntityId) {
      runScenario(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScenario(index: number) {
    const s = scenarios[index];
    const entityId = mode === "inline" ? (initialEntityId || s.entityId) : s.entityId;
    const amount = mode === "inline" ? (initialAmount?.toString() || s.amount) : s.amount;

    if (!entityId || !amount) return;

    setScenarios((prev) =>
      prev.map((item, i) => (i === index ? { ...item, loading: true } : item))
    );

    try {
      const res = await fetch(`/api/waterfall-templates/${templateId}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          distributableAmount: Number(amount),
          saveResults: false, // CRITICAL: preview mode — no WaterfallCalculation persisted
        }),
      });

      if (!res.ok) {
        throw new Error("Calculation failed");
      }

      const result: WaterfallResult = await res.json();

      setScenarios((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, result, loading: false } : item
        )
      );
    } catch {
      setScenarios((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, loading: false } : item
        )
      );
    }
  }

  async function runAll() {
    await Promise.all(scenarios.map((_, i) => runScenario(i)));
  }

  function addScenario() {
    if (scenarios.length >= 3) return;
    setScenarios((prev) => [
      ...prev,
      {
        amount: "",
        entityId: initialEntityId || (entities[0]?.id ?? ""),
        result: null,
        loading: false,
      },
    ]);
  }

  function removeScenario(index: number) {
    if (scenarios.length <= 1) return;
    setScenarios((prev) => prev.filter((_, i) => i !== index));
    setExpandedBreakdowns((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => { if (v < index) next.add(v); else if (v > index) next.add(v - 1); });
      return next;
    });
  }

  function clearAll() {
    setScenarios([
      {
        amount: initialAmount?.toString() || "",
        entityId: initialEntityId || (entities[0]?.id ?? ""),
        result: null,
        loading: false,
      },
    ]);
    setExpandedBreakdowns(new Set());
  }

  function updateScenario(index: number, field: "amount" | "entityId", value: string) {
    setScenarios((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value, result: null } : item
      )
    );
  }

  function toggleBreakdown(index: number) {
    setExpandedBreakdowns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const completedScenarios = scenarios
    .map((s, i) => ({ ...s, index: i }))
    .filter((s) => s.result !== null);

  const chartScenarios = completedScenarios.map((s) => ({
    label: `${fmt(Number(s.amount || initialAmount || 0))}`,
    lpTotal: s.result!.totalLP,
    gpTotal: s.result!.totalGP,
  }));

  const gridClass = cn(
    "grid gap-4",
    completedScenarios.length === 1 && "grid-cols-1",
    completedScenarios.length === 2 && "grid-cols-2",
    completedScenarios.length >= 3 && "grid-cols-3"
  );

  return (
    <div className="space-y-4">
      {/* Header (standalone only) */}
      {mode === "standalone" && (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Scenario Analysis</div>
            {templateName && (
              <div className="text-xs text-gray-500">{templateName}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {scenarios.length > 1 && (
              <button
                onClick={runAll}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Run All
              </button>
            )}
            <button
              onClick={addScenario}
              disabled={scenarios.length >= 3}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add Scenario
            </button>
            {completedScenarios.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline mode header */}
      {mode === "inline" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => runScenario(0)}
            disabled={scenarios[0]?.loading}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {scenarios[0]?.loading ? "Calculating…" : "Refresh Preview"}
          </button>
          {completedScenarios.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Scenario Input Slots (standalone only) */}
      {mode === "standalone" && (
        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">
                Scenario {i + 1}
              </span>
              <select
                value={s.entityId}
                onChange={(e) => updateScenario(i, "entityId", e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
              >
                <option value="">Select entity…</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={s.amount}
                onChange={(e) => updateScenario(i, "amount", e.target.value)}
                placeholder="Amount ($)"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
              />
              <button
                onClick={() => runScenario(i)}
                disabled={s.loading || !s.entityId || !s.amount}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {s.loading ? "…" : "Run"}
              </button>
              {scenarios.length > 1 && (
                <button
                  onClick={() => removeScenario(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
                  title="Remove scenario"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator for inline mode */}
      {mode === "inline" && scenarios[0]?.loading && (
        <div className="text-xs text-gray-500 py-2">Calculating waterfall preview…</div>
      )}

      {/* Results: Side-by-side comparison columns */}
      {completedScenarios.length > 0 && (
        <div className={gridClass}>
          {completedScenarios.map((s) => {
            const r = s.result!;
            const lpPercent = r.summary?.lpPercent ?? (r.distributableAmount > 0 ? (r.totalLP / r.distributableAmount) * 100 : 0);
            const gpPercent = r.summary?.gpPercent ?? (r.distributableAmount > 0 ? (r.totalGP / r.distributableAmount) * 100 : 0);

            return (
              <div key={s.index} className="bg-blue-50 rounded-lg border border-blue-200 p-3 space-y-2">
                {/* Column header */}
                <div>
                  <div className="text-xs font-semibold text-blue-900">
                    {fmt(r.distributableAmount)} distribution
                  </div>
                  <div className="text-[10px] text-blue-700">{r.entityName}</div>
                </div>

                {/* Clawback warning */}
                {r.clawbackLiability > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-1.5 text-[10px] text-red-700">
                    Clawback: {fmt(r.clawbackLiability)}
                  </div>
                )}

                {/* Tier breakdown table */}
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-1 font-semibold text-blue-800">Tier</th>
                      <th className="text-right py-1 font-semibold text-blue-800">Allocated</th>
                      <th className="text-right py-1 font-semibold text-blue-800">LP</th>
                      <th className="text-right py-1 font-semibold text-blue-800">GP</th>
                      <th className="text-right py-1 font-semibold text-blue-800">Rem.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.tiers || []).map((tier, ti) => (
                      <tr key={ti} className="border-b border-blue-100">
                        <td className="py-1 text-gray-900 max-w-[80px] truncate" title={tier.name}>{tier.name}</td>
                        <td className="py-1 text-right font-medium">{fmt(tier.totalAllocated)}</td>
                        <td className="py-1 text-right text-blue-700">{fmt(tier.allocatedLP)}</td>
                        <td className="py-1 text-right text-orange-700">{fmt(tier.allocatedGP)}</td>
                        <td className="py-1 text-right text-gray-500">{fmt(tier.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-blue-300 font-semibold">
                      <td className="py-1 text-blue-900">Total</td>
                      <td className="py-1 text-right">{fmt(r.distributableAmount)}</td>
                      <td className="py-1 text-right text-blue-800">{fmt(r.totalLP)}</td>
                      <td className="py-1 text-right text-orange-800">{fmt(r.totalGP)}</td>
                      <td className="py-1 text-right text-gray-400">—</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Summary LP/GP split */}
                <div className="flex gap-3 text-[10px] pt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    LP: {lpPercent.toFixed(1)}% ({fmt(r.totalLP)})
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                    GP: {gpPercent.toFixed(1)}% ({fmt(r.totalGP)})
                  </div>
                </div>

                {/* Per-investor breakdown (expandable) */}
                {(r.perInvestorBreakdown?.length ?? 0) > 0 && (
                  <div className="border-t border-blue-200 pt-1.5">
                    <button
                      className="text-[10px] text-blue-700 font-medium hover:text-blue-900 flex items-center gap-1"
                      onClick={() => toggleBreakdown(s.index)}
                    >
                      {expandedBreakdowns.has(s.index) ? "▼" : "▶"} Per-Investor ({r.perInvestorBreakdown.length})
                    </button>
                    {expandedBreakdowns.has(s.index) && (
                      <table className="w-full text-[10px] mt-1.5">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="text-left py-0.5 font-semibold text-blue-800">Investor</th>
                            <th className="text-right py-0.5 font-semibold text-blue-800">Pro-Rata</th>
                            <th className="text-right py-0.5 font-semibold text-blue-800">LP Alloc.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.perInvestorBreakdown.map((b) => (
                            <tr key={b.investorId} className="border-b border-blue-50">
                              <td className="py-0.5 text-gray-900 truncate max-w-[80px]" title={b.investorName}>{b.investorName}</td>
                              <td className="py-0.5 text-right text-gray-500">{(b.proRataShare * 100).toFixed(1)}%</td>
                              <td className="py-0.5 text-right font-medium text-blue-700">{fmt(b.lpAllocation)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chart: shown when 2+ scenarios have results */}
      {completedScenarios.length >= 2 && (
        <WaterfallScenarioChart scenarios={chartScenarios} />
      )}

      {/* Empty state for standalone mode */}
      {mode === "standalone" && completedScenarios.length === 0 && (
        <div className="text-center py-8 text-xs text-gray-400">
          Enter an entity and amount for each scenario, then click Run to see results.
        </div>
      )}
    </div>
  );
}
