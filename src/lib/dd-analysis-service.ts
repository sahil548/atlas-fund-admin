import { createAIClient, getModelForFirm, getPromptTemplate, getCategoryInstructions } from "@/lib/ai-config";
import type { DealContext } from "@/lib/screening-service";

// ── Types ────────────────────────────────────────────

export interface DDAnalysisSection {
  name: string;
  content: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface DDAnalysisFinding {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface DDAnalysisResult {
  summary: string;
  sections: DDAnalysisSection[];
  findings: DDAnalysisFinding[];
  recommendation: string;
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
  IC_MEMO: {
    name: "IC Memo",
    description: "Investment Committee memo with recommendation",
  },
};

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

ANALYST NOTES:
${notesList}
`.trim();
}

function buildAnalysisPrompt(
  dealCtx: DealContext,
  type: string,
  templateContent: string,
  screeningData?: {
    score: number;
    recommendation: string;
    strengths: string[];
    risks: string[];
    ddFindings?: Record<string, { title: string; description: string; priority: string }[]>;
  } | null,
  priorFindings?: { title: string; description: string; priority: string }[] | null,
): string {
  const dealContextBlock = buildDealContextBlock(dealCtx);

  const isICMemo = type === "IC_MEMO";
  const recommendationOptions = isICMemo
    ? "APPROVE | APPROVE_WITH_CONDITIONS | DECLINE"
    : "GO | NO_GO | NEEDS_MORE_INFO";

  let screeningBlock = "";
  if (screeningData && isICMemo) {
    screeningBlock = `
PRIOR AI SCREENING RESULTS:
- Score: ${screeningData.score}/100
- Recommendation: ${screeningData.recommendation}
- Strengths: ${screeningData.strengths.join("; ")}
- Risks: ${screeningData.risks.join("; ")}
`;
    // Include detailed findings per category for IC Memo
    if (screeningData.ddFindings) {
      screeningBlock += `\nDETAILED SCREENING FINDINGS BY CATEGORY:\n`;
      for (const [category, findings] of Object.entries(screeningData.ddFindings)) {
        screeningBlock += `\n${category}:\n`;
        for (const f of findings) {
          screeningBlock += `  - [${f.priority}] ${f.title}: ${f.description}\n`;
        }
      }
      screeningBlock += `\nReference these specific findings in the memo sections. The IC memo should synthesize and contextualize the screening findings, not repeat them verbatim.\n`;
    }
  }

  // Prior screening findings for per-workstream DD analysis (not IC Memo)
  let priorFindingsBlock = "";
  if (priorFindings && priorFindings.length > 0 && !isICMemo) {
    priorFindingsBlock = `\nPRIOR SCREENING FINDINGS FOR THIS CATEGORY:\n`;
    for (const f of priorFindings) {
      priorFindingsBlock += `- [${f.priority}] ${f.title}: ${f.description}\n`;
    }
    priorFindingsBlock += `\nBuild on these findings — go deeper, validate, and add new findings the screening may have missed.\n`;
  }

  return `${templateContent}

${dealContextBlock}
${screeningBlock}${priorFindingsBlock}
You MUST respond in valid JSON with exactly this shape:
{
  "summary": "<2-3 sentence executive overview of this analysis>",
  "sections": [
    {
      "name": "<Section Title>",
      "content": "<Detailed analysis text for this section — 2-4 paragraphs>",
      "riskLevel": "HIGH | MEDIUM | LOW"
    }
  ],
  "findings": [
    {
      "title": "<Short finding title — becomes a DD task>",
      "description": "<1-2 sentence actionable finding with specific next steps>",
      "priority": "HIGH | MEDIUM | LOW"
    }
  ],
  "recommendation": "${recommendationOptions}"
}

RULES:
- Provide 3-6 sections covering the major analytical areas
- Provide 4-8 findings that become actionable due diligence tasks
- Each finding should be specific to this deal, not generic boilerplate
- Section content should reference the deal context provided above
- Be specific about dollar amounts, percentages, and timeline estimates where possible
- Findings with priority HIGH should be addressed before IC submission`;
}

// ── LLM Analysis Call ────────────────────────────────

export async function runDDAnalysis(
  firmId: string,
  dealCtx: DealContext,
  type: string,
  screeningData?: {
    score: number;
    recommendation: string;
    strengths: string[];
    risks: string[];
    ddFindings?: Record<string, { title: string; description: string; priority: string }[]>;
  } | null,
  priorFindings?: { title: string; description: string; priority: string }[] | null,
  categoryName?: string | null,
): Promise<DDAnalysisResult | null> {
  const client = await createAIClient(firmId);
  if (!client) return null;

  const model = await getModelForFirm(firmId);

  // Template resolution: IC_MEMO uses prompt template; DD types use category instructions
  let templateContent: string | null;
  if (type === "IC_MEMO") {
    templateContent = await getPromptTemplate(firmId, type);
  } else if (categoryName) {
    templateContent = await getCategoryInstructions(firmId, categoryName);
  } else {
    // Legacy fallback for old callers
    templateContent = await getPromptTemplate(firmId, type);
  }
  if (!templateContent) return null;

  const systemPrompt = buildAnalysisPrompt(dealCtx, type, templateContent, screeningData, priorFindings);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Run ${type.replace(/_/g, " ")} analysis for "${dealCtx.dealName}" — ${dealCtx.sector || "general"} sector, ${dealCtx.assetClass.replace(/_/g, " ")} asset class. Produce the full analysis JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const validLevels = ["HIGH", "MEDIUM", "LOW"];

    const sections: DDAnalysisSection[] = Array.isArray(parsed.sections)
      ? parsed.sections.map((s: Record<string, unknown>) => ({
          name: String(s.name || "Analysis"),
          content: String(s.content || ""),
          riskLevel: (validLevels.includes(String(s.riskLevel))
            ? String(s.riskLevel)
            : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        }))
      : [];

    const findings: DDAnalysisFinding[] = Array.isArray(parsed.findings)
      ? parsed.findings.map((f: Record<string, unknown>) => ({
          title: String(f.title || "Review required"),
          description: String(f.description || "Further analysis needed."),
          priority: (validLevels.includes(String(f.priority))
            ? String(f.priority)
            : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        }))
      : [];

    return {
      summary:
        String(parsed.summary || "").slice(0, 2000) || "Analysis completed.",
      sections,
      findings,
      recommendation: String(parsed.recommendation || "NEEDS_MORE_INFO"),
    };
  } catch (error) {
    console.error(`[DD Analysis Service] ${type} LLM call failed:`, error);
    return null;
  }
}
