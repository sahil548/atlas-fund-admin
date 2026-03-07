"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";
import { useInvestor } from "@/components/providers/investor-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

/* eslint-disable @typescript-eslint/no-explicit-any */

const LEDGER_TYPE_COLORS: Record<string, string> = {
  CONTRIBUTION: "text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700",
  DISTRIBUTION: "text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700",
  FEE: "text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700",
  INCOME: "text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700",
};

export default function LPActivityPage() {
  const { investorId } = useInvestor();
  const { data, isLoading } = useSWR(
    investorId ? `/api/lp/${investorId}/activity` : null,
    fetcher
  );
  const { data: capitalAccount, isLoading: caLoading } = useSWR(
    investorId ? `/api/investors/${investorId}/capital-account` : null,
    fetcher
  );

  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Capital Account Running Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">Capital Account</h3>
          <div className="text-xs text-gray-500 mt-0.5">Running ledger of your contributions, distributions, and fees</div>
        </div>

        {/* Entity summaries */}
        {!caLoading && capitalAccount?.entities && capitalAccount.entities.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {capitalAccount.entities.map((entity: { entityId: string; entityName: string; commitment: number; currentBalance: number; totalContributed: number; totalDistributed: number }) => (
              <div key={entity.entityId} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">{entity.entityName}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commitment</span>
                    <span className="font-medium">{fmt(entity.commitment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contributed</span>
                    <span className="font-medium text-red-600">{fmt(entity.totalContributed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Distributed</span>
                    <span className="font-medium text-green-600">{fmt(entity.totalDistributed)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="text-gray-500 font-medium">Current Balance</span>
                    <span className={`font-bold ${entity.currentBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmt(entity.currentBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ledger table */}
        {!caLoading && capitalAccount?.ledger && capitalAccount.ledger.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Type", "Entity", "Description", "Amount", "Balance"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capitalAccount.ledger.map((entry: {
                date: string;
                type: string;
                entityName: string;
                description: string;
                amount: number;
                runningBalance: number;
              }, idx: number) => (
                <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={LEDGER_TYPE_COLORS[entry.type] || "text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{entry.entityName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{entry.description}</td>
                  <td className={`px-4 py-2.5 font-medium ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {entry.amount >= 0 ? "+" : ""}{fmt(entry.amount)}
                  </td>
                  <td className={`px-4 py-2.5 font-bold ${entry.runningBalance >= 0 ? "text-gray-900" : "text-red-700"}`}>
                    {fmt(entry.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            {caLoading ? "Loading capital account..." : "No capital account activity yet."}
          </div>
        )}
      </div>

      {/* Capital Calls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-1">Capital Calls</h3>
        <div className="text-xs text-gray-500 mb-4">Notices issued to you</div>
        <div className="space-y-3">
          {data.capitalCalls?.length === 0 && (
            <div className="text-xs text-gray-400">No capital calls yet.</div>
          )}
          {data.capitalCalls?.map((item: {
            id: string;
            amount: number;
            capitalCall: {
              id: string;
              callNumber: number;
              callDate: string;
              dueDate: string;
              purpose: string;
              status: string;
              entity: { name: string };
            };
          }) => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    Call #{item.capitalCall.callNumber}
                  </span>
                  <Badge color={
                    item.capitalCall.status === "FUNDED" ? "green"
                    : item.capitalCall.status === "ISSUED" ? "yellow"
                    : item.capitalCall.status === "OVERDUE" ? "red"
                    : "gray"
                  }>
                    {item.capitalCall.status.toLowerCase()}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">{fmt(item.amount)}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Entity:</span>{" "}
                  <span className="font-medium">{item.capitalCall.entity.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Call Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(item.capitalCall.callDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Due:</span>{" "}
                  <span className="font-medium">
                    {new Date(item.capitalCall.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Purpose:</span>{" "}
                  <span className="font-medium">{item.capitalCall.purpose || "\u2014"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distributions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-1">Distributions</h3>
        <div className="text-xs text-gray-500 mb-4">Proceeds distributed to you</div>
        <div className="space-y-3">
          {data.distributions?.length === 0 && (
            <div className="text-xs text-gray-400">No distributions yet.</div>
          )}
          {data.distributions?.map((item: {
            id: string;
            grossAmount: number;
            netAmount: number;
            income: number;
            returnOfCapital: number;
            longTermGain: number;
            distribution: {
              id: string;
              distributionDate: string;
              source: string;
              entity: { name: string };
            };
          }) => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {item.distribution.source || "Distribution"}
                  </span>
                  <Badge color="green">received</Badge>
                </div>
                <div className="text-sm font-semibold">{fmt(item.netAmount)}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Entity:</span>{" "}
                  <span className="font-medium">{item.distribution.entity.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(item.distribution.distributionDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Income:</span>{" "}
                  <span className="font-medium">{fmt(item.income)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Return of Capital:</span>{" "}
                  <span className="font-medium">{fmt(item.returnOfCapital)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
