"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PERMISSION_AREAS, type PermissionArea, type PermissionLevel } from "@/lib/permissions-types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface PermissionUser {
  id: string;
  name: string;
  email: string;
  initials: string | null;
  permissions: Record<PermissionArea, PermissionLevel>;
}

interface PermissionsData {
  users: PermissionUser[];
  areas: string[];
}

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  full: "Full",
  read_only: "Read Only",
  none: "None",
};

const LEVEL_COLORS: Record<PermissionLevel, string> = {
  full: "green",
  read_only: "blue",
  none: "gray",
};

const AREA_LABELS: Record<string, string> = {
  deals: "Deals",
  entities: "Entities",
  capital_activity: "Capital",
  investors: "Investors",
  documents: "Documents",
  settings: "Settings",
  reports: "Reports",
};

export function PermissionsTab() {
  const toast = useToast();
  const { data, isLoading } = useSWR<PermissionsData>(
    "/api/settings/permissions",
    fetcher,
  );

  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [localPermissions, setLocalPermissions] = useState<
    Record<string, Record<PermissionArea, PermissionLevel>>
  >({});

  function getPermission(userId: string, area: PermissionArea): PermissionLevel {
    // Use local override if present, otherwise use server data
    return (
      localPermissions[userId]?.[area] ??
      data?.users.find((u) => u.id === userId)?.permissions[area] ??
      "read_only"
    );
  }

  function setPermission(userId: string, area: PermissionArea, level: PermissionLevel) {
    setLocalPermissions((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        [area]: level,
      },
    }));
  }

  async function savePermissions(user: PermissionUser) {
    const permissions = PERMISSION_AREAS.reduce<Record<PermissionArea, PermissionLevel>>(
      (acc, area) => {
        acc[area] = getPermission(user.id, area);
        return acc;
      },
      {} as Record<PermissionArea, PermissionLevel>,
    );

    setSavingUserId(user.id);
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, permissions }),
      });

      if (res.ok) {
        toast.success(`Permissions saved for ${user.name}`);
        // Clear local overrides for this user — server is now source of truth
        setLocalPermissions((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
        mutate("/api/settings/permissions");
      } else {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to save permissions";
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSavingUserId(null);
    }
  }

  if (isLoading || !data) {
    return <div className="text-sm text-gray-400">Loading permissions...</div>;
  }

  if (data.users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No GP Team members found. Invite team members with the GP Team role to configure their permissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        Configure what each GP Team member can access. GP Admins always have full access (not shown here).
        Service Providers are read-only on their assigned entities.
      </div>

      {data.users.map((user) => {
        const hasLocalChanges = !!localPermissions[user.id];
        return (
          <div key={user.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* User header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {user.initials || user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => savePermissions(user)}
                loading={savingUserId === user.id}
                disabled={!hasLocalChanges}
              >
                {hasLocalChanges ? "Save Changes" : "Saved"}
              </Button>
            </div>

            {/* Permission matrix */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-3">
                {PERMISSION_AREAS.map((area) => {
                  const current = getPermission(user.id, area);
                  const isModified = localPermissions[user.id]?.[area] !== undefined;
                  return (
                    <div key={area} className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        {AREA_LABELS[area] ?? area}
                      </div>
                      <select
                        className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                          isModified
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-300 bg-white"
                        }`}
                        value={current}
                        onChange={(e) =>
                          setPermission(user.id, area, e.target.value as PermissionLevel)
                        }
                      >
                        <option value="full">Full</option>
                        <option value="read_only">Read Only</option>
                        <option value="none">None</option>
                      </select>
                      <Badge color={LEVEL_COLORS[current] as "green" | "blue" | "gray"}>
                        {LEVEL_LABELS[current]}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
