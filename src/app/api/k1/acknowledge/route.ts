/**
 * POST /api/k1/acknowledge
 * Batch-acknowledge K-1 documents for an investor.
 *
 * Body: { documentIds: string[], investorId: string }
 * Returns: { acknowledged: number, acknowledgedAt: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/* eslint-disable @typescript-eslint/no-explicit-any */

const AcknowledgeSchema = z.object({
  documentIds: z.array(z.string()).min(1),
  investorId: z.string(),
});

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data, error } = await parseBody(req, AcknowledgeSchema);
  if (error) return error;

  const { documentIds, investorId } = data!;

  try {
    // Verify all documents belong to the investor and are TAX category
    const docs = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        category: "TAX",
      },
      select: { id: true, investorId: true },
    });

    // Check that all requested docs were found as TAX documents
    if (docs.length !== documentIds.length) {
      return NextResponse.json(
        { error: "One or more documents not found or not K-1 documents" },
        { status: 400 }
      );
    }

    // Verify all documents belong to the specified investor
    const foreignDocs = docs.filter((d) => d.investorId !== investorId);
    if (foreignDocs.length > 0) {
      return NextResponse.json(
        { error: "One or more documents do not belong to the specified investor" },
        { status: 403 }
      );
    }

    const acknowledgedAt = new Date();

    // Batch update all matching documents
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentIds },
        investorId,
        category: "TAX",
      },
      data: {
        acknowledgedAt,
        acknowledgedByInvestorId: investorId,
      },
    });

    // Fire-and-forget audit log
    logAudit(
      authUser.firmId,
      authUser.id,
      "K1_ACKNOWLEDGE",
      "Document",
      documentIds.join(","),
      { count: documentIds.length, investorId }
    ).catch((err) => logger.error("[audit] K1_ACKNOWLEDGE failed:", { error: err instanceof Error ? err.message : String(err) }));

    return NextResponse.json({
      acknowledged: result.count,
      acknowledgedAt: acknowledgedAt.toISOString(),
    });
  } catch (err: any) {
    logger.error("[k1/acknowledge]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err.message || "Failed to acknowledge K-1 documents" },
      { status: 500 }
    );
  }
}
