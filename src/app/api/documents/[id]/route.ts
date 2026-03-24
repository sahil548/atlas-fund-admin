import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ExtractedFieldsSchema, AppliedFieldsSchema } from "@/lib/json-schemas";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDocumentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await getAuthUser();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      deal: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Sanitize high-risk JSON blob fields: extractedFields and appliedFields
  const safeExtracted = ExtractedFieldsSchema.safeParse(doc.extractedFields);
  const safeApplied = AppliedFieldsSchema.safeParse(doc.appliedFields);
  const sanitizedDoc = {
    ...doc,
    extractedFields: safeExtracted.success ? safeExtracted.data : null,
    appliedFields: safeApplied.success ? safeApplied.data : null,
  };

  return NextResponse.json(sanitizedDoc);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getAuthUser();

    const { data, error } = await parseBody(req, UpdateDocumentSchema);
    if (error) return error;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(data!.name !== undefined && { name: data!.name }),
        ...(data!.category !== undefined && { category: data!.category }),
        ...(data!.assetId !== undefined && { assetId: data!.assetId }),
        ...(data!.entityId !== undefined && { entityId: data!.entityId }),
        ...(data!.dealId !== undefined && { dealId: data!.dealId }),
      },
      include: {
        deal: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("[documents/[id]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getAuthUser();

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Try to delete from blob storage if URL exists
    if (doc.fileUrl) {
      try {
        const { del } = await import("@vercel/blob");
        await del(doc.fileUrl);
      } catch {
        // Blob deletion is best-effort — don't block document deletion
      }
    }

    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[documents/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
