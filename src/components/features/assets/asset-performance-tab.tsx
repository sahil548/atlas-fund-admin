"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { pct, fmt, cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// ─────────────────────────────────────────────────────────
// Variance indicators
// ─────────────────────────────────────────────────────────

function VarianceArrow({ delta, format = "pct" }: { delta: number | null; format?: "pct" | "x" }) {
  if (delta == null) return <span className="text-gray-400 text-xs">—</span>;
  const positive = delta > 0;
  const neutral = Math.abs(delta) < 0.001;
  if (neutral) return <span className="text-gray-400 text-xs">≈ 0</span>;
  return (
    <span className={cn("text-xs font-semibold flex items-center gap-0.5", positive ? "text-emerald-700" : "text-red-600")}>
      {positive ? "▲" : "▼"}
      {format === "pct" ? pct(Math.abs(delta)) : `${Math.abs(delta).toFixed(2)}x`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Metric comparison card
// ─────────────────────────────────────────────────────────

function CompareCard({
  label,
  projected,
  actual,
  delta,
  format = "pct",
  projectedEmpty = false,
}: {
  label: string;
  projected: number | null;
  actual: number | null;
  delta: number | null;
  format?: "pct" | "x" | "currency" | "raw";
  projectedEmpty?: boolean;
}) {
  function fmt_val(v: number | null, f: string) {
    if (v == null) return "—";
    if (f === "pct") return pct(v);
    if (f === "x") return `${v.toFixed(2)}x`;
    if (f === "currency") return fmt(v);
    return v.toFixed(2);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</div>
      <div className="grid grid-cols-3 gap-3 items-center">
        {/* Projected */}
        <div className="text-center">
          <div className="text-[10px] text-gray-400 mb-1">Projected</div>
          {projectedEmpty ? (
            <div className="text-xs text-gray-300 italic">Not set</div>
          ) : (
            <div className="text-base font-bold text-gray-700">{fmt_val(projected, format)}</div>
          )}
        </div>

        {/* Variance arrow */}
        <div className="text-center flex flex-col items-center">
          <VarianceArrow delta={delta} format={format === "x" ? "x" : "pct"} />
          <div className="text-[9px] text-gray-300 mt-1">vs target</div>
        </div>

        {/* Actual */}
        <div className="text-center">
          <div className="text-[10px] text-gray-400 mb-1">Actual</div>
          <div className={cn(
            "text-base font-bold",
            actual == null ? "text-gray-300" :
            delta != null && delta > 0 ? "text-emerald-700" :
            delta != null && delta < -0.005 ? "text-red-600" :
            "text-gray-900"
          )}>
            {fmt_val(actual, format)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Inline edit field
// ─────────────────────────────────────────────────────────

function InlineEditNumber({
  label,
  value,
  onSave,
  format = "pct",
  placeholder,
}: {
  label: string;
  value: number | null;
  onSave: (v: number | null) => Promise<void>;
  format?: "pct" | "x";
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function displayVal() {
    if (value == null) return <span className="text-gray-300 italic text-xs">Not set</span>;
    if (format === "pct") return <span className="text-xs font-medium text-gray-700">{pct(value)}</span>;
    return <span className="text-xs font-medium text-gray-700">{value.toFixed(2)}x</span>;
  }

  async function handleSave() {
    const num = parseFloat(draft);
    if (isNaN(num)) {
      setEditing(false);
      return;
    }
    // Convert percentage input to decimal for IRR (e.g. "15" -> 0.15), keep as-is for multiples
    const parsed = format === "pct" ? num / 100 : num;
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">{label}:</span>
        <input
          className="border border-indigo-300 rounded px-1.5 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder ?? (format === "pct" ? "e.g. 15" : "e.g. 2.5")}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      {displayVal()}
      <button
        onClick={() => {
          setDraft(value != null ? (format === "pct" ? (value * 100).toFixed(1) : value.toFixed(2)) : "");
          setEditing(true);
        }}
        className="text-[10px] text-indigo-500 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export function AssetPerformanceTab({ assetId }: { assetId: string }) {
  const { data, isLoading, error } = useSWR(
    `/api/assets/${assetId}/attribution`,
    fetcher,
    { revalidateOnFocus: false }
  );

  async function updateProjection(field: "projectedIRR" | "projectedMultiple", value: number | null) {
    await fetch(`/api/assets/${assetId}/attribution`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    mutate(`/api/assets/${assetId}/attribution`);
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Loading performance data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-sm text-gray-500">Unable to load performance data.</div>
        <div className="text-xs text-gray-300 mt-1">Check that the asset has entity allocations and a cost basis.</div>
      </div>
    );
  }

  const { actual, projected, variance, assetInfo } = data;
  const hasProjections = projected.source !== "none";
  const projectionSourceLabel =
    projected.source === "deal_metadata"
      ? "AI-extracted from CIM"
      : projected.source === "asset"
      ? "GP estimate"
      : "None";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Performance Attribution</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Projected vs actual returns — {assetInfo.name}
            </p>
          </div>
          {hasProjections && (
            <Badge color="indigo">
              Projections: {projectionSourceLabel}
            </Badge>
          )}
        </div>

        {/* Empty state for no projections */}
        {!hasProjections && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-amber-800">No projections available</div>
            <div className="text-xs text-amber-600 mt-1">
              Enter deal-time estimates below, or they will be auto-populated from AI-extracted deal documents.
            </div>
          </div>
        )}

        {/* GP override controls */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
          <InlineEditNumber
            label="Projected IRR"
            value={projected.irr}
            onSave={(v) => updateProjection("projectedIRR", v)}
            format="pct"
            placeholder="e.g. 15 (for 15%)"
          />
          <InlineEditNumber
            label="Projected Multiple"
            value={projected.multiple}
            onSave={(v) => updateProjection("projectedMultiple", v)}
            format="x"
            placeholder="e.g. 2.5"
          />
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CompareCard
            label="IRR"
            projected={projected.irr}
            actual={actual.irr}
            delta={variance.irrDelta}
            format="pct"
            projectedEmpty={!hasProjections && projected.irr == null}
          />
          <CompareCard
            label="Multiple (MOIC)"
            projected={projected.multiple}
            actual={actual.moic}
            delta={variance.moicDelta}
            format="x"
            projectedEmpty={!hasProjections && projected.multiple == null}
          />
        </div>

        {/* Asset-class-specific projected metrics */}
        {hasProjections && Object.keys(projected.classSpecific ?? {}).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Deal-Time Targets</div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(projected.classSpecific).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-[10px] text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {typeof val === "number" ? val.toFixed(2) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actual performance detail */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Actual Performance Detail</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { l: "Cost Basis", v: fmt(assetInfo.costBasis) },
            { l: "Fair Value", v: fmt(assetInfo.fairValue) },
            {
              l: "Unrealized Gain",
              v: `${actual.unrealizedGain >= 0 ? "+" : ""}${fmt(actual.unrealizedGain)}`,
              c: actual.unrealizedGain >= 0 ? "text-emerald-700" : "text-red-600",
            },
            { l: "Total Distributions", v: fmt(actual.totalDistributions) },
            { l: "Total Income", v: fmt(actual.totalIncome) },
            {
              l: "Total Return",
              v: actual.totalReturn != null ? pct(actual.totalReturn) : "—",
              c: actual.totalReturn != null && actual.totalReturn > 0 ? "text-emerald-700" : "",
            },
          ].map(({ l, v, c }: any, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-400 uppercase">{l}</div>
              <div className={cn("text-sm font-bold mt-1", c ?? "text-gray-900")}>{v}</div>
            </div>
          ))}
        </div>

        {/* Capital called */}
        {actual.totalCalled > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Capital Called</span>
              <span className="text-xs font-semibold text-gray-700">{fmt(actual.totalCalled)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
