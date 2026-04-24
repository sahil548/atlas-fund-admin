/**
 * PATCH /api/entities/[id]/funding-sources/[fsId]
 *   Body: { isDefault?: boolean; accountNickname?: string }
 * DELETE /api/entities/[id]/funding-sources/[fsId]
 *   Soft-delete + Dwolla removal.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import { removeFundingSource, isDwollaConfigured } from "@/lib/integrations/dwolla";
import { logger } from "@/lib/logger";

const PatchSchema = z.object({
  isDefault: z.boolean().optional(),
  accountNickname: z.string().max(120).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fsId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    if (authUser.role === "LP_INVESTOR" || authUser.role === "SERVICE_PROVIDER") {
      return forbidden();
    }
    const { id: entityId, fsId } = await params;
    const { data, error } = await parseBody(req, PatchSchema);
    if (error) return error;

    const existing = await prisma.entityFundingSource.findFirst({
      where: { id: fsId, entityId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (data!.isDefault === true) {
      await prisma.$transaction([
        prisma.entityFundingSource.updateMany({
          where: { entityId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.entityFundingSource.update({
          where: { id: fsId },
          data: {
            isDefault: true,
            ...(data!.accountNickname !== undefined && { accountNickname: data!.accountNickname }),
          },
        }),
      ]);
    } else {
      await prisma.entityFundingSource.update({
        where: { id: fsId },
        data: {
          ...(data!.isDefault === false && { isDefault: false }),
          ...(data!.accountNickname !== undefined && { accountNickname: data!.accountNickname }),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[entity funding-sources PATCH]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fsId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    if (authUser.role === "LP_INVESTOR" || authUser.role === "SERVICE_PROVIDER") {
      return forbidden();
    }
    const { id: entityId, fsId } = await params;

    const fs = await prisma.entityFundingSource.findFirst({
      where: { id: fsId, entityId },
      select: { id: true, dwollaFundingSourceId: true, isDefault: true },
    });
    if (!fs) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (isDwollaConfigured()) {
      try {
        await removeFundingSource(fs.dwollaFundingSourceId);
      } catch (err) {
        logger.warn("[entity funding-sources DELETE] Dwolla remove failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await prisma.entityFundingSource.update({
      where: { id: fsId },
      data: { status: "REMOVED", isDefault: false },
    });

    if (fs.isDefault) {
      const next = await prisma.entityFundingSource.findFirst({
        where: { entityId, status: { not: "REMOVED" } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await prisma.entityFundingSource.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[entity funding-sources DELETE]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 },
    );
  }
}
