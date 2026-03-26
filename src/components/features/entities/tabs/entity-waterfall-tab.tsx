"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
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

export function EntityWaterfallTab({ entity, entityId }: { entity: any; entityId: string }) {
  const toast = useToast();
  const e = entity;

  // Fetch ALL firm templates — find ones belonging to this entity
  const { data: allTemplates } = useSWR("/api/waterfall-templates", fetcher);
  const entityTag = `[entity:${entityId}]`;
  const entityTemplates: any[] = (allTemplates || []).filter(
    (t: any) =>
      // Linked via FK
      t.entities?.some((ent: any) => ent.id === entityId) ||
      // Or is the entity's current primary template
      t.id === e.waterfallTemplateId ||
      // Or tagged with this entity ID in the description
      (t.description && t.description.includes(entityTag))
  );

  // Also include the entity's primary template from the entity data if not already in the list
  if (e.waterfallTemplate && !entityTemplates.find((t: any) => t.id === e.waterfallTemplate.id)) {
    entityTemplates.unshift(e.waterfallTemplate);
  }

  const [showTemplate, setShowTemplate] = useState(false);
  const [addTierTarget, setAddTierTarget] = useState<any | null>(null);
  const [editTier, setEditTier] = useState<{ tier: Tier; templateId: string } | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(
    e.waterfallTemplate?.id || null
  );

  // Edit/delete template state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateSaving, setEditTemplateSaving] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<any | null>(null);
  const [deleteTemplateLoading, setDeleteTemplateLoading] = useState(false);

  async function handleSaveTemplateName() {
    if (!editingTemplateId || !editTemplateName.trim()) return;
    setEditTemplateSaving(true);
    try {
      const res = await fetch(`/api/waterfall-templates/${editingTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTemplateName }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      toast.success("Template updated");
      mutate("/api/waterfall-templates");
      mutate(`/api/entities/${entityId}`);
      setEditingTemplateId(null);
    } finally { setEditTemplateSaving(false); }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateTarget) return;
    setDeleteTemplateLoading(true);
    try {
      const res = await fetch(`/api/waterfall-templates/${deleteTemplateTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); toast.error(typeof d.error === "string" ? d.error : "Failed to delete"); return; }
      toast.success("Template deleted");
      mutate("/api/waterfall-templates");
      mutate(`/api/entities/${entityId}`);
    } finally { setDeleteTemplateLoading(false); setDeleteTemplateTarget(null); }
  }

  function renderTemplate(template: any) {
    const isExpanded = expandedTemplate === template.id;
    const tiers: Tier[] = template.tiers || [];

    return (
      <div key={template.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Template header - always visible */}
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
              {template.description && <p className="text-xs text-gray-500 mt-0.5">{template.description.replace(/\[entity:[^\]]+\]\s*—?\s*/g, "").trim()}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="indigo">{tiers.length} tier{tiers.length !== 1 ? "s" : ""}</Badge>
            {editingTemplateId === template.id ? (
              <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                <input
                  value={editTemplateName}
                  onChange={(ev) => setEditTemplateName(ev.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button onClick={handleSaveTemplateName} disabled={editTemplateSaving} className="text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded px-2 py-1 disabled:opacity-50">{editTemplateSaving ? "…" : "Save"}</button>
                <button onClick={() => setEditingTemplateId(null)} className="text-[10px] font-medium text-gray-500 hover:text-gray-700 rounded px-2 py-1">Cancel</button>
                <button onClick={() => { setEditingTemplateId(null); setDeleteTemplateTarget(template); }} className="text-[10px] font-medium text-red-500 hover:text-red-700 rounded px-2 py-1 hover:bg-red-50">Delete</button>
              </div>
            ) : (
              <button
                onClick={(ev) => { ev.stopPropagation(); setEditingTemplateId(template.id); setEditTemplateName(template.name); }}
                className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 rounded px-2 py-1 hover:bg-indigo-50 border border-indigo-200"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Expanded: tiers + preview */}
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
                        {t.description && (
                          <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                        )}
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

            {/* Scenario Preview */}
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
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Waterfall Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {entityTemplates.length} template{entityTemplates.length !== 1 ? "s" : ""} — create separate waterfalls for income, return of capital, gains, etc.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowTemplate(true)}>+ New Waterfall</Button>
      </div>

      {/* Template list */}
      {entityTemplates.length > 0 ? (
        entityTemplates.map((template: any) => renderTemplate(template))
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-sm text-gray-500 mb-3">No waterfall templates for this vehicle yet.</div>
          <p className="text-xs text-gray-400 mb-4">Create waterfalls for different distribution types — income, return of capital, capital gains, etc.</p>
          <Button size="sm" onClick={() => setShowTemplate(true)}>+ Create First Waterfall</Button>
        </div>
      )}

      {/* Modals */}
      <CreateTemplateForm open={showTemplate} onClose={() => setShowTemplate(false)} entityId={entityId} />
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

      {/* Delete Template Confirmation */}
      <ConfirmDialog
        open={!!deleteTemplateTarget}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Waterfall Template"
        message={
          deleteTemplateTarget
            ? `Delete "${deleteTemplateTarget.name}" and all its tiers? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTemplateLoading}
      />
    </div>
  );
}
