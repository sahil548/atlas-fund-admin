"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { useInvestor } from "@/components/providers/investor-provider";
import { useToast } from "@/components/ui/toast";

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

interface EntitySummary {
  entityId: string;
  entityName: string;
  commitment: number;
  currentBalance: number;
  totalContributed: number;
  totalDistributed: number;
  totalFees: number;
}

interface CapitalAccountData {
  investorId: string;
  investorName: string;
  ledger: LedgerEntry[];
  entities: EntitySummary[];
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

export default function LPAccountPage() {
  const { investorId } = useInvestor();
  const toast = useToast();
  const [recomputing, setRecomputing] = useState(false);

  const { data, isLoading } = useSWR<CapitalAccountData>(
    investorId ? `/api/investors/${investorId}/capital-account` : null,
    fetcher
  );
  const { data: dashboard } = useSWR(
    investorId ? `/api/lp/${investorId}/dashboard` : null,
    fetcher
  );

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
      mutate(`/api/investors/${investorId}/capital-account`);
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

  // Pull metrics from dashboard API (computed from real data)
  const netIrr = dashboard?.irr != null ? `${(dashboard.irr * 100).toFixed(1)}%` : "—";
  const tvpi = dashboard?.tvpi != null ? `${dashboard.tvpi.toFixed(2)}x` : "—";
  const dpi = dashboard?.dpi != null ? `${dashboard.dpi.toFixed(2)}x` : "—";
  const rvpi = dashboard?.rvpi != null ? `${dashboard.rvpi.toFixed(2)}x` : "—";

  // Compute period summaries from ledger
  const periodSummaries = computePeriodSummaries(data.ledger);

  const rows: { l: string; v: string; s?: boolean; hl?: boolean; label?: boolean; b?: boolean; inc?: boolean; cap?: boolean; neg?: boolean }[] = [
    { l: "Total Commitment", v: fmtSigned(totalCommitment), s: true },
    { l: "Contributions", v: fmtSigned(totalContributed) },
    { l: "DISTRIBUTIONS", v: "", label: true },
    { l: "  Total Distributions", v: fmtSigned(totalDistributed), b: true, inc: true },
    { l: "FEES & EXPENSES", v: "", label: true },
    { l: "  Total Fees & Expenses", v: fmtSigned(-Math.abs(totalFees)), b: true, neg: true },
    { l: "Current Balance", v: fmtSigned(currentBalance), s: true, hl: true },
  ];

  return (
    <div className="space-y-5">
      {/* Period Summary Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-3">Period Summary</h3>
        {periodSummaries.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            <div className="font-medium text-gray-500 mb-1">No period summaries yet</div>
            <div className="text-xs max-w-sm mx-auto">
              Period summaries will appear once capital account activity is recorded. Each capital
              call funded or distribution paid creates a ledger entry.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Period</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Contributions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Distributions</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Fees</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Net Change</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 uppercase tracking-wide">Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {periodSummaries.map((p) => (
                  <tr key={p.period} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-700">{p.period}</td>
                    <td className="py-2 px-2 text-right text-blue-700">{fmtSigned(p.contributions)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">{fmtSigned(p.distributions)}</td>
                    <td className="py-2 px-2 text-right text-gray-500">{p.fees > 0 ? fmtSigned(-p.fees) : "$0"}</td>
                    <td className={`py-2 px-2 text-right font-medium ${p.netChange >= 0 ? "text-emerald-700" : "text-gray-700"}`}>
                      {fmtSigned(p.netChange)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-800">{fmtSigned(p.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Capital Account Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-semibold">Capital Account — {data.investorName}</h3>
            <div className="text-xs text-gray-500">
              {data.entities.length} {data.entities.length === 1 ? "entity" : "entities"} · {data.ledger.length} transactions
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="indigo">Computed from ledger</Badge>
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
                r.hl ? "bg-indigo-50 text-indigo-900 font-semibold mt-2" : ""
              } ${r.s && !r.hl ? "font-semibold border-t border-gray-200 pt-2 mt-1" : ""} ${
                r.label ? "text-gray-400 text-xs uppercase tracking-wide pt-2 mt-1" : ""
              } ${r.b ? "font-semibold" : ""} ${r.inc ? "text-emerald-700" : ""} ${
                r.cap ? "text-indigo-700" : ""
              } ${r.neg ? "text-gray-500" : ""}`}
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
            <div key={l} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${c}`} />
              {l}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { l: "Net IRR", v: netIrr },
            { l: "TVPI", v: tvpi },
            { l: "DPI", v: dpi },
            { l: "RVPI", v: rvpi },
          ].map((m, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{m.l}</div>
              <div className="text-lg font-semibold">{m.v}</div>
            </div>
          ))}
        </div>

        {/* Per-entity breakdown */}
        {data.entities.length > 1 && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Per Entity</h4>
            <div className="space-y-2">
              {data.entities.map((entity) => (
                <div key={entity.entityId} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="font-medium">{entity.entityName}</div>
                    <div className="text-xs text-gray-500">Commitment: {fmtSigned(entity.commitment)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtSigned(entity.currentBalance)}</div>
                    <div className="text-xs text-gray-500">Balance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent ledger entries */}
        {data.ledger.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity Ledger</h4>
            <div className="space-y-1 text-xs">
              {data.ledger.slice(-10).reverse().map((entry, i) => (
                <div key={i} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      entry.type === "CONTRIBUTION" ? "bg-blue-500" :
                      entry.type === "DISTRIBUTION" ? "bg-emerald-500" :
                      entry.type === "FEE" ? "bg-gray-400" :
                      "bg-indigo-500"
                    }`} />
                    <span className="text-gray-600">{entry.description}</span>
                    <span className="text-gray-400">{entry.entityName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={entry.amount >= 0 ? "text-emerald-700 font-medium" : "text-gray-600"}>
                      {fmtSigned(entry.amount)}
                    </span>
                    <span className="text-gray-400 w-16 text-right">
                      {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
