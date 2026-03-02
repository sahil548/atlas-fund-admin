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

// ── Context ─────────────────────────────────────────────

interface CommandBarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const CommandBarContext = createContext<CommandBarContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  inputRef: { current: null },
});

export function useCommandBar() {
  return useContext(CommandBarContext);
}

// ── Provider ────────────────────────────────────────────

export function CommandBarProvider({ children }: { children: ReactNode }) {
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

  return (
    <CommandBarContext.Provider value={{ isOpen, open, close, toggle, inputRef }}>
      {children}
    </CommandBarContext.Provider>
  );
}
