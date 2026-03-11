import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateCapitalCallLineItemSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import {
  updateCommitmentCalledAmount,
  recomputeCapitalAccountForInvestor,
  updateCapitalCallStatus,
} from "@/lib/capital-activity-engine";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lineItemId: string }> },
) {
  try {
    const { id, lineItemId } = await params;
    const { data, error } = await parseBody(
      req,
      UpdateCapitalCallLineItemSchema,
    );
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    // Verify access via the parent capital call's entity
    const capitalCall = await prisma.capitalCall.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
      select: { id: true, entityId: true },
    });

    if (!capitalCall) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
    }

    // Find the line item
    const lineItem = await prisma.capitalCallLineItem.findFirst({
      where: { id: lineItemId, capitalCallId: id },
    });

    if (!lineItem) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    const isFunding =
      data!.status === "Funded" && lineItem.status !== "Funded";

    const paidDate = isFunding
      ? data!.paidDate
        ? new Date(data!.paidDate)
        : new Date()
      : data!.paidDate
        ? new Date(data!.paidDate)
        : undefined;

    const updated = await prisma.capitalCallLineItem.update({
      where: { id: lineItemId },
      data: {
        ...(data!.status !== undefined && { status: data!.status }),
        ...(paidDate !== undefined && { paidDate }),
        ...(data!.amount !== undefined && { amount: data!.amount }),
      },
      include: {
        investor: { select: { id: true, name: true } },
      },
    });

    // Transaction chain: when line item is funded
    if (isFunding) {
      await updateCommitmentCalledAmount(lineItem.investorId, capitalCall.entityId);
      await recomputeCapitalAccountForInvestor(
        lineItem.investorId,
        capitalCall.entityId,
      );
      await updateCapitalCallStatus(id);
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[capital-calls/[id]/line-items/[lineItemId]] PATCH error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to update line item" },
      { status: 500 },
    );
  }
}
