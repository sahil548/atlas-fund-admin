"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { useCommandBar } from "./command-bar-provider";
import { getUnseenAlertCount } from "@/lib/ai-nl-intent";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MonitoringResponse {
  covenantBreaches?: Array<{ id: string; createdAt: string }>;
  leaseExpirations?: Array<{ id: string; createdAt: string }>;
  loanMaturities?: Array<{ id: string; createdAt: string }>;
  overdueReviews?: Array<{ id: string; createdAt: string }>;
  totalAlerts?: number;
}

/**
 * AlertBadge — shows the unseen alert count as a red badge.
 *
 * Fetches monitoring data via SWR (refreshed every 60s). Renders nothing when
 * unseen count is 0. Designed to be positioned absolutely on the command bar
 * trigger button or similar entry point.
 */
export function AlertBadge() {
  const { firmId } = useFirm();
  const { lastAlertSeenAt } = useCommandBar();

  const { data } = useSWR<MonitoringResponse>(
    firmId ? `/api/assets/monitoring?firmId=${firmId}` : null,
    fetcher,
    {
      refreshInterval: 60000, // re-check once per minute
      revalidateOnFocus: false,
    },
  );

  if (!data) return null;

  // Collect all alerts from the response
  const allAlerts = [
    ...(data.covenantBreaches || []),
    ...(data.leaseExpirations || []),
    ...(data.loanMaturities || []),
    ...(data.overdueReviews || []),
  ];

  const count = getUnseenAlertCount(allAlerts, lastAlertSeenAt);

  if (count === 0) return null;

  return (
    <span
      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow-sm"
      aria-label={`${count} unseen alert${count === 1 ? "" : "s"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
