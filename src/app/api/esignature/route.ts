/**
 * POST /api/esignature
 * Creates an ESignaturePackage and sends the document for signature via DocuSign.
 * Accepts either documentId (Document model) or fileUrl + documentName directly.
 *
 * GET /api/esignature?dealId=xxx&entityId=xxx&documentId=xxx
 * Lists ESignaturePackages filtered by dealId, entityId, or documentId.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getDocuSignClient } from "@/lib/docusign";
import { parseBody } from "@/lib/api-helpers";
import { CreateESignatureSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data: parsed, error: parseError } = await parseBody(req, CreateESignatureSchema);
  if (parseError) return parseError;

  const { title, documentId, fileUrl: directFileUrl, documentName: directDocName, dealId, entityId, signers, subject } = parsed!;

  if (!documentId && !directFileUrl) {
    return NextResponse.json({ error: "Either documentId or fileUrl is required" }, { status: 400 });
  }

  // Verify DocuSign is connected for this firm
  const client = await getDocuSignClient(authUser.firmId);
  if (!client) {
    return NextResponse.json(
      { error: "DocuSign not connected. Please connect DocuSign in Settings.", code: "DOCUSIGN_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  // Resolve document name and URL
  let resolvedFileUrl: string;
  let resolvedDocName: string;
  let resolvedDocumentId: string | null = documentId ?? null;

  if (documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, name: true, fileUrl: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!doc.fileUrl) {
      return NextResponse.json(
        { error: "Document has no file attached. Please upload a file first." },
        { status: 400 }
      );
    }

    resolvedFileUrl = doc.fileUrl;
    resolvedDocName = doc.name;
  } else {
    // Direct fileUrl (e.g., from closing checklist attachment)
    resolvedFileUrl = directFileUrl!;
    resolvedDocName = directDocName ?? title;
    resolvedDocumentId = null;
  }

  // Download the document from its URL
  let documentBuffer: Buffer;
  try {
    const fileRes = await fetch(resolvedFileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch document: ${fileRes.status}`);
    }
    const arrayBuf = await fileRes.arrayBuffer();
    documentBuffer = Buffer.from(arrayBuf);
  } catch (err) {
    logger.error("[esignature] Failed to download document:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to retrieve document file" }, { status: 500 });
  }

  // Create DocuSign envelope
  let envelopeId: string;
  try {
    envelopeId = await client.createEnvelope({
      documentBuffer,
      documentName: resolvedDocName,
      signers,
      subject: subject ?? `Please sign: ${title}`,
    });
  } catch (err) {
    logger.error("[esignature] Failed to create DocuSign envelope:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to send document for signature via DocuSign" }, { status: 500 });
  }

  // Create ESignaturePackage record
  const pkg = await prisma.eSignaturePackage.create({
    data: {
      title,
      status: "SENT",
      provider: "docusign",
      externalId: envelopeId,
      documentId: resolvedDocumentId,
      dealId: dealId ?? null,
      entityId: entityId ?? null,
      signers: signers as unknown as import("@prisma/client").Prisma.InputJsonValue,
      sentAt: new Date(),
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}

export async function GET(req: NextRequest): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { searchParams } = req.nextUrl;
  const dealId = searchParams.get("dealId");
  const entityId = searchParams.get("entityId");
  const documentId = searchParams.get("documentId");

  const where: Record<string, unknown> = {};
  if (dealId) where.dealId = dealId;
  if (entityId) where.entityId = entityId;
  if (documentId) where.documentId = documentId;

  const packages = await prisma.eSignaturePackage.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(packages);
}
