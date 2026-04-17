import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { parseBody } from "@/lib/api-helpers";
import { CreateAssetSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = req.nextUrl.searchParams.get("firmId") || authUser?.firmId;

    // Pass only the truly infra params as knownParams so that assetClass/status/entityId
    // flow through to params.filters and get picked up by the baseWhere block below.
    const params = parsePaginationParams(req.nextUrl.searchParams, [
      "firmId", "cursor", "limit", "search",
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
    const { data, error } = await parseBody(req, CreateAssetSchema);
    if (error) return error;
    const {
      name, assetClass, capitalInstrument, participationStructure,
      sector, status, costBasis, fairValue, incomeType,
      entityId, allocationPercent, allocations,
      // Phase 22-10: parity fields
      entryDate, projectedIRR, projectedMultiple, typeDetails,
      // Phase 22-11: review schedule + ownership + board seat
      nextReview, reviewFrequency, ownershipPercent, shareCount, hasBoardSeat,
    } = data!;

    const cost = Number(costBasis);
    const fv = Number(fairValue);
    const moic = cost > 0 ? fv / cost : 0;

    // Phase 22-12: build entity allocation create payload. Prefer the new
    // `allocations` array (multi-entity split). Fall back to the legacy
    // single-entity shape when only entityId is provided.
    let entityAllocationsCreate: unknown;
    if (allocations && allocations.length > 0) {
      entityAllocationsCreate = allocations.map((a) => ({
        entityId: a.entityId,
        allocationPercent: a.allocationPercent,
        costBasis: cost * (a.allocationPercent / 100),
      }));
    } else if (entityId) {
      entityAllocationsCreate = {
        entityId,
        allocationPercent: Number(allocationPercent) || 100,
        costBasis: cost,
      };
    } else {
      return NextResponse.json(
        { error: "Must provide either `entityId` (legacy single-entity) or `allocations` (multi-entity array)." },
        { status: 400 },
      );
    }

    // Build type-conditional nested create based on typeDetails.kind
    let typeDetailsCreate: Record<string, unknown> = {};
    if (typeDetails) {
      const { kind, ...detailFields } = typeDetails;
      if (kind === "REAL_ESTATE") {
        typeDetailsCreate = { realEstateDetails: { create: detailFields } };
      } else if (kind === "PRIVATE_CREDIT") {
        typeDetailsCreate = { creditDetails: { create: detailFields } };
      } else if (kind === "OPERATING") {
        typeDetailsCreate = { equityDetails: { create: detailFields } };
      } else if (kind === "LP_INTEREST") {
        typeDetailsCreate = { fundLPDetails: { create: detailFields } };
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        assetClass,
        capitalInstrument: capitalInstrument || null,
        participationStructure: participationStructure || null,
        sector: sector || null,
        status: (status || "ACTIVE") as "ACTIVE" | "EXITED" | "WRITTEN_OFF",
        costBasis: cost,
        fairValue: fv,
        moic,
        incomeType: incomeType || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        ...(projectedIRR !== undefined ? { projectedIRR } : {}),
        ...(projectedMultiple !== undefined ? { projectedMultiple } : {}),
        // Phase 22-11 scalars
        ...(nextReview !== undefined ? { nextReview: nextReview ? new Date(nextReview) : null } : {}),
        ...(reviewFrequency !== undefined ? { reviewFrequency } : {}),
        ...(ownershipPercent !== undefined ? { ownershipPercent } : {}),
        ...(shareCount !== undefined ? { shareCount } : {}),
        ...(hasBoardSeat !== undefined ? { hasBoardSeat } : {}),
        entityAllocations: {
          create: entityAllocationsCreate as never,
        },
        ...typeDetailsCreate,
      },
      include: {
        entityAllocations: {
          include: { entity: { select: { id: true, name: true } } },
        },
        realEstateDetails: true,
        creditDetails: true,
        equityDetails: true,
        fundLPDetails: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    logger.error("[assets] POST Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
