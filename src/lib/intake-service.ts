import { createAIClient, getAIConfig, getModelForFirm, getPromptTemplate } from "@/lib/ai-config";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────

export interface IntakeCategory {
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

export interface IntakeDocumentSummary {
  name: string;
  type: string;
  keyPoints: string[];
}

export interface IntakeResult {
  dealSummary: string;
  keyMetrics: Record<string, string>;
  documentSummaries: IntakeDocumentSummary[];
  workstreamContext: Record<string, string>;
  dataGaps: string[];
}

// ── Prompt Builder ───────────────────────────────────────────────

function buildIntakePrompt(
  dealCtx: DealContext,
  categories: IntakeCategory[],
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

  // Include actual document content when available
  let documentContentSection = "";
  if (dealCtx.documentContents && dealCtx.documentContents.length > 0) {
    documentContentSection = "\nDOCUMENT CONTENTS:\n";
    for (const doc of dealCtx.documentContents) {
      const content = doc.content.slice(0, 10_000);
      documentContentSection += `\n--- ${doc.name} ---\n${content}\n`;
      if (doc.content.length > 10_000) {
        documentContentSection += `[... truncated, ${doc.content.length.toLocaleString()} total characters ...]\n`;
      }
    }
  }

  const basePrompt =
    customSystemPrompt ||
    `You are a data extraction and structuring AI for an investment firm's deal pipeline. Your job is to intake all available deal information — documents, notes, financial data, and metadata — and produce a structured summary optimized for downstream due diligence workstreams.`;

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
${documentContentSection}
ANALYST NOTES:
${notesList}

DUE DILIGENCE WORKSTREAMS TO PREPARE DATA FOR:
${categoryList}

${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}\n` : ""}

TASK:
Extract, structure, and organize ALL available data from the deal materials above. You are NOT making investment recommendations or scoring this deal. Your sole purpose is to:
1. Extract key facts, figures, and data points from all available sources
2. Identify what type of information is available and what is missing
3. Organize the extracted data by due diligence workstream so each downstream analysis can start from structured inputs
4. Flag any data quality issues, inconsistencies, or gaps

You MUST respond in valid JSON with exactly this shape:
{
  "dealSummary": "<3-5 paragraph structured overview of the deal based on all available data>",
  "keyMetrics": {
    "<metric_name>": "<value with units>"
  },
  "documentSummaries": [
    {
      "name": "<document name>",
      "type": "<document type: financial_statement, legal_agreement, marketing_deck, model, memo, other>",
      "keyPoints": ["<extracted key point 1>", "<extracted key point 2>"]
    }
  ],
  "workstreamContext": {
    "${enabledCats.map((c) => c.name).join('": "<relevant extracted data...>", "')}": "<relevant extracted data...>"
  },
  "dataGaps": ["<missing information 1>", "<missing information 2>"]
}

RULES:
- keyMetrics should include ALL financial and operational metrics you can extract (revenue, EBITDA, margins, growth rates, multiples, AUM, etc.)
- documentSummaries should cover every document with 3-6 key points each
- workstreamContext should provide a thorough summary of ALL data relevant to that workstream — this is the primary input for downstream AI analysis
- dataGaps should list specific missing items that would be valuable for due diligence (e.g., "No audited financial statements for FY2024", "Management team bios not provided")
- Be factual and precise — extract exact numbers, dates, and terms rather than paraphrasing
- If document content is not available, note what types of documents are listed and what data might be in them`;
}

// ── LLM Intake Call ───────────────────────────────────────────

export async function intakeDealWithAI(
  firmId: string,
  dealCtx: DealContext,
  categories: IntakeCategory[],
  customInstructions?: string,
): Promise<IntakeResult | null> {
  const client = await createAIClient(firmId);
  if (!client) return null;

  const config = await getAIConfig(firmId);
  const model = await getModelForFirm(firmId);

  const intakeTemplate = await getPromptTemplate(firmId, "INTAKE");
  const effectivePrompt = intakeTemplate || config.systemPrompt;

  const systemPrompt = buildIntakePrompt(
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
          content: `Intake and structure all available data for deal: "${dealCtx.dealName}" — ${dealCtx.sector || "general"} sector, ${dealCtx.assetClass.replace(/_/g, " ")} asset class. Produce the full extraction JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const enabledCats = categories.filter((c) => c.enabled);

    // Normalize document summaries
    const documentSummaries: IntakeDocumentSummary[] = Array.isArray(parsed.documentSummaries)
      ? parsed.documentSummaries.map(
          (d: { name?: string; type?: string; keyPoints?: string[] }) => ({
            name: String(d.name || "Unknown document"),
            type: String(d.type || "other"),
            keyPoints: Array.isArray(d.keyPoints) ? d.keyPoints.map(String) : [],
          }),
        )
      : [];

    // Normalize workstream context — ensure every enabled category has an entry
    const workstreamContext: Record<string, string> = {};
    for (const cat of enabledCats) {
      workstreamContext[cat.name] = String(
        parsed.workstreamContext?.[cat.name] ||
          "No relevant data extracted for this workstream.",
      );
    }

    return {
      dealSummary:
        String(parsed.dealSummary || "").slice(0, 5000) ||
        "Intake completed — review extracted data below.",
      keyMetrics:
        parsed.keyMetrics && typeof parsed.keyMetrics === "object"
          ? Object.fromEntries(
              Object.entries(parsed.keyMetrics).map(([k, v]) => [String(k), String(v)]),
            )
          : {},
      documentSummaries,
      workstreamContext,
      dataGaps: Array.isArray(parsed.dataGaps)
        ? parsed.dataGaps.map(String)
        : [],
    };
  } catch (error) {
    logger.error("[Intake Service] LLM call failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
