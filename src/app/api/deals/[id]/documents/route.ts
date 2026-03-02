import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

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
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "Untitled";
  const category = (formData.get("category") as string) || "OTHER";

  let fileUrl: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    fileUrl = `/api/documents/download/${fileName}`;
    fileSize = buffer.length;
    mimeType = file.type || "application/octet-stream";
  }

  const document = await prisma.document.create({
    data: {
      name,
      category: category as any,
      dealId: id,
      fileUrl,
      fileSize,
      mimeType,
    },
  });
  return NextResponse.json(document, { status: 201 });
}
