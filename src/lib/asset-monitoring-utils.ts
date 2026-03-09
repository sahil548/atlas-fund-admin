/**
 * Asset monitoring utility functions (Phase 14)
 * Pure functions for lease expiry categorization and review overdue checks.
 */

export type LeaseExpiryCategory = "critical" | "warning" | "safe" | "expired";

/**
 * Categorize a lease by how soon it expires relative to now.
 *
 * - expired:  leaseEndDate is in the past
 * - critical: expires within 90 days
 * - warning:  expires within 91–180 days
 * - safe:     expires more than 180 days from now
 *
 * @param leaseEndDate - When the lease expires
 * @param now - Reference "today" date
 */
export function categorizeLeaseExpiry(leaseEndDate: Date, now: Date): LeaseExpiryCategory {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = Math.floor(
    (leaseEndDate.getTime() - now.getTime()) / msPerDay,
  );

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 90) return "critical";
  if (daysUntilExpiry <= 180) return "warning";
  return "safe";
}

/**
 * Returns true if the nextReview date is in the past (i.e., review is overdue).
 *
 * @param nextReview - Scheduled next review date (null if no review set)
 * @param now - Reference "today" date
 */
export function isOverdueReview(nextReview: Date | null, now: Date): boolean {
  if (nextReview === null) return false;
  return nextReview.getTime() < now.getTime();
}
