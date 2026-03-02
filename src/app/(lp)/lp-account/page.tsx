"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";
import { INVESTOR_ID } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

function formatPeriod(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

interface CapitalAccountRecord {
  id: string;
  investorId: string;
  entityId: string;
  periodDate: string;
  beginningBalance: number;
  contributions: number;
  incomeAllocations: number;
  capitalAllocations: number;
  distributions: number;
  fees: number;
  endingBalance: number;
  entity: { id: string; name: string };
}

export default function LPAccountPage() {
  const { data: accounts, isLoading } = useSWR<CapitalAccountRecord[]>(
    `/api/investors/${INVESTOR_ID}/capital-account`,
    fetcher
  );
  if (isLoading || !accounts) return <div className="text-sm text-gray-400">Loading...</div>;
  if (accounts.length === 0) return <div className="text-sm text-gray-400">No capital account data available.</div>;

  const account = accounts[0]; // Latest period (API returns ordered by periodDate desc)

  const rows: { l: string; v: string; s?: boolean; hl?: boolean; label?: boolean; b?: boolean; inc?: boolean; cap?: boolean; neg?: boolean }[] = [
    { l: `Beginning Balance (${formatPeriod(account.periodDate)})`, v: fmtSigned(account.beginningBalance), s: true },
    { l: "Contributions", v: fmtSigned(account.contributions) },
    { l: "INCOME ALLOCATIONS", v: "", label: true },
    { l: "  Total Income Allocations", v: fmtSigned(account.incomeAllocations), b: true, inc: true },
    { l: "CAPITAL ALLOCATIONS", v: "", label: true },
    { l: "  Total Capital Allocations", v: fmtSigned(account.capitalAllocations), b: true, cap: true },
    { l: "DISTRIBUTIONS", v: "", label: true },
    { l: "  Total Distributions", v: fmtSigned(-Math.abs(account.distributions)), b: true, neg: true },
    { l: "FEES & EXPENSES", v: "", label: true },
    { l: "  Total Fees & Expenses", v: fmtSigned(-Math.abs(account.fees)), b: true, neg: true },
    { l: `Ending Balance`, v: fmtSigned(account.endingBalance), s: true, hl: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold">Capital Account — {account.entity.name}</h3>
          <div className="text-xs text-gray-500">
            Period ending {new Date(account.periodDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <Badge color="indigo">Computed from ledger</Badge>
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
          ["bg-emerald-500", "Income"],
          ["bg-indigo-500", "Capital Gains"],
          ["bg-gray-500", "Distributions/Fees"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${c}`} />
            {l}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          { l: "Net IRR", v: "\u2014" },
          { l: "TVPI", v: "\u2014" },
          { l: "DPI", v: "\u2014" },
          { l: "RVPI", v: "\u2014" },
        ].map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">{m.l}</div>
            <div className="text-lg font-semibold">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
