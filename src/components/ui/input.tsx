"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors",
        "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
        error ? "border-red-300 focus:ring-red-500/20 focus:border-red-400" : "border-gray-200",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
