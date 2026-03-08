import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAIConfigSchema } from "@/lib/schemas";
import { encryptApiKey } from "@/lib/ai-config";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";

async function getFirmId(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.firmId) throw new Error("Not authenticated");
  return authUser.firmId;
}

function configResponse(config: {
  provider: string;
  model: string;
  apiKey: string | null;
  baseUrl: string | null;
  systemPrompt: string | null;
  thresholdScore: number;
  maxDocuments: number;
  processingMode: string;
}) {
  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey,
    baseUrl: config.baseUrl,
    systemPrompt: config.systemPrompt,
    thresholdScore: config.thresholdScore,
    maxDocuments: config.maxDocuments,
    processingMode: config.processingMode,
  });
}

export async function GET(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "settings", "read_only")) return forbidden();
  }

  const firmId = authUser.firmId!;

  const config = await prisma.aIConfiguration.findUnique({
    where: { firmId },
  });

  if (!config) {
    return NextResponse.json({
      provider: process.env.AI_PROVIDER || "openai",
      model: process.env.AI_MODEL || "gpt-4o",
      hasApiKey: !!process.env.OPENAI_API_KEY,
      baseUrl: null,
      systemPrompt: null,
      thresholdScore: 70,
      maxDocuments: 10,
      processingMode: "async",
    });
  }

  return configResponse(config);
}

export async function PUT(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "settings", "full")) return forbidden();
  }

  const firmId = authUser.firmId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateAIConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  const data = result.data;

  // Build update payload
  const update: Record<string, unknown> = {};
  if (data.provider !== undefined) update.provider = data.provider;
  if (data.model !== undefined) update.model = data.model;
  if (data.baseUrl !== undefined) update.baseUrl = data.baseUrl || null;
  if (data.systemPrompt !== undefined) update.systemPrompt = data.systemPrompt;
  if (data.thresholdScore !== undefined) update.thresholdScore = data.thresholdScore;
  if (data.maxDocuments !== undefined) update.maxDocuments = data.maxDocuments;
  if (data.processingMode !== undefined) update.processingMode = data.processingMode;

  // Encrypt API key if provided
  if (data.apiKey) {
    const { encrypted, iv, tag } = encryptApiKey(data.apiKey);
    update.apiKey = encrypted;
    update.apiKeyIV = iv;
    update.apiKeyTag = tag;
  }

  try {
    const config = await prisma.aIConfiguration.upsert({
      where: { firmId },
      create: { firmId, ...update },
      update,
    });
    return configResponse(config);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
