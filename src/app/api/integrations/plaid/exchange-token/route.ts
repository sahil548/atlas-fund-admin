/**
 * POST /api/integrations/plaid/exchange-token
 *
 * Exchanges a Plaid public_token (from Link) for a permanent access_token.
 * Stores IntegrationConnection per entity.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { exchangePublicToken } from "@/lib/integrations/plaid";

const ExchangeTokenSchema = z.object({
  publicToken: z.string().min(1),
  entityId: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data, error } = await parseBody(req, ExchangeTokenSchema);
  if (error) return error;

  const { publicToken, entityId } = data!;
  const firmId = authUser.firmId;

  // Verify entity belongs to firm
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, firmId },
  });
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  // Exchange public token for permanent access token
  let tokens;
  try {
    tokens = await exchangePublicToken(publicToken, firmId, entityId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Plaid token exchange failed";
    console.error("[plaid/exchange-token]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Upsert IntegrationConnection (per-entity Plaid connection)
  const connection = await prisma.integrationConnection.upsert({
    where: {
      firmId_provider_entityId: {
        firmId,
        provider: "plaid",
        entityId,
      },
    },
    create: {
      firmId,
      provider: "plaid",
      entityId,
      accessToken: tokens.accessToken,
      externalAccountId: tokens.itemId,
      metadata: { itemId: tokens.itemId },
    },
    update: {
      accessToken: tokens.accessToken,
      externalAccountId: tokens.itemId,
      metadata: { itemId: tokens.itemId },
    },
  });

  return NextResponse.json({
    connectionId: connection.id,
    entityId,
    provider: "plaid",
  });
}
