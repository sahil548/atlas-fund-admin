"use client";

import { ActivityFeedSection } from "@/components/features/dashboard/activity-feed-section";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  entityId: string;
}

/**
 * Thin wrapper around ActivityFeedSection for the entity operations tab.
 * Note: ActivityFeedSection currently manages its own entity filter internally
 * via a dropdown. A future enhancement could accept an initial entityId prop.
 */
export function EntityActivitySection({ entityId }: Props) {
  // ActivityFeedSection currently takes no props — it manages filtering internally.
  // The entityId prop is kept for future use when the component supports pre-filtering.
  void entityId;
  return <ActivityFeedSection />;
}
