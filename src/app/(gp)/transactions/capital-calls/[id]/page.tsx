"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CapitalCallStatusButtons } from "@/components/features/capital/capital-call-status-buttons";
import { CapitalCallLineItemsTable } from "@/components/features/capital/capital-call-line-items-table";
import { CapitalCallDocumentPanel } from "@/components/features/capital/capital-call-document-panel";
import { EditCapitalCallForm } from "@/components/features/capital/edit-capital-call-form";
import { useToast } from "@/components/ui/toast";
import { fmt, formatDate, pct } from "@/lib/utils";
import { isOverdue } from "@/lib/computations/overdue-detection";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const CC_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  ISSUED: "blue",
  FUNDED: "green",
  PARTIALLY_FUNDED: "yellow",
  OVERDUE: "red",
};

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

interface Document {
  id: string;
  name: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadDate: string;
  category: string;
}

interface CapitalCallDetail {
  id: string;
  entityId: string;
  callNumber: string;
  callDate: string;
  dueDate: string;
  amount: number;
  purpose: string | null;
  status: string;
  fundedPercent: number;
  entity: { id: string; name: string };
  lineItems: LineItem[];
  documents: Document[];
  _summary: {
    totalLineItems: number;
    fundedLineItems: number;
    pendingLineItems: number;
    totalFunded: number;
    totalPending: number;
  };
}

export default function CapitalCallDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR<CapitalCallDetail>(
    id ? `/api/capital-calls/${id}` : null,
    fetcher,
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/transactions"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Capital Activity
        </Link>
        <div className="text-sm text-red-500">Capital call not found.</div>
      </div>
    );
  }

  const overdue = isOverdue(data);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/capital-calls/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      toast.success("Capital call deleted");
      router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete capital call");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/transactions"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Capital Activity
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap justify-between">
        <div className="flex items-start gap-3 flex-wrap">
          <PageHeader title={`Call #${data.callNumber}`} />
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <Badge color={CC_STATUS_COLORS[data.status] || "gray"}>
              {data.status.replace(/_/g, " ")}
            </Badge>
            {overdue && data.status !== "OVERDUE" && (
              <Badge color="red">OVERDUE</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
          {data.status === "DRAFT" && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditCapitalCallForm
        open={editOpen}
        onClose={() => { setEditOpen(false); mutate(); }}
        capitalCall={data}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Capital Call"
        message="Are you sure you want to delete this capital call? This will also remove all line items. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Call Details */}
      <SectionPanel title="Call Details">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Entity
            </dt>
            <dd className="mt-0.5 text-gray-900 dark:text-gray-100 font-medium">
              {data.entity.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Call Date
            </dt>
            <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
              {formatDate(data.callDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Due Date
            </dt>
            <dd
              className={`mt-0.5 font-medium ${
                overdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {formatDate(data.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Amount
            </dt>
            <dd className="mt-0.5 text-gray-900 dark:text-gray-100 font-semibold">
              {fmt(data.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Funded
            </dt>
            <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
              {pct(data.fundedPercent / 100)}
            </dd>
          </div>
          {data.purpose && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Purpose
              </dt>
              <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                {data.purpose}
              </dd>
            </div>
          )}
        </dl>
      </SectionPanel>

      {/* Status Actions */}
      <SectionPanel title="Status">
        <CapitalCallStatusButtons
          call={data}
          onStatusChange={() => mutate()}
        />
      </SectionPanel>

      {/* Investor Payments */}
      <SectionPanel title="Investor Payments" noPadding>
        <CapitalCallLineItemsTable
          callId={data.id}
          lineItems={data.lineItems}
          callStatus={data.status}
          dueDate={data.dueDate}
          onLineItemUpdate={() => mutate()}
        />
      </SectionPanel>

      {/* Documents */}
      <SectionPanel title="Documents">
        <CapitalCallDocumentPanel
          capitalCallId={data.id}
          entityId={data.entityId}
          documents={data.documents || []}
          onUploadComplete={() => mutate()}
        />
      </SectionPanel>
    </div>
  );
}
