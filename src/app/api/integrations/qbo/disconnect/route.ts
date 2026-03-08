/**
 * POST /api/integrations/qbo/disconnect
 * Body: { entityId: string }
 *
 * Revokes QBO tokens and marks entity as DISCONNECTED.
 * Preserves chart of accounts mappings and previously pulled data.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { qboProvider } from "@/lib/accounting/qbo-provider";
import { z } from "zod";
import type { OAuthTokens } from "@/lib/accounting/provider-types";

const DisconnectSchema = z.object({
  entityId: z.string().min(1, "entityId is required"),
});

export async function POST(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const { data, error } = await parseBody(req, DisconnectSchema);
  if (error) return error;

  const { entityId } = data!;

  // Load connection — verify it belongs to user's firm via entity
  const connection = await prisma.accountingConnection.findFirst({
    where: {
      entityId,
      entity: { firmId: authUser.firmId },
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Revoke tokens if they exist — fire-and-forget (don't fail disconnect if revoke fails)
  if (connection.oauthCredentials) {
    const tokens = connection.oauthCredentials as unknown as OAuthTokens;
    if (tokens.refreshToken) {
      qboProvider.revokeTokens(tokens).catch((err) => {
        console.error("[qbo/disconnect] Token revocation failed (non-fatal):", err);
      });
    }
  }

  // Update connection: clear tokens, set DISCONNECTED
  // Keep chartOfAccountsMapped, accountMappings, providerCompanyName (historical data)
  await prisma.accountingConnection.update({
    where: { id: connection.id },
    data: {
      syncStatus: "DISCONNECTED",
      oauthCredentials: Prisma.JsonNull,
      lastSyncError: null,
    },
  });

  return NextResponse.json({ success: true, entityId });
}
