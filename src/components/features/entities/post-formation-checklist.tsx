"use client";

import { useState } from "react";
import { EntityRegulatoryDataSchema } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChecklistItem {
  label: string;
  tabKey: string;
  href?: string;
  done: boolean;
}

interface PostFormationChecklistProps {
  entity: any;
  onTabChange?: (tab: string) => void;
}

function parseRegulatoryFilings(raw: any): { filings: any[]; jurisdictions: any[] } {
  if (!raw) return { filings: [], jurisdictions: [] };
  const parsed = EntityRegulatoryDataSchema.safeParse(raw);
  if (parsed.success) {
    return {
      filings: parsed.data.filings ?? [],
      jurisdictions: parsed.data.jurisdictions ?? [],
    };
  }
  return { filings: [], jurisdictions: [] };
}

export function PostFormationChecklist({ entity, onTabChange }: PostFormationChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (entity.formationStatus !== "FORMED" && entity.formationStatus !== "REGISTERED") return null;

  const isDealLinked = Array.isArray(entity.dealEntities) && entity.dealEntities.length > 0;
  const { filings } = parseRegulatoryFilings(entity.regulatoryFilings);
  const hasFilings = filings.length > 0;
  const hasFundedCapitalCall = Array.isArray(entity.capitalCalls) &&
    entity.capitalCalls.some((cc: any) => cc.status === "FUNDED");

  let items: ChecklistItem[];

  if (isDealLinked) {
    items = [
      {
        label: "File SEC exemptions",
        tabKey: "regulatory",
        done: hasFilings,
      },
      {
        label: "Add investors & commitments",
        tabKey: "investors",
        done: Array.isArray(entity.commitments) && entity.commitments.length > 0,
      },
      {
        label: "Issue capital call",
        tabKey: "capital",
        done: Array.isArray(entity.capitalCalls) && entity.capitalCalls.length > 0,
      },
      {
        label: "Verify funding received",
        tabKey: "capital",
        href: "/transactions",
        done: hasFundedCapitalCall,
      },
      {
        label: "Close on deal",
        tabKey: "overview",
        href: "/deals",
        done: false,
      },
    ];
  } else {
    items = [
      {
        label: "Add investors",
        tabKey: "investors",
        done: Array.isArray(entity.commitments) && entity.commitments.length > 0,
      },
      {
        label: "Configure waterfall",
        tabKey: "waterfall",
        done: !!entity.waterfallTemplate,
      },
      {
        label: "Upload governing docs",
        tabKey: "documents",
        done: Array.isArray(entity.documents) && entity.documents.length > 0,
      },
      {
        label: "Connect QuickBooks",
        tabKey: "accounting",
        done: entity.accountingConnection?.syncStatus === "CONNECTED",
      },
      {
        label: "Add regulatory filings",
        tabKey: "regulatory",
        done: hasFilings,
      },
    ];
  }

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Checklist icon */}
          <svg
            className="w-4 h-4 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            What&apos;s Next
          </span>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-1">
            {completedCount}/{totalCount} complete
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
          aria-label="Dismiss checklist"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-1.5 mb-3">
        <div
          className="bg-indigo-600 h-1.5 rounded-full transition-all"
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {/* Checkbox indicator */}
            <div
              className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                item.done
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-indigo-300 dark:border-indigo-600"
              }`}
            >
              {item.done && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Label — clickable to navigate to tab */}
            <span className="flex-1">
              {item.href ? (
                <a
                  href={item.href}
                  className={`text-xs transition-colors ${
                    item.done
                      ? "line-through text-indigo-400 dark:text-indigo-600"
                      : "text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer"
                  }`}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  onClick={() => onTabChange?.(item.tabKey)}
                  className={`text-xs text-left transition-colors ${
                    item.done
                      ? "line-through text-indigo-400 dark:text-indigo-600"
                      : "text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer"
                  }`}
                >
                  {item.label}
                </button>
              )}
            </span>

            {/* Arrow link icon */}
            {!item.done && (
              <button
                onClick={() => onTabChange?.(item.tabKey)}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex-shrink-0"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
