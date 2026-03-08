/**
 * GET /api/integrations/google-calendar/callback?code=xxx&state=xxx
 *
 * OAuth callback from Google. Exchanges code for tokens, stores IntegrationConnection.
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

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
  const storedState = req.cookies.get("gcal_oauth_state")?.value;
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
    tokens = await GoogleCalendarClient.exchangeCode(code, firmId);
  } catch (err) {
    console.error("[google-calendar/callback] Token exchange failed:", err);
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("error", "gcal_token_exchange_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Upsert IntegrationConnection
  await prisma.integrationConnection.upsert({
    where: {
      firmId_provider_entityId: {
        firmId,
        provider: "google_calendar",
        entityId: null as unknown as string,
      },
    },
    create: {
      firmId,
      provider: "google_calendar",
      entityId: null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiresAt,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      tokenExpiry: tokens.expiresAt,
    },
  });

  const redirectUrl = new URL("/settings", req.url);
  redirectUrl.searchParams.set("connected", "google_calendar");

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("gcal_oauth_state");

  return response;
}
