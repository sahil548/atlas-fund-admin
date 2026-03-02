"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { InlineEditField } from "./inline-edit-field";
import { ScreeningConfigModal } from "./screening-config-modal";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  DEAD: "Dead",
};

interface DealOverviewTabProps {
  deal: any;
}

export function DealOverviewTab({ deal }: DealOverviewTabProps) {
  const [showScreeningConfig, setShowScreeningConfig] = useState(false);

  const aiScore = deal.screeningResult?.score ?? deal.aiScore;
  const hasScreeningResult = !!deal.screeningResult;
  const isScreening = deal.stage === "SCREENING";
  const isPostScreening =
    deal.stage === "DUE_DILIGENCE" ||
    deal.stage === "IC_REVIEW" ||
    deal.stage === "CLOSING";

  function getScoreColor(score: number | null | undefined) {
    if (score == null) return undefined;
    if (score >= 70) return "green";
    if (score >= 40) return "yellow";
    return "red";
  }

  const scoreColorClass = getScoreColor(aiScore);
  const scoreSub = scoreColorClass === "green"
    ? "Strong"
    : scoreColorClass === "yellow"
    ? "Moderate"
    : scoreColorClass === "red"
    ? "Weak"
    : undefined;

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column: Editable fields */}
        <div className="col-span-2 space-y-6">
          {/* Deal Size & Return */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Deal Size &amp; Return
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <InlineEditField
                label="Target Size"
                value={deal.targetSize}
                field="targetSize"
                dealId={deal.id}
                placeholder="e.g. $50M"
              />
              <InlineEditField
                label="Target Check Size"
                value={deal.targetCheckSize}
                field="targetCheckSize"
                dealId={deal.id}
                placeholder="e.g. $10M"
              />
              <InlineEditField
                label="Target Return"
                value={deal.targetReturn}
                field="targetReturn"
                dealId={deal.id}
                placeholder="e.g. 2.5x / 25% IRR"
              />
            </div>
          </div>

          {/* Parties */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Parties
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InlineEditField
                label="Lead Partner"
                value={deal.leadPartner}
                field="leadPartner"
                dealId={deal.id}
                placeholder="e.g. John Kim"
              />
              <InlineEditField
                label="GP Name"
                value={deal.gpName}
                field="gpName"
                dealId={deal.id}
                placeholder="e.g. Acme Capital"
              />
              <InlineEditField
                label="Source"
                value={deal.source}
                field="source"
                dealId={deal.id}
                placeholder="e.g. Direct / Broker"
              />
              <InlineEditField
                label="Counterparty"
                value={deal.counterparty}
                field="counterparty"
                dealId={deal.id}
                placeholder="e.g. Seller LLC"
              />
            </div>
          </div>

          {/* Investment Context */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Investment Context
            </h4>
            <div className="space-y-4">
              <InlineEditField
                label="Investment Rationale"
                value={deal.investmentRationale}
                field="investmentRationale"
                dealId={deal.id}
                type="textarea"
                placeholder="Why is this deal interesting?"
              />
              <InlineEditField
                label="Thesis Notes"
                value={deal.thesisNotes}
                field="thesisNotes"
                dealId={deal.id}
                type="textarea"
                placeholder="Investment thesis and key drivers..."
              />
              <InlineEditField
                label="Description"
                value={deal.description}
                field="description"
                dealId={deal.id}
                type="textarea"
                placeholder="Brief deal description..."
              />
              <InlineEditField
                label="Additional Context"
                value={deal.additionalContext}
                field="additionalContext"
                dealId={deal.id}
                type="textarea"
                placeholder="Any additional context, background, or notes..."
              />
            </div>
          </div>

          {deal.targetEntity && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Target Entity
              </div>
              <Link
                href={`/entities/${deal.targetEntity.id}`}
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                {deal.targetEntity.name}
              </Link>
            </div>
          )}
        </div>

        {/* Right column: Status cards */}
        <div className="space-y-3">
          <StatCard
            label="Stage"
            value={stageLabel[deal.stage] || deal.stage}
            small
          />
          <StatCard
            label="AI Score"
            value={aiScore != null ? `${aiScore}/100` : "---"}
            sub={scoreSub}
            small
          />
          <StatCard
            label="Documents"
            value={String(deal.documents?.length ?? 0)}
            small
          />
          <StatCard
            label="Notes"
            value={String(deal.notes?.length ?? 0)}
            small
          />
        </div>
      </div>

      {/* Screening CTA (SCREENING stage, no screeningResult) */}
      {isScreening && !hasScreeningResult && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-purple-900">
                Ready to screen?
              </div>
              <p className="text-sm text-purple-700 mt-1">
                AI will analyze all deal info, documents, and notes to generate
                a screening score and populate Due Diligence findings.
              </p>
              <Button
                className="mt-3"
                onClick={() => setShowScreeningConfig(true)}
              >
                Configure &amp; Run AI Screening
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Screening Stage Gate Summary */}
      {(isPostScreening || (isScreening && hasScreeningResult)) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Stage Gate Summary
          </div>
          {isScreening && hasScreeningResult && (
            <p className="text-sm text-gray-600">
              AI Screening complete. Review results in the AI Screening tab.
            </p>
          )}
          {deal.stage === "DUE_DILIGENCE" && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Complete workstreams and click &quot;Send to IC Review&quot; when
                ready.
              </p>
              {deal.workstreams?.length > 0 && (
                <div className="space-y-1">
                  {(deal.workstreams as any[]).map((ws: any) => {
                    const pct =
                      ws.totalTasks > 0
                        ? Math.round(
                            (ws.completedTasks / ws.totalTasks) * 100
                          )
                        : 0;
                    return (
                      <div
                        key={ws.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ws.status === "COMPLETE"
                              ? "bg-emerald-400"
                              : ws.status === "IN_PROGRESS"
                              ? "bg-amber-400"
                              : "bg-gray-300"
                          }`}
                        />
                        <span className="flex-1">{ws.name}</span>
                        <span className="text-gray-500">
                          {ws.completedTasks}/{ws.totalTasks} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {deal.stage === "IC_REVIEW" && (
            <p className="text-sm text-gray-600">
              Awaiting IC committee decision. Review questions and vote in the IC
              Review tab.
            </p>
          )}
          {deal.stage === "CLOSING" && (
            <p className="text-sm text-gray-600">
              Deal approved by IC — closing in progress.
            </p>
          )}
        </div>
      )}

      <ScreeningConfigModal
        open={showScreeningConfig}
        onClose={() => setShowScreeningConfig(false)}
        dealId={deal.id}
        onComplete={() => {
          setShowScreeningConfig(false);
        }}
      />
    </div>
  );
}
