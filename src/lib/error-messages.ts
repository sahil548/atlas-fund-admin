/**
 * Centralized error-message taxonomy for Atlas.
 *
 * Rationale (per CONTEXT.md Claude's Discretion on FIN-09): the three AI routes
 * (ai/execute, ai/suggest-tasks, ai/draft-lp-update) all share the same prerequisite
 * checks (auth, rate limit, AI key). Centralizing avoids copy drift and makes Phase 23
 * documentation retrofit easier. Each entry is a string or factory function so that
 * callers never assemble error copy inline.
 *
 * Usage:
 *   import { ERR } from "@/lib/error-messages";
 *   return NextResponse.json({ error: ERR.AI_NO_KEY }, { status: 400 });
 */

export const ERR = {
  // ── Deal stage-gate ──────────────────────────────────────────────────────────
  // Descriptive, tells the user exactly what to do next.
  DEAL_STAGE_GATE: (stage: string) =>
    `Can't delete a deal in ${stage} stage. Move it to Dead first, then delete from there.`,

  // ── AI prerequisites ─────────────────────────────────────────────────────────
  // Shown when an AI route is called but no API key is configured for the firm/user.
  AI_NO_KEY:
    "AI features require an API key. Go to Settings \u2192 AI Config to configure OpenAI or Anthropic.",

  // Shown when the AI key is present but the account's aiAccess flag is false.
  AI_NO_ACCESS:
    "AI access is not enabled for your account. Contact your firm administrator.",

  // Shown when the configured model is unavailable (e.g. deprecated model ID).
  AI_MODEL_UNAVAILABLE:
    "The configured AI model is currently unavailable. Try another model in Settings \u2192 AI Config.",

  // ── Document extraction ──────────────────────────────────────────────────────
  // Shown when the user triggers AI extraction on a document but AI is not set up.
  DOC_EXTRACT_NO_AI:
    "Document AI summary requires AI access. Go to Settings \u2192 AI Config to enable it.",

  // Shown when the document has no file attached (nothing to extract from).
  DOC_EXTRACT_NO_FILE: "This document has no attached file to extract from.",
} as const;
