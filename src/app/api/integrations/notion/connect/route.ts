/**
 * GET /api/integrations/notion/connect
 *
 * Redirects to Notion OAuth2 authorization page.
 * Uses CSRF state cookie (base64url JSON with firmId + nonce, 10-min expiry).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { NotionClient } from "@/lib/integrations/notion";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  // Graceful degradation if credentials not configured
  if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Notion credentials not configured. Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const firmId = authUser.firmId;
  const authUrl = NotionClient.getAuthUrl(firmId);

  const stateParam = new URL(authUrl).searchParams.get("state") ?? "";

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("notion_oauth_state", stateParam, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
