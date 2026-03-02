"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const { data: firm } = useSWR<Firm & { createdAt: string }>("/api/firms/firm-1", fetcher);
  const { data: firms } = useSWR<Firm[]>("/api/firms", fetcher);
  const { data: accountingEntities } = useSWR<AccountingEntity[]>("/api/accounting/connections", fetcher);
  const { data: users } = useSWR<User[]>("/api/users", fetcher);

  const [tab, setTab] = useState<"firm" | "users" | "integrations" | "gp" | "ai" | "notifications">("firm");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", legalName: "" });
  const [saving, setSaving] = useState(false);

  const tabs = [
    { key: "firm" as const, label: "Firm Profile" },
    { key: "users" as const, label: "Users & Access" },
    { key: "integrations" as const, label: "Integrations" },
    { key: "gp" as const, label: "GP Management" },
    { key: "ai" as const, label: "AI Configuration" },
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
      const res = await fetch("/api/firms/firm-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, legalName: editForm.legalName || null }),
      });
      if (res.ok) {
        mutate("/api/firms/firm-1");
        mutate("/api/firms");
        setEditing(false);
      }
    } finally {
      setSaving(false);
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
            <Button onClick={() => alert("Invite user functionality coming soon.")}>+ Invite User</Button>
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

      {/* Tab: AI Configuration */}
      {tab === "ai" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-1">AI Screening Configuration</h3>
            <p className="text-xs text-gray-500 mb-4">Configure the AI model and system prompt used for automated deal screening. Changes apply to all new screenings.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model Provider</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-indigo-50 border-2 border-indigo-300 rounded-lg p-3 cursor-pointer">
                    <div className="text-xs font-semibold text-indigo-700">Anthropic Claude</div>
                    <div className="text-[10px] text-indigo-500 mt-0.5">claude-sonnet-4-20250514 &bull; Recommended</div>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer opacity-50">
                    <div className="text-xs font-semibold text-gray-500">OpenAI GPT-4</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Coming soon</div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System Prompt</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono h-32 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  defaultValue={`You are an expert investment analyst for a family office GP. Analyze the provided deal documents and produce a structured screening report.\n\nEvaluate:\n1. Business quality and competitive positioning\n2. Financial health and growth trajectory\n3. Management team strength\n4. Deal structure and terms\n5. Key risks and mitigants\n\nProvide a score (0-100) and recommendation: PROCEED_TO_DD, WATCHLIST, or PASS.`}
                />
                <div className="text-[10px] text-gray-400 mt-1">This prompt is prepended to every AI screening request. Use it to customize analysis criteria for your investment strategy.</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Screening Parameters</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">Auto-Screen Threshold</div>
                    <div className="text-sm font-semibold mt-0.5">Score &ge; 70</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">Max Documents</div>
                    <div className="text-sm font-semibold mt-0.5">10 per deal</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">Processing Mode</div>
                    <div className="text-sm font-semibold mt-0.5">Async Queue</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Save Configuration</button>
                <button className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Reset to Default</button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">API Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <div>
                <div className="text-xs font-medium">Not Connected</div>
                <div className="text-[10px] text-gray-500">Configure your Anthropic API key in environment variables to enable AI screening.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Notifications (stub) */}
      {tab === "notifications" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Notifications</h3>
          <div className="text-sm text-gray-400">Notification preferences coming soon.</div>
        </div>
      )}
    </div>
  );
}
