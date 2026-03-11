/**
 * POST /api/docusign/webhook
 *
 * Receives DocuSign Connect webhook events for envelope status updates.
 * No Clerk auth — DocuSign calls this from its servers.
 * Updates ESignaturePackage status based on envelope event type.
 * On COMPLETED: downloads signed document and stores back in Atlas.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDocuSignClient } from "@/lib/docusign";
import { put } from "@vercel/blob";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { logger } from "@/lib/logger";

/* eslint-disable @typescript-eslint/no-explicit-any */

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

/** Maps DocuSign envelope status strings to ESignatureStatus enum values */
function mapDocuSignStatus(dsStatus: string): string | null {
  switch (dsStatus.toLowerCase()) {
    case "sent":
      return "SENT";
    case "delivered":
      return "VIEWED";
    case "completed":
      return "COMPLETED";
    case "declined":
      return "DECLINED";
    case "voided":
      return "DECLINED";
    default:
      return null;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: any;

  // DocuSign sends XML or JSON depending on Connect config.
  // We handle JSON (set in DocuSign Connect config: "JSON" format).
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Attempt to parse as JSON regardless of content-type header
      const text = await req.text();
      body = JSON.parse(text);
    }
  } catch (err) {
    logger.error("[docusign/webhook] Failed to parse body:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // DocuSign Connect JSON format: { event, envelopeId, status, ... }
  // The exact shape depends on the Connect configuration.
  // Try to extract envelopeId from both top-level and nested formats.
  const envelopeId: string | undefined =
    body.envelopeId ||
    body.EnvelopeID ||
    body.data?.envelopeId ||
    body.data?.envelopeSummary?.envelopeId;

  const dsStatus: string | undefined =
    body.status ||
    body.Status ||
    body.data?.envelopeSummary?.status;

  if (!envelopeId || !dsStatus) {
    logger.warn("[docusign/webhook] Missing envelopeId or status in payload:", JSON.stringify(body).slice(0, 500));
    // Return 200 so DocuSign doesn't retry indefinitely
    return NextResponse.json({ message: "Event acknowledged (no actionable data)" });
  }

  const atlasStatus = mapDocuSignStatus(dsStatus);
  if (!atlasStatus) {
    // Unrecognized status — acknowledge but don't update
    return NextResponse.json({ message: `Event acknowledged (status=${dsStatus} not mapped)` });
  }

  // Find the ESignaturePackage by externalId (envelope ID)
  const pkg = await prisma.eSignaturePackage.findFirst({
    where: { externalId: envelopeId },
  });

  if (!pkg) {
    logger.warn(`[docusign/webhook] No ESignaturePackage found for envelopeId=${envelopeId}`);
    return NextResponse.json({ message: "Acknowledged — package not found" });
  }

  const updateData: Record<string, any> = { status: atlasStatus };
  if (atlasStatus === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  // Update ESignaturePackage status
  await prisma.eSignaturePackage.update({
    where: { id: pkg.id },
    data: updateData,
  });

  // If COMPLETED: download signed document and store back into Atlas
  if (atlasStatus === "COMPLETED" && pkg.documentId) {
    try {
      // Find the firm via deal or entity
      let firmId: string | null = null;
      if (pkg.dealId) {
        const deal = await prisma.deal.findUnique({ where: { id: pkg.dealId }, select: { firmId: true } });
        firmId = deal?.firmId ?? null;
      } else if (pkg.entityId) {
        const entity = await prisma.entity.findUnique({ where: { id: pkg.entityId }, select: { firmId: true } });
        firmId = entity?.firmId ?? null;
      }

      if (firmId) {
        const client = await getDocuSignClient(firmId);
        if (client) {
          const signedBuffer = await client.downloadSignedDocument(envelopeId);
          const signedFileName = `signed-${envelopeId}-${Date.now()}.pdf`;

          let signedUrl: string;

          if (USE_BLOB) {
            const blob = await put(`signed-documents/${signedFileName}`, signedBuffer, {
              access: "public",
              contentType: "application/pdf",
            });
            signedUrl = blob.url;
          } else {
            // Local fallback
            const uploadDir = path.join(process.cwd(), "public", "uploads", "signed-documents");
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, signedFileName), signedBuffer);
            signedUrl = `/uploads/signed-documents/${signedFileName}`;
          }

          // Create a new Document record for the signed version
          await prisma.document.create({
            data: {
              name: `Signed — ${pkg.title}`,
              category: "LEGAL",
              fileUrl: signedUrl,
              mimeType: "application/pdf",
              fileSize: signedBuffer.length,
              ...(pkg.dealId && { dealId: pkg.dealId }),
              ...(pkg.entityId && { entityId: pkg.entityId }),
            },
          });

          logger.info(`[docusign/webhook] Signed document stored for envelope ${envelopeId}`);
        }
      }
    } catch (err) {
      // Non-fatal — status was already updated
      logger.error(`[docusign/webhook] Failed to download/store signed document for ${envelopeId}:`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ message: "Webhook processed", status: atlasStatus });
}
