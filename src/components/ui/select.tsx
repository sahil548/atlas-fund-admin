"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, options, placeholder, className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors bg-white",
        "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
        error ? "border-red-300 focus:ring-red-500/20 focus:border-red-400" : "border-gray-200",
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = "Select";
