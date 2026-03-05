import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

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
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Untitled";
    const category = (formData.get("category") as string) || "OTHER";
    const assetId = (formData.get("assetId") as string) || undefined;
    const entityId = (formData.get("entityId") as string) || undefined;
    const dealId = (formData.get("dealId") as string) || undefined;

    let fileUrl: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      mimeType = file.type || "application/octet-stream";
      fileSize = buffer.length;

      if (USE_BLOB) {
        // ── Vercel Blob (production) ──
        const blob = await put(`documents/${fileName}`, buffer, {
          access: "public",
          contentType: mimeType,
        });
        fileUrl = blob.url;
      } else {
        // ── Local filesystem (development) ──
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        fileUrl = `/api/documents/download/${fileName}`;
      }
    }

    const doc = await prisma.document.create({
      data: {
        name,
        category: category as any,
        assetId,
        entityId,
        dealId,
        fileUrl,
        fileSize,
        mimeType,
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[documents POST] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
