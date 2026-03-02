import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import type { AIResponse, DatabaseContext, SearchResult } from "./command-bar-types";

/**
 * Get an OpenAI-compatible client.
 * Supports: OpenAI (default), Anthropic (via OpenAI-compatible endpoint),
 * or any OpenAI-compatible API via OPENAI_BASE_URL.
 */
function getAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const provider = process.env.AI_PROVIDER || "openai";
  const baseURL = process.env.OPENAI_BASE_URL;

  if (provider === "anthropic") {
    return new OpenAI({
      apiKey,
      baseURL: baseURL || "https://api.anthropic.com/v1/",
    });
  }

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

function getModel(): string {
  return process.env.AI_MODEL || "gpt-4o";
}

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

function formatCurrency(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
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
  - Total Fair Value: ${formatCurrency(ctx.totalFairValue)}
  - Total Cost Basis: ${formatCurrency(ctx.totalCostBasis)}
  - Unrealized Gain: ${formatCurrency(ctx.totalFairValue - ctx.totalCostBasis)}
- Investors: ${ctx.investorCount} LPs (${formatCurrency(ctx.totalCommitted)} committed)
- Tasks: ${taskBreakdown || "none"}

RECENT ACTIVITY:
${activitySummary}

AVAILABLE MODULES:
Dashboard, Deal Desk, Portfolio/Assets, Entities, Directory, Documents, Tasks, Accounting, Meetings, Waterfall, Capital Activity, Settings

INSTRUCTIONS:
- Be concise and helpful. Reference real data from the portfolio state above.
- When the user asks about deals, reference the stage breakdown.
- When asked about performance, reference fair value vs cost basis.
- Suggest relevant follow-up questions.
- If the user wants to navigate somewhere, include search results with the page URL.

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
  const client = getAIClient();

  if (!client) {
    return {
      message:
        "AI features require an API key. Add OPENAI_API_KEY to your .env file to enable intelligent search and chat.",
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

    const response = await client.chat.completions.create({
      model: getModel(),
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
