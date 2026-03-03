"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { mutate } from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CategoryConfig {
  name: string;
  description: string;
  defaultInstructions: string;
  enabled: boolean;
  instructions: string;
}

interface ScreeningConfigModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  onComplete: () => void;
  rerun?: boolean;
}

export function ScreeningConfigModal({
  open,
  onClose,
  dealId,
  onComplete,
  rerun = false,
}: ScreeningConfigModalProps) {
  const toast = useToast();
  const { firmId } = useFirm();
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [contextInfo, setContextInfo] = useState({ docs: 0, notes: 0 });

  useEffect(() => {
    if (!open) return;

    // Fetch DD category templates
    setFetching(true);
    Promise.all([
      fetch(`/api/dd-categories?firmId=${firmId}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`/api/deals/${dealId}`)
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([cats, deal]) => {
        const templates = Array.isArray(cats)
          ? cats
          : Array.isArray(cats?.categories)
          ? cats.categories
          : [];
        setCategories(
          templates.map((c: any) => ({
            name: c.name || c.category || "",
            description: c.description || "",
            defaultInstructions: c.defaultInstructions || c.instructions || "",
            enabled: true,
            instructions: c.defaultInstructions || c.instructions || "",
          }))
        );
        setContextInfo({
          docs: deal?.documents?.length ?? 0,
          notes: deal?.notes?.length ?? 0,
        });
      })
      .finally(() => setFetching(false));
  }, [open, dealId]);

  // If no templates from API, provide reasonable defaults
  useEffect(() => {
    if (open && !fetching && categories.length === 0) {
      setCategories([
        {
          name: "Financial",
          description: "Revenue, margins, cash flow analysis",
          defaultInstructions:
            "Analyze financial statements, revenue growth, and cash flow dynamics.",
          enabled: true,
          instructions:
            "Analyze financial statements, revenue growth, and cash flow dynamics.",
        },
        {
          name: "Operational",
          description: "Business operations and technology",
          defaultInstructions:
            "Evaluate operational efficiency, technology stack, and key processes.",
          enabled: true,
          instructions:
            "Evaluate operational efficiency, technology stack, and key processes.",
        },
        {
          name: "Legal",
          description: "Legal structure and compliance",
          defaultInstructions:
            "Review corporate structure, contracts, IP, and regulatory compliance.",
          enabled: true,
          instructions:
            "Review corporate structure, contracts, IP, and regulatory compliance.",
        },
        {
          name: "ESG",
          description: "Environmental, social, and governance",
          defaultInstructions:
            "Assess ESG risks, environmental compliance, and governance structure.",
          enabled: true,
          instructions:
            "Assess ESG risks, environmental compliance, and governance structure.",
        },
        {
          name: "Market",
          description: "Market positioning and competition",
          defaultInstructions:
            "Analyze competitive landscape, market size, and growth potential.",
          enabled: true,
          instructions:
            "Analyze competitive landscape, market size, and growth potential.",
        },
      ]);
    }
  }, [open, fetching, categories.length]);

  function toggleCategory(idx: number) {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, enabled: !c.enabled } : c))
    );
  }

  function updateInstructions(idx: number, instructions: string) {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, instructions } : c))
    );
  }

  async function runScreening() {
    setLoading(true);
    try {
      const config: Record<string, unknown> = {
        categories: categories
          .filter((c) => c.enabled)
          .map((c) => ({
            name: c.name,
            instructions: c.instructions,
            enabled: true,
          })),
        customInstructions: customInstructions || undefined,
      };
      if (rerun) config.rerun = true;
      const res = await fetch(`/api/deals/${dealId}/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Screening failed");
      toast.success(
        rerun
          ? "AI screening re-run complete — IC Memo regenerated"
          : "AI screening complete — IC Memo generated"
      );
      mutate(`/api/deals/${dealId}`);
      onComplete();
    } catch {
      toast.error("Screening failed");
    } finally {
      setLoading(false);
    }
  }

  const enabledCount = categories.filter((c) => c.enabled).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rerun ? "Re-run AI Screening" : "Configure AI Screening"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={runScreening}>
            {rerun ? "Re-run Screening" : "Run AI Screening"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Context preview */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="text-xs font-medium text-indigo-700">
            Context Preview
          </div>
          <div className="text-sm text-indigo-600 mt-1">
            {contextInfo.docs} document{contextInfo.docs !== 1 ? "s" : ""},
            {" "}
            {contextInfo.notes} note{contextInfo.notes !== 1 ? "s" : ""},
            deal fields loaded
          </div>
        </div>

        {/* Category toggles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700">
              DD Categories ({enabledCount} of {categories.length} enabled)
            </h4>
          </div>

          {fetching ? (
            <div className="text-sm text-gray-400 py-4 text-center">
              Loading categories...
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.name}
                  className={`border rounded-lg p-3 transition-colors ${
                    cat.enabled
                      ? "border-indigo-200 bg-white"
                      : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleCategory(idx)}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                        cat.enabled ? "bg-indigo-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          cat.enabled ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {cat.name}
                      </div>
                      {cat.description && (
                        <div className="text-xs text-gray-500">
                          {cat.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {cat.enabled && (
                    <div className="mt-2">
                      <Textarea
                        value={cat.instructions}
                        onChange={(e) =>
                          updateInstructions(idx, e.target.value)
                        }
                        rows={2}
                        placeholder="Instructions for this category..."
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom instructions */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Overall Custom Instructions (optional)
          </label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
            placeholder="Any additional instructions for the AI screening..."
          />
        </div>
      </div>
    </Modal>
  );
}
