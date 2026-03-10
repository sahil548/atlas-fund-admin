"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { isOverdue } from "@/lib/computations/overdue-detection";
import { CheckCircle } from "lucide-react";

interface LineItem {
  id: string;
  status: string;
}

interface CapitalCall {
  id: string;
  status: string;
  dueDate: string;
  lineItems: LineItem[];
}

interface CapitalCallStatusButtonsProps {
  call: CapitalCall;
  onStatusChange: () => void;
}

export function CapitalCallStatusButtons({
  call,
  onStatusChange,
}: CapitalCallStatusButtonsProps) {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const overdue = isOverdue(call);

  async function handleIssue() {
    setLoading(true);
    try {
      const res = await fetch(`/api/capital-calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ISSUED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Failed to issue capital call";
        toast.error(msg);
        return;
      }
      toast.success("Capital call issued — investors notified");
      setDialogOpen(false);
      onStatusChange();
    } catch {
      toast.error("Failed to issue capital call");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Overdue badge shown alongside other status indicators */}
      {overdue && call.status !== "OVERDUE" && (
        <Badge color="red">OVERDUE</Badge>
      )}

      {call.status === "DRAFT" && (
        <>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Mark as Issued
          </button>
          <ConfirmDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onConfirm={handleIssue}
            title="Issue Capital Call"
            message={`This will notify ${call.lineItems.length} investor${call.lineItems.length !== 1 ? "s" : ""}. Proceed?`}
            confirmLabel="Issue Call"
            variant="primary"
            loading={loading}
          />
        </>
      )}

      {(call.status === "ISSUED" || call.status === "PARTIALLY_FUNDED") && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Waiting for investor payments. Mark investors as funded below.
        </p>
      )}

      {call.status === "FUNDED" && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">All investors funded</span>
        </div>
      )}
    </div>
  );
}
