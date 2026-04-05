"use client";

import { useState, useRef, useEffect, useCallback, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

// Matches the native React.SelectHTMLAttributes onChange pattern
// so existing consumers (e) => set(e.target.value) keep working
interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder,
  error,
  disabled,
  className,
  name,
  id,
  required,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  // Controlled vs uncontrolled
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Hidden select ref for synthetic event creation
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find((o) => o.value === currentValue);

  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (!isControlled) setInternalValue(option.value);

      // Create a synthetic event matching native select behavior
      if (onChange && hiddenSelectRef.current) {
        // Update the hidden select value so the event reflects it
        hiddenSelectRef.current.value = option.value;
        const syntheticEvent = {
          target: hiddenSelectRef.current,
          currentTarget: hiddenSelectRef.current,
          nativeEvent: new Event("change"),
          bubbles: true,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: false,
          preventDefault: () => {},
          isDefaultPrevented: () => false,
          stopPropagation: () => {},
          isPropagationStopped: () => false,
          persist: () => {},
          timeStamp: Date.now(),
          type: "change",
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }

      setOpen(false);
      setFocusedIndex(-1);
    },
    [isControlled, onChange]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (open && focusedIndex >= 0) {
            handleSelect(options[focusedIndex]);
          } else {
            setOpen((prev) => !prev);
            setFocusedIndex(
              Math.max(0, options.findIndex((o) => o.value === currentValue))
            );
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setFocusedIndex(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusedIndex(Math.max(0, options.findIndex((o) => o.value === currentValue)));
          } else {
            setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusedIndex(Math.max(0, options.findIndex((o) => o.value === currentValue)));
          } else {
            setFocusedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        case "Tab":
          setOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [disabled, open, focusedIndex, options, currentValue, handleSelect]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  // Compute dropdown position relative to the trigger button (portal renders at body level)
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMaxH = 320; // matches max-h-80
    const openAbove = spaceBelow < dropdownMaxH && rect.top > spaceBelow;
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
    });
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const reposition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 320;
      const openAbove = spaceBelow < dropdownMaxH && rect.top > spaceBelow;
      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        zIndex: 9999,
      });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Memoize portal target
  const portalTarget = useMemo(() =>
    typeof document !== "undefined" ? document.body : null,
  []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden native select for form submission and synthetic event creation */}
      <select
        ref={hiddenSelectRef}
        name={name}
        id={selectId}
        required={required}
        value={currentValue}
        onChange={() => {}} // controlled via handleSelect
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          if (!open) {
            setFocusedIndex(
              Math.max(0, options.findIndex((o) => o.value === currentValue))
            );
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between text-sm border rounded-lg px-3 py-2 outline-none transition-colors bg-white text-left",
          "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
          "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100",
          error
            ? "border-red-300 focus:ring-red-500/20 focus:border-red-400"
            : "border-gray-200 hover:border-gray-300 dark:hover:border-gray-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn(!selectedOption && "text-gray-400 dark:text-gray-500")}>
          {selectedOption ? selectedOption.label : placeholder ?? "Select…"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown list — rendered in a portal so it's never clipped by modal/parent overflow */}
      {open && portalTarget && createPortal(
        <ul
          ref={listRef}
          id={`${selectId}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          style={dropdownStyle}
          className="max-h-80 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1"
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors",
                  isSelected
                    ? "text-indigo-600 dark:text-indigo-400 font-medium"
                    : "text-gray-700 dark:text-gray-200",
                  isFocused && !isSelected && "bg-gray-50 dark:bg-gray-700",
                  isFocused && isSelected && "bg-indigo-50 dark:bg-indigo-900/30"
                )}
              >
                {option.label}
              </li>
            );
          })}
        </ul>,
        portalTarget
      )}
    </div>
  );
}

Select.displayName = "Select";
