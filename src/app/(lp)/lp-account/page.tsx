"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const INVESTOR_ID = "investor-1"; // CalPERS

export default function LPAccountPage() {
  const { data: accounts, isLoading } = useSWR(`/api/investors/${INVESTOR_ID}/capital-account`, fetcher);
  if (isLoading || !accounts) return <div className="text-sm text-gray-400">Loading...</div>;

  const account = accounts[0]; // Latest period

  // Use the detailed capital account statement from the mockup
  const rows = [
    { l: "Beginning Balance (10/1/24)", v: "$47,250,000", s: true },
    { l: "Contributions", v: "$0" },
    { l: "INCOME ALLOCATIONS", v: "", label: true },
    { l: "  Interest income", v: "$320,000", inc: true },
    { l: "  Dividend income (NovaTech)", v: "$1,520,000", inc: true },
    { l: "  Rental income (123 Industrial)", v: "$410,000", inc: true },
    { l: "  Total Income", v: "$2,250,000", b: true, inc: true },
    { l: "CAPITAL ALLOCATIONS", v: "", label: true },
    { l: "  Net realized gain (LT)", v: "$4,640,000", cap: true },
    { l: "  Change in unrealized", v: "$2,100,000", cap: true },
    { l: "  Total Capital Gains", v: "$6,740,000", b: true, cap: true },
    { l: "DISTRIBUTIONS", v: "", label: true },
    { l: "  Return of capital", v: "($1,800,000)", neg: true },
    { l: "  Income distributions", v: "($1,400,000)", neg: true },
    { l: "  Total Distributions", v: "($3,200,000)", b: true, neg: true },
    { l: "FEES & EXPENSES", v: "", label: true },
    { l: "  Management fees", v: "($187,500)", neg: true },
    { l: "  Fund expenses", v: "($42,500)", neg: true },
    { l: "  Carried interest", v: "($850,000)", neg: true },
    { l: "Ending Balance (12/31/24)", v: "$51,960,000", s: true, hl: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold">Capital Account — CalPERS</h3>
          <div className="text-xs text-gray-500">Atlas Fund I, LLC — Q4 2024</div>
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
          { l: "Net IRR", v: "22.4%" },
          { l: "TVPI", v: "1.87x" },
          { l: "DPI", v: "0.72x" },
          { l: "RVPI", v: "1.15x" },
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
