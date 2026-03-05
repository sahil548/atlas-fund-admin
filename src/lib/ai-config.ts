import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// ── Encryption helpers (AES-256-GCM) ───────────────────

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer | null {
  const hex = process.env.AI_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null; // 32-byte key = 64 hex chars
  return Buffer.from(hex, "hex");
}

export function encryptApiKey(plaintext: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  if (!key) {
    // No encryption key — store in plaintext (dev mode)
    return { encrypted: plaintext, iv: "", tag: "" };
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  let enc = cipher.update(plaintext, "utf8", "hex");
  enc += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { encrypted: enc, iv: iv.toString("hex"), tag };
}

export function decryptApiKey(
  encrypted: string,
  iv: string,
  tag: string
): string {
  const key = getEncryptionKey();
  if (!key || !iv || !tag) {
    // No encryption key or no IV/tag — assume stored in plaintext
    return encrypted;
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let dec = decipher.update(encrypted, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

// ── Config lookup (DB → env var fallback) ──────────────

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string | null;
  baseUrl: string | null;
  systemPrompt: string | null;
  thresholdScore: number;
  maxDocuments: number;
  processingMode: string;
}

export async function getAIConfig(firmId: string): Promise<AIConfig> {
  const row = await prisma.aIConfiguration.findUnique({
    where: { firmId },
  });

  if (row) {
    const dbApiKey = row.apiKey
      ? decryptApiKey(row.apiKey, row.apiKeyIV || "", row.apiKeyTag || "")
      : null;
    // If DB has no key, fall back to env vars
    const resolvedApiKey =
      dbApiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || null;

    return {
      provider: row.provider,
      model: row.model,
      apiKey: resolvedApiKey,
      baseUrl: row.baseUrl,
      systemPrompt: row.systemPrompt,
      thresholdScore: row.thresholdScore,
      maxDocuments: row.maxDocuments,
      processingMode: row.processingMode,
    };
  }

  // Fallback to env vars — check both OpenAI and Anthropic keys
  const openaiKey = process.env.OPENAI_API_KEY || null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || null;
  const resolvedKey = openaiKey || anthropicKey || null;
  const resolvedProvider =
    process.env.AI_PROVIDER || (anthropicKey && !openaiKey ? "anthropic" : "openai");
  const resolvedModel =
    process.env.AI_MODEL || (resolvedProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o");
  const resolvedBaseUrl =
    process.env.OPENAI_BASE_URL || (resolvedProvider === "anthropic" ? "https://api.anthropic.com/v1/" : null);

  return {
    provider: resolvedProvider,
    model: resolvedModel,
    apiKey: resolvedKey,
    baseUrl: resolvedBaseUrl,
    systemPrompt: null,
    thresholdScore: 70,
    maxDocuments: 10,
    processingMode: "async",
  };
}

// ── Anthropic → OpenAI compatibility wrapper ──────────
// Wraps the Anthropic SDK in an OpenAI-compatible interface so all
// existing callers (screening, DD analysis, agents, etc.) work unchanged.

/* eslint-disable @typescript-eslint/no-explicit-any */
class AnthropicCompat {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  get chat() {
    const client = this.client;
    return {
      completions: {
        create: async (params: any) => {
          const systemMsg = params.messages?.find((m: any) => m.role === "system");
          const nonSystemMsgs = (params.messages || []).filter(
            (m: any) => m.role !== "system",
          );

          // If JSON mode requested, add instruction to system prompt
          let systemText = systemMsg?.content || "";
          const isJsonMode = params.response_format?.type === "json_object";
          if (isJsonMode) {
            systemText += "\n\nIMPORTANT: You must respond with ONLY the raw JSON object. Do NOT wrap it in ```json or any markdown code fences. No explanation, no extra text — output the JSON object directly starting with {.";
          }

          const response = await client.messages.create({
            model: params.model,
            max_tokens: params.max_tokens || 4096,
            ...(params.temperature != null ? { temperature: params.temperature } : {}),
            ...(systemText ? { system: systemText } : {}),
            messages: nonSystemMsgs.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          });

          // Log token usage for cost visibility
          const usage = (response as any).usage;
          if (usage) {
            console.log(`[AI] ${params.model}: ${usage.input_tokens} in + ${usage.output_tokens} out tokens`);
          }

          const textBlock = response.content.find((b: any) => b.type === "text") as any;
          let text = textBlock?.text || "";

          // Strip markdown code fences if Claude wraps JSON in them
          if (isJsonMode && text) {
            text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
          }

          return {
            choices: [
              { message: { content: text } },
            ],
          };
        },
      },
    };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Client factory ─────────────────────────────────────

export async function createAIClient(
  firmId: string,
): Promise<OpenAI | AnthropicCompat | null> {
  const config = await getAIConfig(firmId);
  if (!config.apiKey) return null;

  if (config.provider === "anthropic") {
    return new AnthropicCompat(config.apiKey);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
}

export async function getModelForFirm(firmId: string): Promise<string> {
  const config = await getAIConfig(firmId);
  return config.model;
}

// ── Prompt template lookup ─────────────────────────────

import { getDefaultContent } from "@/lib/default-prompt-templates";

/**
 * Get prompt template for a given type. Any module can call this.
 * Fallback: DB template → hardcoded default → null
 */
export async function getPromptTemplate(
  firmId: string,
  type: string,
): Promise<string | null> {
  const template = await prisma.aIPromptTemplate.findUnique({
    where: { firmId_type: { firmId, type } },
  });

  if (template?.isActive) return template.content;

  return getDefaultContent(type);
}

/**
 * Get DD category instructions for a given category name.
 * Fallback: firm-specific → global default → null
 */
export async function getCategoryInstructions(
  firmId: string,
  categoryName: string,
): Promise<string | null> {
  const template = await prisma.dDCategoryTemplate.findFirst({
    where: {
      name: categoryName,
      OR: [{ firmId }, { firmId: null, isDefault: true }],
    },
    orderBy: { firmId: "desc" },
  });
  return template?.defaultInstructions || null;
}

// ── Connection test ────────────────────────────────────

export async function testConnection(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hello in one word." }],
      });
    } else {
      const client = new OpenAI({
        apiKey,
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      });
      await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 5,
      });
    }

    return { connected: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return { connected: false, error: message };
  }
}
