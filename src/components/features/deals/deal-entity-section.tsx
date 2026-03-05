"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

interface DealEntitySectionProps {
  dealId: string;
  targetEntity: any;
}

export function DealEntitySection({ dealId, targetEntity }: DealEntitySectionProps) {
  const [showLinkEntity, setShowLinkEntity] = useState(false);
  const [linkingEntity, setLinkingEntity] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    entityType: "MAIN_FUND",
    vehicleStructure: "LLC",
  });
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [startFormation, setStartFormation] = useState(true);
  const toast = useToast();
  const { firmId } = useFirm();

  const { data: entities } = useSWR(
    showLinkEntity ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  async function handleLinkEntity(entityId: string) {
    setLinkingEntity(true);
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      mutate(`/api/deals/${dealId}`);
      setShowLinkEntity(false);
    } catch {
      toast.error("Failed to link entity");
    } finally {
      setLinkingEntity(false);
    }
  }

  async function handleUnlinkEntity() {
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: null }),
      });
      mutate(`/api/deals/${dealId}`);
    } catch {
      toast.error("Failed to unlink entity");
    }
  }

  async function handleCreateAndLink() {
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
      await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: created.id }),
      });
      mutate(`/api/deals/${dealId}`);
      toast.success(`Entity "${newEntityForm.name.trim()}" created & linked`);
      setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" });
      setShowCreateEntity(false);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Investment Vehicle</h4>
      {targetEntity ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/entities/${targetEntity.id}`} className="text-sm text-indigo-600 hover:underline font-semibold">
                {targetEntity.name}
              </Link>
              <Badge color="purple">{entityTypeLabels[targetEntity.entityType] || targetEntity.entityType}</Badge>
              {targetEntity.vehicleStructure && (
                <Badge color="blue">{vehicleStructureLabels[targetEntity.vehicleStructure] || targetEntity.vehicleStructure}</Badge>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(true)}>Change</Button>
          </div>
          {showLinkEntity && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-500 mb-2">Select a different entity:</div>
              {entities ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(entities as any[]).map((entity: any) => (
                    <button key={entity.id} onClick={() => handleLinkEntity(entity.id)} disabled={linkingEntity} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between">
                      <span className="font-medium">{entity.name}</span>
                      <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Loading entities...</div>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={handleUnlinkEntity}>Unlink Entity</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center">
          <div className="text-sm text-gray-500 mb-3">No investment vehicle linked to this deal.</div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(true)}>Link Existing</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateEntity(true)}>Create New</Button>
          </div>
          {showCreateEntity && (
            <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white text-left">
              <div className="text-xs font-semibold text-gray-700 mb-3">Create New Entity</div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Name</label>
                  <input type="text" value={newEntityForm.name} onChange={(e) => setNewEntityForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Atlas Fund I LLC" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Entity Type</label>
                    <select value={newEntityForm.entityType} onChange={(e) => setNewEntityForm((f) => ({ ...f, entityType: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                      {Object.entries(entityTypeLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Vehicle Structure</label>
                    <select value={newEntityForm.vehicleStructure} onChange={(e) => setNewEntityForm((f) => ({ ...f, vehicleStructure: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                      {Object.entries(vehicleStructureLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={startFormation} onChange={(e) => setStartFormation(e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-xs text-gray-600">Start formation workflow</span>
                </label>
                {startFormation && (<p className="text-[10px] text-gray-400 mt-1">A formation workflow will be created to track legal filings and registrations.</p>)}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={handleCreateAndLink} disabled={creatingEntity || !newEntityForm.name.trim()}>{creatingEntity ? "Creating..." : "Create & Link"}</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setShowCreateEntity(false); setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" }); }}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
          {showLinkEntity && (
            <div className="mt-4 border-t border-gray-100 pt-3 text-left">
              <div className="text-xs text-gray-500 mb-2">Select an entity:</div>
              {entities ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(entities as any[]).length === 0 ? (
                    <div className="text-xs text-gray-400 py-2">No entities found. Create one first.</div>
                  ) : (
                    (entities as any[]).map((entity: any) => (
                      <button key={entity.id} onClick={() => handleLinkEntity(entity.id)} disabled={linkingEntity} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between">
                        <span className="font-medium">{entity.name}</span>
                        <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Loading entities...</div>
              )}
              <div className="mt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
