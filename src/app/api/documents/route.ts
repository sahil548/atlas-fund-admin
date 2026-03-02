import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDocumentSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const where: Record<string, unknown> = {};
  if (firmId) {
    where.OR = [
      { entity: { firmId } },
      { deal: { firmId } },
      { asset: { entityAllocations: { some: { entity: { firmId } } } } },
    ];
  }

  const docs = await prisma.document.findMany({
    where,
    include: {
      asset: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      deal: { select: { id: true, name: true } },
    },
    orderBy: { uploadDate: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDocumentSchema);
  if (error) return error;
  const doc = await prisma.document.create({
    data: { ...data!, mimeType: "application/pdf", fileSize: 0 },
  });
  return NextResponse.json(doc, { status: 201 });
}
