"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  Bot,
  Loader2,
  ArrowRight,
  Send,
  Trash2,
} from "lucide-react";
import { useCommandBar } from "./command-bar-provider";
import { useFirm } from "@/components/providers/firm-provider";
import { classifyIntent } from "@/lib/ai-nl-intent";
import { isValidAppRoute } from "@/lib/routes";
import { ActionConfirmation } from "./action-confirmation";
import { useToast } from "@/components/ui/toast";
import type { ActionPlan, CommandBarMessage, SearchResult, TaskSuggestion } from "@/lib/command-bar-types";

// ── Priority badge colors ─────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-gray-100 text-gray-600",
};

// ── TaskSuggestionCard (side panel version) ────────────────

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

    const body: Record<string, unknown> = {
      title: suggestion.title,
      priority: suggestion.priority,
      firmId,
      contextType: contextType,
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
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 transition-colors shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-800">{suggestion.title}</span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
              PRIORITY_COLORS[suggestion.priority] || "bg-gray-100 text-gray-600"
            }`}
          >
            {suggestion.priority}
          </span>
        </div>
        {suggestion.rationale && (
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{suggestion.rationale}</p>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={added || adding || !pageContext?.entityId}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
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

// ── LPUpdateDraft (side panel version) ──────────────────────

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
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden mt-2">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
          LP Update Draft
        </span>
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {copied ? "✓ Copied" : "Copy to Clipboard"}
        </button>
      </div>
      <div className="px-3 py-3 overflow-y-auto" style={{ maxHeight: "none" }}>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {draft}
        </pre>
      </div>
    </div>
  );
}

// ── Type badge colors (matches command-bar.tsx) ─────────

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

// ── Side Panel Component ────────────────────────────────

export function CommandBarSidePanel() {
  const router = useRouter();
  const { firmId } = useFirm();
  const {
    conversation,
    addMessage,
    clearConversation,
    isSearching,
    setIsSearching,
    closeSidePanel,
    pageContext,
  } = useCommandBar();

  const [input, setInput] = useState("");
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation, isSearching]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Submit query ─────────────────────────────────────

  const submitQuery = useCallback(
    async (text: string) => {
      if (!text.trim() || isSearching) return;

      const intent = classifyIntent(text);

      const userMessage: CommandBarMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      addMessage(userMessage);
      setInput("");
      setIsSearching(true);

      try {
        if (intent === "fuzzy_search") {
          // Short query: use DB search, no AI call
          const dbRes = await fetch(
            `/api/commands/search?q=${encodeURIComponent(text)}&firmId=${firmId}`,
          ).then((r) => r.json());

          const dbSearchResults: SearchResult[] = dbRes.results || [];

          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: dbSearchResults.length > 0
              ? `Found ${dbSearchResults.length} result${dbSearchResults.length === 1 ? "" : "s"} for "${text}".`
              : `No records found for "${text}". Try a more specific search or ask a question.`,
            timestamp: new Date(),
            searchResults: dbSearchResults,
          });
        } else if (intent === "nl_action") {
          // Check for task suggestion query pattern BEFORE generic action
          const isSuggestQuery = /what should (i|we) do|next (steps?|tasks?|actions?)|suggest.*tasks?/i.test(text);
          if (isSuggestQuery && pageContext?.entityId) {
            const contextTypeMap: Record<string, string> = { deal: "DEAL", asset: "ASSET", entity: "ENTITY" };
            const contextType = contextTypeMap[pageContext.pageType];
            if (contextType) {
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
              return;
            }
          }

          // Check for LP update query pattern BEFORE generic action
          const isLPUpdate = /draft.*lp.*update|lp.*quarterly|investor.*update|lp.*report/i.test(text);
          if (isLPUpdate) {
            if (!pageContext?.entityId || pageContext.pageType !== "entity") {
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content:
                  "Which fund would you like to draft an LP update for? Navigate to a fund/entity page or specify the fund name.",
                timestamp: new Date(),
              });
              return;
            }

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
            return;
          }

          // Generic NL action: route to /api/ai/execute for planning
          setPendingAction(text);
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
          setIsSearching(false);
          return;
        } else {
          // NL query: route to AI
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

          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: aiRes.message || "I processed your request.",
            timestamp: new Date(),
            searchResults: mergedResults,
            suggestions: aiRes.suggestions || [],
          });
        }
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

  // ── Action confirmation handlers ──────────────────────

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
            content: result.clarification || result.message || "Action failed. Please try again.",
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

  // ── Navigation ──────────────────────────────────────

  const navigateTo = (path: string) => {
    if (isValidAppRoute(path)) {
      router.push(path);
    } else {
      router.push("/dashboard");
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigateTo(result.url);
  };

  const handleSuggestionClick = (suggestion: string) => {
    submitQuery(suggestion);
  };

  // ── Keyboard ─────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(input);
    }
  };

  const defaultSuggestions = [
    "What deals are in our pipeline?",
    "Show portfolio performance",
    "Summarize recent activity",
    "How much capital is committed?",
  ];

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] z-40 bg-white border-l border-gray-200 shadow-xl dark:bg-gray-900 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Atlas AI</span>
          {pageContext && pageContext.pageType !== "other" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium capitalize">
              {pageContext.pageType}{pageContext.entityName ? `: ${pageContext.entityName}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {conversation.length > 0 && (
            <button
              onClick={clearConversation}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={closeSidePanel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation body */}
      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {conversation.length === 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-gray-100 text-sm text-gray-800 max-w-[85%]">
                Hi! I can answer questions about your portfolio, deals, assets, and more. What would you like to know?
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {defaultSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-[12px] px-3 py-1.5 rounded-full bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors border border-gray-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {conversation.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3 py-2 rounded-xl rounded-br-sm bg-indigo-600 text-white text-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[90%]">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-gray-100 text-sm text-gray-800">
                          {msg.content}
                        </div>
                      </div>

                      {/* Search results */}
                      {msg.searchResults && msg.searchResults.length > 0 && (
                        <div className="mt-2 ml-8 space-y-1.5">
                          {msg.searchResults.slice(0, 6).map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleResultClick(result)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all shadow-sm"
                            >
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                  TYPE_COLORS[result.type] || "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {result.type}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-gray-800 truncate">
                                  {result.title}
                                </div>
                                {result.subtitle && (
                                  <div className="text-[10px] text-gray-400 truncate">
                                    {result.subtitle}
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 ml-8 flex flex-wrap gap-1">
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSuggestionClick(s)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Task suggestion cards */}
                      {msg.taskSuggestions && msg.taskSuggestions.length > 0 && (
                        <div className="mt-2 ml-8 space-y-2">
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
                        <div className="mt-2 ml-8">
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
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  </div>
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action confirmation — shown when AI returns an action plan */}
      {actionPlan && (
        <div className="shrink-0">
          <ActionConfirmation
            plan={actionPlan}
            onConfirm={handleActionConfirm}
            onCancel={handleActionCancel}
            isExecuting={isExecuting}
          />
        </div>
      )}

      {/* Footer input */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-indigo-300 focus-within:bg-white transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-700"
            disabled={isSearching}
          />
          <button
            onClick={() => submitQuery(input)}
            disabled={!input.trim() || isSearching}
            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Powered by Atlas AI — answers are based on your portfolio data
        </p>
      </div>
    </div>
  );
}
