"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { CommandBarMessage, PageContext } from "@/lib/command-bar-types";

// Re-export PageContext so consumers can import it from this file directly.
export type { PageContext };

// ── Context ─────────────────────────────────────────────

interface CommandBarContextType {
  // ── Existing: command bar open/close ──────────────────
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;

  // ── New: page context ─────────────────────────────────
  /** Current page the GP is viewing. Set by page-level components on mount. */
  pageContext: PageContext | null;
  setPageContext: (ctx: PageContext | null) => void;

  // ── New: side panel ───────────────────────────────────
  /** When true, the persistent side panel is open. */
  isSidePanelOpen: boolean;
  openSidePanel: () => void;
  closeSidePanel: () => void;

  // ── New: conversation state (moved from component-local) ──
  /** Shared conversation thread — both inline dropdown and side panel read this. */
  conversation: CommandBarMessage[];
  addMessage: (msg: CommandBarMessage) => void;
  clearConversation: () => void;
  /** True while an AI search/action call is in-flight. */
  isSearching: boolean;
  setIsSearching: (v: boolean) => void;

  // ── New: alert freshness ──────────────────────────────
  /**
   * ISO timestamp of the last time the GP acknowledged alerts.
   * Persisted in localStorage ("atlas_last_alert_seen"). Null on first visit.
   */
  lastAlertSeenAt: string | null;
  /** Saves current ISO timestamp to state + localStorage. */
  updateLastAlertSeen: () => void;
}

const CommandBarContext = createContext<CommandBarContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  inputRef: { current: null },

  pageContext: null,
  setPageContext: () => {},

  isSidePanelOpen: false,
  openSidePanel: () => {},
  closeSidePanel: () => {},

  conversation: [],
  addMessage: () => {},
  clearConversation: () => {},
  isSearching: false,
  setIsSearching: () => {},

  lastAlertSeenAt: null,
  updateLastAlertSeen: () => {},
});

export function useCommandBar() {
  return useContext(CommandBarContext);
}

// ── Provider ────────────────────────────────────────────

export function CommandBarProvider({ children }: { children: ReactNode }) {
  // ── Existing state ────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return next;
    });
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // ── Page context ──────────────────────────────────────
  const [pageContext, setPageContextState] = useState<PageContext | null>(null);

  const setPageContext = useCallback((ctx: PageContext | null) => {
    setPageContextState(ctx);
  }, []);

  // Auto-detect page context from URL pattern so the AI knows what "this deal" means.
  // Detail page components can call setPageContext({ ..., entityName }) after data loads
  // to enrich the context with the entity name.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.match(/^\/deals\/[^/]+$/)) {
      setPageContextState({ pageType: "deal", entityId: pathname.split("/")[2] });
    } else if (pathname.match(/^\/assets\/[^/]+$/)) {
      setPageContextState({ pageType: "asset", entityId: pathname.split("/")[2] });
    } else if (pathname.match(/^\/entities\/[^/]+$/)) {
      setPageContextState({ pageType: "entity", entityId: pathname.split("/")[2] });
    } else if (pathname.match(/^\/contacts\/[^/]+$/)) {
      setPageContextState({ pageType: "contact", entityId: pathname.split("/")[2] });
    } else if (pathname === "/dashboard") {
      setPageContextState({ pageType: "dashboard" });
    } else {
      setPageContextState({ pageType: "other" });
    }
  }, [pathname]);

  // ── Side panel ────────────────────────────────────────
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const openSidePanel = useCallback(() => setIsSidePanelOpen(true), []);
  const closeSidePanel = useCallback(() => setIsSidePanelOpen(false), []);

  // ── Conversation state ────────────────────────────────
  const [conversation, setConversation] = useState<CommandBarMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const addMessage = useCallback((msg: CommandBarMessage) => {
    setConversation((prev) => [...prev, msg]);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  // ── Alert freshness ───────────────────────────────────
  // SSR-safe: localStorage is only available in the browser.
  const [lastAlertSeenAt, setLastAlertSeenAtState] = useState<string | null>(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("atlas_last_alert_seen")
        : null,
  );

  const updateLastAlertSeen = useCallback(() => {
    const ts = new Date().toISOString();
    setLastAlertSeenAtState(ts);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_last_alert_seen", ts);
    }
  }, []);

  // ── Context value ─────────────────────────────────────
  const value: CommandBarContextType = {
    isOpen,
    open,
    close,
    toggle,
    inputRef,

    pageContext,
    setPageContext,

    isSidePanelOpen,
    openSidePanel,
    closeSidePanel,

    conversation,
    addMessage,
    clearConversation,
    isSearching,
    setIsSearching,

    lastAlertSeenAt,
    updateLastAlertSeen,
  };

  return (
    <CommandBarContext.Provider value={value}>
      {children}
    </CommandBarContext.Provider>
  );
}
