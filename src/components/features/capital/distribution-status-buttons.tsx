"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CheckCircle } from "lucide-react";

interface Distribution {
  id: string;
  status: string;
}

interface Props {
  distribution: Distribution;
  onStatusChange: () => void;
}

export function DistributionStatusButtons({ distribution, onStatusChange }: Props) {
  const toast = useToast();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleTransition(newStatus: "APPROVED" | "PAID" | "DRAFT") {
    setLoading(true);
    try {
      const res = await fetch(`/api/distributions/${distribution.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to update status";
        toast.error(msg);
        return;
      }
      toast.success(
        newStatus === "APPROVED" ? "Distribution approved"
          : newStatus === "PAID" ? "Distribution marked as paid"
          : "Distribution reverted to draft"
      );
      onStatusChange();
    } catch {
      toast.error("Failed to update distribution status");
    } finally {
      setLoading(false);
      setShowApproveDialog(false);
      setShowPaidDialog(false);
      setShowRevertDialog(false);
    }
  }

  if (distribution.status === "DRAFT") {
    return (
      <>
        <button
          onClick={() => setShowApproveDialog(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Approve
        </button>
        <ConfirmDialog
          open={showApproveDialog}
          onClose={() => setShowApproveDialog(false)}
          onConfirm={() => handleTransition("APPROVED")}
          title="Approve Distribution"
          message="Approve this distribution for payment?"
          confirmLabel="Approve"
          variant="primary"
          loading={loading}
        />
      </>
    );
  }

  if (distribution.status === "APPROVED") {
    return (
      <>
        <button
          onClick={() => setShowPaidDialog(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Mark as Paid
        </button>
        <button
          onClick={() => setShowRevertDialog(true)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Revert to Draft
        </button>
        <ConfirmDialog
          open={showPaidDialog}
          onClose={() => setShowPaidDialog(false)}
          onConfirm={() => handleTransition("PAID")}
          title="Mark Distribution as Paid"
          message="This will mark the distribution as paid, recompute capital accounts, and notify investors."
          confirmLabel="Mark as Paid"
          variant="primary"
          loading={loading}
        />
        <ConfirmDialog
          open={showRevertDialog}
          onClose={() => setShowRevertDialog(false)}
          onConfirm={() => handleTransition("DRAFT")}
          title="Revert to Draft"
          message="This will revert the distribution back to draft status, allowing you to edit or delete it."
          confirmLabel="Revert to Draft"
          variant="danger"
          loading={loading}
        />
      </>
    );
  }

  if (distribution.status === "PAID") {
    return (
      <>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Distribution paid
        </div>
        <button
          onClick={() => setShowRevertDialog(true)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Revert to Draft
        </button>
        <ConfirmDialog
          open={showRevertDialog}
          onClose={() => setShowRevertDialog(false)}
          onConfirm={() => handleTransition("DRAFT")}
          title="Revert to Draft"
          message="This will revert the distribution back to draft status, allowing you to edit or delete it. If capital accounts were updated when marked paid, they will need to be recalculated."
          confirmLabel="Revert to Draft"
          variant="danger"
          loading={loading}
        />
      </>
    );
  }

  return null;
}
