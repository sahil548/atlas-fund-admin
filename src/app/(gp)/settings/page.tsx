"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { PromptTemplatesEditor } from "@/components/features/settings/prompt-templates-editor";

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

interface AIConfigResponse {
  provider: string;
  model: string;
  hasApiKey: boolean;
  baseUrl: string | null;
  systemPrompt: string | null;
  thresholdScore: number;
  maxDocuments: number;
  processingMode: string;
}

const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
const ANTHROPIC_MODELS = ["claude-sonnet-4-20250514", "claude-opus-4-20250115"];

const DEFAULT_SYSTEM_PROMPT = `You are an expert investment analyst for a family office GP. Analyze the provided deal documents and produce a structured screening report.\n\nEvaluate:\n1. Business quality and competitive positioning\n2. Financial health and growth trajectory\n3. Management team strength\n4. Deal structure and terms\n5. Key risks and mitigants\n\nProvide a score (0-100) and recommendation: PROCEED_TO_DD, WATCHLIST, or PASS.`;

export default function SettingsPage() {
  const { data: firm } = useSWR<Firm & { createdAt: string }>("/api/firms/firm-1", fetcher);
  const { data: firms } = useSWR<Firm[]>("/api/firms", fetcher);
  const { data: accountingEntities } = useSWR<AccountingEntity[]>("/api/accounting/connections", fetcher);
  const { data: users } = useSWR<User[]>("/api/users", fetcher);
  const toast = useToast();
  const { firmId } = useFirm();

  const [tab, setTab] = useState<"firm" | "users" | "integrations" | "gp" | "ai" | "notifications">("firm");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", legalName: "" });
  const [saving, setSaving] = useState(false);

  // AI Configuration state
  const { data: aiConfig } = useSWR<AIConfigResponse>(
    tab === "ai" ? `/api/settings/ai-config?firmId=${firmId}` : null,
    fetcher
  );
  const [aiForm, setAiForm] = useState({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    thresholdScore: 70,
    maxDocuments: 10,
    processingMode: "async",
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [connectionError, setConnectionError] = useState("");

  // Hydrate AI form from config
  useEffect(() => {
    if (aiConfig) {
      setAiForm((prev) => ({
        ...prev,
        provider: aiConfig.provider || "openai",
        model: aiConfig.model || "gpt-4o",
        systemPrompt: aiConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        thresholdScore: aiConfig.thresholdScore ?? 70,
        maxDocuments: aiConfig.maxDocuments ?? 10,
        processingMode: aiConfig.processingMode || "async",
      }));
      setConnectionStatus(aiConfig.hasApiKey ? "connected" : "unknown");
    }
  }, [aiConfig]);

  async function handleTestConnection() {
    if (!aiForm.apiKey && !aiConfig?.hasApiKey) {
      setConnectionStatus("error");
      setConnectionError("Please enter an API key first");
      return;
    }
    setTestingConnection(true);
    try {
      const res = await fetch("/api/settings/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiForm.provider,
          apiKey: aiForm.apiKey || "__existing__",
        }),
      });
      const result = await res.json();
      setConnectionStatus(result.connected ? "connected" : "error");
      setConnectionError(result.error || "");
    } catch {
      setConnectionStatus("error");
      setConnectionError("Network error");
    } finally {
      setTestingConnection(false);
    }
  }

  async function handleSaveAIConfig() {
    setAiSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider: aiForm.provider,
        model: aiForm.model,
        systemPrompt: aiForm.systemPrompt,
        thresholdScore: Number(aiForm.thresholdScore) || 70,
        maxDocuments: Math.max(1, Number(aiForm.maxDocuments) || 10),
        processingMode: aiForm.processingMode,
      };
      if (aiForm.apiKey) payload.apiKey = aiForm.apiKey;

      const res = await fetch(`/api/settings/ai-config?firmId=${firmId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      mutate(`/api/settings/ai-config?firmId=${firmId}`);
      setAiForm((prev) => ({ ...prev, apiKey: "" }));
      toast.success("AI configuration saved");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setAiSaving(false);
    }
  }

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
            <h3 className="text-sm font-semibold mb-1">AI Configuration</h3>
            <p className="text-xs text-gray-500 mb-4">Configure the AI model, API keys, and system prompt used across Atlas — screening, command bar, and agent routing all share this configuration.</p>
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model Provider</label>
                <div className="flex gap-2">
                  <div
                    onClick={() => {
                      setAiForm((p) => ({ ...p, provider: "openai", model: OPENAI_MODELS[0] }));
                      setConnectionStatus("unknown");
                    }}
                    className={`flex-1 rounded-lg p-3 cursor-pointer transition-colors ${
                      aiForm.provider === "openai"
                        ? "bg-indigo-50 border-2 border-indigo-300"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${aiForm.provider === "openai" ? "text-indigo-700" : "text-gray-600"}`}>OpenAI GPT-4</div>
                    <div className={`text-[10px] mt-0.5 ${aiForm.provider === "openai" ? "text-indigo-500" : "text-gray-400"}`}>gpt-4o, gpt-4o-mini, gpt-4-turbo</div>
                  </div>
                  <div
                    onClick={() => {
                      setAiForm((p) => ({ ...p, provider: "anthropic", model: ANTHROPIC_MODELS[0] }));
                      setConnectionStatus("unknown");
                    }}
                    className={`flex-1 rounded-lg p-3 cursor-pointer transition-colors ${
                      aiForm.provider === "anthropic"
                        ? "bg-indigo-50 border-2 border-indigo-300"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${aiForm.provider === "anthropic" ? "text-indigo-700" : "text-gray-600"}`}>Anthropic Claude</div>
                    <div className={`text-[10px] mt-0.5 ${aiForm.provider === "anthropic" ? "text-indigo-500" : "text-gray-400"}`}>claude-sonnet-4-20250514 &bull; Recommended</div>
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <select
                  value={aiForm.model}
                  onChange={(e) => setAiForm((p) => ({ ...p, model: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(aiForm.provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(e) => setAiForm((p) => ({ ...p, apiKey: e.target.value }))}
                    placeholder={aiConfig?.hasApiKey ? "Key configured (enter new to replace)" : "Enter your API key"}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </button>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System Prompt</label>
                <textarea
                  value={aiForm.systemPrompt}
                  onChange={(e) => setAiForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono h-32 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="text-[10px] text-gray-400 mt-1">This prompt is prepended to every AI screening request. Use it to customize analysis criteria for your investment strategy.</div>
              </div>

              {/* Screening Parameters */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Screening Parameters</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Auto-Screen Threshold</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={aiForm.thresholdScore}
                      onChange={(e) => setAiForm((p) => ({ ...p, thresholdScore: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Max Documents per Deal</div>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={aiForm.maxDocuments}
                      onChange={(e) => setAiForm((p) => ({ ...p, maxDocuments: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Processing Mode</div>
                    <select
                      value={aiForm.processingMode}
                      onChange={(e) => setAiForm((p) => ({ ...p, processingMode: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="async">Async Queue</option>
                      <option value="sync">Synchronous</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save / Reset */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveAIConfig}
                  disabled={aiSaving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiSaving ? "Saving..." : "Save Configuration"}
                </button>
                <button
                  onClick={() => {
                    setAiForm({
                      provider: "openai",
                      model: "gpt-4o",
                      apiKey: "",
                      systemPrompt: DEFAULT_SYSTEM_PROMPT,
                      thresholdScore: 70,
                      maxDocuments: 10,
                      processingMode: "async",
                    });
                    setConnectionStatus("unknown");
                  }}
                  className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>

          {/* Prompt Templates */}
          <PromptTemplatesEditor />

          {/* Connection Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">API Status</h3>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-green-500" :
                connectionStatus === "error" ? "bg-red-400" : "bg-amber-400"
              }`}></div>
              <div>
                <div className="text-xs font-medium">
                  {connectionStatus === "connected" ? "Connected" :
                   connectionStatus === "error" ? "Connection Failed" : "Not Connected"}
                </div>
                <div className="text-[10px] text-gray-500">
                  {connectionStatus === "connected"
                    ? `${aiForm.provider === "anthropic" ? "Anthropic" : "OpenAI"} API key verified • Model: ${aiForm.model}`
                    : connectionStatus === "error"
                      ? connectionError || "Check your API key and try again."
                      : "Enter your API key and click Test Connection to verify."}
                </div>
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
