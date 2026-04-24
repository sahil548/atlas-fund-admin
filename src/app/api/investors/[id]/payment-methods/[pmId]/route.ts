/**
 * PATCH /api/investors/[id]/payment-methods/[pmId]
 *   Body: { isDefault?: boolean; accountNickname?: string }
 * DELETE /api/investors/[id]/payment-methods/[pmId]
 *   Soft-deletes the payment method (status=REMOVED) and asks Dwolla to
 *   remove the funding source on their side.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
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
  { params }: { params: Promise<{ id: string; pmId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id: investorId, pmId } = await params;
    const { data, error } = await parseBody(req, PatchSchema);
    if (error) return error;

    const existing = await prisma.investorPaymentMethod.findFirst({
      where: { id: pmId, investorId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If marking as default, clear other defaults in a transaction
    if (data!.isDefault === true) {
      await prisma.$transaction([
        prisma.investorPaymentMethod.updateMany({
          where: { investorId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.investorPaymentMethod.update({
          where: { id: pmId },
          data: {
            isDefault: true,
            ...(data!.accountNickname !== undefined && { accountNickname: data!.accountNickname }),
          },
        }),
      ]);
    } else {
      await prisma.investorPaymentMethod.update({
        where: { id: pmId },
        data: {
          ...(data!.isDefault === false && { isDefault: false }),
          ...(data!.accountNickname !== undefined && { accountNickname: data!.accountNickname }),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[payment-methods PATCH]", {
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
  { params }: { params: Promise<{ id: string; pmId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id: investorId, pmId } = await params;

    const pm = await prisma.investorPaymentMethod.findFirst({
      where: { id: pmId, investorId },
      select: { id: true, dwollaFundingSourceId: true, isDefault: true },
    });
    if (!pm) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Best-effort Dwolla removal — if it fails we still mark locally removed
    if (isDwollaConfigured()) {
      try {
        await removeFundingSource(pm.dwollaFundingSourceId);
      } catch (err) {
        logger.warn("[payment-methods DELETE] Dwolla remove failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await prisma.investorPaymentMethod.update({
      where: { id: pmId },
      data: { status: "REMOVED", isDefault: false },
    });

    // If we removed the default, promote the most recent non-removed one
    if (pm.isDefault) {
      const next = await prisma.investorPaymentMethod.findFirst({
        where: { investorId, status: { not: "REMOVED" } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await prisma.investorPaymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[payment-methods DELETE]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 },
    );
  }
}
