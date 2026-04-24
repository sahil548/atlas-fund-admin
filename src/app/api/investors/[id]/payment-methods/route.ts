/**
 * GET /api/investors/[id]/payment-methods
 *
 * Lists the investor's linked bank accounts (non-removed). Safe to expose
 * to the LP portal — only bank name, last4, nickname, and status are
 * returned. Dwolla ids are included for GP-side reconciliation tooling
 * but contain no sensitive data.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id } = await params;

    const methods = await prisma.investorPaymentMethod.findMany({
      where: {
        investorId: id,
        status: { not: "REMOVED" },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        dwollaFundingSourceId: true,
        bankName: true,
        accountNickname: true,
        accountType: true,
        last4: true,
        status: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ paymentMethods: methods });
  } catch (err) {
    logger.error("[payment-methods GET]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
  }
}
