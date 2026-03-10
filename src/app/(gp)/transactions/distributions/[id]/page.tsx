"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { DistributionStatusButtons } from "@/components/features/capital/distribution-status-buttons";
import { DistributionDocumentPanel } from "@/components/features/capital/distribution-document-panel";
import { fmt, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const DIST_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  APPROVED: "blue",
  PAID: "green",
};

interface Document {
  id: string;
  name: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadDate: string;
  category: string;
}

interface LineItem {
  id: string;
  distributionId: string;
  investorId: string;
  grossAmount: number;
  returnOfCapital: number;
  income: number;
  longTermGain: number;
  carriedInterest: number;
  netAmount: number;
  investor: { id: string; name: string };
}

interface Distribution {
  id: string;
  entityId: string;
  distributionDate: string;
  grossAmount: number;
  source: string | null;
  returnOfCapital: number;
  income: number;
  longTermGain: number;
  shortTermGain: number;
  carriedInterest: number;
  netToLPs: number;
  status: string;
  distributionType: string | null;
  memo: string | null;
  entity: { id: string; name: string };
  lineItems: LineItem[];
  documents?: Document[];
  _summary: { totalLineItems: number; totalGross: number; totalNet: number };
}

export default function DistributionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, mutate } = useSWR<Distribution>(
    id ? `/api/distributions/${id}` : null,
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-48" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400 p-4">
        Failed to load distribution. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Capital Activity
      </Link>

      {/* Page header */}
      <PageHeader
        title="Distribution"
        subtitle={data.entity?.name}
        breadcrumbs={[
          { label: "Capital Activity", href: "/transactions" },
          { label: "Distribution" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Badge color={DIST_STATUS_COLORS[data.status] || "gray"}>
              {data.status}
            </Badge>
            <DistributionStatusButtons
              distribution={data}
              onStatusChange={() => mutate()}
            />
          </div>
        }
      />

      {/* Distribution Details */}
      <SectionPanel title="Distribution Details">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Entity</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{data.entity?.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Distribution Date</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{formatDate(data.distributionDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Status</div>
            <Badge color={DIST_STATUS_COLORS[data.status] || "gray"}>{data.status}</Badge>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Distribution Type</div>
            <div className="text-gray-900 dark:text-gray-100">{data.distributionType || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gross Amount</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{fmt(data.grossAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Net to LPs</div>
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">{fmt(data.netToLPs)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Source</div>
            <div className="text-gray-900 dark:text-gray-100">{data.source || "—"}</div>
          </div>
          {data.memo && (
            <div className="col-span-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Memo</div>
              <div className="text-gray-900 dark:text-gray-100">{data.memo}</div>
            </div>
          )}
        </div>

        {/* Tax breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tax Breakdown</div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Return of Capital</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{data.returnOfCapital ? fmt(data.returnOfCapital) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Income</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{data.income ? fmt(data.income) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">LT Gain</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{data.longTermGain ? fmt(data.longTermGain) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">ST Gain</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{data.shortTermGain ? fmt(data.shortTermGain) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Carried Interest</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{data.carriedInterest ? fmt(data.carriedInterest) : "—"}</div>
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* Investor Allocations */}
      <SectionPanel title="Investor Allocations" noPadding>
        {data.lineItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No investor allocations found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Investor</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Gross Amount</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Return of Capital</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Income</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">LT Gain</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Carried Interest</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{li.investor.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(li.grossAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{li.returnOfCapital ? fmt(li.returnOfCapital) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{li.income ? fmt(li.income) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{li.longTermGain ? fmt(li.longTermGain) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{li.carriedInterest ? fmt(li.carriedInterest) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{fmt(li.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-gray-100">Total ({data._summary.totalLineItems} investors)</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(data._summary.totalGross)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{fmt(data._summary.totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionPanel>

      {/* Documents */}
      <SectionPanel
        title="Documents"
        headerRight={
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {(data.documents || []).length} attached
          </span>
        }
      >
        <DistributionDocumentPanel
          distributionId={data.id}
          entityId={data.entityId}
          documents={data.documents || []}
        />
      </SectionPanel>
    </div>
  );
}
