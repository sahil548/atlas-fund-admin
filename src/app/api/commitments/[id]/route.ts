import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { PatchCommitmentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const { data, error } = await parseBody(req, PatchCommitmentSchema);
    if (error) return error;
    const { amount } = data!;

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
    logger.error("[commitments/[id]]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update commitment" }, { status: 500 });
  }
}
