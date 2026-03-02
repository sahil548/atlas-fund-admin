import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDocumentSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { dealId: id },
    orderBy: { uploadDate: "desc" },
  });
  return NextResponse.json(documents);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, CreateDocumentSchema);
  if (error) return error;
  const document = await prisma.document.create({
    data: { ...data!, dealId: id, mimeType: "application/pdf", fileSize: 0 },
  });
  return NextResponse.json(document, { status: 201 });
}
