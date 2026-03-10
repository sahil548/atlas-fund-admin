"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { CapitalCallStatusButtons } from "@/components/features/capital/capital-call-status-buttons";
import { CapitalCallLineItemsTable } from "@/components/features/capital/capital-call-line-items-table";
import { CapitalCallDocumentPanel } from "@/components/features/capital/capital-call-document-panel";
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
