import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDistributionLineItemSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lineItemId: string }> },
) {
  try {
    const { id, lineItemId } = await params;
    const { data, error } = await parseBody(
      req,
      UpdateDistributionLineItemSchema,
    );
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    // Verify access via parent distribution
    const distribution = await prisma.distributionEvent.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
      select: { id: true, status: true },
    });

    if (!distribution) {
      return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
    }

    // Only allow updates when distribution is DRAFT
    if (distribution.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Line items can only be updated when distribution is in DRAFT status" },
        { status: 400 },
      );
    }

    // Find the line item
    const lineItem = await prisma.distributionLineItem.findFirst({
      where: { id: lineItemId, distributionId: id },
    });

    if (!lineItem) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    const updated = await prisma.distributionLineItem.update({
      where: { id: lineItemId },
      data: {
        ...(data!.grossAmount !== undefined && { grossAmount: data!.grossAmount }),
        ...(data!.returnOfCapital !== undefined && { returnOfCapital: data!.returnOfCapital }),
        ...(data!.income !== undefined && { income: data!.income }),
        ...(data!.longTermGain !== undefined && { longTermGain: data!.longTermGain }),
        ...(data!.carriedInterest !== undefined && { carriedInterest: data!.carriedInterest }),
        ...(data!.netAmount !== undefined && { netAmount: data!.netAmount }),
      },
      include: {
        investor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[distributions/[id]/line-items/[lineItemId]] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update line item" },
      { status: 500 },
    );
  }
}
