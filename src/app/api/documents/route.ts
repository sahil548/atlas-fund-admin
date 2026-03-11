import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/pagination";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { extractTextFromBuffer, extractDocumentFields, shouldExtractAI } from "@/lib/document-extraction";
import { parseBody } from "@/lib/api-helpers";
import { PatchDocumentLinkSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();

  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "documents", "read_only")) return forbidden();
  }

  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");

  const entityId = req.nextUrl.searchParams.get("entityId") || undefined;

  const params = parsePaginationParams(req.nextUrl.searchParams, [
    "firmId", "cursor", "limit", "search", "category",
  ]);

  const baseWhere: Record<string, unknown> = {};
  if (entityId) {
    // Filter documents belonging to the specified entity
    baseWhere.entityId = entityId;
  } else if (firmId) {
    baseWhere.OR = [
      { entity: { firmId } },
      { deal: { firmId } },
      { asset: { entityAllocations: { some: { entity: { firmId } } } } },
    ];
  }
  if (params.filters?.category) baseWhere.category = params.filters.category;

  // For documents, search across name field
  const searchWhere = params.search
    ? { name: { contains: params.search, mode: "insensitive" as const } }
    : {};

  const where = { ...baseWhere, ...searchWhere };

  const [rawDocs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      take: params.limit + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: { uploadDate: "desc" },
      include: {
        asset: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  const paginated = buildPaginatedResult(rawDocs, params.limit, total);

  return NextResponse.json({
    data: paginated.data,
    nextCursor: paginated.nextCursor,
    hasMore: paginated.hasMore,
    total: paginated.total,
  });
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    if (authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "documents", "full")) return forbidden();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Untitled";
    const category = (formData.get("category") as string) || "OTHER";
    const assetId = (formData.get("assetId") as string) || undefined;
    const entityId = (formData.get("entityId") as string) || undefined;
    const dealId = (formData.get("dealId") as string) || undefined;
    const capitalCallId = (formData.get("capitalCallId") as string) || undefined;
    const distributionEventId = (formData.get("distributionEventId") as string) || undefined;

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
        const blob = await put(`documents/${fileName}`, buffer, {
          access: "private",
          contentType: mimeType,
        });
        fileUrl = `/api/documents/serve?url=${encodeURIComponent(blob.url)}`;
      } else {
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        fileUrl = `/api/documents/download/${fileName}`;
      }
    }

    // Extract text content from in-memory buffer (must happen before document creation)
    let extractedText: string | null = null;
    if (buffer && originalFileName && mimeType) {
      try {
        const text = await extractTextFromBuffer(buffer, originalFileName, mimeType);
        if (text.length > 0) extractedText = text;
      } catch (err) {
        logger.error("[documents] Text extraction failed:", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    const doc = await prisma.document.create({
      data: {
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: category as any,
        assetId,
        entityId,
        dealId,
        capitalCallId,
        distributionEventId,
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
    const firmId = authUser?.firmId || new URL(req.url).searchParams.get("firmId") || null;
    if (doc.extractedText && firmId && shouldExtractAI(doc.category)) {
      extractDocumentFields(doc.id, doc.category, doc.extractedText, firmId, authUser?.id)
        .catch((err) => {
          logger.error("[documents] Background AI extraction error:", { error: err instanceof Error ? err.message : String(err) });
        });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    logger.error("[documents POST] Error:", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { data, error } = await parseBody(req, PatchDocumentLinkSchema);
    if (error) return error;
    const { documentId, capitalCallId, distributionEventId } = data!;

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(capitalCallId !== undefined && { capitalCallId }),
        ...(distributionEventId !== undefined && { distributionEventId }),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Document not found" }, { status: 404 });
    logger.error("[documents] PATCH error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
