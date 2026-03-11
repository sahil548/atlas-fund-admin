import { prisma } from "@/lib/prisma";
import { createAIClient, getModelForFirm } from "@/lib/ai-config";
import type { AgentCapability, AgentResponse } from "./command-bar-types";
import { logger } from "@/lib/logger";

// ── Agent capability definitions ────────────────────────────────

const AGENT_DEFINITIONS: Record<
  string,
  { description: string; capabilities: AgentCapability[] }
> = {
  dealdesk: {
    description: "Deal pipeline, screening, IC review, stage transitions",
    capabilities: [
      { agent: "dealdesk", name: "pipeline_status", description: "Get current deal pipeline status and stage breakdown" },
      { agent: "dealdesk", name: "deal_detail", description: "Get details about a specific deal" },
      { agent: "dealdesk", name: "screening_results", description: "Review AI screening results for deals" },
      { agent: "dealdesk", name: "ic_status", description: "Check IC review status and vote records" },
    ],
  },
  portfolio: {
    description: "Asset performance, valuations, NAV, allocation analysis",
    capabilities: [
      { agent: "portfolio", name: "portfolio_summary", description: "Get portfolio summary with fair values and cost basis" },
      { agent: "portfolio", name: "asset_allocation", description: "Analyze asset allocation by class, instrument, and participation" },
      { agent: "portfolio", name: "performance_metrics", description: "Calculate IRR, TVPI, DPI, and MOIC metrics" },
      { agent: "portfolio", name: "valuation_history", description: "Review valuation history for assets" },
    ],
  },
  accounting: {
    description: "Capital calls, distributions, accounting connections, fee calculations",
    capabilities: [
      { agent: "accounting", name: "capital_calls", description: "List pending and completed capital calls" },
      { agent: "accounting", name: "distributions", description: "Review distribution history and allocations" },
      { agent: "accounting", name: "connection_status", description: "Check QBO/Xero accounting connection status" },
      { agent: "accounting", name: "lp_commitments", description: "Summarize LP commitment levels and funded amounts" },
    ],
  },
  operations: {
    description: "Tasks, meetings, documents, entity formation, notifications",
    capabilities: [
      { agent: "operations", name: "task_summary", description: "Get task summary by status and assignee" },
      { agent: "operations", name: "upcoming_meetings", description: "List upcoming meetings and recent transcripts" },
      { agent: "operations", name: "formation_status", description: "Check entity formation workflow progress" },
      { agent: "operations", name: "recent_documents", description: "List recently uploaded or modified documents" },
    ],
  },
};

// ── Public API ──────────────────────────────────────────────────

/**
 * List all agent capabilities.
 */
export function listCapabilities(): AgentCapability[] {
  return Object.values(AGENT_DEFINITIONS).flatMap((def) => def.capabilities);
}

/**
 * Route a natural language query to the best agent and execute it.
 * Returns null if no confident match (falls back to general AI search).
 */
export async function routeToAgent(
  query: string,
  firmId: string,
): Promise<AgentResponse | null> {
  const client = await createAIClient(firmId);
  if (!client) return null;

  try {
    const model = await getModelForFirm(firmId);

    // Step 1: Determine which agent should handle this query
    const agentList = Object.entries(AGENT_DEFINITIONS)
      .map(([name, def]) => `- ${name}: ${def.description}. Capabilities: ${def.capabilities.map((c) => c.name).join(", ")}`)
      .join("\n");

    const routingResponse = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You route queries to specialized agents. Available agents:\n${agentList}\n\nRespond in JSON: { "agent": "agent_name", "capability": "capability_name", "confidence": 0.0-1.0, "reasoning": "brief explanation" }\nIf no agent is a good fit, set confidence below 0.5.`,
        },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.3,
    });

    const routing = JSON.parse(routingResponse.choices[0]?.message?.content || "{}");

    if (!routing.agent || !routing.confidence || routing.confidence < 0.5) {
      return null; // No confident match, fall back to general search
    }

    // Step 2: Gather agent-specific data and generate response
    const agentData = await gatherAgentData(routing.agent, routing.capability, firmId);

    const agentResponse = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are the ${routing.agent} agent for Atlas fund administration platform. Respond helpfully about ${AGENT_DEFINITIONS[routing.agent]?.description || "general operations"}.\n\nRelevant data:\n${JSON.stringify(agentData, null, 2)}\n\nRespond in JSON: { "message": "your response", "suggestions": ["follow-up 1", "follow-up 2"] }`,
        },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    });

    const parsed = JSON.parse(agentResponse.choices[0]?.message?.content || "{}");

    return {
      success: true,
      message: parsed.message || "Agent processed your request.",
      routed_to: routing.agent,
      routing_confidence: routing.confidence,
      suggestions: parsed.suggestions || [],
      searchResults: parsed.searchResults || [],
    };
  } catch (error) {
    logger.error("[Agent Registry] Routing error", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// ── Agent Data Gathering ────────────────────────────────────────

async function gatherAgentData(
  agent: string,
  _capability: string,
  firmId: string,
): Promise<Record<string, unknown>> {
  switch (agent) {
    case "dealdesk":
      return gatherDealDeskData(firmId);
    case "portfolio":
      return gatherPortfolioData();
    case "accounting":
      return gatherAccountingData(firmId);
    case "operations":
      return gatherOperationsData();
    default:
      return {};
  }
}

async function gatherDealDeskData(firmId: string) {
  const deals = await prisma.deal.findMany({
    where: { firmId },
    select: {
      id: true,
      name: true,
      stage: true,
      assetClass: true,
      sector: true,
      targetSize: true,
      aiScore: true,
      aiFlag: true,
      createdAt: true,
      dealLead: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return { deals, totalDeals: deals.length };
}

async function gatherPortfolioData() {
  const assets = await prisma.asset.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      assetClass: true,
      capitalInstrument: true,
      fairValue: true,
      costBasis: true,
      sector: true,
    },
    orderBy: { fairValue: "desc" },
    take: 20,
  });
  const totalFV = assets.reduce((s, a) => s + (a.fairValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + (a.costBasis || 0), 0);
  return { assets, totalFairValue: totalFV, totalCostBasis: totalCost, unrealizedGain: totalFV - totalCost };
}

async function gatherAccountingData(firmId: string) {
  const [entities, capitalCalls, distributions] = await Promise.all([
    prisma.entity.findMany({
      where: { firmId },
      select: {
        id: true,
        name: true,
        entityType: true,
        totalCommitments: true,
        accountingConnection: { select: { provider: true, syncStatus: true, lastSyncAt: true } },
      },
    }),
    prisma.capitalCall.findMany({
      where: { entity: { firmId } },
      select: { id: true, callNumber: true, amount: true, status: true, dueDate: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.distributionEvent.findMany({
      where: { entity: { firmId } },
      select: { id: true, grossAmount: true, status: true, distributionDate: true },
      orderBy: { distributionDate: "desc" },
      take: 10,
    }),
  ]);
  return { entities, capitalCalls, distributions };
}

async function gatherOperationsData() {
  const [tasks, meetings, recentDocs] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeName: true,
      },
      orderBy: { dueDate: "asc" },
      take: 15,
    }),
    prisma.meeting.findMany({
      orderBy: { meetingDate: "desc" },
      take: 5,
      select: { id: true, title: true, meetingDate: true, hasTranscript: true },
    }),
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, category: true, createdAt: true },
    }),
  ]);
  return { openTasks: tasks, recentMeetings: meetings, recentDocuments: recentDocs };
}
