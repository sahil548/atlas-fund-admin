"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface AIConfigResponse {
  aiEnabled: boolean;
  provider: string;
  model: string;
  hasPersonalKey: boolean;
  source: "user" | "tenant" | "none";
}

interface FirefliesStatusResponse {
  connected: boolean;
  email: string | null;
  lastSync: string | null;
}

function SourceBadge({ source }: { source: "user" | "tenant" | "none" }) {
  if (source === "user") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Using: Your key
      </span>
    );
  }
  if (source === "tenant") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        Using: Firm default
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
      No key configured
    </span>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    GP_ADMIN: "GP Admin",
    GP_TEAM: "GP Team",
    SERVICE_PROVIDER: "Service Provider",
    LP_INVESTOR: "LP Investor",
  };
  return map[role] ?? role;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export default function ProfilePage() {
  const { user } = useUser();
  const { firmId, firmName } = useFirm();
  const toast = useToast();

  // ── AI Settings state ───────────────────────────────────
  const { data: aiConfig, isLoading: aiLoading } = useSWR<AIConfigResponse>(
    user?.id ? `/api/users/${user.id}/ai-config` : null,
    fetcher
  );

  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  if (aiConfig && !formInitialized) {
    setProvider((aiConfig.provider as "openai" | "anthropic") || "openai");
    setModel(aiConfig.model || "");
    setFormInitialized(true);
  }

  const defaultModel = provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o";

  async function handleSaveAI() {
    if (!user?.id) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        provider,
        model: model || defaultModel,
      };
      if (clearKey) {
        payload.apiKey = null;
      } else if (apiKey) {
        payload.apiKey = apiKey;
      }

      const res = await fetch(`/api/users/${user.id}/ai-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("AI settings saved");
        setApiKey("");
        setClearKey(false);
        mutate(`/api/users/${user.id}/ai-config`);
        setFormInitialized(false);
      } else {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to save AI settings";
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  }

  // ── Fireflies Integration state ─────────────────────────
  const { data: firefliesStatus, isLoading: firefliesLoading } =
    useSWR<FirefliesStatusResponse>(
      user?.id ? `/api/users/${user.id}/fireflies` : null,
      fetcher
    );

  const [firefliesApiKey, setFirefliesApiKey] = useState("");
  const [firefliesConnecting, setFirefliesConnecting] = useState(false);
  const [firefliesDisconnecting, setFirefliesDisconnecting] = useState(false);
  const [firefliesError, setFirefliesError] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  async function handleFirefliesConnect() {
    if (!user?.id || !firefliesApiKey.trim()) return;
    setFirefliesConnecting(true);
    setFirefliesError(null);
    try {
      const res = await fetch(`/api/users/${user.id}/fireflies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: firefliesApiKey.trim() }),
      });

      if (res.ok) {
        toast.success("Fireflies account connected");
        setFirefliesApiKey("");
        mutate(`/api/users/${user.id}/fireflies`);
      } else {
        const data = await res.json();
        const msg = typeof data.error === "string"
          ? data.error
          : "Invalid API key — check your Fireflies integration settings";
        setFirefliesError(msg);
      }
    } catch {
      setFirefliesError("Failed to connect Fireflies account");
    } finally {
      setFirefliesConnecting(false);
    }
  }

  async function handleFirefliesDisconnect() {
    if (!user?.id) return;
    setShowDisconnectConfirm(false);
    setFirefliesDisconnecting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/fireflies`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Fireflies account disconnected");
        mutate(`/api/users/${user.id}/fireflies`);
      } else {
        toast.error("Failed to disconnect Fireflies account");
      }
    } catch {
      toast.error("Failed to disconnect Fireflies account");
    } finally {
      setFirefliesDisconnecting(false);
    }
  }

  if (!user?.id || !firmId) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.name}</p>
      </div>

      {/* User info card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{user.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Role</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{roleLabel(user.role)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Firm</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{firmName}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Initials</p>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              {user.initials || user.name?.slice(0, 2).toUpperCase() || "??"}
            </div>
          </div>
        </div>
      </div>

      {/* AI Settings card */}
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4 ${aiConfig && !aiConfig.aiEnabled ? "opacity-60" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Settings</h2>
          {aiConfig && aiConfig.aiEnabled && (
            <SourceBadge source={aiConfig.source} />
          )}
        </div>

        {aiLoading && (
          <div className="text-sm text-gray-400">Loading AI configuration...</div>
        )}

        {!aiLoading && aiConfig && !aiConfig.aiEnabled && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              AI features are disabled for your account. Contact your admin to enable.
            </p>
          </div>
        )}

        {!aiLoading && aiConfig && aiConfig.aiEnabled && (
          <div className="space-y-4">
            {/* Provider */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value as "openai" | "anthropic");
                  setModel("");
                }}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={defaultModel}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Leave blank to use the default: {defaultModel}
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Personal API Key
                <span className="ml-1 text-[10px] font-normal text-gray-400">(optional — overrides firm default)</span>
              </label>

              {aiConfig.hasPersonalKey && !clearKey && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 font-mono">
                    ****** (saved)
                  </span>
                  <button
                    type="button"
                    onClick={() => setClearKey(true)}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove key
                  </button>
                </div>
              )}

              {clearKey && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded px-2 py-1">
                    Key will be removed on save
                  </span>
                  <button
                    type="button"
                    onClick={() => setClearKey(false)}
                    className="text-xs text-gray-500 hover:text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!clearKey && (
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiConfig.hasPersonalKey ? "Enter new key to replace" : "sk-... or your Anthropic key"}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 font-mono"
                />
              )}

              <p className="mt-1 text-[11px] text-gray-400">
                Keys are encrypted with AES-256-GCM before storage. Never stored in plaintext.
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveAI}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Saving..." : "Save AI Settings"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fireflies Integration card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Microphone icon (inline SVG — no extra dependency) */}
            <svg
              className="w-4 h-4 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
              />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Fireflies Integration
            </h2>
          </div>
          {firefliesStatus?.connected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Connected
            </span>
          )}
        </div>

        {firefliesLoading && (
          <div className="text-sm text-gray-400">Loading Fireflies status...</div>
        )}

        {!firefliesLoading && firefliesStatus && !firefliesStatus.connected && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your Fireflies account to automatically import meeting transcripts and action items into Atlas.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Fireflies API Key
              </label>
              <input
                type="password"
                value={firefliesApiKey}
                onChange={(e) => {
                  setFirefliesApiKey(e.target.value);
                  setFirefliesError(null);
                }}
                placeholder="Your Fireflies API key"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 font-mono"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Find your API key at{" "}
                <a
                  href="https://app.fireflies.ai/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:text-indigo-600 underline"
                >
                  app.fireflies.ai
                </a>{" "}
                &rarr; Settings &rarr; Integrations &rarr; API
              </p>
            </div>

            {firefliesError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                <p className="text-xs text-red-600 dark:text-red-400">{firefliesError}</p>
              </div>
            )}

            <button
              onClick={handleFirefliesConnect}
              disabled={firefliesConnecting || !firefliesApiKey.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {firefliesConnecting ? "Connecting..." : "Connect Fireflies"}
            </button>
          </div>
        )}

        {!firefliesLoading && firefliesStatus?.connected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Connected Account
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {firefliesStatus.email ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Last Sync
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {firefliesStatus.lastSync
                    ? formatRelativeTime(firefliesStatus.lastSync)
                    : "Never synced"}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                disabled={firefliesDisconnecting}
                className="px-4 py-2 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {firefliesDisconnecting ? "Disconnecting..." : "Disconnect Fireflies"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect confirmation dialog */}
      <ConfirmDialog
        open={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleFirefliesDisconnect}
        title="Disconnect Fireflies"
        message="This will stop syncing meetings from your Fireflies account. Previously synced meetings will remain. You can reconnect at any time."
        confirmLabel="Disconnect"
        variant="danger"
        loading={firefliesDisconnecting}
      />
    </div>
  );
}
