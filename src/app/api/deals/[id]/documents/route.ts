import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { getAuthUser } from "@/lib/auth";
import { extractTextFromBuffer, extractDocumentFields, shouldExtractAI } from "@/lib/document-extraction";
import { logger } from "@/lib/logger";

// Allow time for PDF text extraction on Vercel serverless
export const maxDuration = 60;

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

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
    const authUser = await getAuthUser();
    const firmId = new URL(req.url).searchParams.get("firmId") || authUser?.firmId || null;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Untitled";
    const category = (formData.get("category") as string) || "OTHER";

    let fileUrl: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let buffer: Buffer | null = null;
    let originalFileName: string | null = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      originalFileName = file.name;
      mimeType = file.type || "application/octet-stream";
      fileSize = buffer.length;

      if (USE_BLOB) {
        // ── Vercel Blob (production) ──
        const blob = await put(`documents/${fileName}`, buffer, {
          access: "private",
          contentType: mimeType,
        });
        // Serve via proxy route (works with both private and public blob stores)
        fileUrl = `/api/documents/serve?url=${encodeURIComponent(blob.url)}`;
      } else {
        // ── Local filesystem (development) ──
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        fileUrl = `/api/documents/download/${fileName}`;
      }
    }

    // Extract text content from in-memory buffer
    let extractedText: string | null = null;
    if (buffer && originalFileName && mimeType) {
      try {
        const text = await extractTextFromBuffer(buffer, originalFileName, mimeType);
        if (text.length > 0) extractedText = text;
      } catch (err) {
        logger.error("[documents] Text extraction failed:", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    const document = await prisma.document.create({
      data: {
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: category as any,
        dealId: id,
        fileUrl,
        fileSize,
        mimeType,
        extractedText,
      },
    });

    // Trigger AI extraction async (fire-and-forget) — locked decision: auto-extract on upload
    // NEVER await this — the upload response must return immediately
    // NOTE: On Vercel serverless, background work may be killed after response.
    // Use POST /api/documents/[id]/extract for guaranteed extraction on failure.
    if (extractedText && firmId && shouldExtractAI(document.category)) {
      extractDocumentFields(document.id, document.category, extractedText, firmId, authUser?.id)
        .catch((err) => {
          logger.error("[deal-docs] Background AI extraction error:", { error: err instanceof Error ? err.message : String(err) });
        });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    logger.error("[documents POST] Error:", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
