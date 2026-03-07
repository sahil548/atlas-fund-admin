import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateEntitySchema } from "@/lib/schemas";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");

  const params = parsePaginationParams(req.nextUrl.searchParams, [
    "firmId", "cursor", "limit", "search", "entityType", "status", "vintage",
  ]);

  const baseWhere: Record<string, unknown> = {};
  if (firmId) baseWhere.firmId = firmId;
  if (params.filters?.entityType) baseWhere.entityType = params.filters.entityType;
  if (params.filters?.status) baseWhere.status = params.filters.status;
  if (params.filters?.vintage) baseWhere.vintageYear = parseInt(params.filters.vintage, 10);

  const cleanParams = { ...params, filters: {} };

  const { where, take, skip, cursor } = buildPrismaArgs(
    cleanParams,
    ["name"],
    baseWhere,
    "createdAt",
  );

  const [rawEntities, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      take,
      skip,
      cursor,
      orderBy: { name: "asc" },
      include: {
        accountingConnection: true,
        commitments: { include: { investor: true } },
        assetAllocations: { include: { asset: true } },
        navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
        distributions: { select: { netToLPs: true } },
      },
    }),
    prisma.entity.count({ where }),
  ]);

  const enriched = rawEntities.map((entity) => {
    const totalCalled = entity.commitments.reduce(
      (sum, c) => sum + (c.calledAmount ?? 0),
      0,
    );
    const totalDistributed = entity.distributions.reduce(
      (sum, d) => sum + (d.netToLPs ?? 0),
      0,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { distributions, ...rest } = entity;
    return { ...rest, totalCalled, totalDistributed };
  });

  const paginated = buildPaginatedResult(enriched, params.limit, total);

  return NextResponse.json({
    data: paginated.data,
    nextCursor: paginated.nextCursor,
    hasMore: paginated.hasMore,
    total: paginated.total,
  });
}

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data, error } = await parseBody(req, CreateEntitySchema);
  if (error) return error;
  const { startFormation, ...entityData } = data!;
  const entity = await prisma.entity.create({ data: { ...entityData, firmId: authUser.firmId } });

  if (startFormation) {
    const { FORMATION_CHECKLIST_TEMPLATES } = await import("@/lib/formation-templates");
    await prisma.task.createMany({
      data: FORMATION_CHECKLIST_TEMPLATES.map((t) => ({
        title: t.title,
        order: t.order,
        status: "TODO",
        priority: "HIGH",
        contextType: "FORMATION",
        contextId: entity.id,
        entityId: entity.id,
      })),
    });
    await prisma.entity.update({
      where: { id: entity.id },
      data: { formationStatus: "FORMING" },
    });
  }

  // Audit log — fire and forget
  logAudit(authUser.firmId, authUser.id, "CREATE_ENTITY", "Entity", entity.id, {
    name: entity.name,
    entityType: entity.entityType,
  });

  return NextResponse.json(entity, { status: 201 });
}
