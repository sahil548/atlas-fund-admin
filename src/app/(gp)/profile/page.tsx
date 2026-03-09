"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/components/providers/user-provider";
import { useFirm } from "@/components/providers/firm-provider";
import { useToast } from "@/components/ui/toast";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

interface AIConfigResponse {
  aiEnabled: boolean;
  provider: string;
  model: string;
  hasPersonalKey: boolean;
  source: "user" | "tenant" | "none";
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

export default function ProfilePage() {
  const { user } = useUser();
  const { firmId, firmName } = useFirm();
  const toast = useToast();

  // Fetch AI config for current user
  const { data: aiConfig, isLoading: aiLoading } = useSWR<AIConfigResponse>(
    user?.id ? `/api/users/${user.id}/ai-config` : null,
    fetcher
  );

  // AI form state
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form once AI config loads
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
      // Build payload — only include apiKey if user entered one or wants to clear
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        provider,
        model: model || defaultModel,
      };
      if (clearKey) {
        payload.apiKey = null; // explicit clear
      } else if (apiKey) {
        payload.apiKey = apiKey; // new key provided
      }
      // If neither clearKey nor apiKey — apiKey field omitted, existing key preserved

      const res = await fetch(`/api/users/${user.id}/ai-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("AI settings saved");
        setApiKey(""); // clear input after save
        setClearKey(false);
        mutate(`/api/users/${user.id}/ai-config`);
        setFormInitialized(false); // re-sync form from fresh data
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
                  // Reset model when provider changes so placeholder shows correct default
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
    </div>
  );
}
