"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineEditField } from "./inline-edit-field";
import { ScreeningConfigModal } from "./screening-config-modal";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  DEAD: "Dead",
};

const entityTypeLabels: Record<string, string> = {
  MAIN_FUND: "Main Fund",
  SIDECAR: "Sidecar",
  SPV: "SPV",
  CO_INVEST_VEHICLE: "Co-Invest Vehicle",
  GP_ENTITY: "GP Entity",
  HOLDING_COMPANY: "Holding Company",
};

const vehicleStructureLabels: Record<string, string> = {
  LLC: "LLC",
  LP: "LP",
  CORP: "Corp",
  TRUST: "Trust",
};

interface DealOverviewTabProps {
  deal: any;
}

export function DealOverviewTab({ deal }: DealOverviewTabProps) {
  const [showScreeningConfig, setShowScreeningConfig] = useState(false);
  const [showLinkEntity, setShowLinkEntity] = useState(false);
  const [linkingEntity, setLinkingEntity] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    entityType: "MAIN_FUND",
    vehicleStructure: "LLC",
  });
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [startFormation, setStartFormation] = useState(true);
  const toast = useToast();
  const { firmId } = useFirm();

  const { data: entities } = useSWR(
    showLinkEntity ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

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

  async function handleLinkEntity(entityId: string) {
    setLinkingEntity(true);
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      mutate(`/api/deals/${deal.id}`);
      setShowLinkEntity(false);
    } catch {
      // silently fail
    } finally {
      setLinkingEntity(false);
    }
  }

  async function handleUnlinkEntity() {
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: null }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      // silently fail
    }
  }

  async function handleCreateAndLink() {
    if (!newEntityForm.name.trim()) return;
    setCreatingEntity(true);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId,
          name: newEntityForm.name.trim(),
          entityType: newEntityForm.entityType,
          vehicleStructure: newEntityForm.vehicleStructure,
          startFormation,
        }),
      });
      const created = await res.json();
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: created.id }),
      });
      mutate(`/api/deals/${deal.id}`);
      toast.success(`Entity "${newEntityForm.name.trim()}" created & linked`);
      setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" });
      setShowCreateEntity(false);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  }

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
                label="Total Raise"
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
              <div>
                <div className="text-[11px] text-gray-500 mb-1">Deal Lead</div>
                <div className="text-sm font-medium text-gray-900">
                  {deal.dealLead?.name || "Unassigned"}
                </div>
              </div>
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

          {/* Investment Vehicle */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Investment Vehicle
            </h4>
            {deal.targetEntity ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/entities/${deal.targetEntity.id}`}
                      className="text-sm text-indigo-600 hover:underline font-semibold"
                    >
                      {deal.targetEntity.name}
                    </Link>
                    <Badge color="purple">
                      {entityTypeLabels[deal.targetEntity.entityType] || deal.targetEntity.entityType}
                    </Badge>
                    {deal.targetEntity.vehicleStructure && (
                      <Badge color="blue">
                        {vehicleStructureLabels[deal.targetEntity.vehicleStructure] || deal.targetEntity.vehicleStructure}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowLinkEntity(true)}
                  >
                    Change
                  </Button>
                </div>
                {showLinkEntity && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="text-xs text-gray-500 mb-2">Select a different entity:</div>
                    {entities ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {(entities as any[]).map((entity: any) => (
                          <button
                            key={entity.id}
                            onClick={() => handleLinkEntity(entity.id)}
                            disabled={linkingEntity}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span className="font-medium">{entity.name}</span>
                            <Badge color="gray">
                              {entityTypeLabels[entity.entityType] || entity.entityType}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Loading entities...</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowLinkEntity(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleUnlinkEntity}
                      >
                        Unlink Entity
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center">
                <div className="text-sm text-gray-500 mb-3">
                  No investment vehicle linked to this deal.
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowLinkEntity(true)}
                  >
                    Link Existing
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreateEntity(true)}
                  >
                    Create New
                  </Button>
                </div>
                {showCreateEntity && (
                  <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white text-left">
                    <div className="text-xs font-semibold text-gray-700 mb-3">
                      Create New Entity
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">
                          Name
                        </label>
                        <input
                          type="text"
                          value={newEntityForm.name}
                          onChange={(e) =>
                            setNewEntityForm((f) => ({ ...f, name: e.target.value }))
                          }
                          placeholder="e.g. Atlas Fund I LLC"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">
                            Entity Type
                          </label>
                          <select
                            value={newEntityForm.entityType}
                            onChange={(e) =>
                              setNewEntityForm((f) => ({
                                ...f,
                                entityType: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                          >
                            {Object.entries(entityTypeLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">
                            Vehicle Structure
                          </label>
                          <select
                            value={newEntityForm.vehicleStructure}
                            onChange={(e) =>
                              setNewEntityForm((f) => ({
                                ...f,
                                vehicleStructure: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                          >
                            {Object.entries(vehicleStructureLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={startFormation}
                          onChange={(e) => setStartFormation(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600">Start formation workflow</span>
                      </label>
                      {startFormation && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          A formation workflow will be created to track legal filings and registrations.
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleCreateAndLink}
                          disabled={creatingEntity || !newEntityForm.name.trim()}
                        >
                          {creatingEntity ? "Creating..." : "Create & Link"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowCreateEntity(false);
                            setNewEntityForm({
                              name: "",
                              entityType: "MAIN_FUND",
                              vehicleStructure: "LLC",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {showLinkEntity && (
                  <div className="mt-4 border-t border-gray-100 pt-3 text-left">
                    <div className="text-xs text-gray-500 mb-2">Select an entity:</div>
                    {entities ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {(entities as any[]).length === 0 ? (
                          <div className="text-xs text-gray-400 py-2">
                            No entities found. Create one first.
                          </div>
                        ) : (
                          (entities as any[]).map((entity: any) => (
                            <button
                              key={entity.id}
                              onClick={() => handleLinkEntity(entity.id)}
                              disabled={linkingEntity}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="font-medium">{entity.name}</span>
                              <Badge color="gray">
                                {entityTypeLabels[entity.entityType] || entity.entityType}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Loading entities...</div>
                    )}
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowLinkEntity(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
