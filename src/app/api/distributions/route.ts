import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDistributionSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const distributions = await prisma.distributionEvent.findMany({
      where: firmId ? { entity: { firmId } } : {},
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: true } },
      },
      orderBy: { distributionDate: "desc" },
    });
    return NextResponse.json(distributions);
  } catch (err) {
    console.error("[distributions] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to load distributions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { data, error } = await parseBody(req, CreateDistributionSchema);
    if (error) return error;

    const { autoGenerateLineItems, entityId, distributionDate, grossAmount, ...rest } = data!;

    const dist = await prisma.distributionEvent.create({
      data: {
        ...rest,
        entityId,
        grossAmount,
        distributionDate: new Date(distributionDate),
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
        // Pro-rata by commitment amount
        const lineItemsData = commitments.map((c) => {
          const share = c.amount / totalCommitments;
          const investorGross = grossAmount * share;
          const returnOfCapital = (rest.returnOfCapital ?? 0) * share;
          const income = (rest.income ?? 0) * share;
          const longTermGain = (rest.longTermGain ?? 0) * share;
          const carriedInterest = (rest.carriedInterest ?? 0) * share;
          const netAmount = (rest.netToLPs ?? 0) * share;

          return {
            distributionId: dist.id,
            investorId: c.investorId,
            grossAmount: investorGross,
            returnOfCapital,
            income,
            longTermGain,
            carriedInterest,
            netAmount,
            distributionType: rest.distributionType,
          };
        });

        await prisma.distributionLineItem.createMany({ data: lineItemsData });
      }
    }

    const distWithLineItems = await prisma.distributionEvent.findUnique({
      where: { id: dist.id },
      include: {
        entity: { select: { id: true, name: true } },
        lineItems: { include: { investor: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(distWithLineItems, { status: 201 });
  } catch (err) {
    console.error("[distributions] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to create distribution" },
      { status: 500 },
    );
  }
}
