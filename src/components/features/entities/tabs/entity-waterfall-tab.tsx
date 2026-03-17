"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";
import { WaterfallPreviewPanel } from "@/components/features/waterfall/waterfall-preview-panel";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

  const [showTemplate, setShowTemplate] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [editTier, setEditTier] = useState<Tier | null>(null);

  return (
    <div className="space-y-4">
      {e.waterfallTemplate ? (
        <>
          {/* Template header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">{e.waterfallTemplate.name}</h3>
                {e.waterfallTemplate.description && <p className="text-xs text-gray-500 mt-0.5">{e.waterfallTemplate.description}</p>}
              </div>
              <Button size="sm" onClick={() => setShowAddTier(true)}>+ Tier</Button>
            </div>

            {/* Vertical sequential tier layout */}
            {(e.waterfallTemplate.tiers || []).length > 0 ? (
              <div className="space-y-0">
                {(e.waterfallTemplate.tiers || []).map((t: Tier, i: number) => (
                  <div key={t.id}>
                    {/* Tier card — full width, colored left border */}
                    <div
                      onClick={() => setEditTier(t)}
                      className={`p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${tierBorderColors[i % tierBorderColors.length]} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tier {t.tierOrder}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {t.splitLP != null && t.splitGP != null && (
                            <span>LP: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.splitLP}%</span> &middot; GP: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.splitGP}%</span></span>
                          )}
                          {t.hurdleRate != null && (
                            <span>Hurdle: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.hurdleRate}%</span></span>
                          )}
                        </div>
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-1.5">{t.description}</p>
                      )}
                    </div>

                    {/* Downward arrow connector between tiers */}
                    {i < (e.waterfallTemplate.tiers || []).length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-4 text-center">No tiers configured.</div>
            )}
          </div>

          {/* Scenario Analysis */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <WaterfallPreviewPanel
              templateId={e.waterfallTemplate.id}
              templateName={e.waterfallTemplate.name}
              entities={[{ id: entityId, name: e.name }]}
              mode="inline"
              initialEntityId={entityId}
            />
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
          <div className="text-sm text-gray-500 mb-3">No waterfall template assigned to this entity.</div>
          <Button size="sm" onClick={() => setShowTemplate(true)}>+ Create Template</Button>
        </div>
      )}

      {/* Modals */}
      <CreateTemplateForm open={showTemplate} onClose={() => setShowTemplate(false)} />
      {e.waterfallTemplate && (
        <AddTierForm
          open={showAddTier}
          onClose={() => setShowAddTier(false)}
          templateId={e.waterfallTemplate.id}
          nextOrder={(e.waterfallTemplate.tiers?.length || 0) + 1}
        />
      )}
      {editTier && e.waterfallTemplate && (
        <EditTierForm
          open={!!editTier}
          onClose={() => setEditTier(null)}
          templateId={e.waterfallTemplate.id}
          tier={editTier}
        />
      )}
    </div>
  );
}
