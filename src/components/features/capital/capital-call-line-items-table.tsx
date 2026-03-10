"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fmt, formatDate } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Investor {
  id: string;
  name: string;
}

interface LineItem {
  id: string;
  capitalCallId: string;
  investorId: string;
  amount: number;
  status: string;
  paidDate: string | null;
  investor: Investor;
}

interface CapitalCallLineItemsTableProps {
  callId: string;
  lineItems: LineItem[];
  callStatus: string;
  onLineItemUpdate: () => void;
}

export function CapitalCallLineItemsTable({
  callId,
  lineItems,
  callStatus,
  onLineItemUpdate,
}: CapitalCallLineItemsTableProps) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const funded = lineItems.filter((li) => li.status === "Funded");
  const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const fundedAmount = funded.reduce((sum, li) => sum + li.amount, 0);

  async function handleMarkFunded(lineItem: LineItem) {
    setLoadingId(lineItem.id);
    try {
      const res = await fetch(
        `/api/capital-calls/${callId}/line-items/${lineItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "Funded",
            paidDate: new Date().toISOString(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Failed to mark investor as funded";
        toast.error(msg);
        return;
      }
      toast.success("Investor marked as funded");
      // Mutate the parent capital call SWR key — the engine may auto-advance status
      mutate(`/api/capital-calls/${callId}`);
      onLineItemUpdate();
    } catch {
      toast.error("Failed to mark investor as funded");
    } finally {
      setLoadingId(null);
    }
  }

  const isCallFunded = callStatus === "FUNDED";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">
                Investor
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">
                Amount
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">
                Status
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">
                Paid Date
              </th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-gray-400 dark:text-gray-500 text-xs"
                >
                  No investors on this capital call.
                </td>
              </tr>
            ) : (
              lineItems.map((li) => (
                <tr
                  key={li.id}
                  className="border-t border-gray-50 dark:border-gray-700"
                >
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {li.investor.name}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {fmt(li.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={li.status === "Funded" ? "green" : "gray"}>
                      {li.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    {li.paidDate ? formatDate(li.paidDate) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {li.status === "Funded" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <button
                        onClick={() => handleMarkFunded(li)}
                        disabled={
                          isCallFunded || loadingId === li.id
                        }
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingId === li.id ? "Saving…" : "Mark Funded"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      {lineItems.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
          {funded.length} of {lineItems.length} funded — {fmt(fundedAmount)} of{" "}
          {fmt(totalAmount)} total
        </div>
      )}
    </div>
  );
}
