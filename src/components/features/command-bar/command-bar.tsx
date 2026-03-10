"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Mic,
  MicOff,
  X,
  Send,
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
  ArrowRight,
  Bot,
  Bell,
  PanelRight,
  AlertTriangle,
} from "lucide-react";
import { useFirm } from "@/components/providers/firm-provider";
import { useCommandBar } from "./command-bar-provider";
import { discoverCommands } from "@/lib/command-discovery";
import { isValidAppRoute } from "@/lib/routes";
import { classifyIntent, getUnseenAlertCount } from "@/lib/ai-nl-intent";
import { ActionConfirmation } from "./action-confirmation";
import { useToast } from "@/components/ui/toast";
import type {
  ActionPlan,
  CommandAction,
  CommandBarMessage,
  SearchResult,
  TaskSuggestion,
} from "@/lib/command-bar-types";

// ── Priority badge colors ────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-gray-100 text-gray-600",
};

// ── TaskSuggestionCard — renders one suggested task with Add button ──

function TaskSuggestionCard({
  suggestion,
  firmId,
  pageContext,
  contextType,
}: {
  suggestion: TaskSuggestion;
  firmId: string;
  pageContext: { pageType: string; entityId?: string; entityName?: string } | null;
  contextType: string | null;
}) {
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (added || adding || !pageContext?.entityId) return;
    setAdding(true);

    const contextTypeMap: Record<string, string> = {
      deal: "DEAL",
      asset: "ASSET",
      entity: "ENTITY",
    };
    const resolvedContextType = contextType || contextTypeMap[pageContext.pageType] || null;

    const body: Record<string, unknown> = {
      title: suggestion.title,
      priority: suggestion.priority,
      firmId,
      contextType: resolvedContextType,
      contextId: pageContext.entityId,
    };

    if (pageContext.pageType === "deal") body.dealId = pageContext.entityId;
    else if (pageContext.pageType === "asset") body.assetId = pageContext.entityId;
    else if (pageContext.pageType === "entity") body.entityId = pageContext.entityId;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setAdded(true);
        toast.success("Task created");
      } else {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to create task";
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-gray-800">{suggestion.title}</span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
              PRIORITY_COLORS[suggestion.priority] || "bg-gray-100 text-gray-600"
            }`}
          >
            {suggestion.priority}
          </span>
        </div>
        {suggestion.rationale && (
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{suggestion.rationale}</p>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={added || adding || !pageContext?.entityId}
        className={`shrink-0 flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
          added
            ? "bg-green-50 text-green-600 border border-green-200"
            : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {added ? "✓ Added" : adding ? "Adding…" : "+ Add"}
      </button>
    </div>
  );
}

// ── LPUpdateDraft — renders LP update with Copy button ──────

function LPUpdateDraft({ draft }: { draft: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
          LP Update Draft
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div className="px-3 py-2 max-h-48 overflow-y-auto">
        <pre className="text-[10px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {draft}
        </pre>
      </div>
    </div>
  );
}

// ── Icon resolver ───────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Building2, Briefcase, FileText, Users, DollarSign,
  CheckSquare, Calendar, Settings, TrendingUp, Layers, Globe,
  PieChart, UserPlus, Plus, Calculator, Bell,
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

// ── Alert data type ─────────────────────────────────────

interface MonitoringAlert {
  id: string;
  createdAt: string;
}

// ── Main Component (inline dropdown, not modal) ────────

export function CommandBar() {
  const router = useRouter();
  const { firmId } = useFirm();
  const {
    isOpen,
    open,
    close,
    inputRef,
    // Provider-level conversation state (shared with side panel)
    conversation,
    addMessage,
    isSearching,
    setIsSearching,
    pageContext,
    openSidePanel,
    lastAlertSeenAt,
    updateLastAlertSeen,
  } = useCommandBar();

  // Local UI state (not shared — only needed in dropdown)
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [dynamicActions, setDynamicActions] = useState<CommandAction[]>([]);
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  // Action confirmation state (nl_action flow)
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Alert state — fetch once per open, cache in ref to avoid re-fetching
  const [unseenAlertCount, setUnseenAlertCount] = useState(0);
  const alertFetchedRef = useRef(false);
  const alertDataRef = useRef<MonitoringAlert[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dbSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset local UI state when closed (NOT conversation — that's in provider)
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDynamicActions([]);
      setDbResults([]);
      setActionPlan(null);
      setPendingAction("");
    }
  }, [isOpen]);

  // Fetch alerts once when command bar first opens
  useEffect(() => {
    if (!isOpen || alertFetchedRef.current || !firmId) return;

    alertFetchedRef.current = true;
    fetch(`/api/assets/monitoring?firmId=${firmId}`)
      .then((r) => r.json())
      .then((data) => {
        // Collect all alert items — each has a createdAt
        const allAlerts: MonitoringAlert[] = [
          ...(data.covenantBreaches || []),
          ...(data.leaseExpirations || []),
          ...(data.loanMaturities || []),
          ...(data.overdueReviews || []),
        ];
        alertDataRef.current = allAlerts;
        const count = getUnseenAlertCount(allAlerts, lastAlertSeenAt);
        setUnseenAlertCount(count);
      })
      .catch(() => {
        // Non-critical — silently ignore monitoring fetch errors
      });
  }, [isOpen, firmId, lastAlertSeenAt]);

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Click-outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  // Fuzzy command discovery on query change
  useEffect(() => {
    if (query.trim()) {
      setDynamicActions(discoverCommands(query));
    } else {
      setDynamicActions([]);
      setDbResults([]);
    }

    // Debounced DB search (only for fuzzy_search intent or short queries)
    if (dbSearchTimer.current) clearTimeout(dbSearchTimer.current);
    if (query.trim().length >= 2) {
      const intent = classifyIntent(query);
      if (intent === "fuzzy_search") {
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
    }
  }, [query, firmId]);

  // ── Submit query ─────────────────────────────────────

  const submitQuery = useCallback(
    async (text: string) => {
      if (!text.trim() || isSearching) return;

      const intent = classifyIntent(text);

      // Short/fuzzy queries: use existing fuzzy search + DB search, no AI call
      if (intent === "fuzzy_search") {
        const userMessage: CommandBarMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        addMessage(userMessage);
        setQuery("");
        setDynamicActions([]);
        setIsSearching(true);

        try {
          const dbRes = await fetch(
            `/api/commands/search?q=${encodeURIComponent(text)}&firmId=${firmId}`,
          ).then((r) => r.json());

          const dbSearchResults: SearchResult[] = dbRes.results || [];

          const assistantMessage: CommandBarMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: dbSearchResults.length > 0
              ? `Found ${dbSearchResults.length} result${dbSearchResults.length === 1 ? "" : "s"} for "${text}".`
              : `No records found for "${text}". Try a more specific search or ask a question.`,
            timestamp: new Date(),
            searchResults: dbSearchResults,
          };
          addMessage(assistantMessage);
        } catch {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          });
        } finally {
          setIsSearching(false);
        }
        return;
      }

      // NL action: route to /api/ai/execute for planning (shows confirmation UI)
      if (intent === "nl_action") {
        const userMessage: CommandBarMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        addMessage(userMessage);
        setQuery("");
        setDynamicActions([]);
        setIsSearching(true);
        setPendingAction(text);

        try {
          const res = await fetch("/api/ai/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: text,
              firmId,
              pageContext,
              confirmed: false,
            }),
          });
          const plan: ActionPlan = await res.json();
          setActionPlan(plan);
        } catch {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I encountered an error processing your action. Please try again.",
            timestamp: new Date(),
          });
        } finally {
          setIsSearching(false);
        }
        return;
      }

      // Check for task suggestion query pattern (on-demand only, per CONTEXT.md)
      const isSuggestQuery = /what should (i|we) do|next (steps?|tasks?|actions?)|suggest.*tasks?/i.test(text);
      if (isSuggestQuery && pageContext?.entityId) {
        const contextTypeMap: Record<string, string> = { deal: "DEAL", asset: "ASSET", entity: "ENTITY" };
        const contextType = contextTypeMap[pageContext.pageType];
        if (contextType) {
          const userMessage: CommandBarMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            timestamp: new Date(),
          };
          addMessage(userMessage);
          setQuery("");
          setDynamicActions([]);
          setIsSearching(true);

          try {
            const res = await fetch("/api/ai/suggest-tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firmId, contextType, contextId: pageContext.entityId }),
            }).then((r) => r.json());

            const tasks = res.tasks || [];
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: tasks.length > 0
                ? `Here are ${tasks.length} suggested next tasks for this ${pageContext.pageType}:`
                : "I couldn't generate task suggestions right now. Please try again.",
              timestamp: new Date(),
              taskSuggestions: tasks.length > 0 ? tasks : undefined,
            });
          } catch {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Sorry, I encountered an error generating task suggestions. Please try again.",
              timestamp: new Date(),
            });
          } finally {
            setIsSearching(false);
          }
          return;
        }
      }

      // Check for LP update query pattern
      const isLPUpdate = /draft.*lp.*update|lp.*quarterly|investor.*update|lp.*report/i.test(text);
      if (isLPUpdate) {
        const userMessage: CommandBarMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        addMessage(userMessage);
        setQuery("");
        setDynamicActions([]);
        setIsSearching(true);

        // If not on entity page, ask user to navigate to one
        if (!pageContext?.entityId || pageContext.pageType !== "entity") {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Which fund would you like to draft an LP update for? Navigate to a fund/entity page or specify the fund name.",
            timestamp: new Date(),
          });
          setIsSearching(false);
          return;
        }

        try {
          const res = await fetch("/api/ai/draft-lp-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firmId, entityId: pageContext.entityId }),
          }).then((r) => r.json());

          if (res.error) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: typeof res.error === "string" ? res.error : "Failed to draft LP update. Please try again.",
              timestamp: new Date(),
            });
          } else {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Here is a draft LP quarterly update for ${res.entityName || "this fund"}:`,
              timestamp: new Date(),
              lpUpdateDraft: res.draft,
            });
          }
        } catch {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I encountered an error drafting the LP update. Please try again.",
            timestamp: new Date(),
          });
        } finally {
          setIsSearching(false);
        }
        return;
      }

      // NL query: route to AI
      const userMessage: CommandBarMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      addMessage(userMessage);
      setQuery("");
      setDynamicActions([]);
      setIsSearching(true);

      try {
        const [aiRes, dbRes] = await Promise.all([
          fetch("/api/ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text, firmId, pageContext }),
          }).then((r) => r.json()),

          fetch(
            `/api/commands/search?q=${encodeURIComponent(text)}&firmId=${firmId}`,
          ).then((r) => r.json()),
        ]);

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
        addMessage(assistantMessage);
      } catch {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [firmId, isSearching, addMessage, setIsSearching, pageContext],
  );

  // ── Pop-out to side panel ────────────────────────────

  const handlePopOut = useCallback(() => {
    openSidePanel();
    close();
  }, [openSidePanel, close]);

  // ── Action confirmation handlers ─────────────────────

  const handleActionConfirm = useCallback(
    async (editedPayload: Record<string, unknown>) => {
      if (!actionPlan) return;
      setIsExecuting(true);

      try {
        const res = await fetch("/api/ai/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction,
            firmId,
            pageContext,
            confirmed: true,
            actionType: actionPlan.actionType,
            confirmedPayload: editedPayload,
          }),
        });
        const result = await res.json();

        setActionPlan(null);
        setPendingAction("");

        // Add success/error message to conversation
        if (result.success) {
          const msg = result.result?.url
            ? `${result.message} [View record](${result.result.url})`
            : result.message;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: msg,
            timestamp: new Date(),
          });
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.clarification
              ? result.clarification
              : result.message || "Action failed. Please try again.",
            timestamp: new Date(),
          });
        }
      } catch {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error executing the action. Please try again.",
          timestamp: new Date(),
        });
        setActionPlan(null);
        setPendingAction("");
      } finally {
        setIsExecuting(false);
      }
    },
    [actionPlan, pendingAction, firmId, pageContext, addMessage],
  );

  const handleActionCancel = useCallback(() => {
    setActionPlan(null);
    setPendingAction("");
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Action cancelled.",
      timestamp: new Date(),
    });
  }, [addMessage]);

  // ── Dismiss proactive alert banner ──────────────────

  const dismissAlertBanner = useCallback(() => {
    updateLastAlertSeen();
    setUnseenAlertCount(0);
  }, [updateLastAlertSeen]);

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
    if (isValidAppRoute(path)) {
      close();
      router.push(path);
    } else {
      // Bad URL from AI — fall back to dashboard
      close();
      router.push("/dashboard");
    }
  };

  const handleActionClick = (action: CommandAction) => {
    if (action.actionId) {
      window.dispatchEvent(
        new CustomEvent("atlas:command-action", { detail: { actionId: action.actionId } }),
      );
      close();
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
      close();
      inputRef.current?.blur();
    }
  };

  // Determine if dropdown should show
  const hasContent =
    dynamicActions.length > 0 ||
    dbResults.length > 0 ||
    conversation.length > 0 ||
    actionPlan !== null ||
    (isOpen && !query.trim());

  const showDropdown = isOpen && hasContent;

  const defaultSuggestions = [
    "What deals are in our pipeline?",
    "Show portfolio performance",
    "Summarize recent activity",
    "How much capital is committed?",
  ];

  return (
    <div ref={containerRef} className="relative">
      {/* Always-visible inline search input */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200/70 transition-colors w-full">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!isOpen) open(); }}
          onFocus={() => { if (!isOpen) open(); }}
          onKeyDown={handleKeyDown}
          placeholder="Search or ask AI..."
          className="flex-1 text-xs bg-transparent outline-none placeholder:text-gray-400 text-gray-700"
        />
        {query && (
          <button
            onClick={() => submitQuery(query)}
            className="p-0.5 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        )}
        {!query && (
          <kbd className="text-[9px] bg-gray-200 px-1 py-0.5 rounded font-mono text-gray-500">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown results panel */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Dynamic command actions (pill row) */}
          {dynamicActions.length > 0 && conversation.length === 0 && (
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-gray-100">
              {dynamicActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 whitespace-nowrap transition-colors border border-gray-100"
                >
                  <CommandIcon name={action.icon} className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* DB search results (while typing, before submit — fuzzy_search intent) */}
          {dbResults.length > 0 && conversation.length === 0 && (
            <div className="border-b border-gray-100 max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Records
                </span>
              </div>
              {dbResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors"
                >
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                      TYPE_COLORS[result.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {result.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {result.title}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {result.subtitle}
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Conversation thread */}
          <div ref={conversationRef} className="max-h-[400px] overflow-y-auto">
            {conversation.length === 0 ? (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-indigo-600" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700">Atlas AI</span>
                  <span className="text-[10px] text-gray-400">— Ask anything about your portfolio</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {defaultSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 space-y-2.5">
                {/* Pop-out button — visible when conversation is active */}
                <div className="flex justify-end">
                  <button
                    onClick={handlePopOut}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 transition-colors px-2 py-0.5 rounded-full hover:bg-indigo-50"
                    title="Open in side panel"
                  >
                    <PanelRight className="w-3 h-3" />
                    Pop out
                  </button>
                </div>

                {conversation.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-1.5 rounded-xl rounded-br-sm bg-indigo-600 text-white text-xs">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-[90%]">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                            </div>
                            <div className="px-3 py-1.5 rounded-xl rounded-bl-sm bg-gray-100 text-xs text-gray-800">
                              {msg.content}
                            </div>
                          </div>

                          {msg.searchResults && msg.searchResults.length > 0 && (
                            <div className="mt-1.5 ml-7 space-y-1">
                              {msg.searchResults.slice(0, 5).map((result) => (
                                <button
                                  key={result.id}
                                  onClick={() => handleResultClick(result)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-left transition-all"
                                >
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                      TYPE_COLORS[result.type] || "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {result.type}
                                  </span>
                                  <span className="text-[11px] font-medium text-gray-800 truncate">
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

                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="mt-1.5 ml-7 flex flex-wrap gap-1">
                              {msg.suggestions.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleSuggestionClick(s)}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-gray-600 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Task suggestion cards */}
                          {msg.taskSuggestions && msg.taskSuggestions.length > 0 && (
                            <div className="mt-1.5 ml-7 space-y-1.5">
                              {msg.taskSuggestions.map((task, i) => {
                                const contextTypeMap: Record<string, string> = {
                                  deal: "DEAL",
                                  asset: "ASSET",
                                  entity: "ENTITY",
                                };
                                const ct = pageContext
                                  ? contextTypeMap[pageContext.pageType] || null
                                  : null;
                                return (
                                  <TaskSuggestionCard
                                    key={i}
                                    suggestion={task}
                                    firmId={firmId}
                                    pageContext={pageContext}
                                    contextType={ct}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* LP update draft */}
                          {msg.lpUpdateDraft && (
                            <div className="mt-1.5 ml-7">
                              <LPUpdateDraft draft={msg.lpUpdateDraft} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isSearching && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Loader2 className="w-2.5 h-2.5 text-indigo-600 animate-spin" />
                      </div>
                      <span className="text-[10px] text-gray-500">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action confirmation UI — shown when AI returns an action plan */}
          {actionPlan && (
            <ActionConfirmation
              plan={actionPlan}
              onConfirm={handleActionConfirm}
              onCancel={handleActionCancel}
              isExecuting={isExecuting}
            />
          )}

          {/* Proactive alert banner — shown when unseen alerts exist */}
          {unseenAlertCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-100">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-[11px] text-amber-700 flex-1">
                Heads up: {unseenAlertCount} new alert{unseenAlertCount === 1 ? "" : "s"} since your last visit
              </span>
              <button
                onClick={() => { close(); router.push("/assets"); }}
                className="text-[10px] font-medium text-amber-600 hover:text-amber-800 hover:underline shrink-0"
              >
                View
              </button>
              <button
                onClick={dismissAlertBanner}
                className="text-[10px] text-amber-400 hover:text-amber-600 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100 bg-gray-50/50">
            <span className="text-[9px] text-gray-400 mr-0.5">Quick:</span>
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
                  close();
                }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 text-gray-600 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
                {action.label}
              </button>
            ))}
            <button
              onClick={toggleVoice}
              className={`ml-auto p-1 rounded-full transition-colors ${
                isListening
                  ? "text-red-500 bg-red-50 animate-pulse"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </button>
            {isOpen && (
              <button
                onClick={() => { close(); inputRef.current?.blur(); }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
