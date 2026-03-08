/**
 * GET /api/docusign/connect?firmId=xxx
 *
 * Redirects GP admin to DocuSign OAuth authorization page.
 * Uses CSRF state cookie (same pattern as QBO connect in Phase 5).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { DocuSignClient } from "@/lib/docusign";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const firmId = searchParams.get("firmId") ?? authUser.firmId;

  // Only GP admins of the same firm can connect
  if (firmId !== authUser.firmId) return forbidden();

  // Generate CSRF state: base64url({ firmId, nonce })
  const nonce = crypto.randomUUID();
  const statePayload = Buffer.from(JSON.stringify({ firmId, nonce })).toString("base64url");

  // Build DocuSign authorization URL
  const authUrl = DocuSignClient.getAuthUrl(firmId, statePayload);

  // Set CSRF state in httpOnly cookie (10 min expiry) and redirect
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("docusign_oauth_state", statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
