"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { AIGlobalConfig } from "@/components/features/settings/ai-global-config";
import { DealPipelineEditor } from "@/components/features/settings/deal-pipeline-editor";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Firm { id: string; name: string; legalName: string | null }
interface AccountingEntity { id: string; name: string; accountingConnection?: { provider: string; syncStatus: string; lastSyncAt: string | null } | null }
interface User { id: string; name: string; email: string; role: string; isActive: boolean; initials: string | null; createdAt: string }

const roleColors: Record<string, string> = {
  ADMIN: "purple",
  GP_MANAGER: "indigo",
  GP_ANALYST: "blue",
  LP_VIEWER: "green",
  AUDITOR: "orange",
};

export default function SettingsPage() {
  const { firmId } = useFirm();
  const { data: firm } = useSWR<Firm & { createdAt: string }>(firmId ? `/api/firms/${firmId}` : null, fetcher);
  const { data: firms } = useSWR<Firm[]>("/api/firms", fetcher);
  const { data: accountingEntities } = useSWR<AccountingEntity[]>("/api/accounting/connections", fetcher);
  const { data: users } = useSWR<User[]>("/api/users", fetcher);
  const toast = useToast();

  const [tab, setTab] = useState<"firm" | "users" | "integrations" | "gp" | "ai" | "dealdesk" | "notifications">("firm");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", legalName: "" });
  const [saving, setSaving] = useState(false);

  // Invite user modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "GP_TEAM" });

  const tabs = [
    { key: "firm" as const, label: "Firm Profile" },
    { key: "users" as const, label: "Users & Access" },
    { key: "integrations" as const, label: "Integrations" },
    { key: "gp" as const, label: "GP Management" },
    { key: "ai" as const, label: "AI Configuration" },
    { key: "dealdesk" as const, label: "Deal Desk" },
    { key: "notifications" as const, label: "Notifications" },
  ];

  function startEditing() {
    if (firm) {
      setEditForm({ name: firm.name, legalName: firm.legalName || "" });
      setEditing(true);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/firms/${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, legalName: editForm.legalName || null }),
      });
      if (res.ok) {
        mutate(`/api/firms/${firmId}`);
        mutate("/api/firms");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        toast.success(`Invited ${inviteForm.email} — they can now sign up to join your firm.`);
        setShowInvite(false);
        setInviteForm({ email: "", name: "", role: "GP_TEAM" });
        mutate("/api/users");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to invite user");
      }
    } catch {
      toast.error("Failed to invite user");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Firm Profile */}
      {tab === "firm" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Firm Profile</h3>
            {!editing && (
              <Button variant="secondary" onClick={startEditing}>Edit</Button>
            )}
          </div>
          {firm ? (
            editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Firm Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label>
                    <Input
                      value={editForm.legalName}
                      onChange={(e) => setEditForm((f) => ({ ...f, legalName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500 text-xs">Created</span><div className="font-medium text-sm">{new Date(firm.createdAt).toLocaleDateString()}</div></div>
                  <div><span className="text-gray-500 text-xs">Firm ID</span><div className="font-medium font-mono text-xs">{firm.id}</div></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} loading={saving} disabled={!editForm.name}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500 text-xs">Firm Name</span><div className="font-medium">{firm.name}</div></div>
                  <div><span className="text-gray-500 text-xs">Legal Name</span><div className="font-medium">{firm.legalName || "\u2014"}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500 text-xs">Created</span><div className="font-medium">{new Date(firm.createdAt).toLocaleDateString()}</div></div>
                  <div><span className="text-gray-500 text-xs">Firm ID</span><div className="font-medium font-mono text-xs">{firm.id}</div></div>
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-gray-400">Loading...</div>
          )}
        </div>
      )}

      {/* Tab 2: Users & Access */}
      {tab === "users" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold">Users & Access</h3>
            <Button onClick={() => setShowInvite(true)}>+ Invite User</Button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {u.initials || u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge color={roleColors[u.role] || "gray"}>{u.role.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">
                    <button className="text-indigo-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Integrations */}
      {tab === "integrations" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Accounting Integrations</h3>
          <div className="space-y-3">
            {accountingEntities?.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-xs text-gray-500">
                    {e.accountingConnection ? `Last sync: ${e.accountingConnection.lastSyncAt ? new Date(e.accountingConnection.lastSyncAt).toLocaleString() : "Never"}` : "Not connected"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {e.accountingConnection && (
                    <>
                      <Badge color={e.accountingConnection.provider === "QBO" ? "green" : "blue"}>{e.accountingConnection.provider}</Badge>
                      <Badge color={e.accountingConnection.syncStatus === "CONNECTED" ? "green" : e.accountingConnection.syncStatus === "ERROR" ? "red" : "gray"}>
                        {e.accountingConnection.syncStatus}
                      </Badge>
                    </>
                  )}
                  {!e.accountingConnection && <Badge color="gray">Not Connected</Badge>}
                </div>
              </div>
            ))}
            {(!accountingEntities || accountingEntities.length === 0) && (
              <div className="text-sm text-gray-400">No entities found.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: GP Management */}
      {tab === "gp" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold">GP Management</h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage firms across the platform. Each firm has its own entities, deals, and team members.</p>
            </div>
            <Button onClick={() => alert("Create firm functionality coming soon.")}>+ Add Firm</Button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Firm Name", "Legal Name", "Firm ID", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {firms?.map((f) => (
                <tr key={f.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                        {f.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{f.legalName || "\u2014"}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-400 text-[10px]">{f.id}</td>
                  <td className="px-3 py-2.5">
                    <button className="text-indigo-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              ))}
              {(!firms || firms.length === 0) && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">No firms found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: AI Configuration — global provider/model/key only */}
      {tab === "ai" && <AIGlobalConfig firmId={firmId} />}

      {/* Tab 6: Deal Desk — pipeline configuration */}
      {tab === "dealdesk" && <DealPipelineEditor firmId={firmId} />}

      {/* Tab 7: Notifications (stub) */}
      {tab === "notifications" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Notifications</h3>
          <div className="text-sm text-gray-400">Notification preferences coming soon.</div>
        </div>
      )}

      {/* Invite User Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Enter your teammate&apos;s email and role. They&apos;ll be pre-registered in your firm — when they sign up via the login page, they&apos;ll automatically join your workspace.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name (optional)</label>
            <Input
              placeholder="Full name"
              value={inviteForm.name}
              onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={inviteForm.role}
              onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="GP_ADMIN">GP Admin</option>
              <option value="GP_TEAM">GP Team</option>
              <option value="LP_INVESTOR">LP Investor</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleInvite} loading={inviting} disabled={!inviteForm.email}>
              Send Invite
            </Button>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
