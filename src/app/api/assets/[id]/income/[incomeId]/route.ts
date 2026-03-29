import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateIncomeEventSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; incomeId: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id, incomeId } = await params;
    await getAuthUser();

    const { data, error } = await parseBody(req, UpdateIncomeEventSchema);
    if (error) return error;

    const existing = await prisma.incomeEvent.findFirst({
      where: { id: incomeId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Income event not found" }, { status: 404 });
    }

    const updated = await prisma.incomeEvent.update({
      where: { id: incomeId },
      data: {
        ...(data!.incomeType !== undefined && { incomeType: data!.incomeType }),
        ...(data!.amount !== undefined && { amount: data!.amount }),
        ...(data!.date && { date: new Date(data!.date) }),
        ...(data!.description !== undefined && { description: data!.description }),
        ...(data!.isPrincipal !== undefined && { isPrincipal: data!.isPrincipal }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[income/[incomeId]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update income event" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, incomeId } = await params;
    await getAuthUser();

    const existing = await prisma.incomeEvent.findFirst({
      where: { id: incomeId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Income event not found" }, { status: 404 });
    }

    await prisma.incomeEvent.delete({ where: { id: incomeId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[income/[incomeId]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete income event" }, { status: 500 });
  }
}
