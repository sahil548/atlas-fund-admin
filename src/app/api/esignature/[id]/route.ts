/**
 * GET /api/esignature/[id]
 * Returns a single ESignaturePackage by ID.
 *
 * PATCH /api/esignature/[id]
 * Manual status refresh — calls DocuSign API for current status and updates record.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getDocuSignClient } from "@/lib/docusign";
import { logger } from "@/lib/logger";

function mapDocuSignStatus(dsStatus: string): string | null {
  switch (dsStatus.toLowerCase()) {
    case "sent": return "SENT";
    case "delivered": return "VIEWED";
    case "completed": return "COMPLETED";
    case "declined": return "DECLINED";
    case "voided": return "DECLINED";
    default: return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  const pkg = await prisma.eSignaturePackage.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "ESignaturePackage not found" }, { status: 404 });
  }

  return NextResponse.json(pkg);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  const pkg = await prisma.eSignaturePackage.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "ESignaturePackage not found" }, { status: 404 });
  }

  if (!pkg.externalId) {
    return NextResponse.json({ error: "No DocuSign envelope ID on this package" }, { status: 400 });
  }

  const client = await getDocuSignClient(authUser.firmId);
  if (!client) {
    return NextResponse.json({ error: "DocuSign not connected" }, { status: 400 });
  }

  let dsStatus: string;
  try {
    dsStatus = await client.getEnvelopeStatus(pkg.externalId);
  } catch (err) {
    logger.error("[esignature/[id]] Status check failed:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch status from DocuSign" }, { status: 500 });
  }

  const atlasStatus = mapDocuSignStatus(dsStatus);
  if (!atlasStatus) {
    return NextResponse.json({ message: `Status ${dsStatus} not mapped`, pkg });
  }

  const updateData: Record<string, unknown> = { status: atlasStatus };
  if (atlasStatus === "COMPLETED" && !pkg.completedAt) {
    updateData.completedAt = new Date();
  }

  const updated = await prisma.eSignaturePackage.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
