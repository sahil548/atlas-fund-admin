import { createAIClient, getModelForFirm, getPromptTemplate, getCategoryInstructions } from "@/lib/ai-config";
import type { DealContext } from "@/lib/deal-types";
import { jsonrepair } from "jsonrepair";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────

export interface DDOpenQuestion {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface DDAnalysisSection {
  name: string;
  content: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Unified analysis result. Shape depends on analysis type:
 *
 * WORKSTREAMS: summary + openQuestions (sections/score/recommendation empty)
 * IC_MEMO:     score + summary + sections + recommendation (openQuestions empty)
 *
 * Legacy data may also have `findings` and `sections` on workstreams — the
 * frontend checks for `openQuestions` to determine format.
 */
export interface DDAnalysisResult {
  summary: string;
  openQuestions: DDOpenQuestion[];
  score: number;
  sections: DDAnalysisSection[];
  recommendation: string;
}

/** Legacy finding type — kept for backward-compat parsing of old data */
export interface DDAnalysisFinding {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

// ── Prior response for regeneration ──────────────────

export interface PriorResponse {
  question: string;
  answer: string | null; // null = unanswered
}

// ── Analysis type metadata ───────────────────────────

export const DD_ANALYSIS_META: Record<
  string,
  { name: string; description: string }
> = {
  DD_FINANCIAL: {
    name: "Financial Due Diligence",
    description: "Quality of earnings, balance sheet, cash flow, projections stress test",
  },
  DD_LEGAL: {
    name: "Legal Due Diligence",
    description: "Entity structure, key agreements, regulatory, covenant analysis",
  },
  DD_MARKET: {
    name: "Market Due Diligence",
    description: "Market sizing, competitive landscape, customer analysis, comparable analysis",
  },
  DD_TAX: {
    name: "Tax Due Diligence",
    description: "Tax structure, compliance, entity elections, credits and exposures",
  },
  DD_OPERATIONAL: {
    name: "Operational Due Diligence",
    description: "Management, processes, technology, scalability, key person risk",
  },
  DD_ESG: {
    name: "ESG Due Diligence",
    description: "Environmental, social, governance factors and compliance",
  },
  DD_COLLATERAL: {
    name: "Collateral Due Diligence",
    description: "Property appraisals, site condition, title/lien positions, insurance",
  },
  DD_TENANT_LEASE: {
    name: "Tenant & Lease Due Diligence",
    description: "Tenant credit, lease terms, occupancy, rent comparables",
  },
  DD_CUSTOMER: {
    name: "Customer Due Diligence",
    description: "Customer concentration, retention, cohort economics",
  },
  DD_TECHNOLOGY: {
    name: "Technology Due Diligence",
    description: "Tech stack, technical debt, product roadmap, cybersecurity",
  },
  DD_REGULATORY: {
    name: "Regulatory & Permitting Due Diligence",
    description: "Regulatory approvals, permits, government concessions",
  },
  DD_ENGINEERING: {
    name: "Engineering Due Diligence",
    description: "Engineering design, construction risk, asset condition",
  },
  DD_CREDIT: {
    name: "Credit Due Diligence",
    description: "Credit metrics, covenants, collateral coverage, downside modeling",
  },
  DD_COMMERCIAL: {
    name: "Commercial Due Diligence",
    description: "Commercial assessment, revenue validation, go-to-market analysis",
  },
  DD_MANAGEMENT: {
    name: "Management Due Diligence",
    description: "Leadership assessment, succession planning, organizational structure",
  },
  DD_CUSTOM: {
    name: "Custom Due Diligence",
    description: "Custom analysis based on workstream-specific instructions",
  },
  IC_MEMO: {
    name: "IC Memo",
    description: "Investment Committee memo with recommendation",
  },
};

// ── Text compression for prompts ─────────────────────
// PDF-extracted text is noisy — redundant whitespace, repeated headers/footers,
// decoration lines. This compresses it for more efficient token usage while
// preserving all meaningful content.

function compressForPrompt(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    // Collapse multiple spaces/tabs to single space
    .replace(/[ \t]{2,}/g, " ")
    // Trim trailing whitespace per line
    .replace(/[ \t]+$/gm, "")
    // Remove lines that are only decoration (dashes, underscores, dots, equals)
    .replace(/^[-_=.·•]{3,}$/gm, "")
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, "\n\n")
    // Remove standalone page numbers (e.g. "  12  " or "Page 3 of 10")
    .replace(/^\s*(?:Page\s+)?\d+(?:\s+of\s+\d+)?\s*$/gim, "")
    // Trim leading/trailing
    .trim();
}

// ── Prompt Builder ───────────────────────────────────

function buildDealContextBlock(dealCtx: DealContext): string {
  const docsList =
    dealCtx.documents.length > 0
      ? dealCtx.documents
          .map((d) => `- ${d.name} (${d.category || "uncategorized"})`)
          .join("\n")
      : "No documents uploaded yet";

  const notesList =
    dealCtx.notes.length > 0
      ? dealCtx.notes
          .slice(0, 5)
          .map((n) => `- ${n.author || "Unknown"}: ${n.content.slice(0, 300)}`)
          .join("\n")
      : "No analyst notes";

  // Include actual document content when available — compress for token efficiency
  let documentContentSection = "";
  if (dealCtx.documentContents && dealCtx.documentContents.length > 0) {
    documentContentSection = "\nDOCUMENT CONTENTS:\n";
    for (const doc of dealCtx.documentContents) {
      const compressed = compressForPrompt(doc.content);
      const content = compressed.slice(0, 10_000);
      documentContentSection += `\n--- ${doc.name} ---\n${content}\n`;
      if (compressed.length > 10_000) {
        documentContentSection += `[... truncated, ${compressed.length.toLocaleString()} total characters ...]\n`;
      }
    }
  }

  return `
DEAL UNDER REVIEW:
- Name: ${dealCtx.dealName}
- Asset Class: ${dealCtx.assetClass.replace(/_/g, " ")}
${dealCtx.capitalInstrument ? `- Capital Instrument: ${dealCtx.capitalInstrument.replace(/_/g, " ")}` : ""}
${dealCtx.participationStructure ? `- Participation: ${dealCtx.participationStructure.replace(/_/g, " ")}` : ""}
${dealCtx.sector ? `- Sector: ${dealCtx.sector}` : ""}
${dealCtx.targetSize ? `- Target Size: ${dealCtx.targetSize}` : ""}
${dealCtx.targetCheckSize ? `- Check Size: ${dealCtx.targetCheckSize}` : ""}
${dealCtx.targetReturn ? `- Target Return: ${dealCtx.targetReturn}` : ""}
${dealCtx.gpName ? `- GP / Sponsor: ${dealCtx.gpName}` : ""}

${dealCtx.description ? `DEAL DESCRIPTION:\n${dealCtx.description}\n` : ""}
${dealCtx.investmentRationale ? `INVESTMENT RATIONALE:\n${dealCtx.investmentRationale}\n` : ""}
${dealCtx.thesisNotes ? `THESIS NOTES:\n${dealCtx.thesisNotes}\n` : ""}
${dealCtx.additionalContext ? `ADDITIONAL CONTEXT:\n${dealCtx.additionalContext}\n` : ""}

ATTACHED DOCUMENTS:
${docsList}
${documentContentSection}
ANALYST NOTES:
${notesList}
`.trim();
}

function buildWorkstreamPrompt(
  dealCtx: DealContext,
  templateContent: string,
  priorResponses?: PriorResponse[] | null,
): string {
  const dealContextBlock = buildDealContextBlock(dealCtx);

  let priorResponsesBlock = "";
  if (priorResponses && priorResponses.length > 0) {
    priorResponsesBlock = "\nPRIOR OPEN QUESTIONS AND USER RESPONSES:\n";
    for (const pr of priorResponses) {
      if (pr.answer) {
        priorResponsesBlock += `- Q: "${pr.question}" → A: "${pr.answer}"\n`;
      } else {
        priorResponsesBlock += `- Q: "${pr.question}" → [UNANSWERED]\n`;
      }
    }
    priorResponsesBlock += `\nIncorporate user responses into your analysis. For answered questions, use the response to refine your assessment. For unanswered questions, re-raise them if still relevant or replace with more targeted follow-ups.\n`;
  }

  return `${templateContent}

${dealContextBlock}
${priorResponsesBlock}
You MUST respond in valid JSON with exactly this shape:
{
  "summary": "<2-3 substantive paragraphs covering the key analysis points, specific findings, and overall assessment for this workstream. Reference specific data points from the deal materials.>",
  "openQuestions": [
    {
      "title": "<Specific, answerable question — e.g. 'What is the current occupancy rate?' or 'Can management provide audited financials for FY2024?'>",
      "description": "<Why this question matters for the investment decision and what a good answer looks like>",
      "priority": "HIGH | MEDIUM | LOW"
    }
  ]
}

RULES:
- The summary should be 2-3 detailed paragraphs, not a brief sentence. Cover key analysis points, risks, and opportunities.
- Provide 4-8 open questions that the deal team needs to answer
- Each question should be specific and answerable — not generic ("review financials") but targeted ("What is the trailing 12-month revenue broken down by customer segment?")
- Priority HIGH questions should be answered before IC submission
- Reference actual data points from the deal context when available
- Do NOT include a recommendation — that comes from the IC memo
- CRITICAL JSON FORMATTING: Never use unescaped double-quote characters (") inside JSON string values. Use single quotes (') for any inline quotations within text. All JSON string values must be properly escaped.`;
}

function buildICMemoPrompt(
  dealCtx: DealContext,
  templateContent: string,
  workstreamSummaries: { name: string; summary: string; openQuestions?: { title: string; answer?: string | null }[] }[],
): string {
  const dealContextBlock = buildDealContextBlock(dealCtx);

  let workstreamBlock = "\nWORKSTREAM ANALYSIS SUMMARIES:\n";
  for (const ws of workstreamSummaries) {
    workstreamBlock += `\n── ${ws.name} ──\n${ws.summary}\n`;
    if (ws.openQuestions && ws.openQuestions.length > 0) {
      const answered = ws.openQuestions.filter((q) => q.answer);
      if (answered.length > 0) {
        workstreamBlock += `\nResolved questions:\n`;
        for (const q of answered) {
          workstreamBlock += `  - ${q.title} → ${q.answer}\n`;
        }
      }
      const unanswered = ws.openQuestions.filter((q) => !q.answer);
      if (unanswered.length > 0) {
        workstreamBlock += `\nOpen questions (unresolved):\n`;
        for (const q of unanswered) {
          workstreamBlock += `  - ${q.title}\n`;
        }
      }
    }
  }

  return `${templateContent}

${dealContextBlock}
${workstreamBlock}
You MUST respond in valid JSON with exactly this shape:
{
  "score": <number 0-100>,
  "summary": "<Executive summary: what the deal is, the investment thesis, and overall recommendation in 2-3 paragraphs>",
  "sections": [
    {
      "name": "<Section Title>",
      "content": "<Detailed analysis text for this section — 2-4 paragraphs>",
      "riskLevel": "HIGH | MEDIUM | LOW"
    }
  ],
  "recommendation": "APPROVE | APPROVE_WITH_CONDITIONS | DECLINE"
}

SCORING GUIDE:
- 85-100: Strong investment — clear thesis, manageable risks, attractive returns
- 70-84: Solid investment — good thesis with some conditions to address
- 50-69: Mixed — notable concerns requiring significant conditions or further DD
- 30-49: Weak — significant risks outweigh potential returns
- 0-29: Pass — fundamental issues, do not pursue

SECTIONS TO INCLUDE:
1. Executive Summary (deal overview, thesis, recommendation)
2. Investment Highlights (3-5 key attractions)
3. Key Risks & Mitigants (risk, impact, likelihood, mitigant for each)
4. Deal Terms (structure, valuation, returns, protections)
5. Financial Summary (revenue, EBITDA, margins, leverage — trailing/current/projected)
6. DD Findings Summary (synthesize key takeaways across all workstreams)
7. Recommendation (APPROVE / APPROVE_WITH_CONDITIONS / DECLINE with conditions)

RULES:
- Synthesize workstream findings — don't repeat them verbatim
- Reference specific data points, dollar amounts, percentages
- Flag unresolved open questions as conditions for approval
- The memo should read as a professional IC document suitable for voting members
- CRITICAL JSON FORMATTING: Never use unescaped double-quote characters (") inside JSON string values. Use single quotes (') for any inline quotations within text. All JSON string values must be properly escaped.`;
}

// ── JSON Repair Helper ────────────────────────────────

/**
 * Repair common LLM JSON output issues:
 * 1. Unescaped double-quote characters inside string values (most common issue)
 * 2. Unescaped control characters (newlines, tabs, carriage returns)
 * 3. Trailing commas before } or ]
 * 4. Missing commas between properties
 *
 * Strategy: First try a targeted regex fix for the most common pattern
 * (unescaped quotes like `."` inside strings), then fall back to
 * character-by-character repair for control characters.
 */
function repairLLMJson(raw: string): string {
  // Phase 1: Fix unescaped double quotes inside JSON string values.
  // The most common LLM pattern is prose containing typographic quotes like:
  //   "summary": "...some text ending with a quote."", "next": ...
  //   "summary": "...some text ending with a quote."\n  "next": ...
  // We fix this by escaping quotes that appear inside string values.
  // Strategy: use known JSON structure — find property boundaries via key names
  // and escape any unescaped " within the value portion.

  // Phase 1a: Fix the pattern: ." followed by ", (content quote before real delimiter)
  // This handles: ...regulations."",  →  ...regulations.\"",
  let fixed = raw.replace(/([.!?;])"("(?:\s*,|\s*\n\s*"))/g, '$1\\"$2');

  // Phase 1b: Fix missing comma — ." followed by newline + "key":
  // This handles: ...expiration."\n  "openQuestions":  →  ...expiration.",\n  "openQuestions":
  fixed = fixed.replace(/"(\s*\n\s*)"(\w+)"\s*:/g, '",\n  "$2":');

  // Phase 2: Character walk for control characters
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < fixed.length; i++) {
    const ch = fixed[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Replace unescaped control characters with their JSON escape sequences
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // Handle other control characters (ASCII 0-31)
      const code = ch.charCodeAt(0);
      if (code < 32) {
        result += "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
    }

    result += ch;
  }

  // Phase 3: Remove trailing commas before } or ]
  result = result.replace(/,\s*([\]}])/g, "$1");

  return result;
}

// ── LLM Analysis Call ────────────────────────────────

export type DDAnalysisReturn = { result: DDAnalysisResult; errorReason?: undefined } | { result: null; errorReason: string };

export async function runDDAnalysis(
  firmId: string,
  dealCtx: DealContext,
  type: string,
  options?: {
    categoryName?: string | null;
    priorResponses?: PriorResponse[] | null;
    workstreamSummaries?: { name: string; summary: string; openQuestions?: { title: string; answer?: string | null }[] }[];
  },
): Promise<DDAnalysisReturn> {
  const t0 = performance.now();
  const timings: Record<string, number> = {};

  // Wrap client creation in try/catch — decryption failures shouldn't crash the route
  let client;
  try {
    client = await createAIClient(firmId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[DD Analysis] createAIClient failed for firm ${firmId}: ${msg}`);
    return { result: null, errorReason: `AI client initialization failed: ${msg}` };
  }
  if (!client) {
    logger.warn(`[DD Analysis] No AI client for firm ${firmId} — no API key configured`);
    return { result: null, errorReason: "No AI API key configured. Go to Settings → AI Configuration to add one." };
  }
  timings.clientInit = performance.now() - t0;

  const model = await getModelForFirm(firmId);
  const isICMemo = type === "IC_MEMO";
  timings.configLookup = performance.now() - t0;

  // Template resolution: IC_MEMO uses prompt template; DD types use category instructions
  let templateContent: string | null;
  if (isICMemo) {
    templateContent = await getPromptTemplate(firmId, type);
  } else if (options?.categoryName) {
    templateContent = await getCategoryInstructions(firmId, options.categoryName);
  } else {
    templateContent = await getPromptTemplate(firmId, type);
  }

  timings.templateResolve = performance.now() - t0;

  // Fallback to sensible default
  if (!templateContent) {
    const meta = DD_ANALYSIS_META[type];
    const analysisName = meta?.name || type.replace(/_/g, " ");
    const analysisDesc = meta?.description || "comprehensive analysis";
    templateContent = `You are a senior investment analyst performing ${analysisName} for a private investment firm.

Your task is to conduct a thorough ${analysisDesc}. Analyze all available deal data — documents, notes, financial information, and metadata — and produce a structured assessment.

Focus on:
- Key risks and their severity
- Specific, answerable questions the deal team should resolve
- Areas where additional information is needed
- Material observations that affect the investment decision

Be specific to the deal at hand. Reference actual data points, figures, and facts from the provided materials. Avoid generic boilerplate.`;
  }

  // Build the appropriate prompt
  const systemPrompt = isICMemo
    ? buildICMemoPrompt(dealCtx, templateContent, options?.workstreamSummaries || [])
    : buildWorkstreamPrompt(dealCtx, templateContent, options?.priorResponses);
  timings.promptBuild = performance.now() - t0;

  const promptTokenEstimate = Math.ceil(systemPrompt.length / 4); // rough estimate

  try {
    // Retry once on failure (transient timeouts / rate limits shouldn't produce permanent mock data)
    let response;
    const llmStart = performance.now();
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: isICMemo
                ? `Generate the IC Memo for "${dealCtx.dealName}" — synthesize all workstream analyses into a comprehensive investment committee memo with score and recommendation.`
                : `Run ${type.replace(/_/g, " ")} analysis for "${dealCtx.dealName}" — ${dealCtx.sector || "general"} sector, ${dealCtx.assetClass.replace(/_/g, " ")} asset class. Produce the analysis JSON.`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 6000,
          temperature: 0.3,
        });
        break; // Success — exit retry loop
      } catch (retryErr: unknown) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        if (attempt === 2) throw retryErr; // Re-throw on final attempt
        logger.warn(`[DD Analysis] ${type} attempt ${attempt} failed (${retryMsg}), retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    timings.llmCall = performance.now() - llmStart;

    let raw = response!.choices[0]?.message?.content || "{}";

    // Sanitize common LLM JSON issues before parsing
    // Strip markdown code fences if still present
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    // Remove trailing commas before } or ] (common LLM mistake)
    raw = raw.replace(/,\s*([\]}])/g, "$1");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch (firstErr) {
      logger.warn(`[DD Analysis] ${type} initial JSON parse failed, attempting repair...`);

      // Try multiple repair strategies in order of robustness
      const extracted = raw.match(/\{[\s\S]*\}/)?.[0];
      const strategies: Array<[string, () => string]> = [
        ["jsonrepair(raw)", () => jsonrepair(raw)],
        ["repairLLMJson(raw)", () => repairLLMJson(raw)],
        ...(extracted
          ? ([
              ["jsonrepair(extracted)", () => jsonrepair(extracted)],
              ["repairLLMJson(extracted)", () => repairLLMJson(extracted)],
            ] as Array<[string, () => string]>)
          : []),
      ];

      let repaired: Record<string, unknown> | null = null;
      for (const [label, fn] of strategies) {
        try {
          const fixed = fn();
          repaired = JSON.parse(fixed);
          logger.debug(`[DD Analysis] ${type} JSON repaired via ${label}`);
          break;
        } catch { /* try next strategy */ }
      }

      if (!repaired) throw firstErr;
      parsed = repaired;
    }

    timings.jsonParse = performance.now() - t0 - (timings.llmCall + timings.promptBuild);

    const validLevels = ["HIGH", "MEDIUM", "LOW"];
    const totalMs = performance.now() - t0;
    timings.total = totalMs;

    // Log comprehensive timing report
    const label = options?.categoryName || type;
    const outputTokens = raw.length / 4; // rough estimate
    logger.debug(
      `[DD Timing] ${label}: total=${(totalMs / 1000).toFixed(1)}s | ` +
      `init=${timings.clientInit.toFixed(0)}ms config=${(timings.configLookup - timings.clientInit).toFixed(0)}ms ` +
      `template=${((timings.templateResolve || 0) - (timings.configLookup || 0)).toFixed(0)}ms ` +
      `prompt=${((timings.promptBuild || 0) - (timings.templateResolve || 0)).toFixed(0)}ms ` +
      `llm=${(timings.llmCall / 1000).toFixed(1)}s parse=${timings.jsonParse.toFixed(0)}ms | ` +
      `~${promptTokenEstimate} prompt tokens, ~${Math.ceil(outputTokens)} output tokens`
    );

    if (isICMemo) {
      // Parse IC Memo result
      const sections: DDAnalysisSection[] = Array.isArray(parsed.sections)
        ? parsed.sections.map((s: Record<string, unknown>) => ({
            name: String(s.name || "Analysis"),
            content: String(s.content || ""),
            riskLevel: (validLevels.includes(String(s.riskLevel))
              ? String(s.riskLevel)
              : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
          }))
        : [];

      const validRecs = ["APPROVE", "APPROVE_WITH_CONDITIONS", "DECLINE"];
      const recommendation = validRecs.includes(String(parsed.recommendation))
        ? String(parsed.recommendation)
        : "APPROVE_WITH_CONDITIONS";

      const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));

      return { result: {
        summary: String(parsed.summary || "").slice(0, 3000) || "IC Memo generated.",
        openQuestions: [],
        score,
        sections,
        recommendation,
      } };
    } else {
      // Parse workstream result
      const openQuestions: DDOpenQuestion[] = Array.isArray(parsed.openQuestions)
        ? parsed.openQuestions.map((q: Record<string, unknown>) => ({
            title: String(q.title || "Review required"),
            description: String(q.description || "Further investigation needed."),
            priority: (validLevels.includes(String(q.priority))
              ? String(q.priority)
              : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
          }))
        : [];

      return { result: {
        summary: String(parsed.summary || "").slice(0, 5000) || "Analysis completed.",
        openQuestions,
        score: 0,
        sections: [],
        recommendation: "",
      } };
    }
  } catch (error: unknown) {
    const totalMs = performance.now() - t0;
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`[DD Analysis Service] ${type} LLM call failed after ${(totalMs / 1000).toFixed(1)}s: ${msg}`);
    // Extract specific error reasons for UI surfacing
    let errorReason = "AI analysis failed — try re-analyzing.";
    if (msg.includes("credit balance is too low")) {
      errorReason = "Anthropic API credits exhausted. Please add credits at console.anthropic.com.";
    } else if (msg.includes("rate limit") || msg.includes("429")) {
      errorReason = "API rate limit hit — wait a moment and try re-analyzing.";
    } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNABORTED")) {
      errorReason = "AI request timed out — try re-analyzing.";
    } else if (msg.includes("401") || msg.includes("authentication") || msg.includes("invalid.*key")) {
      errorReason = "AI API key is invalid. Check Settings → AI Configuration.";
    }
    return { result: null, errorReason };
  }
}
