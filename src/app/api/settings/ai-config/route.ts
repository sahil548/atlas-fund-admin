import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAIConfigSchema } from "@/lib/schemas";
import { encryptApiKey } from "@/lib/ai-config";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId") || "firm-1";

  const config = await prisma.aIConfiguration.findUnique({
    where: { firmId },
  });

  if (!config) {
    // Return defaults (env var fallback)
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

export async function PUT(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId") || "firm-1";
  const { data, error } = await parseBody(req as unknown as Request, UpdateAIConfigSchema);
  if (error) return error;

  // Build update payload
  const update: Record<string, unknown> = {};
  if (data!.provider !== undefined) update.provider = data!.provider;
  if (data!.model !== undefined) update.model = data!.model;
  if (data!.baseUrl !== undefined) update.baseUrl = data!.baseUrl || null;
  if (data!.systemPrompt !== undefined) update.systemPrompt = data!.systemPrompt;
  if (data!.thresholdScore !== undefined) update.thresholdScore = data!.thresholdScore;
  if (data!.maxDocuments !== undefined) update.maxDocuments = data!.maxDocuments;
  if (data!.processingMode !== undefined) update.processingMode = data!.processingMode;

  // Encrypt API key if provided
  if (data!.apiKey) {
    const { encrypted, iv, tag } = encryptApiKey(data!.apiKey);
    update.apiKey = encrypted;
    update.apiKeyIV = iv;
    update.apiKeyTag = tag;
  }

  const config = await prisma.aIConfiguration.upsert({
    where: { firmId },
    create: { firmId, ...update },
    update,
  });

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
