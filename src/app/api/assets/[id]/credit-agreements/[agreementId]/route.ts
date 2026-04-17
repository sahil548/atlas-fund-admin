import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateCreditAgreementSchema } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; agreementId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id, agreementId } = await params;
    await getAuthUser();

    const agreement = await prisma.creditAgreement.findFirst({
      where: { id: agreementId, assetId: id },
      include: { covenants: true, payments: { orderBy: { date: "desc" } } },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Credit agreement not found" }, { status: 404 });
    }

    return NextResponse.json(agreement);
  } catch (err) {
    logger.error("[assets/[id]/credit-agreements/[agreementId]] GET error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load credit agreement" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id, agreementId } = await params;
    await getAuthUser();

    const { data, error } = await parseBody(req, UpdateCreditAgreementSchema);
    if (error) return error;

    const existing = await prisma.creditAgreement.findFirst({
      where: { id: agreementId, assetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Credit agreement not found" }, { status: 404 });
    }

    const { maturityDate, ...rest } = data!;

    const agreement = await prisma.creditAgreement.update({
      where: { id: agreementId },
      data: {
        ...rest,
        ...(maturityDate ? { maturityDate: new Date(maturityDate) } : {}),
      },
    });

    return NextResponse.json(agreement);
  } catch (err) {
    logger.error("[assets/[id]/credit-agreements/[agreementId]] PUT error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update credit agreement" }, { status: 500 });
  }
}
