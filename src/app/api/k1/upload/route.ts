/**
 * POST /api/k1/upload
 * Bulk K-1 PDF upload with filename-based investor matching.
 *
 * Accepts multipart/form-data:
 *   - files: PDF files (multiple)
 *   - entityId: string
 *   - taxYear: string (e.g. "2025")
 *
 * Filename pattern: "K1_InvestorName_2025.pdf" → matches investor "Investor Name"
 *
 * Returns { uploaded, matched, unmatched: string[] }
 */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { notifyInvestorsOnK1Available } from "@/lib/notification-delivery";
import { normalizeName, extractInvestorNameFromFilename, matchInvestor } from "@/lib/k1-matching";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    if (authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "reports", "full")) return forbidden();
    }

    const formData = await req.formData();
    const entityId = formData.get("entityId") as string | null;
    const taxYear = formData.get("taxYear") as string | null;

    if (!entityId || !taxYear) {
      return NextResponse.json(
        { error: "entityId and taxYear are required" },
        { status: 400 },
      );
    }

    // Validate entity belongs to this firm
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, name: true, firmId: true },
    });

    if (!entity || entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Fetch all investors with commitments to this entity
    const investors = await prisma.investor.findMany({
      where: {
        commitments: {
          some: { entityId },
        },
      },
      select: { id: true, name: true },
    });

    // Collect all files from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    let matched = 0;
    const unmatched: string[] = [];

    // Process each file
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Vercel Blob (or local fallback)
      const blobPath = `k1/${entityId}/${taxYear}/${file.name}`;
      let blobUrl: string;
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: "application/pdf",
        });
        blobUrl = blob.url;
      } else {
        blobUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
      }

      // Try to match investor by filename
      const extractedName = extractInvestorNameFromFilename(file.name);
      let matchedInvestor: { id: string; name: string } | null = null;

      if (extractedName) {
        matchedInvestor = matchInvestor(extractedName, investors);
      }

      // Create Document record (with or without investorId)
      await prisma.document.create({
        data: {
          name: file.name,
          category: "TAX",
          fileUrl: blobUrl,
          fileSize: buffer.length,
          mimeType: "application/pdf",
          entityId,
          investorId: matchedInvestor?.id ?? null,
        },
      });

      if (matchedInvestor) {
        matched++;
        // Fire-and-forget LP email notification
        notifyInvestorsOnK1Available({
          investorId: matchedInvestor.id,
          entityName: entity.name,
          taxYear: parseInt(taxYear, 10),
        }).catch((err: any) => {
          console.error(
            "[k1/upload] Failed to notify investor:",
            matchedInvestor?.id,
            err,
          );
        });
      } else {
        unmatched.push(file.name);
      }
    }

    return NextResponse.json(
      {
        uploaded: files.length,
        matched,
        unmatched,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[k1/upload]", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload K-1 files" },
      { status: 500 },
    );
  }
}
