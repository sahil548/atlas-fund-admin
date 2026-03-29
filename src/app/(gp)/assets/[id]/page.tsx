"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EditAssetForm } from "@/components/features/assets/edit-asset-form";
import { LogValuationForm } from "@/components/features/assets/log-valuation-form";
import { CreateTaskForm } from "@/components/features/assets/create-task-form";
import { InlineTaskAdd } from "@/components/features/tasks/inline-task-add";
import { UploadDocumentForm } from "@/components/features/assets/upload-document-form";
import { LogIncomeForm } from "@/components/features/assets/log-income-form";
import { AssetOriginatedFrom } from "@/components/features/assets/asset-originated-from";
import { AssetPerformanceTab } from "@/components/features/assets/asset-performance-tab";
import { ExitAssetModal } from "@/components/features/assets/exit-asset-modal";
import { AssetOverviewTab } from "@/components/features/assets/asset-overview-tab";
import { AssetContractsTab } from "@/components/features/assets/asset-contracts-tab";
import { ValuationHistoryChart } from "@/components/features/assets/valuation-history-chart";
import { AssetIncomeTab } from "@/components/features/assets/asset-income-tab";
import { AssetExpensesTab } from "@/components/features/assets/asset-expenses-tab";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fmt, pct, cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TABS = ["overview", "contracts", "performance", "income", "expenses", "documents", "tasks", "activity"] as const;
type Tab = (typeof TABS)[number];

function AssetTasksTab({ assetId, assetName }: { assetId: string; assetName: string }) {
  const tasksKey = `/api/tasks?assetId=${assetId}`;
  const { data, isLoading } = useSWR(tasksKey, fetcher);
  const tasks: any[] = data?.data ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Tasks</h3>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-400">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-gray-400 text-center py-4">Loading tasks...</div>
      ) : tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${
                    t.status === "DONE"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {t.status === "DONE" ? "\u2713" : ""}
                </span>
                <div>
                  <div
                    className={`text-sm ${t.status === "DONE" ? "text-gray-400 line-through" : ""}`}
                  >
                    {t.title}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Due: {t.dueDate ? formatDate(t.dueDate) : "---"} ·{" "}
                    {t.assignee?.name || t.assigneeName || "Unassigned"}
                  </div>
                </div>
              </div>
              <Badge
                color={
                  t.status === "DONE"
                    ? "green"
                    : t.status === "IN_PROGRESS"
                    ? "yellow"
                    : "gray"
                }
              >
                {t.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-6">No tasks yet</div>
      )}
      <InlineTaskAdd
        contextType="asset"
        contextId={assetId}
        assetId={assetId}
        contextLabel={assetName}
        onTaskCreated={() => mutate(tasksKey)}
      />
    </div>
  );
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: a, isLoading } = useSWR(`/api/assets/${id}`, fetcher);
  const [tab, setTab] = useState<Tab>("overview");
  const router = useRouter();
  const toast = useToast();
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [showLogValuation, setShowLogValuation] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [showLogIncome, setShowLogIncome] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (isLoading || !a) return <div className="text-sm text-gray-400">Loading...</div>;

  const ur = a.fairValue - a.costBasis;
  const deal = a.sourceDeal;

  return (
    <div className="space-y-4">
      <Link href="/assets" className="text-xs text-indigo-600 hover:underline">
        &larr; Back to Assets
      </Link>

      {/* Originated from banner */}
      {deal && <AssetOriginatedFrom dealId={deal.id} dealName={deal.name} />}

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{a.name}</h2>
              <Badge color={ASSET_CLASS_COLORS[a.assetClass]}>
                {ASSET_CLASS_LABELS[a.assetClass]}
              </Badge>
              {a.capitalInstrument && (
                <Badge color={a.capitalInstrument === "DEBT" ? "orange" : "blue"}>
                  {CAPITAL_INSTRUMENT_LABELS[a.capitalInstrument]}
                </Badge>
              )}
              {a.participationStructure && (
                <Badge color={PARTICIPATION_COLORS[a.participationStructure] || "gray"}>
                  {PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}
                </Badge>
              )}
              <Badge color={a.status === "ACTIVE" ? "green" : "purple"}>
                {a.status?.toLowerCase() ?? "---"}
              </Badge>
              {a.hasBoardSeat && <Badge color="indigo">Board Seat</Badge>}
            </div>
            <div className="text-xs text-gray-500">
              {a.sector} · Entered{" "}
              {a.entryDate
                ? new Date(a.entryDate).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    month: "short",
                    year: "numeric",
                  })
                : "---"}{" "}
              ·{" "}
              {a.entityAllocations
                ?.map((ea: { entity: { name: string } }) => ea.entity.name)
                .join(", ")}
            </div>
          </div>
          <div className="flex gap-2">
            {a.status === "ACTIVE" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExitModal(true)}
              >
                Record Exit
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditAsset(true)}
            >
              Edit Asset
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[
            { l: "Fair Value", v: fmt(a.fairValue) },
            { l: "Cost Basis", v: fmt(a.costBasis) },
            {
              l: "Unrealized",
              v: `${ur > 0 ? "+" : ""}${fmt(ur)}`,
              c: ur > 0 ? "text-emerald-700" : "text-red-600",
            },
            {
              l: "MOIC",
              v: `${(a.moic || 0).toFixed(2)}x`,
              c: (a.moic || 0) >= 2 ? "text-emerald-700" : "",
            },
            { l: "Gross IRR", v: a.irr ? pct(a.irr) : "---", c: "text-emerald-700" },
            { l: "Income", v: a.incomeType || "---" },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">{s.l}</div>
              <div className={`text-lg font-bold ${s.c || "text-gray-900 dark:text-gray-100"}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified 6-Tab Navigation */}
      <Tabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as Tab)} />

      <SectionErrorBoundary>

      {/* ── Overview Tab ─────────────────────────────────── */}
      {tab === "overview" && <AssetOverviewTab asset={a} />}

      {/* ── Contracts Tab ────────────────────────────────── */}
      {tab === "contracts" && <AssetContractsTab asset={a} />}

      {/* ── Performance Tab ──────────────────────────────── */}
      {tab === "performance" && (
        <div className="space-y-4">
          {/* Valuation History Chart (renders only when 2+ valuations exist) */}
          {a.valuations?.length >= 2 && (
            <ValuationHistoryChart valuations={a.valuations} />
          )}
          {/* Attribution comparison */}
          <AssetPerformanceTab assetId={a.id} />
        </div>
      )}

      {/* ── Income Tab ───────────────────────────────────── */}
      {tab === "income" && (
        <AssetIncomeTab
          assetId={id}
          entityId={a.entityAllocations?.[0]?.entityId || ""}
        />
      )}

      {/* ── Expenses Tab ─────────────────────────────────── */}
      {tab === "expenses" && (
        <AssetExpensesTab
          assetId={id}
          entityId={a.entityAllocations?.[0]?.entityId || ""}
        />
      )}

      {/* ── Documents Tab ────────────────────────────────── */}
      {tab === "documents" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Documents</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadDoc(true)}
            >
              + Document
            </Button>
          </div>
          {a.documents?.length > 0 ? (
            a.documents.map(
              (d: { id: string; name: string; uploadDate: string; category: string }) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">&#128196;</span>
                    <div>
                      <div className="text-sm">{d.name}</div>
                      <div className="text-[10px] text-gray-500">{formatDate(d.uploadDate)}</div>
                    </div>
                  </div>
                  <Badge>{d.category}</Badge>
                </div>
              ),
            )
          ) : (
            <div className="text-xs text-gray-400 text-center py-6">No documents uploaded</div>
          )}
        </div>
      )}

      {/* ── Tasks Tab ────────────────────────────────────── */}
      {tab === "tasks" && <AssetTasksTab assetId={id} assetName={a.name} />}

      {/* ── Activity Tab ─────────────────────────────────── */}
      {tab === "activity" && (
        <div className="space-y-4">
          {/* Meetings */}
          {a.meetings?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold mb-3">Meetings</h3>
              {a.meetings.map(
                (m: {
                  id: string;
                  meetingDate: string;
                  title: string;
                  hasTranscript: boolean;
                  actionItems: number;
                }) => (
                  <div
                    key={m.id}
                    className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg mb-2 hover:border-indigo-200 cursor-pointer"
                  >
                    <div className="flex justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatDate(m.meetingDate)}</span>
                        <span className="text-sm font-medium">{m.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                        <span className="text-xs text-gray-500">{m.actionItems} actions</span>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Activity Timeline */}
          {a.activityEvents?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
              {a.activityEvents.map(
                (e: {
                  id: string;
                  eventDate: string;
                  description: string;
                  eventType: string;
                }) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-[10px] text-gray-400 w-16">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(e.eventDate))}
                    </span>
                    <Badge
                      color={
                        e.eventType === "meeting"
                          ? "purple"
                          : e.eventType === "task"
                          ? "green"
                          : e.eventType === "document"
                          ? "blue"
                          : "orange"
                      }
                    >
                      {e.eventType}
                    </Badge>
                    <span className="text-xs text-gray-700">{e.description}</span>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Governance */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3">Governance & Rights</h3>
            <div className={cn("grid grid-cols-2 gap-3 text-sm")}>
              {[
                ["Board Seat", a.hasBoardSeat ? "Yes" : "None"],
                [
                  "Information Rights",
                  "Quarterly financials + annual audit",
                ],
                [
                  "Review Schedule",
                  a.nextReview ? formatDate(a.nextReview) : "Not scheduled",
                ],
                [
                  "Asset Class",
                  ASSET_CLASS_LABELS[a.assetClass] ||
                    a.assetClass?.replace(/_/g, " "),
                ],
                [
                  "Vehicles",
                  a.entityAllocations
                    ?.map((ea: { entity: { name: string } }) => ea.entity.name)
                    .join(", "),
                ],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Empty state if no activity at all */}
          {!a.meetings?.length && !a.activityEvents?.length && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="text-sm text-gray-400">No activity recorded yet</div>
              <div className="text-xs text-gray-300 mt-1">
                Meetings, governance events, and timeline activity will display here.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EditAssetForm open={showEditAsset} onClose={() => setShowEditAsset(false)} asset={a} />
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setDeleteLoading(true);
          try {
            const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to delete");
            toast.success("Asset deleted");
            router.push("/assets");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete asset");
          } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
          }
        }}
        title="Delete Asset"
        message={`Are you sure you want to delete "${a.name}"? This action cannot be undone. Note: assets with valuations, leases, income events, or other records must have those removed first.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <LogValuationForm
        open={showLogValuation}
        onClose={() => setShowLogValuation(false)}
        assetId={a.id}
      />
      <CreateTaskForm
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        assetId={a.id}
      />
      <UploadDocumentForm
        open={showUploadDoc}
        onClose={() => setShowUploadDoc(false)}
        assetId={a.id}
      />
      <LogIncomeForm
        open={showLogIncome}
        onClose={() => setShowLogIncome(false)}
        assetId={a.id}
        entityId={a.entityAllocations?.[0]?.entity?.id || ""}
      />
      <ExitAssetModal
        asset={{
          id: a.id,
          name: a.name,
          costBasis: a.costBasis,
          entryDate: a.entryDate,
          status: a.status,
        }}
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onSuccess={() => mutate(`/api/assets/${id}`)}
      />

      </SectionErrorBoundary>
    </div>
  );
}
