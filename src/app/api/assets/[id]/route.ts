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
