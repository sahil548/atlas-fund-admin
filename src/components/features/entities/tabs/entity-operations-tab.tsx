"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { InlineTaskAdd } from "@/components/features/tasks/inline-task-add";
import { EntityAccountingTab } from "@/components/features/accounting/entity-accounting-tab";
import { EntityDocumentsSection } from "@/components/features/entities/tabs/operations/entity-documents-section";
import { EntityMeetingsSection } from "@/components/features/entities/tabs/operations/entity-meetings-section";
import { EntityReportsSection } from "@/components/features/entities/tabs/operations/entity-reports-section";
import { EntityActivitySection } from "@/components/features/entities/tabs/operations/entity-activity-section";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Props {
  entity: any;
  entityId: string;
}

const SUB_TABS = [
  { key: "documents", label: "Documents" },
  { key: "accounting", label: "Accounting" },
  { key: "meetings", label: "Meetings" },
  { key: "tasks", label: "Tasks" },
  { key: "activity", label: "Activity" },
  { key: "reports", label: "Reports" },
] as const;

type SubTab = typeof SUB_TABS[number]["key"];

function TasksInline({ entityId, entityName }: { entityId: string; entityName: string }) {
  const tasksKey = `/api/tasks?entityId=${entityId}`;
  const { data, isLoading } = useSWR(tasksKey, fetcher);
  const tasks: any[] = data?.data ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Tasks</h3>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-gray-400 text-center py-4">Loading tasks...</div>
      ) : tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${t.status === "DONE" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>
                  {t.status === "DONE" ? "\u2713" : ""}
                </span>
                <div>
                  <div className={`text-sm ${t.status === "DONE" ? "text-gray-400 line-through" : ""}`}>{t.title}</div>
                  <div className="text-[10px] text-gray-500">
                    Due: {t.dueDate ? formatDate(t.dueDate) : "---"} · {t.assignee?.name || t.assigneeName || "Unassigned"}
                  </div>
                </div>
              </div>
              <Badge color={t.status === "DONE" ? "green" : t.status === "IN_PROGRESS" ? "yellow" : "gray"}>
                {t.status.toLowerCase().replace("_", " ")}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-6">No tasks yet</div>
      )}
      <InlineTaskAdd
        contextType="entity"
        contextId={entityId}
        entityId={entityId}
        contextLabel={entityName}
        onTaskCreated={() => mutate(tasksKey)}
      />
    </div>
  );
}

function PlaidBankAccounts({ entityId }: { entityId: string }) {
  const { data: plaidData, isLoading } = useSWR(`/api/integrations/plaid/accounts?entityId=${entityId}`, fetcher);

  if (isLoading) return <div className="text-xs text-gray-400 py-2">Loading bank accounts...</div>;
  if (!plaidData || !Array.isArray(plaidData) || plaidData.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-4">
      <h3 className="text-sm font-semibold mb-3">Bank Accounts (Plaid)</h3>
      <div className="space-y-2">
        {plaidData.map((acct: any) => (
          <div key={acct.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="text-sm font-medium">{acct.name || acct.officialName || "Account"}</div>
              <div className="text-[10px] text-gray-500">{acct.mask ? `****${acct.mask}` : ""} {acct.subtype || acct.type || ""}</div>
            </div>
            {acct.balances?.current != null && (
              <div className="text-sm font-semibold">${acct.balances.current.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EntityOperationsTab({ entity, entityId }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("documents");

  return (
    <div className="space-y-4">
      {/* Sub-navigation pills */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 inline-flex">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              subTab === t.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === "documents" && (
        <EntityDocumentsSection entity={entity} entityId={entityId} />
      )}

      {subTab === "accounting" && (
        <>
          <EntityAccountingTab
            entityId={entityId}
            entityName={entity.name}
            connection={entity.accountingConnection ? {
              id: entity.accountingConnection.id,
              provider: entity.accountingConnection.provider,
              syncStatus: entity.accountingConnection.syncStatus,
              lastSyncAt: entity.accountingConnection.lastSyncAt,
              chartOfAccountsMapped: entity.accountingConnection.chartOfAccountsMapped,
              lastSyncError: entity.accountingConnection.lastSyncError,
              providerCompanyName: entity.accountingConnection.providerCompanyName,
            } : null}
          />
          <PlaidBankAccounts entityId={entityId} />
        </>
      )}

      {subTab === "meetings" && (
        <EntityMeetingsSection entity={entity} entityId={entityId} />
      )}

      {subTab === "tasks" && (
        <TasksInline entityId={entityId} entityName={entity.name} />
      )}

      {subTab === "activity" && (
        <EntityActivitySection entityId={entityId} />
      )}

      {subTab === "reports" && (
        <EntityReportsSection entity={entity} entityId={entityId} />
      )}
    </div>
  );
}
