import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateInvestorSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "investors", "read_only")) return forbidden();
    }

    const firmId = req.nextUrl.searchParams.get("firmId") || authUser?.firmId;

    const params = parsePaginationParams(req.nextUrl.searchParams, [
      "firmId", "cursor", "limit", "search", "entityId", "type",
    ]);

    const baseWhere: Record<string, unknown> = {};
    if (firmId) {
      // Include investors linked to the firm via commitments, contact, or company
      baseWhere.OR = [
        { commitments: { some: { entity: { firmId } } } },
        { contact: { firmId } },
        { company: { firmId } },
      ];
    }
    if (params.filters?.type) baseWhere.investorType = params.filters.type;

    const cleanParams = { ...params, filters: {} };

    const { where, take, skip, cursor } = buildPrismaArgs(
      cleanParams,
      ["name"],
      baseWhere,
      "createdAt",
    );

    const [rawInvestors, total] = await Promise.all([
      prisma.investor.findMany({
        where,
        take,
        skip,
        cursor,
        orderBy: { totalCommitted: "desc" },
        include: {
          commitments: {
            include: { entity: { select: { id: true, name: true } } },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          company: { select: { id: true, name: true, type: true } },
          userAccess: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
      }),
      prisma.investor.count({ where }),
    ]);

    const paginated = buildPaginatedResult(rawInvestors, params.limit, total);

    return NextResponse.json({
      data: paginated.data,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      total: paginated.total,
    });
  } catch (err) {
    logger.error("[investors] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load investors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    if (authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "investors", "full")) return forbidden();
    }

    const { data, error } = await parseBody(req, CreateInvestorSchema);
    if (error) return error;

    try {
      const investor = await prisma.investor.create({ data: data! });
      return NextResponse.json(investor, { status: 201 });
    } catch (createErr: any) {
      // Handle unique constraint violation on contactId/companyId
      // This happens when a contact/company already has an investor profile
      if (createErr?.code === "P2002") {
        const target = createErr?.meta?.target as string[] | undefined;
        const isContactDup = target?.includes("contactId");
        const isCompanyDup = target?.includes("companyId");

        // Retry without the duplicate FK — create as standalone investor
        const retryData = { ...data! };
        if (isContactDup) delete (retryData as any).contactId;
        if (isCompanyDup) delete (retryData as any).companyId;

        const investor = await prisma.investor.create({ data: retryData });
        return NextResponse.json(investor, { status: 201 });
      }
      throw createErr;
    }
  } catch (err) {
    logger.error("[investors] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create investor" }, { status: 500 });
  }
}
