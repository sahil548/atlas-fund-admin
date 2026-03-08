/**
 * GET /api/integrations/google-calendar/connect
 *
 * Redirects to Google OAuth2 authorization page for Calendar access.
 * Uses CSRF state cookie (base64url JSON with firmId + nonce, 10-min expiry).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  // Graceful degradation if credentials not configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const firmId = authUser.firmId;
  const authUrl = GoogleCalendarClient.getAuthUrl(firmId);

  const stateParam = new URL(authUrl).searchParams.get("state") ?? "";

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gcal_oauth_state", stateParam, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
