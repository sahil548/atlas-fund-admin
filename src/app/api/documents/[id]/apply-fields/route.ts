import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/documents/[id]/apply-fields
 *
 * Legacy endpoint — previously used to apply type-specific extracted fields
 * to parent deal/asset/entity records. Now that extraction produces universal
 * summaries instead of structured fields, this endpoint is retained for
 * backward compatibility but simply returns a no-op success.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await getAuthUser();

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    message: "Document summaries are read-only. No fields to apply.",
  });
}
