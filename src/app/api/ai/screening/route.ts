import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  screenDealWithAI,
  type ScreeningCategory,
  type DealContext,
} from "@/lib/screening-service";
import { getAuthUser } from "@/lib/auth";

const DEFAULT_CATEGORIES: ScreeningCategory[] = [
  { name: "Financial Analysis", instructions: "Analyze financial statements, projections, and key metrics", enabled: true },
  { name: "Legal & Regulatory", instructions: "Review legal structure, regulatory compliance, and pending litigation", enabled: true },
  { name: "Commercial Due Diligence", instructions: "Assess market position, competitive landscape, and growth drivers", enabled: true },
  { name: "Management & Governance", instructions: "Evaluate management team, governance structure, and key person risk", enabled: true },
  { name: "Operational Assessment", instructions: "Review operations, technology infrastructure, and scalability", enabled: true },
  { name: "ESG & Compliance", instructions: "Assess environmental, social, governance factors and compliance posture", enabled: true },
];

/**
 * POST /api/ai/screening
 *
 * Standalone AI screening endpoint — performs LLM-powered screening
 * without creating database records (useful for preview / ad-hoc analysis).
 *
 * Body: { dealId: string, categories?: ScreeningCategory[], customInstructions?: string }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dealId = body.dealId as string | undefined;
  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      documents: { select: { name: true, category: true, extractedText: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true, author: { select: { name: true } } },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Include document content (truncated to 5k per doc for screening)
  const documentContents = deal.documents
    .filter((d) => d.extractedText)
    .map((d) => ({ name: d.name, content: d.extractedText!.slice(0, 5_000) }));

  const dealCtx: DealContext = {
    dealName: deal.name,
    assetClass: deal.assetClass,
    capitalInstrument: deal.capitalInstrument,
    participationStructure: deal.participationStructure,
    sector: deal.sector,
    targetSize: deal.targetSize,
    targetCheckSize: deal.targetCheckSize,
    targetReturn: deal.targetReturn,
    gpName: deal.gpName,
    description: deal.description,
    investmentRationale: deal.investmentRationale,
    additionalContext: deal.additionalContext,
    thesisNotes: deal.thesisNotes,
    documents: deal.documents.map((d) => ({ name: d.name, category: d.category })),
    notes: deal.notes.map((n) => ({ content: n.content, author: n.author?.name || null })),
    documentContents,
  };

  const categories = (body.categories as ScreeningCategory[] | undefined) || DEFAULT_CATEGORIES;
  const customInstructions = body.customInstructions as string | undefined;
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || deal.firmId || "";
  if (!firmId) {
    return NextResponse.json({ error: "Unable to determine firm" }, { status: 401 });
  }

  const result = await screenDealWithAI(firmId, dealCtx, categories, customInstructions);

  if (!result) {
    return NextResponse.json(
      {
        error: "No API key configured. Add your API key in Settings → AI Configuration to enable AI screening.",
        aiPowered: false,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    dealId,
    ...result,
    aiPowered: true,
    processedAt: new Date().toISOString(),
  });
}
