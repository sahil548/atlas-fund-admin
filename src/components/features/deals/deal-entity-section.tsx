"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { pct } from "@/lib/utils";
import Link from "next/link";

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

const formationStatusColors: Record<string, string> = {
  NOT_STARTED: "gray",
  FORMING: "yellow",
  FORMED: "green",
  REGISTERED: "blue",
};

const formationStatusLabels: Record<string, string> = {
  NOT_STARTED: "Not Started",
  FORMING: "Forming",
  FORMED: "Formed",
  REGISTERED: "Registered",
};

interface DealEntitySectionProps {
  dealId: string;
}

export function DealEntitySection({ dealId }: DealEntitySectionProps) {
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    entityType: "MAIN_FUND",
    vehicleStructure: "LLC",
  });
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [startFormation, setStartFormation] = useState(true);
  const [removingEntityId, setRemovingEntityId] = useState<string | null>(null);
  const toast = useToast();
  const { firmId } = useFirm();

  // Fetch linked entities via junction table
  const { data: dealEntities, isLoading } = useSWR(
    `/api/deals/${dealId}/entities`,
    fetcher,
  );

  // Fetch all entities for the picker
  const { data: allEntities } = useSWR(
    showAddEntity ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  const linkedEntities: any[] = dealEntities || [];
  const linkedEntityIds = new Set(linkedEntities.map((de: any) => de.entityId));

  // Available entities not yet linked (API returns { data: [...] })
  const entityList = Array.isArray(allEntities) ? allEntities : Array.isArray(allEntities?.data) ? allEntities.data : [];
  const availableEntities = entityList.filter(
    (e: any) => !linkedEntityIds.has(e.id)
  );

  async function handleAddEntity(entityId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to add entity";
        toast.error(msg);
        return;
      }
      toast.success("Entity linked to deal");
      mutate(`/api/deals/${dealId}/entities`);
      setShowAddEntity(false);
    } catch {
      toast.error("Failed to link entity");
    }
  }

  async function handleRemoveEntity(entityId: string) {
    setRemovingEntityId(entityId);
    try {
      const res = await fetch(`/api/deals/${dealId}/entities?entityId=${entityId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to remove entity";
        toast.error(msg);
        return;
      }
      toast.success("Entity removed from deal");
      mutate(`/api/deals/${dealId}/entities`);
    } catch {
      toast.error("Failed to remove entity");
    } finally {
      setRemovingEntityId(null);
    }
  }

  async function handleCreateAndLink() {
    if (!newEntityForm.name.trim()) return;
    setCreatingEntity(true);
    try {
      // Create entity
      const createRes = await fetch("/api/entities", {
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
      const created = await createRes.json();
      if (!createRes.ok) {
        const msg = typeof created.error === "string" ? created.error : "Failed to create entity";
        toast.error(msg);
        return;
      }

      // Link to deal via junction table
      const linkRes = await fetch(`/api/deals/${dealId}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: created.id }),
      });
      if (!linkRes.ok) {
        toast.error("Entity created but failed to link to deal");
        return;
      }

      mutate(`/api/deals/${dealId}/entities`);
      toast.success(`Entity "${newEntityForm.name.trim()}" created & linked`);
      setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" });
      setShowCreateEntity(false);
      setShowAddEntity(false);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Investment Vehicles</h4>
        <div className="text-xs text-gray-400 py-4 text-center">Loading entities...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Investment Vehicles
          {linkedEntities.length > 0 && (
            <span className="ml-1.5 text-gray-400 font-normal">({linkedEntities.length})</span>
          )}
        </h4>
        <button
          onClick={() => setShowAddEntity(!showAddEntity)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Entity
        </button>
      </div>

      {linkedEntities.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center">
          <div className="text-sm text-gray-500 mb-3">No investment vehicles linked to this deal.</div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAddEntity(true)}>Link Existing</Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowAddEntity(true); setShowCreateEntity(true); }}>Create New</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedEntities.map((de: any) => {
            const entity = de.entity;
            if (!entity) return null;
            return (
              <div key={de.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/entities/${entity.id}`} className="text-sm text-indigo-600 hover:underline font-semibold truncate">
                      {entity.name}
                    </Link>
                    <Badge color="purple">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                    {entity.formationStatus && (
                      <Badge color={formationStatusColors[entity.formationStatus] || "gray"}>
                        {formationStatusLabels[entity.formationStatus] || entity.formationStatus}
                      </Badge>
                    )}
                  </div>
                  {de.allocationPercent != null && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Allocation: {pct(de.allocationPercent / 100)}
                    </div>
                  )}
                  {de.role && (
                    <div className="text-[10px] text-gray-500">
                      Role: {de.role}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveEntity(entity.id)}
                  disabled={removingEntityId === entity.id}
                  className="text-gray-400 hover:text-red-500 p-1 rounded flex-shrink-0"
                  title="Remove entity from deal"
                >
                  {removingEntityId === entity.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Entity Picker */}
      {showAddEntity && (
        <div className="mt-3 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-700">
            Link an entity to this deal
          </div>
          <div className="max-h-40 overflow-y-auto">
            {availableEntities.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                {allEntities ? "No more entities available" : "Loading entities..."}
              </div>
            ) : (
              availableEntities.map((entity: any) => (
                <button
                  key={entity.id}
                  onClick={() => handleAddEntity(entity.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium">{entity.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                    {entity.formationStatus && (
                      <Badge color={formationStatusColors[entity.formationStatus] || "gray"}>
                        {formationStatusLabels[entity.formationStatus] || entity.formationStatus}
                      </Badge>
                    )}
                  </div>
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
              onClick={() => { setShowAddEntity(false); setShowCreateEntity(false); }}
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
                    setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" });
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
  );
}
