/**
 * POST /api/integrations/plaid/create-link-token
 *
 * Creates a Plaid Link token for the given entity.
 * Returns { link_token } to be used with Plaid Link on the client.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import { createLinkToken } from "@/lib/integrations/plaid";

const CreateLinkTokenSchema = z.object({
  entityId: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Graceful degradation if credentials not configured
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json(
      { error: "Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET." },
      { status: 503 }
    );
  }

  const { data, error } = await parseBody(req, CreateLinkTokenSchema);
  if (error) return error;

  try {
    const linkToken = await createLinkToken(authUser.firmId, data!.entityId);
    return NextResponse.json({ link_token: linkToken });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create Plaid link token";
    console.error("[plaid/create-link-token]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
