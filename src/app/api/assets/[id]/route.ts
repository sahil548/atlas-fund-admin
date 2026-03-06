import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAssetSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      sourceDeal: {
        select: {
          id: true,
          name: true,
          assetClass: true,
          stage: true,
          targetSize: true,
          targetReturn: true,
          counterparty: true,
          dealMetadata: true,
          dealLeadId: true,
          dealLead: { select: { id: true, name: true, initials: true } },
          screeningResult: {
            select: {
              score: true,
              summary: true,
              strengths: true,
              risks: true,
              recommendation: true,
              memo: true,
              memoGeneratedAt: true,
              ddFindings: true,
            },
          },
          workstreams: {
            include: {
              tasks: true,
            },
          },
          icProcess: { include: { votes: true } },
        },
      },
      entityAllocations: { include: { entity: true } },
      equityDetails: true,
      creditDetails: true,
      realEstateDetails: true,
      fundLPDetails: true,
      leases: true,
      creditAgreements: { include: { covenants: true, payments: { orderBy: { date: "desc" } } } },
      valuations: { orderBy: { valuationDate: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      documents: { orderBy: { uploadDate: "desc" } },
      meetings: { orderBy: { meetingDate: "desc" } },
      incomeEvents: { orderBy: { date: "desc" } },
      activityEvents: { orderBy: { eventDate: "desc" } },
    },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateAssetSchema);
  if (error) return error;
  const asset = await prisma.asset.update({ where: { id }, data: data! });
  return NextResponse.json(asset);
}
