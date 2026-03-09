/**
 * GET /api/users/[id]/fireflies
 * PUT /api/users/[id]/fireflies
 * DELETE /api/users/[id]/fireflies
 *
 * Per-user Fireflies API key management.
 * Each GP team member can connect their own Fireflies account.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { encryptApiKey } from "@/lib/ai-config";
import { fetchFirefliesUser } from "@/lib/fireflies";

type Params = Promise<{ id: string }>;

/**
 * GET /api/users/[id]/fireflies
 * Return Fireflies connection status for a user.
 */
export async function GET(
  _req: Request,
  { params }: { params: Params }
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Only the user themselves or a GP_ADMIN can view connection status
  if (authUser.id !== id && authUser.role !== "GP_ADMIN") {
    return forbidden();
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firmId: true,
      firefliesApiKey: true,
      firefliesEmail: true,
      firefliesLastSync: true,
    },
  });

  if (!user || user.firmId !== authUser.firmId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    connected: !!user.firefliesApiKey,
    email: user.firefliesEmail ?? null,
    lastSync: user.firefliesLastSync ?? null,
  });
}

/**
 * PUT /api/users/[id]/fireflies
 * Connect Fireflies by storing an encrypted API key.
 * Validates the key against Fireflies API before storing.
 */
export async function PUT(
  req: Request,
  { params }: { params: Params }
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Only the user themselves can connect their own account
  if (authUser.id !== id) {
    return forbidden();
  }

  let apiKey: string;
  try {
    const body = await req.json();
    apiKey = body.apiKey;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  // Validate the key by calling Fireflies user query
  let firefliesUser: { email: string; name: string };
  try {
    firefliesUser = await fetchFirefliesUser(apiKey.trim());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to validate API key";
    return NextResponse.json(
      { error: `Invalid API key — ${message}` },
      { status: 400 }
    );
  }

  // Encrypt and store the API key
  const { encrypted, iv, tag } = encryptApiKey(apiKey.trim());

  await prisma.user.update({
    where: { id },
    data: {
      firefliesApiKey: encrypted,
      firefliesApiKeyIV: iv,
      firefliesApiKeyTag: tag,
      firefliesEmail: firefliesUser.email,
    },
  });

  return NextResponse.json({
    connected: true,
    email: firefliesUser.email,
  });
}

/**
 * DELETE /api/users/[id]/fireflies
 * Disconnect Fireflies by clearing all stored key fields.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Params }
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Only the user themselves can disconnect their own account
  if (authUser.id !== id) {
    return forbidden();
  }

  await prisma.user.update({
    where: { id },
    data: {
      firefliesApiKey: null,
      firefliesApiKeyIV: null,
      firefliesApiKeyTag: null,
      firefliesEmail: null,
      firefliesLastSync: null,
    },
  });

  return NextResponse.json({ connected: false });
}
