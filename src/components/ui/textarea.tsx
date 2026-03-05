"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors min-h-[80px] resize-y",
        "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
        "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500",
        error ? "border-red-300 focus:ring-red-500/20 focus:border-red-400" : "border-gray-200",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
