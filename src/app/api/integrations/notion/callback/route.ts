/**
 * GET /api/integrations/notion/callback?code=xxx&state=xxx
 *
 * OAuth callback from Notion. Exchanges code for token, stores IntegrationConnection.
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotionClient } from "@/lib/integrations/notion";

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
  const storedState = req.cookies.get("notion_oauth_state")?.value;
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

  // Exchange code for token
  let tokens;
  try {
    tokens = await NotionClient.exchangeCode(code, firmId);
  } catch (err) {
    console.error("[notion/callback] Token exchange failed:", err);
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("error", "notion_token_exchange_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Upsert IntegrationConnection
  await prisma.integrationConnection.upsert({
    where: {
      firmId_provider_entityId: {
        firmId,
        provider: "notion",
        entityId: null as unknown as string,
      },
    },
    create: {
      firmId,
      provider: "notion",
      entityId: null,
      accessToken: tokens.accessToken,
      externalAccountId: tokens.workspaceId,
      metadata: {
        workspaceId: tokens.workspaceId,
        workspaceName: tokens.workspaceName,
        botId: tokens.botId,
      },
    },
    update: {
      accessToken: tokens.accessToken,
      externalAccountId: tokens.workspaceId,
      metadata: {
        workspaceId: tokens.workspaceId,
        workspaceName: tokens.workspaceName,
        botId: tokens.botId,
      },
    },
  });

  const redirectUrl = new URL("/settings", req.url);
  redirectUrl.searchParams.set("connected", "notion");

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.delete("notion_oauth_state");

  return response;
}
