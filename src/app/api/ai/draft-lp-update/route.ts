import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createUserAIClient } from "@/lib/ai-config";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/utils";

const DraftLPUpdateSchema = z.object({
  firmId: z.string().min(1),
  entityId: z.string().min(1),
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

  const { data, error } = await parseBody(req, DraftLPUpdateSchema);
  if (error) return error;

  const { firmId, entityId } = data!;

  // Resolve AI client (user key -> tenant key -> none)
  const aiClient = await createUserAIClient(authUser.id, firmId);
  if (!aiClient) {
    return NextResponse.json(
      { error: "No API key configured. Add one in Settings → AI Configuration." },
      { status: 400 },
    );
  }
  const { client, model } = aiClient;

  // Gather fund data (capped per RESEARCH.md Pitfall 5 — avoid token limit issues)
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      assetAllocations: {
        take: 10,
        orderBy: { asset: { fairValue: "desc" } },
        include: {
          asset: {
            select: {
              name: true,
              assetClass: true,
              fairValue: true,
              costBasis: true,
              status: true,
            },
          },
        },
      },
      capitalCalls: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { amount: true, status: true, createdAt: true, callDate: true },
      },
      distributions: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { grossAmount: true, status: true, createdAt: true, distributionDate: true },
      },
    },
  });

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  // Compute total NAV from asset allocations
  const totalFairValue = entity.assetAllocations.reduce(
    (sum, a) => sum + (a.asset?.fairValue || 0),
    0,
  );

  // Format asset list for prompt
  const assetLines = entity.assetAllocations
    .map((a) => {
      const asset = a.asset;
      if (!asset) return null;
      const moic =
        asset.costBasis > 0
          ? `${(asset.fairValue / asset.costBasis).toFixed(2)}x`
          : "N/A";
      return `  - ${asset.name} (${asset.assetClass}, ${asset.status}): FV ${fmt(asset.fairValue)}, Cost ${fmt(asset.costBasis)}, MOIC ${moic}`;
    })
    .filter(Boolean)
    .join("\n");

  // Format capital calls for prompt
  const capitalCallLines = entity.capitalCalls
    .map((cc) => {
      const date = cc.callDate
        ? new Date(cc.callDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : new Date(cc.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return `  - ${fmt(cc.amount)} called (${date}, status: ${cc.status})`;
    })
    .join("\n");

  // Format distributions for prompt
  const distributionLines = entity.distributions
    .map((d) => {
      const date = d.distributionDate
        ? new Date(d.distributionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return `  - ${fmt(d.grossAmount)} distributed (${date}, status: ${d.status})`;
    })
    .join("\n");

  const prompt = `You are drafting a quarterly LP update for ${entity.name}.

Fund Data:
- Entity Type: ${entity.entityType}
- Vintage Year: ${entity.vintageYear || "N/A"}
- Total Commitments: ${entity.totalCommitments ? fmt(entity.totalCommitments) : "Not set"}
- Current NAV (Fair Value Sum): ${fmt(totalFairValue)}
- Fund Status: ${entity.status}

Portfolio Assets (${entity.assetAllocations.length} holdings):
${assetLines || "  (no assets recorded)"}

Recent Capital Calls:
${capitalCallLines || "  (no recent capital calls)"}

Recent Distributions:
${distributionLines || "  (no recent distributions)"}

Write a professional LP quarterly update. Use the following format:

## Executive Summary
[2-3 sentences summarizing fund performance and key highlights]

## Portfolio Highlights
[Notable developments across portfolio companies/assets, performance, key milestones]

## Capital Activity
[Summary of capital calls made and distributions returned during the period]

## Outlook
[Forward-looking commentary on the portfolio and pipeline]

---
Guidelines:
- Be factual and use only the data provided above
- Use professional, formal tone appropriate for LP communications
- Do not invent metrics or data not provided
- Keep each section concise (3-5 sentences)
- Use the actual fund name "${entity.name}" throughout`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1200,
  });

  const draft = response.choices[0]?.message?.content || "Unable to generate LP update. Please try again.";

  return NextResponse.json({ draft, entityName: entity.name });
}
