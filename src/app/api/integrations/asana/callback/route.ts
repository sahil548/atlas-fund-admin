/**
 * GET /api/integrations/asana/callback?code=xxx&state=xxx
 *
 * OAuth callback from Asana. Exchanges code for tokens, stores IntegrationConnection.
 * Whitelisted in middleware (no auth check here — uses CSRF state for security).
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AsanaClient } from "@/lib/integrations/asana";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing required OAuth callback params: code, state" },
      { status: 400 }
    );
  }

  // CSRF verification
  const storedState = req.cookies.get("asana_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "CSRF state mismatch — please retry the connection" },
      { status: 400 }
    );
  }

  // Decode state to get firmId
  let firmId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    firmId = decoded.firmId;
    if (!firmId) throw new Error("firmId missing from state");
  } catch {
    return NextResponse.json({ error: "Invalid OAuth state parameter" }, { status: 400 });
  }

  // Exchange code for tokens
  let tokens;
  try {
    tokens = await AsanaClient.exchangeCode(code, firmId);
  } catch (err) {
    console.error("[asana/callback] Token exchange failed:", err);
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("error", "asana_token_exchange_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Upsert IntegrationConnection for this firm
  await prisma.integrationConnection.upsert({
    where: {
      firmId_provider_entityId: {
        firmId,
        provider: "asana",
        entityId: null as unknown as string,
      },
    },
    create: {
      firmId,
      provider: "asana",
      entityId: null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiresAt,
      externalAccountId: tokens.workspaceGid,
      metadata: tokens.workspaceGid ? { workspaceGid: tokens.workspaceGid } : undefined,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiresAt,
      externalAccountId: tokens.workspaceGid,
      metadata: tokens.workspaceGid ? { workspaceGid: tokens.workspaceGid } : undefined,
    },
  });

  // Clear CSRF cookie and redirect to settings with success indicator
  const redirectUrl = new URL("/settings", req.url);
  redirectUrl.searchParams.set("connected", "asana");

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("asana_oauth_state");

  return response;
}
