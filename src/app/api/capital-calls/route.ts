import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateCapitalCallSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const calls = await prisma.capitalCall.findMany({
      where: firmId ? { entity: { firmId } } : {},
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: true } },
      },
      orderBy: { callDate: "desc" },
    });
    return NextResponse.json(calls);
  } catch (err) {
    console.error("[capital-calls] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load capital calls" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateCapitalCallSchema);
    if (error) return error;

    const { autoGenerateLineItems, entityId, callDate, dueDate, amount, ...rest } = data!;

    const call = await prisma.capitalCall.create({
      data: {
        ...rest,
        entityId,
        amount,
        callDate: new Date(callDate),
        dueDate: new Date(dueDate),
      },
    });

    // Auto-generate pro-rata line items from entity commitments
    if (autoGenerateLineItems) {
      const commitments = await prisma.commitment.findMany({
        where: { entityId },
        select: { investorId: true, amount: true },
      });

      const totalCommitments = commitments.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      if (commitments.length > 0 && totalCommitments > 0) {
        await prisma.capitalCallLineItem.createMany({
          data: commitments.map((c) => ({
            capitalCallId: call.id,
            investorId: c.investorId,
            amount: (c.amount / totalCommitments) * amount,
            status: "Pending",
          })),
        });
      }
    }

    const callWithLineItems = await prisma.capitalCall.findUnique({
      where: { id: call.id },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(callWithLineItems, { status: 201 });
  } catch (e: unknown) {
    console.error("[capital-calls] POST Error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
