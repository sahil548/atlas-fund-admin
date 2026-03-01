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
              assetAllocations: {
                include: {
                  asset: {
                    include: { equityDetails: true, creditDetails: true, realEstateDetails: true, fundLPDetails: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(investor);
}
