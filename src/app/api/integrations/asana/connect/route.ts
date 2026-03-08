/**
 * GET /api/integrations/asana/connect
 *
 * Redirects to Asana OAuth2 authorization page.
 * Uses CSRF state cookie (base64url JSON with firmId + nonce, 10-min expiry).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { AsanaClient } from "@/lib/integrations/asana";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  // Graceful degradation if credentials not configured
  if (!process.env.ASANA_CLIENT_ID || !process.env.ASANA_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Asana credentials not configured. Set ASANA_CLIENT_ID and ASANA_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const firmId = authUser.firmId;
  const authUrl = AsanaClient.getAuthUrl(firmId);

  // Extract state from URL to store in cookie for CSRF verification
  const stateParam = new URL(authUrl).searchParams.get("state") ?? "";

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("asana_oauth_state", stateParam, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
