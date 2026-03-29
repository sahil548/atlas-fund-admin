"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";
import { WaterfallPreviewPanel } from "@/components/features/waterfall/waterfall-preview-panel";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface Tier {
  id: string;
  tierOrder: number;
  name: string;
  description?: string;
  splitLP?: number;
  splitGP?: number;
  hurdleRate?: number;
  appliesTo?: string;
}

const tierBorderColors = [
  "border-l-emerald-500",
  "border-l-blue-500",
  "border-l-amber-500",
  "border-l-orange-500",
  "border-l-purple-500",
];

function cleanDescription(desc: string | null | undefined) {
  if (!desc) return "";
  return desc.replace(/\[entity:[^\]]+\]\s*—?\s*/g, "").trim();
}

export function EntityWaterfallTab({ entity, entityId }: { entity: any; entityId: string }) {
  const toast = useToast();
  const e = entity;

  // Fetch ALL firm templates
  const { data: allTemplates } = useSWR("/api/waterfall-templates", fetcher);
  const entityTag = `[entity:${entityId}]`;

  // Templates assigned to this vehicle
  const assignedTemplates: any[] = (allTemplates || []).filter(
    (t: any) =>
      t.entities?.some((ent: any) => ent.id === entityId) ||
      t.id === e.waterfallTemplateId ||
      (t.description && t.description.includes(entityTag))
  );
  if (e.waterfallTemplate && !assignedTemplates.find((t: any) => t.id === e.waterfallTemplate.id)) {
    assignedTemplates.unshift(e.waterfallTemplate);
  }

  // Templates NOT assigned to this vehicle (available to add)
  const assignedIds = new Set(assignedTemplates.map((t: any) => t.id));
  const availableTemplates: any[] = (allTemplates || []).filter((t: any) => !assignedIds.has(t.id));

  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [assignSaving, setAssignSaving] = useState<string | null>(null);
  const [addTierTarget, setAddTierTarget] = useState<any | null>(null);
  const [editTier, setEditTier] = useState<{ tier: Tier; templateId: string } | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(
    e.waterfallTemplate?.id || assignedTemplates[0]?.id || null
  );

  // Remove template from vehicle
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  async function handleAssignTemplate(templateId: string) {
    setAssignSaving(templateId);
    try {
      const template = availableTemplates.find((t: any) => t.id === templateId);
      const currentDesc = template?.description || "";
      const newDesc = currentDesc.includes(entityTag) ? currentDesc : (currentDesc ? `${entityTag} — ${currentDesc}` : entityTag);

      const res = await fetch(`/api/waterfall-templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc }),
      });
      if (!res.ok) { toast.error("Failed to assign template"); return; }

      if (!e.waterfallTemplateId) {
        await fetch(`/api/entities/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waterfallTemplateId: templateId }),
        });
      }

      toast.success("Waterfall added to vehicle");
      mutate("/api/waterfall-templates");
      mutate(`/api/entities/${entityId}`);
      setShowAddTemplate(false);
    } finally {
      setAssignSaving(null);
    }
  }

  async function handleRemoveTemplate() {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      // Remove entity tag from description
      const currentDesc = removeTarget.description || "";
      const newDesc = currentDesc.replace(entityTag, "").replace(/^\s*—\s*/, "").replace(/\s*—\s*$/, "").trim();

      await fetch(`/api/waterfall-templates/${removeTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc || " " }),
      });

      // If this was the FK-linked template, clear the FK
      if (e.waterfallTemplateId === removeTarget.id) {
        await fetch(`/api/entities/${entityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waterfallTemplateId: null }),
        });
      }

      toast.success("Waterfall removed from vehicle");
      mutate("/api/waterfall-templates");
      mutate(`/api/entities/${entityId}`);
    } finally {
      setRemoveLoading(false);
      setRemoveTarget(null);
    }
  }

  function renderTemplate(template: any) {
    const isExpanded = expandedTemplate === template.id;
    const tiers: Tier[] = template.tiers || [];

    return (
      <div key={template.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
        >
          <div className="flex items-center gap-3">
            <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
              {cleanDescription(template.description) && <p className="text-xs text-gray-500 mt-0.5">{cleanDescription(template.description)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="indigo">{tiers.length} tier{tiers.length !== 1 ? "s" : ""}</Badge>
            <button
              onClick={(ev) => { ev.stopPropagation(); setRemoveTarget(template); }}
              className="text-[10px] font-medium text-red-500 hover:text-red-700 rounded px-2 py-1 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-600">Tiers</span>
                <Button size="sm" onClick={(ev) => { ev.stopPropagation(); setAddTierTarget(template); }}>+ Tier</Button>
              </div>

              {tiers.length > 0 ? (
                <div className="space-y-0">
                  {tiers.map((t: Tier, i: number) => (
                    <div key={t.id}>
                      <div
                        onClick={() => setEditTier({ tier: t, templateId: template.id })}
                        className={`p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${tierBorderColors[i % tierBorderColors.length]} cursor-pointer hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tier {t.tierOrder}</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {t.appliesTo === "PRO_RATA" ? (
                              <span className="font-semibold text-indigo-600">Pro-Rata</span>
                            ) : (
                              <>
                                {t.splitLP != null && t.splitGP != null && (
                                  <span>LP: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.splitLP}%</span> &middot; GP: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.splitGP}%</span></span>
                                )}
                                {t.hurdleRate != null && (
                                  <span>Hurdle: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.hurdleRate}%</span></span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                      </div>
                      {i < tiers.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-3 text-center">No tiers configured. Click &quot;+ Tier&quot; to add the first one.</div>
              )}
            </div>

            {tiers.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-4">
                <WaterfallPreviewPanel
                  templateId={template.id}
                  templateName={template.name}
                  entities={[{ id: entityId, name: e.name }]}
                  mode="inline"
                  initialEntityId={entityId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Waterfall Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {assignedTemplates.length} template{assignedTemplates.length !== 1 ? "s" : ""} assigned — manage all waterfalls in Capital Activity, then assign them here.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddTemplate(true)}>+ Add Waterfall</Button>
      </div>

      {/* Assigned template list */}
      {assignedTemplates.length > 0 ? (
        assignedTemplates.map((template: any) => renderTemplate(template))
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-sm text-gray-500 mb-3">No waterfall templates assigned to this vehicle.</div>
          <p className="text-xs text-gray-400 mb-4">Create waterfalls in the Capital Activity section, then add them here for income distributions, return of capital, etc.</p>
          <Button size="sm" onClick={() => setShowAddTemplate(true)}>+ Add Waterfall</Button>
        </div>
      )}

      {/* Add Waterfall Modal — pick from Capital Activity templates */}
      <Modal
        open={showAddTemplate}
        onClose={() => setShowAddTemplate(false)}
        title="Add Waterfall to Vehicle"
        size="md"
      >
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">Select a waterfall template from Capital Activity to use with this vehicle. Create new templates in the <strong>Transactions → Waterfall Templates</strong> tab.</p>
          {availableTemplates.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-sm text-gray-400 mb-2">No available templates.</div>
              <p className="text-xs text-gray-400">Create waterfall templates in <strong>Transactions → Waterfall Templates</strong> first, then assign them here.</p>
            </div>
          ) : (
            availableTemplates.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</div>
                  {cleanDescription(t.description) && (
                    <div className="text-xs text-gray-500 truncate">{cleanDescription(t.description)}</div>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Badge color="indigo">{t.tiers?.length || 0} tiers</Badge>
                    {t.entities?.map((ent: any) => <Badge key={ent.id} color="blue">{ent.name}</Badge>)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssignTemplate(t.id)}
                  disabled={assignSaving === t.id}
                >
                  {assignSaving === t.id ? "Adding…" : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Tier modals */}
      {addTierTarget && (
        <AddTierForm
          open={!!addTierTarget}
          onClose={() => setAddTierTarget(null)}
          templateId={addTierTarget.id}
          nextOrder={(addTierTarget.tiers?.length || 0) + 1}
          entityId={entityId}
        />
      )}
      {editTier && (
        <EditTierForm
          open={!!editTier}
          onClose={() => setEditTier(null)}
          templateId={editTier.templateId}
          tier={editTier.tier}
          entityId={entityId}
        />
      )}

      {/* Remove Template Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveTemplate}
        title="Remove Waterfall from Vehicle"
        message={
          removeTarget
            ? `Remove "${removeTarget.name}" from this vehicle? The template will still exist in Capital Activity and can be re-added later.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
      />
    </div>
  );
}
