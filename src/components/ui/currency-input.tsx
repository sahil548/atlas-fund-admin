"use client";

import { useState, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

function formatDisplay(raw: string): string {
  if (!raw) return "";
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0", error, className, disabled }, ref) => {
    const [display, setDisplay] = useState(() => formatDisplay(value));

    useEffect(() => {
      setDisplay(formatDisplay(value));
    }, [value]);

    function handleChange(inputValue: string) {
      const stripped = inputValue.replace(/[^0-9.]/g, "");
      // Prevent multiple decimal points
      const parts = stripped.split(".");
      const raw = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : stripped;
      onChange(raw);
      setDisplay(formatDisplay(raw));
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          $
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full text-sm border rounded-lg pl-7 pr-3 py-2 outline-none transition-colors",
            "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
            "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500",
            error ? "border-red-300 focus:ring-red-500/20 focus:border-red-400" : "border-gray-200",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
