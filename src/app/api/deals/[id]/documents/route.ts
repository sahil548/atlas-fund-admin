import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { extractTextFromFile } from "@/lib/document-extraction";

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
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Untitled";
    const category = (formData.get("category") as string) || "OTHER";

    let fileUrl: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let diskFileName: string | null = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), "data", "uploads");
      await mkdir(uploadDir, { recursive: true });
      diskFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const filePath = path.join(uploadDir, diskFileName);
      await writeFile(filePath, buffer);
      fileUrl = `/api/documents/download/${diskFileName}`;
      fileSize = buffer.length;
      mimeType = file.type || "application/octet-stream";
    }

    // Extract text content (non-blocking — store even if extraction fails)
    let extractedText: string | null = null;
    if (diskFileName && mimeType) {
      try {
        const text = await extractTextFromFile(diskFileName, mimeType);
        if (text.length > 0) extractedText = text;
      } catch (err) {
        console.error("[documents] Text extraction failed:", err);
      }
    }

    const document = await prisma.document.create({
      data: {
        name,
        category: category as any,
        dealId: id,
        fileUrl,
        fileSize,
        mimeType,
        extractedText,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[documents POST] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
