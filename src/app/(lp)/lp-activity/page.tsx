"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";
import { useInvestor } from "@/components/providers/investor-provider";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

export default function LPActivityPage() {
  const { investorId } = useInvestor();
  const { data, isLoading } = useSWR(
    investorId ? `/api/lp/${investorId}/activity` : null,
    fetcher
  );
  if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
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
                  <span className="font-medium">{item.capitalCall.purpose || "—"}</span>
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
