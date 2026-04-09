"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
  dueDate?: string;
  onLineItemUpdate: () => void;
}

export function CapitalCallLineItemsTable({
  callId,
  lineItems,
  callStatus,
  dueDate,
  onLineItemUpdate,
}: CapitalCallLineItemsTableProps) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fundAllOpen, setFundAllOpen] = useState(false);
  const [fundAllLoading, setFundAllLoading] = useState(false);
  // Default paid date = due date (fallback to today if no due date)
  const defaultPaidDate = dueDate
    ? new Date(dueDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const [fundAllPaidDate, setFundAllPaidDate] = useState(defaultPaidDate);

  const funded = lineItems.filter((li) => li.status === "Funded");
  const unfunded = lineItems.filter((li) => li.status !== "Funded");
  const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const fundedAmount = funded.reduce((sum, li) => sum + li.amount, 0);
  const unfundedAmount = unfunded.reduce((sum, li) => sum + li.amount, 0);

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

  async function handleFundAll() {
    if (unfunded.length === 0) return;
    setFundAllLoading(true);
    // Normalize paid date to ISO with UTC midnight so the backend stores the user-chosen calendar day
    const paidDateISO = new Date(fundAllPaidDate + "T00:00:00Z").toISOString();
    let successCount = 0;
    let failCount = 0;
    for (const li of unfunded) {
      try {
        const res = await fetch(
          `/api/capital-calls/${callId}/line-items/${li.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Funded", paidDate: paidDateISO }),
          },
        );
        if (res.ok) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      } catch {
        failCount += 1;
      }
    }
    setFundAllLoading(false);
    setFundAllOpen(false);
    if (successCount > 0 && failCount === 0) {
      toast.success(`Funded ${successCount} investor${successCount === 1 ? "" : "s"}`);
    } else if (successCount > 0 && failCount > 0) {
      toast.error(`Funded ${successCount}, ${failCount} failed`);
    } else {
      toast.error("Failed to fund investors");
    }
    mutate(`/api/capital-calls/${callId}`);
    onLineItemUpdate();
  }

  const isCallFunded = callStatus === "FUNDED";
  const canFundAll =
    !isCallFunded &&
    unfunded.length > 0 &&
    (callStatus === "ISSUED" ||
      callStatus === "PARTIALLY_FUNDED" ||
      callStatus === "OVERDUE");

  return (
    <div>
      {canFundAll && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="text-xs text-indigo-900 dark:text-indigo-200">
            {unfunded.length} investor{unfunded.length === 1 ? "" : "s"} pending —{" "}
            <span className="font-semibold">{fmt(unfundedAmount)}</span> outstanding
          </div>
          <Button
            size="sm"
            onClick={() => {
              setFundAllPaidDate(defaultPaidDate);
              setFundAllOpen(true);
            }}
          >
            Fund All at Once
          </Button>
        </div>
      )}

      <Modal
        open={fundAllOpen}
        onClose={() => setFundAllOpen(false)}
        title="Fund All Pending Investors"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFundAllOpen(false)}>
              Cancel
            </Button>
            <Button loading={fundAllLoading} onClick={handleFundAll}>
              Fund {unfunded.length} Investor{unfunded.length === 1 ? "" : "s"} ({fmt(unfundedAmount)})
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will mark all {unfunded.length} pending investor{unfunded.length === 1 ? "" : "s"} as Funded
            with the paid date below. The date defaults to the capital call due date but can be edited.
          </p>
          <FormField label="Paid Date" required>
            <Input
              type="date"
              value={fundAllPaidDate}
              onChange={(e) => setFundAllPaidDate(e.target.value)}
            />
          </FormField>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1 max-h-48 overflow-y-auto">
            <div className="font-medium text-gray-700 dark:text-gray-200">Pending investors:</div>
            {unfunded.map((li) => (
              <div key={li.id} className="flex justify-between">
                <span>{li.investor.name}</span>
                <span className="font-medium">{fmt(li.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1 font-semibold">
              <span>Total</span>
              <span>{fmt(unfundedAmount)}</span>
            </div>
          </div>
        </div>
      </Modal>

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
