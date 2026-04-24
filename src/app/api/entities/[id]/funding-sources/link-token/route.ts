/**
 * POST /api/entities/[id]/funding-sources/link-token
 *
 * Returns a short-lived Plaid Link token scoped for linking a disbursement
 * bank account to an entity. GP-only. The token is created with the Auth
 * product (no transactions) — we just need account/routing for the Dwolla
 * processor handoff.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { createInvestorLinkToken, isPlaidConfigured } from "@/lib/integrations/plaid";
import { logger } from "@/lib/logger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    if (authUser.role === "LP_INVESTOR" || authUser.role === "SERVICE_PROVIDER") {
      return forbidden();
    }
    const { id } = await params;

    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid credentials not configured." },
        { status: 503 },
      );
    }

    const entity = await prisma.entity.findFirst({
      where: { id, firmId: authUser.firmId },
      select: { id: true, name: true },
    });
    if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

    // Reuse the Auth-only link-token helper but scope client_user_id with entity
    const linkToken = await createInvestorLinkToken({
      investorId: `entity__${entity.id}`,
      investorName: entity.name,
    });
    return NextResponse.json({ link_token: linkToken });
  } catch (err) {
    logger.error("[entity funding-sources/link-token]", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
