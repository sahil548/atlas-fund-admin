import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  ActivityItem,
  mergeAndSortActivities,
  filterByTypes,
  filterByEntity,
  paginateActivities,
} from "@/lib/activity-feed-helpers";

/**
 * GET /api/activity
 *
 * Unified activity feed aggregating events from 7 data sources.
 *
 * Query params:
 *   firmId   (required) — tenant filter; falls back to auth user's firmId
 *   entityId (optional) — filter to a specific entity/fund
 *   types    (optional) — comma-separated ActivityType values
 *   limit    (optional, default 20)
 *   offset   (optional, default 0)
 *
 * Response: { items: ActivityItem[], total: number, hasMore: boolean }
 */
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const searchParams = req.nextUrl.searchParams;

  const firmId = authUser?.firmId || searchParams.get("firmId");
  if (!firmId) {
    return NextResponse.json({ error: "firmId is required" }, { status: 400 });
  }

  const entityId = searchParams.get("entityId") || "";
  const typesParam = searchParams.get("types") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // 30 days ago for time-bounded sources
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Run all 7 queries in parallel — each uses .catch(() => []) for fault tolerance
  const [
    dealActivities,
    capitalCalls,
    distributions,
    meetings,
    tasks,
    documents,
    auditLogs,
  ] = await Promise.all([
    // (a) DealActivity
    prisma.dealActivity
      .findMany({
        where: {
          deal: {
            firmId,
            ...(entityId
              ? { entities: { some: { entityId } } }
              : {}),
          },
        },
        include: {
          deal: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),

    // (b) CapitalCall (not DRAFT)
    prisma.capitalCall
      .findMany({
        where: {
          entity: { firmId },
          status: { not: "DRAFT" },
          ...(entityId ? { entityId } : {}),
        },
        include: {
          entity: { select: { id: true, name: true } },
        },
        orderBy: { callDate: "desc" },
      })
      .catch(() => []),

    // (c) DistributionEvent (not DRAFT)
    prisma.distributionEvent
      .findMany({
        where: {
          entity: { firmId },
          status: { not: "DRAFT" },
          ...(entityId ? { entityId } : {}),
        },
        include: {
          entity: { select: { id: true, name: true } },
        },
        orderBy: { distributionDate: "desc" },
      })
      .catch(() => []),

    // (d) Meeting (last 30 days)
    prisma.meeting
      .findMany({
        where: {
          firmId,
          meetingDate: { gte: thirtyDaysAgo },
          ...(entityId ? { entityId } : {}),
        },
        include: {
          deal: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
        },
        orderBy: { meetingDate: "desc" },
      })
      .catch(() => []),

    // (e) Task (created in last 30 days)
    prisma.task
      .findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          ...(entityId ? { entityId } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),

    // (f) Document (uploaded in last 30 days)
    prisma.document
      .findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { deal: { firmId } },
            { entity: { firmId } },
          ],
          ...(entityId ? { entityId } : {}),
        },
        include: {
          deal: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),

    // (g) AuditLog — STATUS_TRANSITION actions only, last 30 days
    prisma.auditLog
      .findMany({
        where: {
          firmId,
          action: "STATUS_TRANSITION",
          createdAt: { gte: thirtyDaysAgo },
          ...(entityId ? { targetId: entityId } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
  ]);

  // ── Map each source to ActivityItem ────────────────────────

  const dealItems: ActivityItem[] = dealActivities.map((da) => ({
    id: `deal_activity-${da.id}`,
    type: "DEAL_ACTIVITY" as const,
    description: da.description,
    entityId: undefined,
    entityName: da.deal.name,
    linkPath: `/deals/${da.deal.id}`,
    date: da.createdAt.toISOString(),
  }));

  const capitalCallItems: ActivityItem[] = capitalCalls.map((cc) => ({
    id: `capital_call-${cc.id}`,
    type: "CAPITAL_CALL" as const,
    description: cc.purpose
      ? `Capital call: ${cc.purpose}`
      : `Capital call #${cc.callNumber} issued`,
    entityId: cc.entityId,
    entityName: cc.entity.name,
    linkPath: `/transactions/capital-calls/${cc.id}`,
    date: cc.callDate.toISOString(),
  }));

  const distributionItems: ActivityItem[] = distributions.map((de) => ({
    id: `distribution-${de.id}`,
    type: "DISTRIBUTION" as const,
    description: de.memo
      ? `Distribution: ${de.memo}`
      : `Distribution from ${de.entity.name}`,
    entityId: de.entityId,
    entityName: de.entity.name,
    linkPath: `/transactions/distributions/${de.id}`,
    date: de.distributionDate.toISOString(),
  }));

  const meetingItems: ActivityItem[] = meetings.map((m) => ({
    id: `meeting-${m.id}`,
    type: "MEETING" as const,
    description: m.title,
    entityId: m.entityId ?? undefined,
    entityName: m.entity?.name ?? m.deal?.name ?? undefined,
    linkPath: `/meetings/${m.id}`,
    date: m.meetingDate.toISOString(),
  }));

  const taskItems: ActivityItem[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    type: "TASK" as const,
    description: t.title,
    entityId: t.entityId ?? undefined,
    entityName: undefined,
    linkPath: t.dealId ? `/deals/${t.dealId}` : t.entityId ? `/entities/${t.entityId}` : `/tasks`,
    date: t.createdAt.toISOString(),
  }));

  const documentItems: ActivityItem[] = documents.map((doc) => ({
    id: `document-${doc.id}`,
    type: "DOCUMENT" as const,
    description: `Document uploaded: ${doc.name}`,
    entityId: doc.entityId ?? undefined,
    entityName: doc.entity?.name ?? doc.deal?.name ?? undefined,
    linkPath: doc.dealId ? `/deals/${doc.dealId}` : doc.entityId ? `/entities/${doc.entityId}` : `/documents/${doc.id}`,
    date: doc.createdAt.toISOString(),
  }));

  const auditItems: ActivityItem[] = auditLogs.map((log) => {
    const meta = log.metadata as Record<string, unknown> | null;
    const description =
      (meta?.description as string) ||
      `${log.targetType} status changed`;
    return {
      id: `audit-${log.id}`,
      type: "ENTITY_CHANGE" as const,
      description,
      entityId: log.targetType === "Entity" ? log.targetId : undefined,
      entityName: undefined,
      linkPath:
        log.targetType === "Entity"
          ? `/entities/${log.targetId}`
          : log.targetType === "Deal"
          ? `/deals/${log.targetId}`
          : `/`,
      date: log.createdAt.toISOString(),
    };
  });

  // ── Merge, filter, paginate ─────────────────────────────────

  const merged = mergeAndSortActivities([
    dealItems,
    capitalCallItems,
    distributionItems,
    meetingItems,
    taskItems,
    documentItems,
    auditItems,
  ]);

  // Type filter (comma-separated list in query param)
  const typeSet = typesParam
    ? new Set(typesParam.split(",").map((t) => t.trim()).filter(Boolean))
    : new Set<string>();

  const typeFiltered = filterByTypes(merged, typeSet);

  // Entity filter (entity filtering was already applied at the DB query level when
  // entityId is provided, but we do a second pass for sources like DealActivity
  // that filter by deal.entities instead of entityId directly)
  const filtered = entityId ? filterByEntity(typeFiltered, entityId) : typeFiltered;

  const paginated = paginateActivities(filtered, offset, limit);

  return NextResponse.json(paginated);
}
