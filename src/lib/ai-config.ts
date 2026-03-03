import OpenAI from "openai";
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

// ── Client factory ─────────────────────────────────────

export async function createAIClient(
  firmId: string
): Promise<OpenAI | null> {
  const config = await getAIConfig(firmId);
  if (!config.apiKey) return null;

  if (config.provider === "anthropic") {
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL:
        config.baseUrl || "https://api.anthropic.com/v1/",
    });
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

// ── Connection test ────────────────────────────────────

export async function testConnection(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = new OpenAI({
      apiKey,
      ...(provider === "anthropic"
        ? { baseURL: baseUrl || "https://api.anthropic.com/v1/" }
        : baseUrl
          ? { baseURL: baseUrl }
          : {}),
    });

    // Lightweight test: list models (works for both OpenAI and Anthropic-compat)
    const model = provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o";
    await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Say hello in one word." }],
      max_tokens: 5,
    });

    return { connected: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return { connected: false, error: message };
  }
}
