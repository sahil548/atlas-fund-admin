"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Mic,
  MicOff,
  X,
  Send,
  Bot,
  ArrowRight,
  Sparkles,
  Plus,
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  Users,
  DollarSign,
  CheckSquare,
  Calendar,
  Settings,
  TrendingUp,
  Layers,
  Globe,
  PieChart,
  UserPlus,
  Calculator,
  Loader2,
} from "lucide-react";
import { useFirm } from "@/components/providers/firm-provider";
import { discoverCommands } from "@/lib/command-discovery";
import type {
  CommandAction,
  CommandBarMessage,
  SearchResult,
} from "@/lib/command-bar-types";

// ── Icon resolver ───────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  Users,
  DollarSign,
  CheckSquare,
  Calendar,
  Settings,
  TrendingUp,
  Layers,
  Globe,
  PieChart,
  UserPlus,
  Plus,
  Calculator,
};

function CommandIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Sparkles;
  return <Icon className={className} />;
}

// ── Type badge colors ───────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  deal: "bg-blue-100 text-blue-700",
  entity: "bg-purple-100 text-purple-700",
  asset: "bg-emerald-100 text-emerald-700",
  investor: "bg-amber-100 text-amber-700",
  contact: "bg-pink-100 text-pink-700",
  company: "bg-indigo-100 text-indigo-700",
  document: "bg-gray-100 text-gray-700",
  task: "bg-orange-100 text-orange-700",
  meeting: "bg-cyan-100 text-cyan-700",
  page: "bg-slate-100 text-slate-700",
};

// ── Main Component ──────────────────────────────────────

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const router = useRouter();
  const { firmId } = useFirm();

  // State
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<CommandBarMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dynamicActions, setDynamicActions] = useState<CommandAction[]>([]);
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dbSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset on close
      setQuery("");
      setDynamicActions([]);
      setDbResults([]);
    }
  }, [isOpen]);

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Fuzzy command discovery on query change
  useEffect(() => {
    if (query.trim()) {
      setDynamicActions(discoverCommands(query));
    } else {
      setDynamicActions([]);
      setDbResults([]);
    }

    // Debounced DB search
    if (dbSearchTimer.current) clearTimeout(dbSearchTimer.current);
    if (query.trim().length >= 2) {
      dbSearchTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/commands/search?q=${encodeURIComponent(query)}&firmId=${firmId}`,
          );
          const data = await res.json();
          setDbResults(data.results || []);
        } catch {
          setDbResults([]);
        }
      }, 300);
    }
  }, [query, firmId]);

  // ── Submit query ─────────────────────────────────────

  const submitQuery = useCallback(
    async (text: string) => {
      if (!text.trim() || isSearching) return;

      const userMessage: CommandBarMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setConversation((prev) => [...prev, userMessage]);
      setQuery("");
      setDynamicActions([]);
      setIsSearching(true);

      try {
        // Fire AI search and DB search in parallel
        const [aiRes, dbRes] = await Promise.all([
          fetch("/api/ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text, firmId }),
          }).then((r) => r.json()),

          fetch(
            `/api/commands/search?q=${encodeURIComponent(text)}&firmId=${firmId}`,
          ).then((r) => r.json()),
        ]);

        // Merge search results (AI results first, then DB results deduplicated)
        const aiResults: SearchResult[] = aiRes.searchResults || [];
        const dbSearchResults: SearchResult[] = dbRes.results || [];
        const seenIds = new Set(aiResults.map((r: SearchResult) => r.id));
        const mergedResults = [
          ...aiResults,
          ...dbSearchResults.filter((r) => !seenIds.has(r.id)),
        ];

        const assistantMessage: CommandBarMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiRes.message || "I processed your request.",
          timestamp: new Date(),
          searchResults: mergedResults,
          suggestions: aiRes.suggestions || [],
        };
        setConversation((prev) => [...prev, assistantMessage]);
      } catch {
        setConversation((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSearching(false);
      }
    },
    [firmId, isSearching],
  );

  // ── Voice Input ──────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechAPI) return;

    const recognition = new SpeechAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setQuery(transcript);
        submitQuery(transcript);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, submitQuery]);

  // ── Navigation handlers ──────────────────────────────

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleActionClick = (action: CommandAction) => {
    if (action.actionId) {
      // Dispatch custom event for global dialog handling
      window.dispatchEvent(
        new CustomEvent("atlas:command-action", { detail: { actionId: action.actionId } }),
      );
      onClose();
    } else if (action.path) {
      navigateTo(action.path);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigateTo(result.url);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    submitQuery(suggestion);
  };

  // ── Keyboard ─────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(query);
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  // ── Default suggestions when empty ───────────────────

  const defaultSuggestions = [
    "What deals are in our pipeline?",
    "Show portfolio performance",
    "Summarize recent activity",
    "How much capital is committed?",
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 top-[15vh] z-50 mx-auto max-w-2xl px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or ask Atlas AI..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => submitQuery(query)}
                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleVoice}
              className={`p-1 rounded-full transition-colors ${
                isListening
                  ? "text-red-500 bg-red-50 animate-pulse"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic command actions (pill row) */}
          {dynamicActions.length > 0 && conversation.length === 0 && (
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-50">
              {dynamicActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 whitespace-nowrap transition-colors border border-gray-100"
                >
                  <CommandIcon name={action.icon} className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* DB search results (when typing but not yet submitted) */}
          {dbResults.length > 0 && conversation.length === 0 && (
            <div className="border-b border-gray-50 max-h-48 overflow-y-auto">
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Records
                </span>
              </div>
              {dbResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                      TYPE_COLORS[result.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {result.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.subtitle}
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Conversation thread */}
          <div
            ref={conversationRef}
            className="max-h-[50vh] overflow-y-auto"
          >
            {conversation.length === 0 ? (
              /* Empty state */
              <div className="px-6 py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mb-3">
                  <Bot className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Atlas AI Assistant
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Ask me anything about your portfolio, deals, or entities
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {defaultSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="px-4 py-3 space-y-3">
                {conversation.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md bg-indigo-600 text-white text-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-[90%]">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                            </div>
                            <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-gray-100 text-sm text-gray-800">
                              {msg.content}
                            </div>
                          </div>

                          {/* Search results within message */}
                          {msg.searchResults && msg.searchResults.length > 0 && (
                            <div className="mt-2 ml-8 space-y-1">
                              {msg.searchResults.slice(0, 5).map((result) => (
                                <button
                                  key={result.id}
                                  onClick={() => handleResultClick(result)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-left transition-all"
                                >
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                      TYPE_COLORS[result.type] || "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {result.type}
                                  </span>
                                  <span className="text-xs font-medium text-gray-800 truncate">
                                    {result.title}
                                  </span>
                                  <span className="text-[10px] text-gray-400 truncate">
                                    {result.subtitle}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-gray-300 shrink-0 ml-auto" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Suggestions */}
                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                              {msg.suggestions.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleSuggestionClick(s)}
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-gray-600 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isSearching && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
                      </div>
                      <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick action footer */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
            <span className="text-[10px] text-gray-400 mr-1">Quick:</span>
            {[
              { label: "New Deal", actionId: "createDeal" },
              { label: "New Entity", actionId: "createEntity" },
              { label: "New Task", actionId: "createTask" },
            ].map((action) => (
              <button
                key={action.actionId}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("atlas:command-action", {
                      detail: { actionId: action.actionId },
                    }),
                  );
                  onClose();
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 text-gray-600 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
                {action.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <kbd className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-500">
                ⌘K
              </kbd>
              <span className="text-[9px] text-gray-400">to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
