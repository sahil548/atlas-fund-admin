import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const body = await req.json();
    const { amount } = body;

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

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

    const oldAmount = commitment.amount;
    const delta = amount - oldAmount;

    // Log audit trail as a Transaction record before updating
    await prisma.transaction.create({
      data: {
        entityId: commitment.entityId,
        transactionType: "TRANSFER",
        description: `Commitment adjusted: $${oldAmount.toLocaleString()} -> $${amount.toLocaleString()}`,
        amount: delta,
        date: new Date(),
      },
    });

    // Update the commitment
    const updated = await prisma.commitment.update({
      where: { id },
      data: { amount },
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[commitments/[id]]", err);
    return NextResponse.json({ error: "Failed to update commitment" }, { status: 500 });
  }
}
