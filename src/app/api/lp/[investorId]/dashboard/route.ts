import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      commitments: {
        include: {
          entity: {
            include: {
              navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
            },
          },
        },
      },
      capitalAccounts: { orderBy: { periodDate: "desc" }, take: 1 },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalCommitted = investor.commitments.reduce((s, c) => s + c.amount, 0);
  const totalCalled = investor.commitments.reduce((s, c) => s + c.calledAmount, 0);

  return NextResponse.json({
    investor,
    totalCommitted,
    totalCalled,
    commitments: investor.commitments,
  });
}
