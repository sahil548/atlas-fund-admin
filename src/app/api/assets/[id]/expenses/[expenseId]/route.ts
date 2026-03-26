import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const UpdateExpenseSchema = z.object({
  category: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
});

type Params = { params: Promise<{ id: string; expenseId: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id, expenseId } = await params;
    await getAuthUser();

    const body = await req.json();
    const parsed = UpdateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await prisma.assetExpense.findFirst({
      where: { id: expenseId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const updated = await prisma.assetExpense.update({
      where: { id: expenseId },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[expenses/[expenseId]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, expenseId } = await params;
    await getAuthUser();

    const existing = await prisma.assetExpense.findFirst({
      where: { id: expenseId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.assetExpense.delete({ where: { id: expenseId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[expenses/[expenseId]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
