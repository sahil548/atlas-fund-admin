/**
 * Pure utility functions for dashboard alerts data transformation.
 * Extracted from the API route to be unit-testable without Prisma/Next.js deps.
 */

export type AlertType = "OVERDUE_CAPITAL_CALL" | "COVENANT_BREACH" | "LEASE_EXPIRY";
export type AlertSeverity = "high" | "medium" | "low";

export interface DashboardAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  entityId?: string;
  assetId?: string;
  linkPath: string;
  date: Date | null;
}

export interface AlertCounts {
  overdueCapitalCalls: number;
  covenantBreaches: number;
  leaseExpiries: number;
}

export interface AlertsResult {
  alerts: DashboardAlert[];
  counts: AlertCounts;
}

// Minimum shape required from Prisma capital call query results
interface RawCapitalCall {
  id: string;
  dueDate: Date;
  amount: number;
  entity: { id: string; name: string };
}

// Minimum shape required from Prisma covenant query results
// Note: Prisma schema uses `agreement` (not `creditAgreement`) as the relation name on Covenant
interface RawCovenant {
  id: string;
  name: string;
  agreement: {
    id: string;
    asset: { id: string; name: string };
  };
}

// Minimum shape required from Prisma lease query results
interface RawLease {
  id: string;
  tenantName: string;
  leaseEndDate: Date | null;
  asset: { id: string; name: string };
}

/**
 * Transform raw Prisma query results (capital calls, covenants, leases) into
 * the unified alerts response shape with counts.
 */
export function buildAlerts(
  capitalCalls: RawCapitalCall[],
  covenants: RawCovenant[],
  leases: RawLease[]
): AlertsResult {
  const alerts: DashboardAlert[] = [];

  // Overdue capital calls — high severity, links to entity
  for (const cc of capitalCalls) {
    alerts.push({
      type: "OVERDUE_CAPITAL_CALL",
      severity: "high",
      title: `Overdue capital call — ${cc.entity.name}`,
      entityId: cc.entity.id,
      linkPath: `/entities/${cc.entity.id}`,
      date: cc.dueDate,
    });
  }

  // Covenant breaches — high severity, links to asset
  for (const cov of covenants) {
    alerts.push({
      type: "COVENANT_BREACH",
      severity: "high",
      title: `Covenant breach: ${cov.name} — ${cov.agreement.asset.name}`,
      assetId: cov.agreement.asset.id,
      linkPath: `/assets/${cov.agreement.asset.id}`,
      date: null,
    });
  }

  // Expiring leases — medium severity, links to asset
  for (const lease of leases) {
    alerts.push({
      type: "LEASE_EXPIRY",
      severity: "medium",
      title: `Lease expiring — ${lease.tenantName} at ${lease.asset.name}`,
      assetId: lease.asset.id,
      linkPath: `/assets/${lease.asset.id}`,
      date: lease.leaseEndDate,
    });
  }

  // Sort by date descending (nulls last)
  alerts.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });

  return {
    alerts,
    counts: {
      overdueCapitalCalls: capitalCalls.length,
      covenantBreaches: covenants.length,
      leaseExpiries: leases.length,
    },
  };
}
