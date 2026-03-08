/**
 * GET /api/integrations/qbo/connect?entityId=xxx
 *
 * Redirects GP admin to Intuit OAuth authorization page.
 * Uses CSRF state cookie to protect callback.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { qboProvider } from "@/lib/accounting/qbo-provider";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ error: "entityId query param is required" }, { status: 400 });
  }

  // Verify entity exists and belongs to user's firm
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, firmId: authUser.firmId },
  });

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  // Generate CSRF state: base64-encode { entityId, nonce }
  const nonce = crypto.randomUUID();
  const statePayload = Buffer.from(JSON.stringify({ entityId, nonce })).toString("base64url");

  // Build authorization URL
  const authUrl = qboProvider.getAuthorizationUrl(entityId, statePayload);

  // Store nonce in httpOnly cookie for CSRF verification (10 minute expiry)
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("qbo_oauth_state", statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
