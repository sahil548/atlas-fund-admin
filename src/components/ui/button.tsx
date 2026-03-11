"use client";

import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 border-transparent",
  secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
};

const sizeClasses: Record<string, string> = {
  sm: "text-xs px-2.5 py-1",
  md: "text-sm px-3 py-1.5",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "sm",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-lg border transition-colors",
        variants[variant],
        sizeClasses[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
