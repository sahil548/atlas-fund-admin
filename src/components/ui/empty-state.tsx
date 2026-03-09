"use client";

import { InboxIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  filtered,
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="text-gray-300 dark:text-gray-600">
        {icon ?? <InboxIcon className="h-10 w-10" />}
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {title}
      </p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {description}
        </p>
      )}
      {!filtered && action && (
        <Button onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
      {filtered && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline mt-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
