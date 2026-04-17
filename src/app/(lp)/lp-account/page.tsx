"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";
import { ExportButton } from "@/components/ui/export-button";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

function fmtSigned(n: number): string {
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  let formatted: string;
  if (abs >= 1e9) formatted = `$${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) formatted = `$${(abs / 1e6).toFixed(1)}M`;
  else if (abs >= 1e3) formatted = `$${(abs / 1e3).toFixed(0)}K`;
  else formatted = `$${abs.toLocaleString()}`;
  return n < 0 ? `(${formatted})` : formatted;
}

interface LedgerEntry {
  date: string;
  type: "CONTRIBUTION" | "DISTRIBUTION" | "FEE" | "INCOME";
  entityId: string;
  entityName: string;
  description: string;
  amount: number;
  runningBalance: number;
}

interface DistributionBreakdown {
  returnOfCapital: number;
  income: number;
  longTermGain: number;
}

interface EntitySummary {
  entityId: string;
  entityName: string;
  commitment: number;
  currentBalance: number;
  totalContributed: number;
  totalDistributed: number;
  totalFees: number;
  distributionBreakdown?: DistributionBreakdown;
}

interface CapitalAccountData {
  investorId: string;
  investorName: string;
  ledger: LedgerEntry[];
  entities: EntitySummary[];
  periodMetrics?: { irr: number | null; tvpi: number | null; dpi: number | null; rvpi: number | null };
}

interface PeriodSummary {
  period: string;
  contributions: number;
  distributions: number;
  fees: number;
  netChange: number;
  endingBalance: number;
}

function computePeriodSummaries(ledger: LedgerEntry[]): PeriodSummary[] {
  if (ledger.length === 0) return [];

  const quarterMap = new Map<string, PeriodSummary>();

  for (const entry of ledger) {
    const d = new Date(entry.date);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const key = `Q${quarter} ${d.getFullYear()}`;

    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        period: key,
        contributions: 0,
        distributions: 0,
        fees: 0,
        netChange: 0,
        endingBalance: 0,
      });
    }

    const period = quarterMap.get(key)!;

    if (entry.type === "CONTRIBUTION") {
      period.contributions += Math.abs(entry.amount);
    } else if (entry.type === "DISTRIBUTION") {
      period.distributions += Math.abs(entry.amount);
    } else if (entry.type === "FEE") {
      period.fees += Math.abs(entry.amount);
    }

    period.netChange += entry.amount;
    // Use the last runningBalance in this quarter
    period.endingBalance = entry.runningBalance;
  }

  // Sort by year/quarter
  const sortedKeys = Array.from(quarterMap.keys()).sort((a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    const yearDiff = parseInt(ya) - parseInt(yb);
    if (yearDiff !== 0) return yearDiff;
    return parseInt(qa.slice(1)) - parseInt(qb.slice(1));
  });

  return sortedKeys.map((k) => quarterMap.get(k)!);
}

// Compute preset date ranges
function getPresetRanges() {
  const now = new Date();
  const year = now.getFullYear();
  const todayStr = now.toISOString().split("T")[0];

  return {
    Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
    Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
    Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
    Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
    FY: { start: `${year}-01-01`, end: `${year}-12-31` },
    YTD: { start: `${year}-01-01`, end: todayStr },
  };
}

export default function LPAccountPage() {
  const { investorId } = useInvestor();
  const toast = useToast();
  const [recomputing, setRecomputing] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";

  const { data, isLoading } = useSWR<CapitalAccountData>(
    investorId ? `/api/investors/${investorId}/capital-account${dateParams}` : null,
    fetcher
  );
  const { data: dashboard } = useSWR(
    investorId ? `/api/lp/${investorId}/dashboard` : null,
    fetcher
  );

  // Detect active preset
  const presets = useMemo(() => getPresetRanges(), []);
  const activePreset = useMemo(() => {
    if (!startDate || !endDate) return "All Time";
    for (const [name, range] of Object.entries(presets)) {
      if (range.start === startDate && range.end === endDate) return name;
    }
    return null;
  }, [startDate, endDate, presets]);

  function applyPreset(name: string) {
    if (name === "All Time") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const range = presets[name as keyof typeof presets];
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }

  async function handleRecompute() {
    if (!investorId || !data || data.entities.length === 0) return;
    setRecomputing(true);
    try {
      const entityId = data.entities[0].entityId;
      const res = await fetch(`/api/investors/${investorId}/capital-account/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          periodStart: "2020-01-01",
          periodEnd: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Computation failed");
      toast.success("Capital account recomputed");
      mutate(`/api/investors/${investorId}/capital-account${dateParams}`);
      mutate(`/api/lp/${investorId}/dashboard`);
    } catch {
      toast.error("Failed to recompute capital account");
    }
    setRecomputing(false);
  }

  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;
  if (data.entities.length === 0 && data.ledger.length === 0) return <div className="text-sm text-gray-400">No capital account data available.</div>;

  // Aggregate across all entities
  const totalContributed = data.entities.reduce((s, e) => s + e.totalContributed, 0);
  const totalDistributed = data.entities.reduce((s, e) => s + e.totalDistributed, 0);
  const totalFees = data.entities.reduce((s, e) => s + e.totalFees, 0);
  const currentBalance = data.entities.reduce((s, e) => s + e.currentBalance, 0);
  const totalCommitment = data.entities.reduce((s, e) => s + e.commitment, 0);

  // Aggregate distribution breakdown across all entities (FIN-12 LP-Obs 2 fix)
  // Only include breakdown rows when at least one entity has distribution data.
  const aggregateBreakdown = data.entities.reduce(
    (acc, e) => {
      if (e.distributionBreakdown) {
        acc.returnOfCapital += e.distributionBreakdown.returnOfCapital;
        acc.income += e.distributionBreakdown.income;
        acc.longTermGain += e.distributionBreakdown.longTermGain;
        acc.hasAny = true;
      }
      return acc;
    },
    { returnOfCapital: 0, income: 0, longTermGain: 0, hasAny: false }
  );
  const showBreakdown = aggregateBreakdown.hasAny && totalDistributed > 0;

  // Use period metrics when date range is active, otherwise fall back to dashboard aggregate metrics
  const isDateFiltered = !!(startDate && endDate);
  const metricsSource = isDateFiltered && data.periodMetrics ? data.periodMetrics : dashboard;
  const metricsLabel = isDateFiltered && data.periodMetrics ? "Period" : "All Time";

  const netIrr = metricsSource?.irr != null ? `${(metricsSource.irr * 100).toFixed(1)}%` : "—";
  const tvpi = metricsSource?.tvpi != null ? `${metricsSource.tvpi.toFixed(2)}x` : "—";
  const dpi = metricsSource?.dpi != null ? `${metricsSource.dpi.toFixed(2)}x` : "—";
  const rvpi = metricsSource?.rvpi != null ? `${metricsSource.rvpi.toFixed(2)}x` : "—";

  // Compute period summaries from ledger
  const periodSummaries = computePeriodSummaries(data.ledger);

  const rows: { l: string; v: string; s?: boolean; hl?: boolean; label?: boolean; b?: boolean; inc?: boolean; cap?: boolean; neg?: boolean; sub?: boolean }[] = [
    { l: "Total Commitment", v: fmtSigned(totalCommitment), s: true },
    { l: "Contributions", v: fmtSigned(totalContributed) },
    { l: "DISTRIBUTIONS", v: "", label: true },
    // Breakdown rows: shown when the API returns subcategory data (FIN-12 fix)
    ...(showBreakdown && aggregateBreakdown.returnOfCapital > 0
      ? [{ l: "  Return of Capital", v: fmtSigned(aggregateBreakdown.returnOfCapital), sub: true, inc: true }]
      : []),
    ...(showBreakdown && aggregateBreakdown.income > 0
      ? [{ l: "  Income / Yield", v: fmtSigned(aggregateBreakdown.income), sub: true, inc: true }]
      : []),
    ...(showBreakdown && aggregateBreakdown.longTermGain > 0
      ? [{ l: "  Long-Term Gain", v: fmtSigned(aggregateBreakdown.longTermGain), sub: true, inc: true }]
      : []),
    { l: "  Total Distributions", v: fmtSigned(totalDistributed), b: true, inc: true },
    { l: "FEES & EXPENSES", v: "", label: true },
    { l: "  Total Fees & Expenses", v: fmtSigned(-Math.abs(totalFees)), b: true, neg: true },
    { l: "Current Balance", v: fmtSigned(currentBalance), s: true, hl: true },
  ];

  const presetNames = ["Q1", "Q2", "Q3", "Q4", "FY", "YTD", "All Time"];

  return (
    <div className="space-y-5">
      {/* Date Range Picker */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-1 ml-2">
            {presetNames.map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  activePreset === preset
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        {isDateFiltered && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Showing: {startDate} to {endDate}
            </span>
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium"
            >
              Clear ×
            </button>
          </div>
        )}
      </div>

      {/* Period Summary Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold dark:text-gray-100 mb-3">Period Summary</h3>
        {periodSummaries.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            <div className="font-medium text-gray-500 dark:text-gray-400 mb-1">No period summaries yet</div>
            <div className="text-xs max-w-sm mx-auto">
              Period summaries will appear once capital account activity is recorded. Each capital
              call funded or distribution paid creates a ledger entry.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Period</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contributions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Distributions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fees</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net Change</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {periodSummaries.map((p) => (
                  <tr key={p.period} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{p.period}</td>
                    <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-400">{fmtSigned(p.contributions)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-400">{fmtSigned(p.distributions)}</td>
                    <td className="py-2 px-2 text-right text-gray-500 dark:text-gray-400">{p.fees > 0 ? fmtSigned(-p.fees) : "$0"}</td>
                    <td className={`py-2 px-2 text-right font-medium ${p.netChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {fmtSigned(p.netChange)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-800 dark:text-gray-200">{fmtSigned(p.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Capital Account Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-semibold dark:text-gray-100">Capital Account — {data.investorName}</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {data.entities.length} {data.entities.length === 1 ? "entity" : "entities"} · {data.ledger.length} transactions
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="indigo">Computed from ledger</Badge>
            <ExportButton
              data={data.ledger.map((entry) => ({
                date: new Date(entry.date).toLocaleDateString("en-US", { timeZone: "UTC" }),
                type: entry.type,
                entity: entry.entityName,
                description: entry.description,
                amount: entry.amount,
                runningBalance: entry.runningBalance,
              }))}
              fileName="LP_Account_Export"
            />
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {recomputing ? "Recomputing…" : "⟳ Recompute"}
            </button>
          </div>
        </div>

        <div className="text-sm space-y-0.5 font-mono">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex justify-between py-0.5 px-2 rounded ${
                r.hl ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100 font-semibold mt-2" : ""
              } ${r.s && !r.hl ? "font-semibold border-t border-gray-200 dark:border-gray-700 pt-2 mt-1 dark:text-gray-100" : ""} ${
                r.label ? "text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wide pt-2 mt-1" : ""
              } ${r.b ? "font-semibold" : ""} ${r.inc ? "text-emerald-700 dark:text-emerald-400" : ""} ${
                r.cap ? "text-indigo-700 dark:text-indigo-400" : ""
              } ${r.neg ? "text-gray-500 dark:text-gray-400" : ""}`}
            >
              <span>{r.l}</span>
              <span>{r.v}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-4 text-xs">
          {[
            ["bg-emerald-500", "Distributions"],
            ["bg-gray-500", "Fees"],
          ].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span className={`w-2 h-2 rounded-full ${c}`} />
              {l}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { l: `Net IRR`, v: netIrr },
            { l: "TVPI", v: tvpi },
            { l: "DPI", v: dpi },
            { l: "RVPI", v: rvpi },
          ].map((m, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {m.l}
                {isDateFiltered && data.periodMetrics && (
                  <span className="ml-1 text-indigo-500 dark:text-indigo-400 font-medium">({metricsLabel})</span>
                )}
              </div>
              <div className="text-lg font-semibold dark:text-gray-100">{m.v}</div>
            </div>
          ))}
        </div>

        {/* Per-entity breakdown */}
        {data.entities.length > 1 && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Per Entity</h4>
            <div className="space-y-2">
              {data.entities.map((entity) => (
                <div key={entity.entityId} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="font-medium dark:text-gray-100">{entity.entityName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Commitment: {fmtSigned(entity.commitment)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold dark:text-gray-100">{fmtSigned(entity.currentBalance)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent ledger entries */}
        {data.ledger.length > 0 && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Activity Ledger</h4>
            <div className="space-y-1 text-xs">
              {data.ledger.slice(-10).reverse().map((entry, i) => (
                <div key={i} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      entry.type === "CONTRIBUTION" ? "bg-blue-500" :
                      entry.type === "DISTRIBUTION" ? "bg-emerald-500" :
                      entry.type === "FEE" ? "bg-gray-400" :
                      "bg-indigo-500"
                    }`} />
                    <span className="text-gray-600 dark:text-gray-400">{entry.description}</span>
                    <span className="text-gray-400 dark:text-gray-500">{entry.entityName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={entry.amount >= 0 ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-600 dark:text-gray-400"}>
                      {fmtSigned(entry.amount)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 w-16 text-right">
                      {new Date(entry.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
