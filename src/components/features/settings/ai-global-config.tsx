"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useToast } from "@/components/ui/toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

interface AIGlobalConfigProps {
  firmId: string;
}

export function AIGlobalConfig({ firmId }: AIGlobalConfigProps) {
  const toast = useToast();
  const { data: aiConfig } = useSWR<AIConfigResponse>(
    `/api/settings/ai-config?firmId=${firmId}`,
    fetcher,
  );

  const [aiForm, setAiForm] = useState({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    if (aiConfig) {
      setAiForm((prev) => ({
        ...prev,
        provider: aiConfig.provider || "openai",
        model: aiConfig.model || "gpt-4o",
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

  async function handleSave() {
    setAiSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider: aiForm.provider,
        model: aiForm.model,
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold mb-1">AI Configuration</h3>
        <p className="text-xs text-gray-500 mb-4">
          Configure the AI provider and API key used across Atlas. All modules share this connection.
        </p>
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

          {/* Save / Reset */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={aiSaving}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiSaving ? "Saving..." : "Save Configuration"}
            </button>
            <button
              onClick={() => {
                setAiForm({ provider: "openai", model: "gpt-4o", apiKey: "" });
                setConnectionStatus("unknown");
              }}
              className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* API Status */}
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
                ? `${aiForm.provider === "anthropic" ? "Anthropic" : "OpenAI"} API key verified \u2022 Model: ${aiForm.model}`
                : connectionStatus === "error"
                  ? connectionError || "Check your API key and try again."
                  : "Enter your API key and click Test Connection to verify."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
