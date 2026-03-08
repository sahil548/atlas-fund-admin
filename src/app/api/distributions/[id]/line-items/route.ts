import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDistributionLineItemSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check (only when authenticated)
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "read_only")) return forbidden();
    }

    // Verify access
    const distribution = await prisma.distributionEvent.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
    });

    if (!distribution) {
      return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
    }

    const lineItems = await prisma.distributionLineItem.findMany({
      where: { distributionId: id },
      include: {
        investor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(lineItems);
  } catch (err) {
    console.error("[distributions/[id]/line-items] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load line items" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data, error } = await parseBody(
      req,
      CreateDistributionLineItemSchema,
    );
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    // Verify access
    const distribution = await prisma.distributionEvent.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
    });

    if (!distribution) {
      return NextResponse.json({ error: "Distribution not found" }, { status: 404 });
    }

    const { investorId, grossAmount, returnOfCapital, income, longTermGain, carriedInterest, netAmount } = data!;

    const lineItem = await prisma.distributionLineItem.create({
      data: {
        distributionId: id,
        investorId,
        grossAmount,
        returnOfCapital,
        income,
        longTermGain,
        carriedInterest,
        netAmount,
        distributionType: distribution.distributionType,
      },
      include: {
        investor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(lineItem, { status: 201 });
  } catch (err) {
    console.error("[distributions/[id]/line-items] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create line item" },
      { status: 500 },
    );
  }
}
