import { prisma } from "@/lib/prisma";
import { createAIClient, getModelForFirm } from "@/lib/ai-config";
import { generateAIRouteList } from "@/lib/routes";
import { fmt } from "@/lib/utils";
import type { AIResponse, DatabaseContext, SearchResult } from "./command-bar-types";

/**
 * Gather portfolio context from the database for AI prompt enrichment.
 */
async function gatherContext(firmId: string): Promise<DatabaseContext> {
  const [
    firm,
    deals,
    entities,
    assets,
    investors,
    tasks,
    recentActivity,
  ] = await Promise.all([
    prisma.firm.findUnique({ where: { id: firmId }, select: { id: true, name: true } }),

    prisma.deal.findMany({
      where: { firmId },
      select: { stage: true },
    }),

    prisma.entity.findMany({
      where: { firmId },
      select: { entityType: true, totalCommitments: true },
    }),

    prisma.asset.findMany({
      where: { status: "ACTIVE" },
      select: { assetClass: true, fairValue: true, costBasis: true },
    }),

    prisma.investor.findMany({
      select: { id: true },
      // count only
    }),

    prisma.task.findMany({
      select: { status: true },
    }),

    prisma.dealActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { description: true, createdAt: true },
    }),
  ]);

  // Aggregate deals by stage
  const dealsByStage: Record<string, number> = {};
  for (const d of deals) {
    dealsByStage[d.stage] = (dealsByStage[d.stage] || 0) + 1;
  }

  // Aggregate entities by type
  const entitiesByType: Record<string, number> = {};
  for (const e of entities) {
    entitiesByType[e.entityType] = (entitiesByType[e.entityType] || 0) + 1;
  }

  // Aggregate assets by class
  const assetsByClass: Record<string, number> = {};
  let totalFairValue = 0;
  let totalCostBasis = 0;
  for (const a of assets) {
    assetsByClass[a.assetClass] = (assetsByClass[a.assetClass] || 0) + 1;
    totalFairValue += a.fairValue || 0;
    totalCostBasis += a.costBasis || 0;
  }

  // Aggregate commitments
  let totalCommitted = 0;
  for (const e of entities) {
    totalCommitted += e.totalCommitments || 0;
  }

  // Aggregate tasks by status
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  }

  return {
    firm,
    dealsByStage,
    totalDeals: deals.length,
    entitiesByType,
    totalEntities: entities.length,
    assetsByClass,
    totalAssets: assets.length,
    totalFairValue,
    totalCostBasis,
    investorCount: investors.length,
    totalCommitted,
    tasksByStatus,
    recentActivity: recentActivity.map((a) => ({
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

function buildSystemPrompt(ctx: DatabaseContext): string {
  const stageBreakdown = Object.entries(ctx.dealsByStage)
    .map(([stage, count]) => `${stage}: ${count}`)
    .join(", ");

  const assetBreakdown = Object.entries(ctx.assetsByClass)
    .map(([cls, count]) => `${cls}: ${count}`)
    .join(", ");

  const entityBreakdown = Object.entries(ctx.entitiesByType)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");

  const taskBreakdown = Object.entries(ctx.tasksByStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ");

  const activitySummary = ctx.recentActivity.length > 0
    ? ctx.recentActivity.map((a) => `- ${a.description}`).join("\n")
    : "No recent activity";

  return `You are Atlas AI, the intelligent assistant for Atlas — a fund administration platform managing fund entities, LP relationships, deal pipeline, and portfolio assets.

CURRENT PORTFOLIO STATE:
- Firm: ${ctx.firm?.name || "Unknown"}
- Deals: ${ctx.totalDeals} total (${stageBreakdown || "none"})
- Entities: ${ctx.totalEntities} (${entityBreakdown || "none"})
- Assets: ${ctx.totalAssets} active (${assetBreakdown || "none"})
  - Total Fair Value: ${fmt(ctx.totalFairValue)}
  - Total Cost Basis: ${fmt(ctx.totalCostBasis)}
  - Unrealized Gain: ${fmt(ctx.totalFairValue - ctx.totalCostBasis)}
- Investors: ${ctx.investorCount} LPs (${fmt(ctx.totalCommitted)} committed)
- Tasks: ${taskBreakdown || "none"}

RECENT ACTIVITY:
${activitySummary}

AVAILABLE MODULES (use ONLY these exact URL paths in searchResults):
${generateAIRouteList()}

INSTRUCTIONS:
- Be concise and helpful. Reference real data from the portfolio state above.
- When the user asks about deals, reference the stage breakdown.
- When asked about performance, reference fair value vs cost basis.
- Suggest relevant follow-up questions.
- If the user wants to navigate somewhere, include search results with the page URL.
- IMPORTANT: Only use URLs from the AVAILABLE MODULES list above. Never invent URLs like /portfolio, /portfolio/assets, /capital-activity, or /tasks/todo.

You MUST respond in valid JSON with exactly this shape:
{
  "message": "Your helpful response text",
  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "searchResults": [
    {
      "id": "unique-id",
      "type": "deal|entity|asset|investor|page",
      "title": "Result title",
      "subtitle": "Brief description",
      "url": "/deals/some-id",
      "metadata": {}
    }
  ]
}`;
}

/**
 * Main AI search function — gathers context, calls LLM, returns structured response.
 */
export async function searchAndAnalyze(
  query: string,
  firmId: string,
): Promise<AIResponse> {
  const client = await createAIClient(firmId);

  if (!client) {
    return {
      message:
        "AI features require an API key. Configure your API key in Settings → AI Configuration to enable intelligent search and chat.",
      searchResults: [],
      suggestions: [
        "How do I add an API key?",
        "What can Atlas AI do?",
        "Show me the deal pipeline",
      ],
    };
  }

  try {
    const ctx = await gatherContext(firmId);
    const systemPrompt = buildSystemPrompt(ctx);
    const model = await getModelForFirm(firmId);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      message:
        parsed.message ||
        "I processed your request but couldn't generate a detailed response.",
      searchResults: (parsed.searchResults || []) as SearchResult[],
      suggestions: (parsed.suggestions || []) as string[],
    };
  } catch (error) {
    console.error("[AI Service] Error:", error);
    return {
      message:
        "I encountered an error processing your request. Please check your API key configuration and try again.",
      searchResults: [],
      suggestions: [
        "Check API key configuration",
        "Try a simpler query",
        "View the dashboard",
      ],
    };
  }
}
