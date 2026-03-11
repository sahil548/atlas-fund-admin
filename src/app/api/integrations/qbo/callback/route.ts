/**
 * GET /api/integrations/qbo/callback?code=xxx&realmId=xxx&state=xxx
 *
 * OAuth callback from Intuit. Already whitelisted in middleware (no auth check).
 * Exchanges code for tokens, stores in DB, redirects to /accounting.
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { qboProvider } from "@/lib/accounting/qbo-provider";
import { storeTokens } from "@/lib/accounting/token-manager";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");

  // Validate required params
  if (!code || !realmId || !state) {
    return NextResponse.json(
      { error: "Missing required OAuth callback params: code, realmId, state" },
      { status: 400 }
    );
  }

  // CSRF verification: compare state against cookie
  const storedState = req.cookies.get("qbo_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "CSRF state mismatch — potential security issue, please retry" },
      { status: 400 }
    );
  }

  // Decode state to get entityId
  let entityId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    entityId = decoded.entityId;
    if (!entityId) throw new Error("entityId missing from state");
  } catch {
    return NextResponse.json({ error: "Invalid OAuth state parameter" }, { status: 400 });
  }

  // Exchange code for tokens
  let tokens;
  try {
    tokens = await qboProvider.exchangeCodeForTokens(code, realmId);
  } catch (err) {
    logger.error("[qbo/callback] Token exchange failed:", { error: err instanceof Error ? err.message : String(err) });
    const redirectUrl = new URL("/accounting", req.url);
    redirectUrl.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Upsert AccountingConnection for this entity
  const connection = await prisma.accountingConnection.upsert({
    where: { entityId },
    create: {
      entityId,
      provider: "QBO",
      providerCompanyId: realmId,
      syncStatus: "CONNECTED",
      oauthCredentials: tokens as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
    update: {
      provider: "QBO",
      providerCompanyId: realmId,
      syncStatus: "CONNECTED",
      oauthCredentials: tokens as unknown as import("@prisma/client").Prisma.InputJsonValue,
      lastSyncError: null,
    },
  });

  // Store tokens via token manager (also sets providerCompanyId)
  await storeTokens(connection.id, tokens);

  // Fetch QBO company name and store it
  try {
    const apiBase =
      process.env.QBO_ENVIRONMENT === "production"
        ? `https://quickbooks.api.intuit.com/v3/company/${realmId}`
        : `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;

    const companyResp = await fetch(`${apiBase}/companyinfo/${realmId}?minorversion=73`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
      },
    });

    if (companyResp.ok) {
      const companyData = await companyResp.json();
      const companyName =
        companyData?.CompanyInfo?.CompanyName ??
        companyData?.QueryResponse?.CompanyInfo?.[0]?.CompanyName ??
        null;

      if (companyName) {
        await prisma.accountingConnection.update({
          where: { id: connection.id },
          data: { providerCompanyName: companyName },
        });
      }
    }
  } catch (err) {
    // Non-fatal — company name is cosmetic
    logger.error("[qbo/callback] Failed to fetch company name (non-fatal):", { error: err instanceof Error ? err.message : String(err) });
  }

  // Delete CSRF cookie and redirect to accounting with success indicator
  const redirectUrl = new URL("/accounting", req.url);
  redirectUrl.searchParams.set("connected", entityId);

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("qbo_oauth_state");

  return response;
}
