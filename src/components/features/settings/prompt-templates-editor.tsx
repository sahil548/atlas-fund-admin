"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROMPT_TEMPLATES,
  MODULE_LABELS,
  getDefaultContent,
} from "@/lib/default-prompt-templates";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface PromptTemplate {
  id: string | null;
  type: string;
  module: string;
  name: string;
  description: string | null;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  persisted: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  SCREENING: "indigo",
  DD_FINANCIAL: "blue",
  DD_LEGAL: "purple",
  DD_MARKET: "green",
  DD_OPERATIONAL: "orange",
  DD_ESG: "teal",
  IC_MEMO: "amber",
  COMP_ANALYSIS: "pink",
};

export function PromptTemplatesEditor() {
  const { firmId } = useFirm();
  const toast = useToast();
  const swrKey = `/api/settings/ai-prompts?firmId=${firmId}`;
  const { data: templates, isLoading } = useSWR<PromptTemplate[]>(swrKey, fetcher);

  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);

  // Sync edit content from loaded templates
  useEffect(() => {
    if (templates) {
      const map: Record<string, string> = {};
      for (const t of templates) map[t.type] = t.content;
      setEditContent(map);
    }
  }, [templates]);

  async function handleSave(tmpl: PromptTemplate) {
    setSavingType(tmpl.type);
    try {
      const res = await fetch(`/api/settings/ai-prompts?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tmpl.type,
          module: tmpl.module,
          name: tmpl.name,
          description: tmpl.description,
          content: editContent[tmpl.type] || tmpl.content,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      mutate(swrKey);
      toast.success(`${tmpl.name} prompt saved`);
    } catch {
      toast.error("Failed to save prompt template");
    } finally {
      setSavingType(null);
    }
  }

  async function handleReset(tmpl: PromptTemplate) {
    const defaultContent = getDefaultContent(tmpl.type);
    if (!defaultContent) return;
    setEditContent((prev) => ({ ...prev, [tmpl.type]: defaultContent }));
    // Save the reset
    setSavingType(tmpl.type);
    try {
      const res = await fetch(`/api/settings/ai-prompts?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tmpl.type,
          module: tmpl.module,
          name: tmpl.name,
          description: tmpl.description,
          content: defaultContent,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate(swrKey);
      toast.success(`${tmpl.name} reset to default`);
    } catch {
      toast.error("Failed to reset template");
    } finally {
      setSavingType(null);
    }
  }

  function isModified(tmpl: PromptTemplate): boolean {
    const defaultContent = getDefaultContent(tmpl.type);
    const currentContent = editContent[tmpl.type] ?? tmpl.content;
    return currentContent !== defaultContent;
  }

  if (isLoading || !templates) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-400">Loading prompt templates...</div>
      </div>
    );
  }

  // Group templates by module
  const grouped: Record<string, PromptTemplate[]> = {};
  for (const t of templates) {
    if (!grouped[t.module]) grouped[t.module] = [];
    grouped[t.module].push(t);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Prompt Templates</h3>
        <p className="text-xs text-gray-500 mt-1">
          Customize the AI analysis frameworks used across modules. Edit a template to change how AI evaluates deals, generates memos, or performs analysis.
        </p>
      </div>

      {Object.entries(grouped).map(([mod, modTemplates]) => (
        <div key={mod} className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {MODULE_LABELS[mod] || mod}
          </h4>

          {modTemplates.map((tmpl) => {
            const isExpanded = expandedType === tmpl.type;
            const modified = isModified(tmpl);
            const color = TYPE_COLORS[tmpl.type] || "gray";
            const charCount = (editContent[tmpl.type] || tmpl.content).length;

            return (
              <div
                key={tmpl.type}
                className={cn(
                  "border rounded-lg transition-all",
                  isExpanded ? "border-gray-300 shadow-sm" : "border-gray-100"
                )}
              >
                {/* Header */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
                  onClick={() => setExpandedType(isExpanded ? null : tmpl.type)}
                >
                  <div className="flex items-center gap-3">
                    <Badge color={color}>
                      {tmpl.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">{tmpl.name}</span>
                    {tmpl.description && (
                      <span className="text-xs text-gray-400 hidden lg:inline">
                        — {tmpl.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {modified && tmpl.persisted && (
                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Customized
                      </span>
                    )}
                    {!tmpl.persisted && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    <svg
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <textarea
                      value={editContent[tmpl.type] ?? tmpl.content}
                      onChange={(e) =>
                        setEditContent((prev) => ({
                          ...prev,
                          [tmpl.type]: e.target.value,
                        }))
                      }
                      className="w-full h-64 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter prompt template..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        {charCount.toLocaleString()} characters
                        {charCount > 10000 && (
                          <span className="text-amber-500 ml-1">
                            — Long prompt, may reduce AI response quality
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                          onClick={() => handleReset(tmpl)}
                          disabled={savingType === tmpl.type}
                        >
                          Reset to Default
                        </button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(tmpl)}
                          disabled={savingType === tmpl.type}
                        >
                          {savingType === tmpl.type ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          No prompt templates configured. Templates will appear here as AI features are enabled.
        </p>
      )}
    </div>
  );
}
