/**
 * POST /api/investors/[id]/payment-methods/link-token
 *
 * Returns a short-lived Plaid Link token that the LP portal uses to open
 * Plaid Link. The resulting public_token is then exchanged via
 * /api/investors/[id]/payment-methods/exchange for a Dwolla funding source.
 *
 * Phase A: Plaid in sandbox is fine. Dwolla is optional for this endpoint —
 * if DWOLLA_* env vars are unset, the Plaid flow still works; the exchange
 * endpoint is where Dwolla is actually called.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { createInvestorLinkToken, isPlaidConfigured } from "@/lib/integrations/plaid";
import { logger } from "@/lib/logger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { id } = await params;

    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET." },
        { status: 503 },
      );
    }

    const investor = await prisma.investor.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const linkToken = await createInvestorLinkToken({
      investorId: investor.id,
      investorName: investor.name,
    });
    return NextResponse.json({ link_token: linkToken });
  } catch (err) {
    logger.error("[payment-methods/link-token]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create link token" },
      { status: 500 },
    );
  }
}
