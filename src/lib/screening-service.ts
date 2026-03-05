import { createAIClient, getAIConfig, getModelForFirm, getPromptTemplate } from "@/lib/ai-config";

// ── Types ────────────────────────────────────────────────────────

export interface ScreeningCategory {
  name: string;
  instructions?: string;
  enabled: boolean;
}

export interface DealContext {
  dealName: string;
  assetClass: string;
  capitalInstrument?: string | null;
  participationStructure?: string | null;
  sector?: string | null;
  targetSize?: string | null;
  targetCheckSize?: string | null;
  targetReturn?: string | null;
  gpName?: string | null;
  description?: string | null;
  investmentRationale?: string | null;
  additionalContext?: string | null;
  thesisNotes?: string | null;
  documents: { name: string; category: string | null }[];
  notes: { content: string; author: string | null }[];
  documentContents?: { name: string; content: string }[];
}

export interface ScreeningFinding {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface ScreeningResult {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  financials: Record<string, string>;
  ddFindings: Record<string, ScreeningFinding[]>;
}

// ── Prompt Builder ───────────────────────────────────────────────

function buildScreeningPrompt(
  dealCtx: DealContext,
  categories: ScreeningCategory[],
  customSystemPrompt: string | null,
  customInstructions: string | undefined,
): string {
  const enabledCats = categories.filter((c) => c.enabled);
  const categoryList = enabledCats
    .map((c) => `- ${c.name}${c.instructions ? `: ${c.instructions}` : ""}`)
    .join("\n");

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

  const basePrompt =
    customSystemPrompt ||
    `You are an expert investment analyst for a family office GP. Analyze the provided deal data and produce a structured screening report.`;

  return `${basePrompt}

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
${dealCtx.documentContents && dealCtx.documentContents.length > 0
    ? "\nDOCUMENT CONTENTS:\n" +
      dealCtx.documentContents
        .map((d) => `\n--- ${d.name} ---\n${d.content}${d.content.length >= 5000 ? "\n[... truncated ...]" : ""}`)
        .join("\n")
    : ""}

ANALYST NOTES:
${notesList}

DUE DILIGENCE CATEGORIES TO EVALUATE:
${categoryList}

${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}\n` : ""}

TASK:
Perform a comprehensive investment screening. Evaluate the deal across the listed DD categories and produce findings that will become due diligence tasks for the team.

You MUST respond in valid JSON with exactly this shape:
{
  "score": <number 0-100>,
  "summary": "<2-4 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "recommendation": "<STRONG_PROCEED | PROCEED | PROCEED_WITH_CAUTION | WATCHLIST | PASS>",
  "financials": {
    "<metric_name>": "<value with units>"
  },
  "ddFindings": {
    "${enabledCats.map((c) => c.name).join('": [...], "')}": [
      {
        "title": "<short finding title>",
        "description": "<1-2 sentence actionable finding>",
        "priority": "HIGH | MEDIUM | LOW"
      }
    ]
  }
}

RULES:
- Score 85-100: STRONG_PROCEED (exceptional opportunity, minimal red flags)
- Score 70-84: PROCEED (solid opportunity, manageable risks)
- Score 50-69: PROCEED_WITH_CAUTION (notable concerns, extra DD needed)
- Score 30-49: WATCHLIST (significant concerns, revisit later)
- Score 0-29: PASS (fundamental issues, do not pursue)
- Each DD category MUST have 2-4 findings with actionable descriptions
- Findings should reference the specific deal context above
- Financials should include any metrics you can infer from the deal data
- Be specific, reference sector dynamics, and provide actionable next steps`;
}

// ── LLM Screening Call ───────────────────────────────────────────

export async function screenDealWithAI(
  firmId: string,
  dealCtx: DealContext,
  categories: ScreeningCategory[],
  customInstructions?: string,
): Promise<ScreeningResult | null> {
  const client = await createAIClient(firmId);
  if (!client) return null; // No API key — caller should fall back to mock

  const config = await getAIConfig(firmId);
  const model = await getModelForFirm(firmId);

  // Prompt priority: template DB → legacy config.systemPrompt → hardcoded default
  const screeningTemplate = await getPromptTemplate(firmId, "SCREENING");
  const effectivePrompt = screeningTemplate || config.systemPrompt;

  const systemPrompt = buildScreeningPrompt(
    dealCtx,
    categories,
    effectivePrompt,
    customInstructions,
  );

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Screen this deal: "${dealCtx.dealName}" — ${dealCtx.sector || "general"} sector, ${dealCtx.assetClass.replace(/_/g, " ")} asset class. Produce the full screening JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.4,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Validate and normalize the response
    const enabledCats = categories.filter((c) => c.enabled);
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));

    // Ensure ddFindings has entries for all enabled categories
    const ddFindings: Record<string, ScreeningFinding[]> = {};
    for (const cat of enabledCats) {
      const catFindings = parsed.ddFindings?.[cat.name];
      if (Array.isArray(catFindings) && catFindings.length > 0) {
        ddFindings[cat.name] = catFindings.map(
          (f: { title?: string; description?: string; priority?: string }) => {
            const prio = String(f.priority || "MEDIUM");
            return {
              title: String(f.title || `${cat.name} review needed`),
              description: String(
                f.description || `Detailed ${cat.name.toLowerCase()} analysis required.`,
              ),
              priority: (["HIGH", "MEDIUM", "LOW"].includes(prio) ? prio : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
            };
          },
        );
      } else {
        ddFindings[cat.name] = [
          {
            title: `${cat.name} — detailed review needed`,
            description: `AI screening flagged this area for further due diligence. ${cat.instructions || ""}`.trim(),
            priority: "MEDIUM",
          },
        ];
      }
    }

    // Normalize recommendation
    const validRecs = [
      "STRONG_PROCEED",
      "PROCEED",
      "PROCEED_WITH_CAUTION",
      "WATCHLIST",
      "PASS",
    ];
    const recommendation = validRecs.includes(parsed.recommendation)
      ? parsed.recommendation
      : score >= 85
        ? "STRONG_PROCEED"
        : score >= 70
          ? "PROCEED"
          : score >= 50
            ? "PROCEED_WITH_CAUTION"
            : score >= 30
              ? "WATCHLIST"
              : "PASS";

    return {
      score,
      summary:
        String(parsed.summary || "").slice(0, 1000) ||
        `AI screening completed with a score of ${score}/100.`,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map(String).slice(0, 6)
        : ["Further analysis needed to identify strengths"],
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.map(String).slice(0, 6)
        : ["Further analysis needed to identify risks"],
      recommendation,
      financials:
        parsed.financials && typeof parsed.financials === "object"
          ? Object.fromEntries(
              Object.entries(parsed.financials).map(([k, v]) => [
                String(k),
                String(v),
              ]),
            )
          : {},
      ddFindings,
    };
  } catch (error) {
    console.error("[Screening Service] LLM call failed:", error);
    return null; // Caller should fall back to mock
  }
}
