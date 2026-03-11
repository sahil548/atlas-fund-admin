import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = req.nextUrl.searchParams.get("firmId") || authUser?.firmId;

    const params = parsePaginationParams(req.nextUrl.searchParams, [
      "firmId", "cursor", "limit", "search", "assetClass", "status", "entityId",
    ]);

    const baseWhere: Record<string, unknown> = {};
    if (params.filters?.assetClass) baseWhere.assetClass = params.filters.assetClass;
    if (params.filters?.status) baseWhere.status = params.filters.status;
    if (firmId) {
      baseWhere.entityAllocations = { some: { entity: { firmId } } };
    }
    if (params.filters?.entityId) {
      baseWhere.entityAllocations = {
        some: {
          entityId: params.filters.entityId,
          ...(firmId ? { entity: { firmId } } : {}),
        },
      };
    }

    // Remove filter keys already handled from params.filters to avoid double-applying
    const cleanParams = {
      ...params,
      filters: {},
    };

    const { where, take, skip, cursor } = buildPrismaArgs(
      cleanParams,
      ["name"],
      baseWhere,
      "createdAt",
    );

    const [rawAssets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        take,
        skip,
        cursor,
        orderBy: { fairValue: "desc" },
        include: {
          entityAllocations: {
            include: { entity: { select: { id: true, name: true } } },
          },
          equityDetails: true,
          creditDetails: true,
          realEstateDetails: true,
          fundLPDetails: true,
        },
      }),
      prisma.asset.count({ where }),
    ]);

    const paginated = buildPaginatedResult(rawAssets, params.limit, total);

    return NextResponse.json({
      data: paginated.data,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
      total: paginated.total,
    });
  } catch (err) {
    logger.error("[assets] GET Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, assetClass, capitalInstrument, participationStructure,
      sector, status, costBasis, fairValue, incomeType,
      entityId, allocationPercent,
    } = body;

    if (!name || !assetClass || costBasis == null || fairValue == null || !entityId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cost = Number(costBasis);
    const fv = Number(fairValue);
    const moic = cost > 0 ? fv / cost : 0;

    const asset = await prisma.asset.create({
      data: {
        name,
        assetClass,
        capitalInstrument: capitalInstrument || null,
        participationStructure: participationStructure || null,
        sector: sector || null,
        status: status || "ACTIVE",
        costBasis: cost,
        fairValue: fv,
        moic,
        incomeType: incomeType || null,
        entryDate: new Date(),
        entityAllocations: {
          create: {
            entityId,
            allocationPercent: Number(allocationPercent) || 100,
            costBasis: cost,
          },
        },
      },
      include: {
        entityAllocations: {
          include: { entity: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    logger.error("[assets] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
