"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const sizes: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  full: "max-w-[95vw]",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, size = "md", children, footer }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Animate open/close
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Stable ref for onClose so effects don't re-run on every parent render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape key + body scroll lock
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Auto-focus first input on open — but only if nothing inside the panel
  // already has focus (prevents stealing focus from inputs during re-renders)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      // If an element inside the modal already has focus, don't steal it
      if (panel.contains(document.activeElement) && document.activeElement !== panel) return;
      const input = panel.querySelector<HTMLElement>(
        "input:not([type='hidden']), textarea, select"
      );
      input?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with fade animation */}
      <div
        className={`fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Panel with slide-up + fade animation */}
      <div
        ref={panelRef}
        className={`relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-full ${sizes[size]} mx-4 transition-all duration-200 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto max-h-[90vh]">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
