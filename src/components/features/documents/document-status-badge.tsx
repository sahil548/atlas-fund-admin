"use client";

import { Badge } from "@/components/ui/badge";

interface DocumentStatusBadgeProps {
  status: string; // ExtractionStatus: NONE, PENDING, PROCESSING, COMPLETE, FAILED
  error?: string | null;
  onRetry?: () => void;
}

export function DocumentStatusBadge({
  status,
  onRetry,
}: DocumentStatusBadgeProps) {
  switch (status) {
    case "PROCESSING":
    case "PENDING":
      return <Badge color="yellow">Processing</Badge>;
    case "COMPLETE":
      return <Badge color="green">Summarized</Badge>;
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1">
          <Badge color="red">Failed</Badge>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="text-[10px] text-indigo-600 hover:underline"
            >
              Retry
            </button>
          )}
        </span>
      );
    default:
      // NONE — show a subtle indicator that summarization is available
      return <Badge color="gray">Not processed</Badge>;
  }
}
