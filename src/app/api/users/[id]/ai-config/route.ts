import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parseBody } from "@/lib/api-helpers";
import { encryptApiKey, getUserAIConfig } from "@/lib/ai-config";

// ── GET /api/users/[id]/ai-config ─────────────────────────────
// Returns the resolved AI config for a user: aiEnabled, provider, model,
// whether they have a personal key, and the source (user | tenant | none).
// NEVER returns the raw API key to the client.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  // Users can only view their own AI config
  if (authUser.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { aiEnabled: true, personalAiConfig: true, firmId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await getUserAIConfig(id, user.firmId);

  // Check if the user has a personal key stored (without decrypting it)
  const personal = user.personalAiConfig as {
    provider?: string;
    model?: string;
    apiKey?: string;
    apiKeyIV?: string;
    apiKeyTag?: string;
  } | null;
  const hasPersonalKey = !!(personal?.apiKey);

  return NextResponse.json({
    aiEnabled: user.aiEnabled,
    provider: config.provider,
    model: config.model,
    hasPersonalKey,
    source: config.source,
  });
}

// ── PUT /api/users/[id]/ai-config ─────────────────────────────
// Updates the user's personal AI config (provider, model, optional API key).
// If apiKey is provided and non-null, it is encrypted before storage.
// If apiKey is null, the personal key is cleared.
// If apiKey is omitted, the existing key is preserved.

const UpdateAIConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().nullable().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  // Users can only update their own AI config
  if (authUser.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await parseBody(req, UpdateAIConfigSchema);
  if (error) return error;

  // Fetch current personal config to potentially preserve existing key
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { personalAiConfig: true },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = existingUser.personalAiConfig as {
    provider?: string;
    model?: string;
    apiKey?: string;
    apiKeyIV?: string;
    apiKeyTag?: string;
  } | null;

  // Build the new personalAiConfig object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configJson: Record<string, any> = {
    provider: data!.provider ?? existing?.provider ?? "openai",
    model: data!.model ?? existing?.model ?? "gpt-4o",
  };

  if (data!.apiKey !== undefined) {
    if (data!.apiKey === null) {
      // Explicitly clear the personal key — no key fields stored
    } else {
      // New key provided — encrypt and store
      const { encrypted, iv, tag } = encryptApiKey(data!.apiKey);
      configJson.apiKey = encrypted;
      configJson.apiKeyIV = iv;
      configJson.apiKeyTag = tag;
    }
  } else {
    // apiKey not provided — preserve existing encrypted key if any
    if (existing?.apiKey) {
      configJson.apiKey = existing.apiKey;
      configJson.apiKeyIV = existing.apiKeyIV;
      configJson.apiKeyTag = existing.apiKeyTag;
    }
  }

  await prisma.user.update({
    where: { id },
    data: { personalAiConfig: configJson },
  });

  // Return the updated resolved config (same shape as GET — no raw key)
  const updatedUser = await prisma.user.findUnique({
    where: { id },
    select: { aiEnabled: true, personalAiConfig: true, firmId: true },
  });

  const updatedPersonal = updatedUser?.personalAiConfig as {
    provider?: string;
    model?: string;
    apiKey?: string;
  } | null;

  const updatedConfig = await getUserAIConfig(id, updatedUser!.firmId);

  return NextResponse.json({
    aiEnabled: updatedUser?.aiEnabled,
    provider: updatedConfig.provider,
    model: updatedConfig.model,
    hasPersonalKey: !!(updatedPersonal?.apiKey),
    source: updatedConfig.source,
  });
}
