import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { CreateCommitmentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const sp = req.nextUrl.searchParams;
    const entityId = sp.get("entityId");
    const investorId = sp.get("investorId");

    const where: Record<string, unknown> = {};
    if (entityId) where.entityId = entityId;
    if (investorId) where.investorId = investorId;
    if (firmId) where.entity = { firmId };

    const commitments = await prisma.commitment.findMany({
      where,
      include: {
        investor: { select: { id: true, name: true, investorType: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(commitments);
  } catch (err) {
    logger.error("[commitments] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load commitments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const { data, error } = await parseBody(req, CreateCommitmentSchema);
    if (error) return error;

    // Verify entity belongs to firm
    if (firmId) {
      const entity = await prisma.entity.findFirst({
        where: { id: data!.entityId, firmId },
      });
      if (!entity) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
    }

    // Verify investor exists
    const investor = await prisma.investor.findUnique({
      where: { id: data!.investorId },
    });
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Check for duplicate commitment (same investor + entity)
    const existing = await prisma.commitment.findFirst({
      where: { investorId: data!.investorId, entityId: data!.entityId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A commitment already exists for this investor and entity. Edit the existing commitment instead." },
        { status: 400 },
      );
    }

    const commitment = await prisma.commitment.create({
      data: {
        investorId: data!.investorId,
        entityId: data!.entityId,
        amount: data!.amount,
      },
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(commitment, { status: 201 });
  } catch (err) {
    logger.error("[commitments] POST error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create commitment" }, { status: 500 });
  }
}
