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
import { PatchDocumentLinkSchema, DocumentFormDataSchema, CreateDocumentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { DocumentCategory } from "@prisma/client";

const VALID_CATEGORIES = Object.values(DocumentCategory) as string[];

function parseDocumentCategory(value: string): DocumentCategory {
  if (VALID_CATEGORIES.includes(value)) return value as DocumentCategory;
  return DocumentCategory.OTHER;
}

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

    const contentType = req.headers.get("content-type") ?? "";

    // ── multipart/form-data branch (file upload from the Upload modal) ──────
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      // 1. Validate the file part separately — Zod does not natively model File objects.
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "A file is required" }, { status: 400 });
      }

      // 2. Extract scalar fields and validate them via DocumentFormDataSchema.
      //    NOTE: parseBody() is for JSON bodies and does NOT support multipart — we
      //    call .safeParse() directly on the constructed plain object.
      const parsed = DocumentFormDataSchema.safeParse({
        name: form.get("name")?.toString() ?? "",
        category: form.get("category")?.toString() ?? "",
        firmId: form.get("firmId")?.toString() ?? (authUser?.firmId ?? ""),
        associatedDealId: form.get("associatedDealId")?.toString() || undefined,
        associatedEntityId: form.get("associatedEntityId")?.toString() || undefined,
        associatedAssetId: form.get("associatedAssetId")?.toString() || undefined,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid form data" },
          { status: 400 },
        );
      }
      const { name, category, firmId: formFirmId, associatedDealId, associatedEntityId, associatedAssetId } = parsed.data;

      // Also read legacy field names that other callers (deal documents tab, etc.) may send
      const capitalCallId = form.get("capitalCallId")?.toString() || undefined;
      const distributionEventId = form.get("distributionEventId")?.toString() || undefined;

      // 3. Persist the file.
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const originalFileName = file.name;
      const mimeType = file.type || "application/octet-stream";
      const fileSize = buffer.length;

      let fileUrl: string;
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

      // 4. Extract text content (must happen before document creation).
      let extractedText: string | null = null;
      try {
        const text = await extractTextFromBuffer(buffer, originalFileName, mimeType);
        if (text.length > 0) extractedText = text;
      } catch (err) {
        logger.error("[documents] Text extraction failed:", { error: err instanceof Error ? err.message : String(err) });
      }

      const doc = await prisma.document.create({
        data: {
          name,
          category: parseDocumentCategory(category),
          assetId: associatedAssetId || undefined,
          entityId: associatedEntityId || undefined,
          dealId: associatedDealId || undefined,
          capitalCallId,
          distributionEventId,
          fileUrl,
          fileSize,
          mimeType,
          extractedText,
        },
      });

      // Trigger AI extraction async (fire-and-forget).
      const firmIdForAI = authUser?.firmId ?? formFirmId;
      if (doc.extractedText && firmIdForAI && shouldExtractAI(doc.category)) {
        extractDocumentFields(doc.id, doc.category, doc.extractedText, firmIdForAI, authUser?.id)
          .catch((err) => {
            logger.error("[documents] Background AI extraction error:", { error: err instanceof Error ? err.message : String(err) });
          });
      }

      return NextResponse.json(doc, { status: 201 });
    }

    // ── JSON branch (legacy callers — metadata-only, no file) ───────────────
    const { data, error } = await parseBody(req, CreateDocumentSchema);
    if (error) return error;
    const { name, category, assetId, entityId, dealId } = data!;

    const doc = await prisma.document.create({
      data: {
        name,
        category: parseDocumentCategory(category),
        assetId,
        entityId,
        dealId,
        fileUrl: null,
        fileSize: null,
        mimeType: null,
        extractedText: null,
      },
    });

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
