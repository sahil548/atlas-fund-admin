import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { UpdateCommitmentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const commitment = await prisma.commitment.findUnique({
      where: { id },
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true, firmId: true } },
      },
    });

    if (!commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (firmId && commitment.entity.firmId !== firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(commitment);
  } catch (err) {
    logger.error("[commitments/[id]] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load commitment" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const { data, error } = await parseBody(req, UpdateCommitmentSchema);
    if (error) return error;

    // Fetch existing commitment with entity for firm guard
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      include: { entity: { select: { id: true, firmId: true } } },
    });

    if (!commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (firmId && commitment.entity.firmId !== firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (data!.amount !== undefined) {
      const oldAmount = commitment.amount;
      const delta = data!.amount - oldAmount;

      // Log audit trail as a Transaction record before updating
      await prisma.transaction.create({
        data: {
          entityId: commitment.entityId,
          transactionType: "TRANSFER",
          description: `Commitment adjusted: $${oldAmount.toLocaleString()} -> $${data!.amount.toLocaleString()}`,
          amount: delta,
          date: new Date(),
        },
      });

      updateData.amount = data!.amount;
    }

    if (data!.calledAmount !== undefined) {
      updateData.calledAmount = data!.calledAmount;
    }

    const updated = await prisma.commitment.update({
      where: { id },
      data: updateData,
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[commitments/[id]] PATCH error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update commitment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const commitment = await prisma.commitment.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, firmId: true } },
        investor: {
          select: {
            capitalCallLineItems: { where: { capitalCall: { entityId: undefined as unknown as string } }, select: { id: true } },
            distributionLineItems: { where: { distribution: { entityId: undefined as unknown as string } }, select: { id: true } },
          },
        },
      },
    });

    if (!commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (firmId && commitment.entity.firmId !== firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check for blocking relationships
    const [callItems, distItems, capAccounts] = await Promise.all([
      prisma.capitalCallLineItem.count({
        where: { investorId: commitment.investorId, capitalCall: { entityId: commitment.entityId } },
      }),
      prisma.distributionLineItem.count({
        where: { investorId: commitment.investorId, distribution: { entityId: commitment.entityId } },
      }),
      prisma.capitalAccount.count({
        where: { investorId: commitment.investorId, entityId: commitment.entityId },
      }),
    ]);

    const blockers = [];
    if (callItems > 0) blockers.push(`${callItems} capital call line item(s)`);
    if (distItems > 0) blockers.push(`${distItems} distribution line item(s)`);
    if (capAccounts > 0) blockers.push(`${capAccounts} capital account record(s)`);

    if (blockers.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: commitment has ${blockers.join(", ")}. Remove them first.` },
        { status: 400 },
      );
    }

    await prisma.commitment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[commitments/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete commitment" }, { status: 500 });
  }
}
