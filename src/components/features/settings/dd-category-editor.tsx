"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

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

interface DDCategoryEditorProps {
  firmId: string;
}

export function DDCategoryEditor({ firmId }: DDCategoryEditorProps) {
  const toast = useToast();
  const swrKey = `/api/dd-categories?firmId=${firmId}`;
  const { data: categories, isLoading } = useSWR<DDCategory[]>(swrKey, fetcher);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, { name: string; description: string; instructions: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", instructions: "", scope: "UNIVERSAL" });
  const [creating, setCreating] = useState(false);

  function getEditFields(cat: DDCategory) {
    return editFields[cat.id] || {
      name: cat.name,
      description: cat.description || "",
      instructions: cat.defaultInstructions || "",
    };
  }

  function setField(id: string, field: string, value: string) {
    setEditFields((prev) => ({
      ...prev,
      [id]: { ...getEditFields({ id } as DDCategory), ...prev[id], [field]: value },
    }));
  }

  function initEdit(cat: DDCategory) {
    if (!editFields[cat.id]) {
      setEditFields((prev) => ({
        ...prev,
        [cat.id]: {
          name: cat.name,
          description: cat.description || "",
          instructions: cat.defaultInstructions || "",
        },
      }));
    }
  }

  async function handleSave(cat: DDCategory) {
    const fields = getEditFields(cat);
    setSavingId(cat.id);
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
      if (!res.ok) throw new Error("Failed to save");
      mutate(swrKey);
      toast.success(`${fields.name} updated`);
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(cat: DDCategory) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/dd-categories?id=${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      mutate(swrKey);
      setExpandedId(null);
      toast.success(`${cat.name} deleted`);
    } catch {
      toast.error("Failed to delete category");
    }
  }

  async function handleCreate() {
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
      mutate(swrKey);
      setNewCategory({ name: "", description: "", instructions: "", scope: "UNIVERSAL" });
      setShowAddForm(false);
      toast.success(`${newCategory.name} created`);
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  if (isLoading || !categories) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-400">Loading DD categories...</div>
      </div>
    );
  }

  // Group by scope
  const grouped: Record<string, DDCategory[]> = {};
  for (const cat of categories) {
    const scope = cat.scope || "UNIVERSAL";
    if (!grouped[scope]) grouped[scope] = [];
    grouped[scope].push(cat);
  }

  const isCustom = (cat: DDCategory) => cat.firmId !== null && !cat.isDefault;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">DD Category Templates</h3>
          <p className="text-xs text-gray-500 mt-1">
            Manage the due diligence categories used when screening deals. Categories auto-filter by deal asset class.
          </p>
        </div>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Instructions</label>
            <textarea
              value={newCategory.instructions}
              onChange={(e) => setNewCategory((p) => ({ ...p, instructions: e.target.value }))}
              placeholder="Instructions the AI receives when analyzing this category..."
              className="w-full h-24 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={creating || !newCategory.name.trim()}>
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
            const isExpanded = expandedId === cat.id;
            const fields = getEditFields(cat);
            const custom = isCustom(cat);

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
                    if (!isExpanded) initEdit(cat);
                    setExpandedId(isExpanded ? null : cat.id);
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
                    <svg
                      className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-180")}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
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
                          onChange={(e) => setField(cat.id, "name", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Description</label>
                        <input
                          value={fields.description}
                          onChange={(e) => setField(cat.id, "description", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Default Instructions</label>
                      <textarea
                        value={fields.instructions}
                        onChange={(e) => setField(cat.id, "instructions", e.target.value)}
                        className="w-full h-32 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Instructions the AI receives when analyzing this category..."
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
                            onClick={() => handleDelete(cat)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(cat)}
                        disabled={savingId === cat.id}
                      >
                        {savingId === cat.id ? "Saving..." : "Save"}
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
  );
}
