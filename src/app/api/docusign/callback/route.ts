/**
 * GET /api/docusign/callback?code=xxx&state=xxx
 *
 * OAuth callback from DocuSign. Whitelisted in middleware (no auth check).
 * Exchanges code for tokens, stores DocuSignConnection, redirects to /settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DocuSignClient } from "@/lib/docusign";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user-cancelled OAuth
  if (error) {
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("error", "docusign_denied");
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing required OAuth callback params: code, state" },
      { status: 400 }
    );
  }

  // CSRF verification: compare state against cookie
  const storedState = req.cookies.get("docusign_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "CSRF state mismatch — potential security issue, please retry" },
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
    tokens = await DocuSignClient.exchangeCode(code);
  } catch (err) {
    console.error("[docusign/callback] Token exchange failed:", err);
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("error", "docusign_token_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Upsert DocuSignConnection for this firm
  await prisma.docuSignConnection.upsert({
    where: { firmId },
    create: {
      firmId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
      accountId: tokens.accountId,
      baseUri: tokens.baseUri,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.tokenExpiry,
      accountId: tokens.accountId,
      baseUri: tokens.baseUri,
    },
  });

  // Delete CSRF cookie and redirect to settings with success indicator
  const redirectUrl = new URL("/settings", req.url);
  redirectUrl.searchParams.set("docusign_connected", "true");

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("docusign_oauth_state");

  return response;
}
