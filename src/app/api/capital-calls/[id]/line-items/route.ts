import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCapitalCallLineItemSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

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

    // Verify access to the capital call
    const capitalCall = await prisma.capitalCall.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
      include: { entity: { select: { id: true, name: true } } },
    });

    if (!capitalCall) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
    }

    const lineItems = await prisma.capitalCallLineItem.findMany({
      where: { capitalCallId: id },
      include: {
        investor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Enrich with commitment info for each investor
    const enriched = await Promise.all(
      lineItems.map(async (li) => {
        const commitment = await prisma.commitment.findUnique({
          where: {
            investorId_entityId: {
              investorId: li.investorId,
              entityId: capitalCall.entityId,
            },
          },
          select: { amount: true, calledAmount: true },
        });
        return { ...li, commitment };
      }),
    );

    return NextResponse.json(enriched);
  } catch (err) {
    logger.error("[capital-calls/[id]/line-items] GET error:", { error: err instanceof Error ? err.message : String(err) });
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
      CreateCapitalCallLineItemSchema,
    );
    if (error) return error;

    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // GP_TEAM permission check
    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "capital_activity", "full")) return forbidden();
    }

    // Verify access to the capital call
    const capitalCall = await prisma.capitalCall.findFirst({
      where: firmId ? { id, entity: { firmId } } : { id },
    });

    if (!capitalCall) {
      return NextResponse.json({ error: "Capital call not found" }, { status: 404 });
    }

    const { investorId, amount } = data!;

    // Check investor has a commitment to this entity
    const commitment = await prisma.commitment.findUnique({
      where: {
        investorId_entityId: {
          investorId,
          entityId: capitalCall.entityId,
        },
      },
    });

    if (!commitment) {
      return NextResponse.json(
        { error: "Investor has no commitment to this entity" },
        { status: 400 },
      );
    }

    // Check for duplicate investor in this capital call
    const existing = await prisma.capitalCallLineItem.findFirst({
      where: { capitalCallId: id, investorId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Investor already has a line item for this capital call" },
        { status: 409 },
      );
    }

    // Warn if amount would exceed unfunded commitment
    const unfundedCommitment = commitment.amount - commitment.calledAmount;
    const headers: Record<string, string> = {};
    if (amount > unfundedCommitment) {
      headers["X-Warning"] =
        `Amount (${amount}) exceeds unfunded commitment (${unfundedCommitment})`;
    }

    const lineItem = await prisma.capitalCallLineItem.create({
      data: {
        capitalCallId: id,
        investorId,
        amount,
        status: "Pending",
      },
      include: {
        investor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(lineItem, { status: 201, headers });
  } catch (err) {
    logger.error("[capital-calls/[id]/line-items] POST error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to create line item" },
      { status: 500 },
    );
  }
}
