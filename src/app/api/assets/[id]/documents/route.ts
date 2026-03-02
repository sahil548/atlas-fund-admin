import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDocumentSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDocumentSchema);
  if (error) return error;
  const doc = await prisma.document.create({
    data: {
      ...data!,
      uploadDate: new Date(),
      mimeType: "application/pdf",
      fileSize: 0,
    },
  });
  return NextResponse.json(doc, { status: 201 });
}
