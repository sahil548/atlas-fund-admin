"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

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

interface AllocationRow {
  entityId: string;
  allocationPercent: number;
}

interface CloseDealModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    costBasis: number;
    fairValue: number;
    entryDate: string;
    allocations: AllocationRow[];
  }) => void;
  dealId: string;
  dealName: string;
  assetClass: string;
  firmId: string;
  initialEntityId?: string;
  loading?: boolean;
  checklistTotal?: number;
  checklistComplete?: number;
}

export function CloseDealModal({
  open,
  onClose,
  onConfirm,
  dealId,
  dealName,
  assetClass,
  firmId,
  initialEntityId,
  loading = false,
  checklistTotal = 0,
  checklistComplete = 0,
}: CloseDealModalProps) {
  const toast = useToast();

  // Form state
  const [costBasis, setCostBasis] = useState("");
  const [fairValue, setFairValue] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [inputMode, setInputMode] = useState<"percent" | "dollar">("percent");
  const [dollarAmounts, setDollarAmounts] = useState<Record<string, string>>({});

  // Entity picker state
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    entityType: "SPV",
    vehicleStructure: "LLC",
  });
  const [startFormation, setStartFormation] = useState(true);
  const [creatingEntity, setCreatingEntity] = useState(false);

  // Fetch entities
  const { data: entities, mutate: mutateEntities } = useSWR<any[]>(
    open ? `/api/entities?firmId=${firmId}` : null,
    (url: string) => fetcher(url).then((r: any) => r.data ?? r),
  );

  // Fetch DealEntity junction records for pre-population
  const { data: dealEntities } = useSWR<any[]>(
    open && dealId ? `/api/deals/${dealId}/entities` : null,
    fetcher,
  );

  // Track whether we've pre-populated from junction records
  const [prePopulated, setPrePopulated] = useState(false);

  // Reset state on modal close
  useEffect(() => {
    if (!open) {
      setCostBasis("");
      setFairValue("");
      setEntryDate(new Date().toISOString().split("T")[0]);
      setAllocations([]);
      setInputMode("percent");
      setDollarAmounts({});
      setShowEntityPicker(false);
      setShowCreateEntity(false);
      setNewEntityForm({ name: "", entityType: "SPV", vehicleStructure: "LLC" });
      setPrePopulated(false);
    }
  }, [open]);

  // Pre-populate from DealEntity junction records (preferred) or fallback to initialEntityId
  useEffect(() => {
    if (!open || prePopulated || allocations.length > 0) return;

    // Try junction table first
    if (dealEntities && dealEntities.length > 0 && entities) {
      const junctionAllocations: AllocationRow[] = dealEntities
        .filter((de: any) => entities.some((e: any) => e.id === de.entityId))
        .map((de: any) => ({
          entityId: de.entityId,
          allocationPercent: de.allocationPercent ?? (100 / dealEntities.length),
        }));

      if (junctionAllocations.length > 0) {
        // Normalize to 100% if no allocations were set
        const total = junctionAllocations.reduce((s, a) => s + a.allocationPercent, 0);
        if (Math.abs(total - 100) > 0.01 && junctionAllocations.every(a => a.allocationPercent === junctionAllocations[0].allocationPercent)) {
          // All equal (default) - split evenly
          const share = parseFloat((100 / junctionAllocations.length).toFixed(2));
          junctionAllocations.forEach((a, i) => {
            a.allocationPercent = i === junctionAllocations.length - 1
              ? Math.round((100 - share * (junctionAllocations.length - 1)) * 100) / 100
              : share;
          });
        }
        setAllocations(junctionAllocations);
        setPrePopulated(true);
        return;
      }
    }

    // Fallback to legacy initialEntityId
    if (initialEntityId && entities) {
      const exists = entities.some((e: any) => e.id === initialEntityId);
      if (exists) {
        setAllocations([{ entityId: initialEntityId, allocationPercent: 100 }]);
        setPrePopulated(true);
      }
    }
  }, [open, initialEntityId, entities, dealEntities, allocations.length, prePopulated]);

  // Parsed cost basis for calculations
  const parsedCostBasis = parseFloat(costBasis) || 0;

  // Allocation management
  function addEntity(entityId: string) {
    if (allocations.some((a) => a.entityId === entityId)) return;
    const newAlloc: AllocationRow = {
      entityId,
      allocationPercent: allocations.length === 0 ? 100 : 0,
    };
    setAllocations((prev) => [...prev, newAlloc]);
    setShowEntityPicker(false);
  }

  function removeEntity(entityId: string) {
    setAllocations((prev) => prev.filter((a) => a.entityId !== entityId));
    setDollarAmounts((prev) => {
      const next = { ...prev };
      delete next[entityId];
      return next;
    });
  }

  function updatePercent(entityId: string, percent: number) {
    setAllocations((prev) =>
      prev.map((a) => (a.entityId === entityId ? { ...a, allocationPercent: percent } : a)),
    );
  }

  function updateDollarAmount(entityId: string, dollarStr: string) {
    setDollarAmounts((prev) => ({ ...prev, [entityId]: dollarStr }));
    if (parsedCostBasis > 0) {
      const dollars = parseFloat(dollarStr.replace(/[^0-9.]/g, "")) || 0;
      const pct = (dollars / parsedCostBasis) * 100;
      updatePercent(entityId, Math.round(pct * 100) / 100);
    }
  }

  function splitEvenly() {
    const count = allocations.length;
    if (count === 0) return;
    const share = parseFloat((100 / count).toFixed(2));
    const newAllocations = allocations.map((a, i) => ({
      ...a,
      allocationPercent: i === count - 1 ? Math.round((100 - share * (count - 1)) * 100) / 100 : share,
    }));
    setAllocations(newAllocations);
    if (parsedCostBasis > 0) {
      const newDollars: Record<string, string> = {};
      newAllocations.forEach((a) => {
        newDollars[a.entityId] = String(Math.round(parsedCostBasis * a.allocationPercent / 100));
      });
      setDollarAmounts(newDollars);
    }
  }

  // Inline entity creation
  async function handleCreateEntity() {
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
      if (!res.ok) {
        toast.error(typeof created.error === "string" ? created.error : "Failed to create entity");
        return;
      }
      await mutateEntities();
      addEntity(created.id);
      toast.success(`Entity "${newEntityForm.name.trim()}" created`);
      setNewEntityForm({ name: "", entityType: "SPV", vehicleStructure: "LLC" });
      setShowCreateEntity(false);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  }

  // Submit
  function handleSubmit() {
    const cb = parsedCostBasis;
    if (cb <= 0) return;
    const fv = fairValue ? parseFloat(fairValue) : cb;
    onConfirm({
      costBasis: cb,
      fairValue: isNaN(fv) ? cb : fv,
      entryDate,
      allocations,
    });
  }

  // Validation
  const totalPercent = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  const isValid =
    parsedCostBasis > 0 &&
    allocations.length > 0 &&
    Math.abs(totalPercent - 100) < 0.01 &&
    allocations.every((a) => a.allocationPercent > 0);

  // Entity name lookup
  function entityName(entityId: string): string {
    const entity = (entities || []).find((e: any) => e.id === entityId);
    return entity?.name || "Unknown";
  }

  function entityType(entityId: string): string {
    const entity = (entities || []).find((e: any) => e.id === entityId);
    return entityTypeLabels[entity?.entityType] || entity?.entityType || "";
  }

  // Available entities (not yet in allocations)
  const availableEntities = (entities || []).filter(
    (e: any) => !allocations.some((a) => a.entityId === e.id),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close Deal & Create Asset"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit} disabled={!isValid}>
            Close Deal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Deal summary */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Creating asset from deal</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{dealName}</span>
            <Badge color="blue">{assetClass}</Badge>
          </div>
        </div>

        {/* Checklist status */}
        {checklistTotal > 0 && (
          <div className={`rounded-lg p-3 border ${
            checklistComplete >= checklistTotal
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${
                checklistComplete >= checklistTotal ? "text-emerald-700" : "text-amber-700"
              }`}>
                Closing Checklist: {checklistComplete}/{checklistTotal} complete
              </span>
              {checklistComplete >= checklistTotal ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            {checklistComplete < checklistTotal && (
              <p className="text-[10px] text-amber-600 mt-1">
                {checklistTotal - checklistComplete} item{checklistTotal - checklistComplete !== 1 ? "s" : ""} remain incomplete. The deal will still close.
              </p>
            )}
          </div>
        )}

        {/* Cost basis */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Cost Basis <span className="text-red-500">*</span>
          </label>
          <CurrencyInput
            value={costBasis}
            onChange={(v) => setCostBasis(v)}
            placeholder="e.g. 10,000,000"
          />
          <p className="text-[10px] text-gray-400 mt-1">Total investment amount for this asset</p>
        </div>

        {/* Fair value */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Fair Value
          </label>
          <CurrencyInput
            value={fairValue}
            onChange={(v) => setFairValue(v)}
            placeholder="Defaults to cost basis"
          />
          <p className="text-[10px] text-gray-400 mt-1">Current fair market value — leave blank to use cost basis</p>
        </div>

        {/* Entry date */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Entry Date
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Entity Allocations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              Entity Allocations <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {allocations.length > 1 && (
                <button
                  onClick={splitEvenly}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Split Evenly
                </button>
              )}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setInputMode("percent")}
                  className={`px-2 py-0.5 text-[10px] font-medium ${
                    inputMode === "percent"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => {
                    if (parsedCostBasis > 0) {
                      const newDollars: Record<string, string> = {};
                      allocations.forEach((a) => {
                        newDollars[a.entityId] = String(Math.round(parsedCostBasis * a.allocationPercent / 100));
                      });
                      setDollarAmounts(newDollars);
                    }
                    setInputMode("dollar");
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium ${
                    inputMode === "dollar"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  $
                </button>
              </div>
            </div>
          </div>

          {allocations.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-2">No investment vehicles assigned</p>
              <Button variant="secondary" size="sm" onClick={() => setShowEntityPicker(true)}>
                + Add Entity
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {allocations.map((alloc) => {
                const entityCostBasis = parsedCostBasis * (alloc.allocationPercent / 100);
                return (
                  <div key={alloc.entityId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    {/* Entity info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{entityName(alloc.entityId)}</div>
                      <div className="text-[10px] text-gray-500">{entityType(alloc.entityId)}</div>
                    </div>

                    {/* Input (% or $) */}
                    {inputMode === "percent" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={alloc.allocationPercent || ""}
                          onChange={(e) => updatePercent(alloc.entityId, parseFloat(e.target.value) || 0)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="0"
                          min={0}
                          max={100}
                          step={0.01}
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">$</span>
                        <input
                          type="text"
                          value={dollarAmounts[alloc.entityId] ?? ""}
                          onChange={(e) => updateDollarAmount(alloc.entityId, e.target.value)}
                          className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    )}

                    {/* Auto-calculated read-only value */}
                    <div className="text-xs text-gray-400 w-24 text-right">
                      {inputMode === "percent"
                        ? parsedCostBasis > 0 ? `$${entityCostBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"
                        : `${alloc.allocationPercent.toFixed(1)}%`
                      }
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeEntity(alloc.entityId)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <button
                  onClick={() => setShowEntityPicker(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add Entity
                </button>
                <div className={`text-xs font-semibold ${
                  Math.abs(totalPercent - 100) < 0.01 ? "text-emerald-600" : "text-red-600"
                }`}>
                  Total: {totalPercent.toFixed(1)}%
                </div>
              </div>

              {/* Validation warning */}
              {allocations.length > 0 && Math.abs(totalPercent - 100) >= 0.01 && (
                <p className="text-[10px] text-red-500 px-1">
                  Allocations must total 100% (currently {totalPercent.toFixed(1)}%)
                </p>
              )}
            </div>
          )}

          {/* Entity picker dropdown */}
          {showEntityPicker && (
            <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="max-h-40 overflow-y-auto">
                {availableEntities.length === 0 && !showCreateEntity ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No more entities available</div>
                ) : (
                  availableEntities.map((entity: any) => (
                    <button
                      key={entity.id}
                      onClick={() => addEntity(entity.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium">{entity.name}</span>
                      <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
                <button
                  onClick={() => setShowCreateEntity(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Create New Entity
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => { setShowEntityPicker(false); setShowCreateEntity(false); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              {/* Inline entity creation form */}
              {showCreateEntity && (
                <div className="border-t border-gray-100 px-3 py-3 space-y-3">
                  <div className="text-xs font-semibold text-gray-700">Create New Entity</div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Name</label>
                    <input
                      type="text"
                      value={newEntityForm.name}
                      onChange={(e) => setNewEntityForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Atlas Fund I LLC"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Entity Type</label>
                      <select
                        value={newEntityForm.entityType}
                        onChange={(e) => setNewEntityForm((f) => ({ ...f, entityType: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        {Object.entries(entityTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Vehicle Structure</label>
                      <select
                        value={newEntityForm.vehicleStructure}
                        onChange={(e) => setNewEntityForm((f) => ({ ...f, vehicleStructure: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        {Object.entries(vehicleStructureLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={startFormation}
                      onChange={(e) => setStartFormation(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-600">Start formation workflow</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateEntity}
                      disabled={creatingEntity || !newEntityForm.name.trim()}
                    >
                      {creatingEntity ? "Creating..." : "Create & Add"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowCreateEntity(false);
                        setNewEntityForm({ name: "", entityType: "SPV", vehicleStructure: "LLC" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs text-indigo-700">
            Closing this deal will create an asset in your portfolio with a link back to all deal intelligence — DD reports, IC memo, and task history will remain accessible from the asset page.
          </p>
        </div>
      </div>
    </Modal>
  );
}
