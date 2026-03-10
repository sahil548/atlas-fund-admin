import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createUserAIClient } from "@/lib/ai-config";
import { prisma } from "@/lib/prisma";
import { jsonrepair } from "jsonrepair";

const SuggestTasksSchema = z.object({
  firmId: z.string().min(1),
  contextType: z.enum(["DEAL", "ASSET", "ENTITY"]),
  contextId: z.string().min(1),
});

export async function POST(req: Request) {
  // Auth + rate limiting
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = rateLimit(authUser.id);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Slow down.", retryAfter: limitResult.retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const { data, error } = await parseBody(req, SuggestTasksSchema);
  if (error) return error;

  const { firmId, contextType, contextId } = data!;

  // Resolve AI client (user key -> tenant key -> none)
  const aiClient = await createUserAIClient(authUser.id, firmId);
  if (!aiClient) {
    return NextResponse.json(
      { error: "No API key configured. Add one in Settings → AI Configuration." },
      { status: 400 },
    );
  }
  const { client, model } = aiClient;

  // Gather context data
  let contextSummary = "";
  let existingTaskTitles: string[] = [];

  if (contextType === "DEAL") {
    const deal = await prisma.deal.findUnique({
      where: { id: contextId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 5 },
        tasks: { take: 10, select: { title: true, status: true } },
        documents: { take: 5, select: { name: true, category: true } },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    existingTaskTitles = deal.tasks.map((t) => t.title);

    const recentActivity = deal.activities
      .slice(0, 5)
      .map((a) => a.description)
      .join("; ");

    const docs = deal.documents.map((d) => `${d.name} (${d.category || "document"})`).join(", ");

    const missingFields: string[] = [];
    if (!deal.counterparty) missingFields.push("counterparty");
    if (!deal.targetSize) missingFields.push("target size");
    if (!deal.sector) missingFields.push("sector");
    if (!deal.description) missingFields.push("description");

    contextSummary = [
      `DEAL: ${deal.name}`,
      `Stage: ${deal.stage}`,
      `Asset Class: ${deal.assetClass}`,
      deal.sector ? `Sector: ${deal.sector}` : null,
      deal.targetSize ? `Target Size: ${deal.targetSize}` : null,
      `Recent activity: ${recentActivity || "none"}`,
      deal.documents.length > 0 ? `Documents: ${docs}` : null,
      missingFields.length > 0 ? `Missing fields: ${missingFields.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  } else if (contextType === "ASSET") {
    const asset = await prisma.asset.findUnique({
      where: { id: contextId },
      include: {
        tasks: { take: 10, select: { title: true, status: true } },
        activityEvents: { orderBy: { createdAt: "desc" }, take: 5, select: { eventType: true, description: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    existingTaskTitles = asset.tasks.map((t) => t.title);

    const recentActivity = asset.activityEvents
      .slice(0, 5)
      .map((a) => a.description || a.eventType)
      .join("; ");

    contextSummary = [
      `ASSET: ${asset.name}`,
      `Class: ${asset.assetClass}`,
      `Status: ${asset.status}`,
      `Fair Value: $${asset.fairValue.toLocaleString()}`,
      `Cost Basis: $${asset.costBasis.toLocaleString()}`,
      recentActivity ? `Recent activity: ${recentActivity}` : null,
      !asset.nextReview ? "Missing: next review date" : null,
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    // ENTITY
    const entity = await prisma.entity.findUnique({
      where: { id: contextId },
      include: {
        assetAllocations: {
          take: 5,
          include: { asset: { select: { name: true, status: true, fairValue: true } } },
        },
        tasks: { take: 10, select: { title: true, status: true } },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    existingTaskTitles = entity.tasks.map((t) => t.title);

    const assets = entity.assetAllocations
      .map((a) => `${a.asset.name} (${a.asset.status}, $${a.asset.fairValue.toLocaleString()})`)
      .join(", ");

    contextSummary = [
      `ENTITY: ${entity.name}`,
      `Type: ${entity.entityType}`,
      `Status: ${entity.status}`,
      entity.totalCommitments ? `Total Commitments: $${entity.totalCommitments.toLocaleString()}` : null,
      assets ? `Assets: ${assets}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const existingTasksList =
    existingTaskTitles.length > 0
      ? `Existing tasks (avoid duplicates): ${existingTaskTitles.slice(0, 10).join("; ")}`
      : "No existing tasks";

  const prompt = `Given this ${contextType} context, suggest 3-5 specific next tasks the GP should do.
Return ONLY a JSON object in this exact format:
{ "tasks": [{ "title": "...", "priority": "HIGH" | "MEDIUM" | "LOW", "rationale": "..." }] }

${contextSummary}
${existingTasksList}

Rules:
- Make tasks specific and actionable (e.g., "Schedule site visit for Q2" not just "Visit site")
- Prioritize based on urgency, deal stage, and missing information
- Do not repeat existing tasks
- Return only valid JSON with no additional text`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message?.content || '{"tasks":[]}';
  const parsed = JSON.parse(jsonrepair(raw)) as {
    tasks: Array<{ title: string; priority: string; rationale: string }>;
  };

  const tasks = (parsed.tasks || []).slice(0, 5).map((t) => ({
    title: t.title || "Untitled task",
    priority: (["HIGH", "MEDIUM", "LOW"].includes(t.priority) ? t.priority : "MEDIUM") as string,
    rationale: t.rationale || "",
  }));

  return NextResponse.json({ tasks });
}
