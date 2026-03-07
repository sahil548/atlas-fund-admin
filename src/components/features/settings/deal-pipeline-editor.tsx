"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getDefaultContent } from "@/lib/default-prompt-templates";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

// ── Types ────────────────────────────────────────────

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

interface DDCategory {
  id: string;
  firmId: string | null;
  name: string;
  description: string | null;
  defaultInstructions: string | null;
  isDefault: boolean;
  scope: string;
  sortOrder: number;
}

// ── Constants ────────────────────────────────────────

const SCOPE_LABELS: Record<string, string> = {
  UNIVERSAL: "Universal",
  REAL_ESTATE: "Real Estate",
  OPERATING_BUSINESS: "Operating Business",
  INFRASTRUCTURE: "Infrastructure",
  DEBT: "Debt",
};
const SCOPE_ORDER = ["UNIVERSAL", "REAL_ESTATE", "OPERATING_BUSINESS", "INFRASTRUCTURE", "DEBT"];
const SCOPE_COLORS: Record<string, string> = {
  UNIVERSAL: "indigo",
  REAL_ESTATE: "green",
  OPERATING_BUSINESS: "blue",
  INFRASTRUCTURE: "orange",
  DEBT: "purple",
};

// ── Component ────────────────────────────────────────

interface DealPipelineEditorProps {
  firmId: string;
}

export function DealPipelineEditor({ firmId }: DealPipelineEditorProps) {
  const toast = useToast();

  // Data fetching
  const promptsKey = `/api/settings/ai-prompts?firmId=${firmId}&module=deals`;
  const categoriesKey = `/api/dd-categories?firmId=${firmId}`;
  const { data: prompts, isLoading: promptsLoading } = useSWR<PromptTemplate[]>(promptsKey, fetcher);
  const { data: categories, isLoading: categoriesLoading } = useSWR<DDCategory[]>(categoriesKey, fetcher);

  // State
  const [expandedStep, setExpandedStep] = useState<1 | 2 | 3 | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [promptEdits, setPromptEdits] = useState<Record<string, string>>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<string, { name: string; description: string; instructions: string }>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", instructions: "", scope: "UNIVERSAL" });
  const [creating, setCreating] = useState(false);

  // Sync prompt edits from loaded data
  useEffect(() => {
    if (prompts) {
      const map: Record<string, string> = {};
      for (const p of prompts) map[p.type] = p.content;
      setPromptEdits(map);
    }
  }, [prompts]);

  // Find specific prompts
  const icMemoPrompt = prompts?.find((p) => p.type === "IC_MEMO");

  // ── Prompt handlers ──

  async function handleSavePrompt(tmpl: PromptTemplate) {
    setSavingPrompt(tmpl.type);
    try {
      const res = await fetch(`/api/settings/ai-prompts?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tmpl.type,
          module: tmpl.module,
          name: tmpl.name,
          description: tmpl.description,
          content: promptEdits[tmpl.type] || tmpl.content,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate(promptsKey);
      toast.success(`${tmpl.name} saved`);
    } catch {
      toast.error("Failed to save prompt");
    } finally {
      setSavingPrompt(null);
    }
  }

  async function handleResetPrompt(tmpl: PromptTemplate) {
    const defaultContent = getDefaultContent(tmpl.type);
    if (!defaultContent) return;
    setPromptEdits((prev) => ({ ...prev, [tmpl.type]: defaultContent }));
    setSavingPrompt(tmpl.type);
    try {
      const res = await fetch(`/api/settings/ai-prompts?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tmpl.type, module: tmpl.module, name: tmpl.name,
          description: tmpl.description, content: defaultContent, isActive: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate(promptsKey);
      toast.success(`${tmpl.name} reset to default`);
    } catch {
      toast.error("Failed to reset prompt");
    } finally {
      setSavingPrompt(null);
    }
  }

  // ── Category handlers ──

  function getCategoryEdit(cat: DDCategory) {
    return categoryEdits[cat.id] || {
      name: cat.name,
      description: cat.description || "",
      instructions: cat.defaultInstructions || "",
    };
  }

  function setCategoryField(id: string, field: string, value: string) {
    setCategoryEdits((prev) => ({
      ...prev,
      [id]: { ...getCategoryEdit({ id } as DDCategory), ...prev[id], [field]: value },
    }));
  }

  function initCategoryEdit(cat: DDCategory) {
    if (!categoryEdits[cat.id]) {
      setCategoryEdits((prev) => ({
        ...prev,
        [cat.id]: {
          name: cat.name,
          description: cat.description || "",
          instructions: cat.defaultInstructions || "",
        },
      }));
    }
  }

  async function handleSaveCategory(cat: DDCategory) {
    const fields = getCategoryEdit(cat);
    setSavingCategory(cat.id);
    try {
      const res = await fetch("/api/dd-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cat.id,
          name: fields.name,
          description: fields.description || null,
          defaultInstructions: fields.instructions || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate(categoriesKey);
      toast.success(`${fields.name} updated`);
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSavingCategory(null);
    }
  }

  async function handleDeleteCategory(cat: DDCategory) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/dd-categories?id=${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      mutate(categoriesKey);
      setExpandedCategoryId(null);
      toast.success(`${cat.name} deleted`);
    } catch {
      toast.error("Failed to delete category");
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dd-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId,
          name: newCategory.name.trim(),
          description: newCategory.description || null,
          defaultInstructions: newCategory.instructions || null,
          scope: newCategory.scope,
          isDefault: false,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate(categoriesKey);
      setNewCategory({ name: "", description: "", instructions: "", scope: "UNIVERSAL" });
      setShowAddForm(false);
      toast.success(`${newCategory.name} created`);
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  const isCustomCategory = (cat: DDCategory) => cat.firmId !== null && !cat.isDefault;

  // ── Loading ──

  if (promptsLoading || categoriesLoading || !prompts || !categories) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-400">Loading pipeline configuration...</div>
      </div>
    );
  }

  // Group categories by scope
  const grouped: Record<string, DDCategory[]> = {};
  for (const cat of categories) {
    const scope = cat.scope || "UNIVERSAL";
    if (!grouped[scope]) grouped[scope] = [];
    grouped[scope].push(cat);
  }

  // ── Prompt editor sub-component ──

  function PromptStepEditor({ tmpl, stepNum, label, sublabel }: { tmpl: PromptTemplate | undefined; stepNum: 1 | 2; label: string; sublabel: string }) {
    if (!tmpl) return null;
    const isExpanded = expandedStep === stepNum;
    const content = promptEdits[tmpl.type] ?? tmpl.content;
    const charCount = content.length;

    return (
      <div className={cn(
        "bg-white rounded-xl border transition-all",
        isExpanded ? "border-gray-300 shadow-sm" : "border-gray-200",
      )}>
        <button
          type="button"
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 rounded-xl"
          onClick={() => setExpandedStep(isExpanded ? null : stepNum)}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {stepNum}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">{label}</div>
            <div className="text-xs text-gray-500">{sublabel}</div>
          </div>
          <div className="flex items-center gap-2">
            {tmpl.persisted && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Customized</span>
            )}
            <svg className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {isExpanded && (
          <div className="px-5 pb-5 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setPromptEdits((prev) => ({ ...prev, [tmpl.type]: e.target.value }))}
              className="w-full h-64 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter prompt..."
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {charCount.toLocaleString()} characters
                {charCount > 10000 && <span className="text-amber-500 ml-1">— Long prompt, may reduce AI response quality</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                  onClick={() => handleResetPrompt(tmpl)}
                  disabled={savingPrompt === tmpl.type}
                >
                  Reset to Default
                </button>
                <Button
                  size="sm"
                  onClick={() => handleSavePrompt(tmpl)}
                  disabled={savingPrompt === tmpl.type}
                >
                  {savingPrompt === tmpl.type ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Deal Pipeline Configuration</h3>
        <p className="text-xs text-gray-500 mt-1">
          Configure how AI processes deals through due diligence workstreams and IC memo generation.
        </p>
      </div>

      {/* Step 1: DD Workstreams */}
      <div className={cn(
        "bg-white rounded-xl border transition-all",
        expandedStep === 2 ? "border-gray-300 shadow-sm" : "border-gray-200",
      )}>
        <button
          type="button"
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 rounded-t-xl"
          onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">DD Workstreams</div>
            <div className="text-xs text-gray-500">Each category defines an analysis framework. Categories auto-filter by deal asset class.</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="gray">{categories.length}</Badge>
            <svg className={cn("w-4 h-4 text-gray-400 transition-transform", expandedStep === 2 && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {expandedStep === 2 && (
          <div className="px-5 pb-5 space-y-4">
            {/* Add Category button */}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? "Cancel" : "+ Add Category"}
              </Button>
            </div>

            {/* Add Category Form */}
            {showAddForm && (
              <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category Name</label>
                    <input
                      value={newCategory.name}
                      onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Insurance DD"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
                    <select
                      value={newCategory.scope}
                      onChange={(e) => setNewCategory((p) => ({ ...p, scope: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {SCOPE_ORDER.map((s) => (
                        <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Analysis Framework</label>
                  <textarea
                    value={newCategory.instructions}
                    onChange={(e) => setNewCategory((p) => ({ ...p, instructions: e.target.value }))}
                    placeholder="The analysis framework the AI uses when running this workstream..."
                    className="w-full h-32 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateCategory} disabled={creating || !newCategory.name.trim()}>
                    {creating ? "Creating..." : "Create Category"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Category list grouped by scope */}
            {SCOPE_ORDER.filter((s) => grouped[s]?.length).map((scope) => (
              <div key={scope} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {SCOPE_LABELS[scope]}
                  </h4>
                  <Badge color={SCOPE_COLORS[scope] || "gray"}>{grouped[scope].length}</Badge>
                </div>

                {grouped[scope].map((cat) => {
                  const isExpanded = expandedCategoryId === cat.id;
                  const fields = getCategoryEdit(cat);
                  const custom = isCustomCategory(cat);

                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "border rounded-lg transition-all",
                        isExpanded ? "border-gray-300 shadow-sm" : "border-gray-100",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
                        onClick={() => {
                          if (!isExpanded) initCategoryEdit(cat);
                          setExpandedCategoryId(isExpanded ? null : cat.id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                          {cat.description && (
                            <span className="text-xs text-gray-400 hidden lg:inline">
                              — {cat.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {custom && (
                            <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Custom</span>
                          )}
                          <svg className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-1">Name</label>
                              <input
                                value={fields.name}
                                onChange={(e) => setCategoryField(cat.id, "name", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-1">Description</label>
                              <input
                                value={fields.description}
                                onChange={(e) => setCategoryField(cat.id, "description", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Analysis Framework</label>
                            <textarea
                              value={fields.instructions}
                              onChange={(e) => setCategoryField(cat.id, "instructions", e.target.value)}
                              className="w-full h-64 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="The analysis framework the AI uses when running this workstream..."
                            />
                            <div className="text-[10px] text-gray-400 mt-1">
                              {(fields.instructions || "").length.toLocaleString()} characters
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              {custom && (
                                <button
                                  type="button"
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                                  onClick={() => handleDeleteCategory(cat)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSaveCategory(cat)}
                              disabled={savingCategory === cat.id}
                            >
                              {savingCategory === cat.id ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {categories.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No DD categories configured. Click &ldquo;+ Add Category&rdquo; to create one.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Connector */}
      <div className="flex justify-start pl-9">
        <div className="w-0.5 h-4 bg-indigo-200" />
      </div>

      {/* Step 2: IC Memo Prompt */}
      <PromptStepEditor
        tmpl={icMemoPrompt}
        stepNum={2}
        label="IC Memo Prompt"
        sublabel="Final synthesis — combines all workstream outputs into an Investment Committee memo"
      />
    </div>
  );
}
