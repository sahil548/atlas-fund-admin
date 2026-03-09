import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { extractDocumentFields } from "@/lib/document-extraction";

// Allow time for AI extraction — up to 60 seconds
export const maxDuration = 60;

/**
 * POST /api/documents/[id]/extract?firmId=xxx
 *
 * Manual retry endpoint for AI field extraction on a specific document.
 * Used when automatic extraction failed or was skipped.
 * Unlike the upload path, this AWAITS the extraction so the caller sees the result.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const firmId = new URL(req.url).searchParams.get("firmId") || authUser.firmId;
  if (!firmId) return NextResponse.json({ error: "firmId required" }, { status: 400 });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      extractedText: true,
      extractionStatus: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (!doc.extractedText) {
    return NextResponse.json(
      { error: "No extracted text available for AI processing" },
      { status: 400 },
    );
  }

  // Reset status to PROCESSING before retrying
  await prisma.document.update({
    where: { id },
    data: { extractionStatus: "PROCESSING", extractionError: null },
  });

  // Run extraction — this time we DO await since the user explicitly triggered retry
  // and expects to see the result synchronously
  try {
    await extractDocumentFields(doc.id, doc.category, doc.extractedText, firmId, authUser.id);

    const updated = await prisma.document.findUnique({
      where: { id },
      select: {
        extractionStatus: true,
        extractedFields: true,
        extractionError: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json(
      { error: "Extraction failed", details: message },
      { status: 500 },
    );
  }
}
