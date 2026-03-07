"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface Entity {
  id: string;
  name: string;
  entityType: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  email: string;
  initials: string | null;
  entityAccess: string[];
}

interface EntityAccessData {
  userId: string;
  name: string;
  email: string;
  role: string;
  entityAccess: string[];
  entities: Entity[];
}

interface Props {
  /** If provided, scoped to managing access for a specific entity only */
  entityId?: string;
}

export function ServiceProviderManager({ entityId }: Props) {
  const { firmId } = useFirm();
  const toast = useToast();

  // Fetch all users to filter SERVICE_PROVIDER ones
  const { data: allUsers, isLoading: usersLoading } = useSWR<ServiceProvider[]>(
    "/api/users",
    fetcher,
  );

  // Fetch all entities for the entity-access dropdown
  const { data: allEntities, isLoading: entitiesLoading } = useSWR<Entity[]>(
    firmId ? `/api/entities?firmId=${firmId}` : null,
    (url: string) => fetch(url).then((r) => r.json()).then((d) => Array.isArray(d) ? d : d.entities ?? []),
  );

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [entityAccessData, setEntityAccessData] = useState<
    Record<string, EntityAccessData>
  >({});
  const [loadingAccessFor, setLoadingAccessFor] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Record<string, string[]>>({});

  const serviceProviders = allUsers?.filter((u) => (u as any).role === "SERVICE_PROVIDER") ?? [];

  async function loadEntityAccess(userId: string) {
    if (entityAccessData[userId]) return;
    setLoadingAccessFor(userId);
    try {
      const res = await fetch(`/api/users/${userId}/entity-access`);
      if (res.ok) {
        const d = await res.json();
        setEntityAccessData((prev) => ({ ...prev, [userId]: d }));
        setSelectedEntityIds((prev) => ({ ...prev, [userId]: d.entityAccess }));
      }
    } catch {
      toast.error("Failed to load entity access");
    } finally {
      setLoadingAccessFor(null);
    }
  }

  async function toggleExpand(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      await loadEntityAccess(userId);
    }
  }

  async function saveEntityAccess(userId: string) {
    const entityIds = selectedEntityIds[userId] ?? [];
    setSavingFor(userId);
    try {
      const res = await fetch(`/api/users/${userId}/entity-access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityIds }),
      });
      if (res.ok) {
        toast.success("Entity access updated");
        // Refresh the cached access data
        setEntityAccessData((prev) => {
          const existing = prev[userId];
          if (!existing) return prev;
          const updatedEntities = (allEntities ?? []).filter((e) => entityIds.includes(e.id));
          return {
            ...prev,
            [userId]: { ...existing, entityAccess: entityIds, entities: updatedEntities },
          };
        });
        mutate("/api/users");
      } else {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to update entity access";
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to update entity access");
    } finally {
      setSavingFor(null);
    }
  }

  function removeEntity(userId: string, eid: string) {
    setSelectedEntityIds((prev) => ({
      ...prev,
      [userId]: (prev[userId] ?? []).filter((id) => id !== eid),
    }));
  }

  function addEntity(userId: string, eid: string) {
    if (!eid) return;
    setSelectedEntityIds((prev) => {
      const current = prev[userId] ?? [];
      if (current.includes(eid)) return prev;
      return { ...prev, [userId]: [...current, eid] };
    });
  }

  if (usersLoading) {
    return <div className="text-sm text-gray-400">Loading service providers...</div>;
  }

  if (serviceProviders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-sm text-gray-500">No service providers found.</div>
        <div className="text-xs text-gray-400 mt-1">
          Invite users with the Service Provider role to give them scoped entity access.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        Service providers have read-only access. Assign them to specific entities so they can only
        see data for those entities.
      </div>

      {serviceProviders.map((provider) => {
        const isExpanded = expandedUserId === provider.id;
        const access = entityAccessData[provider.id];
        const currentEntityIds = selectedEntityIds[provider.id] ?? access?.entityAccess ?? [];
        const hasChanges =
          access &&
          JSON.stringify([...currentEntityIds].sort()) !==
            JSON.stringify([...access.entityAccess].sort());

        // If entityId prop provided, show only if this provider has access or can be added
        if (entityId) {
          // Show all providers but highlight those with this entity
        }

        return (
          <div key={provider.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(provider.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                  {provider.initials || provider.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{provider.name}</div>
                  <div className="text-xs text-gray-400">{provider.email}</div>
                </div>
                <Badge color="orange">Service Provider</Badge>
                <span className="text-xs text-gray-400">
                  {access?.entityAccess.length ?? provider.entityAccess?.length ?? 0} entities
                </span>
              </div>
              <div className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {loadingAccessFor === provider.id ? (
                  <div className="text-sm text-gray-400">Loading...</div>
                ) : (
                  <>
                    {/* Currently assigned entities */}
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Assigned Entities
                      </div>
                      {currentEntityIds.length === 0 ? (
                        <div className="text-xs text-gray-400">
                          No entities assigned. Add entities below.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentEntityIds.map((eid) => {
                            const entity =
                              (allEntities ?? []).find((e) => e.id === eid) ??
                              access?.entities.find((e) => e.id === eid);
                            return (
                              <div
                                key={eid}
                                className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 text-xs"
                              >
                                <span className="text-indigo-700 font-medium">
                                  {entity?.name ?? eid}
                                </span>
                                <button
                                  className="text-red-400 hover:text-red-600 ml-1"
                                  onClick={() => removeEntity(provider.id, eid)}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add entity */}
                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          addEntity(provider.id, e.target.value);
                          e.target.value = "";
                        }}
                        disabled={entitiesLoading}
                      >
                        <option value="" disabled>
                          + Add entity access...
                        </option>
                        {(allEntities ?? [])
                          .filter((e) => !currentEntityIds.includes(e.id))
                          .filter((e) => !entityId || e.id === entityId)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => saveEntityAccess(provider.id)}
                        loading={savingFor === provider.id}
                        disabled={!hasChanges}
                      >
                        Save
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
