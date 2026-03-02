import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ScreeningConfigSchema } from "@/lib/schemas";
import { checkAndAdvanceDeal, recalcWorkstreamProgress } from "@/lib/deal-stage-engine";
import {
  screenDealWithAI,
  type ScreeningCategory,
  type DealContext,
  type ScreeningResult,
  type ScreeningFinding,
} from "@/lib/screening-service";

/**
 * Default screening categories used when no custom config is provided.
 */
const DEFAULT_CATEGORIES: ScreeningCategory[] = [
  { name: "Financial Analysis", instructions: "Analyze financial statements, projections, and key metrics", enabled: true },
  { name: "Legal & Regulatory", instructions: "Review legal structure, regulatory compliance, and pending litigation", enabled: true },
  { name: "Commercial Due Diligence", instructions: "Assess market position, competitive landscape, and growth drivers", enabled: true },
  { name: "Management & Governance", instructions: "Evaluate management team, governance structure, and key person risk", enabled: true },
  { name: "Operational Assessment", instructions: "Review operations, technology infrastructure, and scalability", enabled: true },
  { name: "ESG & Compliance", instructions: "Assess environmental, social, governance factors and compliance posture", enabled: true },
];

/**
 * Generate mock AI findings contextual to the deal (used when no API key is configured).
 */
function generateMockFindings(
  deal: { name: string; assetClass: string; sector?: string | null; targetSize?: string | null },
  categories: ScreeningCategory[],
): Record<string, ScreeningFinding[]> {
  const sectorContext = deal.sector || "general";
  const categoryContext = deal.assetClass.replace(/_/g, " ").toLowerCase();

  const findingsMap: Record<string, ScreeningFinding[]> = {
    "Financial Analysis": [
      { title: "Revenue concentration risk", description: `Top 3 customers represent >40% of revenue. For a ${categoryContext} deal in ${sectorContext}, diversification should be validated during DD.`, priority: "HIGH" },
      { title: "Working capital trends", description: "Working capital cycle has extended by 15 days over the last 12 months. Cash conversion analysis recommended.", priority: "MEDIUM" },
      { title: "Debt covenants review", description: "Existing credit facility has financial covenants that may be impacted by the proposed transaction structure.", priority: "MEDIUM" },
    ],
    "Legal & Regulatory": [
      { title: "IP ownership verification", description: "Key intellectual property assignments need to be confirmed. Review employment agreements for IP assignment clauses.", priority: "HIGH" },
      { title: "Regulatory approval timeline", description: `${sectorContext} sector transactions may require regulatory approval. Estimated timeline: 60-90 days.`, priority: "MEDIUM" },
      { title: "Pending litigation assessment", description: "One outstanding litigation matter identified. Potential exposure appears manageable but requires detailed review.", priority: "LOW" },
    ],
    "Commercial Due Diligence": [
      { title: "Market share validation", description: `Claimed market position in ${sectorContext} needs independent verification. Recommend third-party market study.`, priority: "HIGH" },
      { title: "Customer retention analysis", description: "Net revenue retention reported at 110%. Cohort-level analysis needed to validate sustainability.", priority: "MEDIUM" },
      { title: "Competitive threat assessment", description: "Two well-funded competitors have entered adjacent markets. Evaluate barriers to entry and differentiation.", priority: "MEDIUM" },
    ],
    "Management & Governance": [
      { title: "Key person dependency", description: "Significant reliance on founder/CEO for client relationships and product vision. Succession planning gaps identified.", priority: "HIGH" },
      { title: "Board composition", description: "Board lacks independent directors with relevant industry experience. Governance enhancement recommended post-close.", priority: "LOW" },
    ],
    "Operational Assessment": [
      { title: "Technology infrastructure scalability", description: "Current infrastructure may require significant investment to support projected growth. Capex implications to be quantified.", priority: "MEDIUM" },
      { title: "Integration complexity", description: `Post-acquisition integration for ${categoryContext} transactions in ${sectorContext} typically takes 12-18 months. Resource plan needed.`, priority: "HIGH" },
    ],
    "ESG & Compliance": [
      { title: "ESG policy gaps", description: "Company lacks formal ESG reporting framework. Implementation roadmap should be part of the value creation plan.", priority: "LOW" },
      { title: "Data privacy compliance", description: "GDPR/CCPA compliance posture needs assessment. Data processing agreements with vendors should be reviewed.", priority: "MEDIUM" },
    ],
  };

  const ddFindings: Record<string, ScreeningFinding[]> = {};
  for (const cat of categories) {
    if (!cat.enabled) continue;
    ddFindings[cat.name] = findingsMap[cat.name] || [
      { title: `${cat.name} — initial review needed`, description: `Detailed ${cat.name.toLowerCase()} analysis required for ${deal.name}. ${cat.instructions || ""}`.trim(), priority: "MEDIUM" },
    ];
  }

  return ddFindings;
}

function generateMockResult(
  deal: { name: string; assetClass: string; sector?: string | null; targetSize?: string | null },
  enabledCategories: ScreeningCategory[],
): ScreeningResult {
  const score = Math.floor(Math.random() * 30) + 65;
  const recommendation =
    score >= 85 ? "STRONG_PROCEED" : score >= 70 ? "PROCEED" : "PROCEED_WITH_CAUTION";

  return {
    score,
    summary: `Mock screening completed with a score of ${score}/100. Configure an API key in Settings → AI Configuration to enable real AI-powered screening. ${enabledCategories.length} due diligence workstreams have been auto-generated with example findings.`,
    strengths: [
      "Experienced management team with sector expertise",
      "Attractive valuation relative to comparable transactions",
      "Strong revenue growth trajectory",
    ],
    risks: [
      "Market competition intensifying",
      "Customer concentration risk to be monitored",
      "Integration complexity post-close",
    ],
    recommendation,
    financials: {},
    ddFindings: generateMockFindings(deal, enabledCategories),
  };
}

/**
 * POST /api/deals/[id]/screen
 *
 * Trigger AI screening: calls real LLM (if API key configured) or falls back
 * to mock findings. Creates structured screening result with DD findings,
 * auto-creates workstreams and tasks, then advances SCREENING → DUE_DILIGENCE.
 *
 * Supports rerun: if screening already exists, pass { "rerun": true } in the
 * body alongside optional screening config to delete the old result and rescreen.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse body — we need to read it twice (for rerun flag + screening config)
  let bodyJson: Record<string, unknown> = {};
  try {
    bodyJson = await req.json();
  } catch {
    // No body — use defaults
  }

  const rerun = bodyJson?.rerun === true;

  let screeningCategories: ScreeningCategory[] = DEFAULT_CATEGORIES;
  let screeningConfig: object | undefined = undefined;
  let customInstructions: string | undefined = undefined;

  // Validate screening config if present
  const configResult = ScreeningConfigSchema.safeParse(bodyJson);
  if (configResult.success) {
    screeningCategories = configResult.data.categories;
    customInstructions = configResult.data.customInstructions;
    screeningConfig = {
      categories: configResult.data.categories,
      customInstructions: configResult.data.customInstructions,
    };
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      screeningResult: true,
      documents: { select: { name: true, category: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true, author: { select: { name: true } } },
      },
      workstreams: { select: { id: true, aiGenerated: true } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Handle rerun: delete old screening result + AI-generated workstreams/tasks
  if (deal.screeningResult) {
    if (!rerun) {
      return NextResponse.json(
        { error: "Screening already completed. Pass { rerun: true } to rescreen." },
        { status: 400 },
      );
    }

    // Delete old AI-generated workstreams (cascade to tasks)
    const aiWorkstreamIds = deal.workstreams
      .filter((w) => w.aiGenerated)
      .map((w) => w.id);

    if (aiWorkstreamIds.length > 0) {
      await prisma.dDTask.deleteMany({
        where: { workstreamId: { in: aiWorkstreamIds } },
      });
      await prisma.dDWorkstream.deleteMany({
        where: { id: { in: aiWorkstreamIds } },
      });
    }

    await prisma.aIScreeningResult.delete({
      where: { dealId: id },
    });
  }

  // Build deal context for LLM
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
    documents: deal.documents,
    notes: deal.notes.map((n) => ({ content: n.content, author: n.author?.name || null })),
  };

  const inputContext = {
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
    documentCount: deal.documents.length,
    noteCount: deal.notes.length,
  };

  // Call real LLM or fall back to mock
  const enabledCategories = screeningCategories.filter((c) => c.enabled);
  const firmId = deal.firmId || "firm-1";

  let result: ScreeningResult;
  let aiPowered = false;

  const aiResult = await screenDealWithAI(
    firmId,
    dealCtx,
    screeningCategories,
    customInstructions,
  );

  if (aiResult) {
    result = aiResult;
    aiPowered = true;
  } else {
    // Fallback: mock screening (no API key or LLM error)
    result = generateMockResult(deal, enabledCategories);
  }

  // Create AIScreeningResult with enriched data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;
  await prisma.aIScreeningResult.create({
    data: {
      dealId: id,
      score: result.score,
      summary: result.summary,
      strengths: result.strengths,
      risks: result.risks,
      recommendation: result.recommendation,
      financials: jsonSafe(result.financials),
      ddFindings: jsonSafe(result.ddFindings),
      inputContext: jsonSafe(inputContext),
      screeningConfig: screeningConfig ? jsonSafe(screeningConfig) : undefined,
    },
  });

  // Create DDWorkstream for each enabled category + DDTask for each finding
  for (let i = 0; i < enabledCategories.length; i++) {
    const cat = enabledCategories[i];
    const findings = result.ddFindings[cat.name] || [];

    const workstream = await prisma.dDWorkstream.create({
      data: {
        dealId: id,
        name: cat.name,
        description: `${aiPowered ? "AI" : "Mock"}-generated workstream for ${cat.name.toLowerCase()} due diligence.`,
        aiGenerated: true,
        customInstructions: cat.instructions || null,
        sortOrder: i,
        totalTasks: findings.length,
        completedTasks: 0,
        status: findings.length > 0 ? "NOT_STARTED" : "COMPLETE",
      },
    });

    for (const finding of findings) {
      await prisma.dDTask.create({
        data: {
          workstreamId: workstream.id,
          title: finding.title,
          description: finding.description,
          priority: finding.priority,
          source: "AI_SCREENING",
          status: "TODO",
        },
      });
    }

    await recalcWorkstreamProgress(workstream.id);
  }

  // Create DealActivity record for the screening event
  const totalFindings = Object.values(result.ddFindings).flat().length;

  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "AI_SCREENING",
      description: `${aiPowered ? "AI" : "Mock"} screening ${rerun ? "rerun " : ""}completed with score ${result.score}/100 (${result.recommendation}). ${enabledCategories.length} workstreams and ${totalFindings} tasks auto-generated.`,
      metadata: {
        score: result.score,
        recommendation: result.recommendation,
        workstreamCount: enabledCategories.length,
        taskCount: totalFindings,
        aiPowered,
        rerun,
      },
    },
  });

  // Auto-advance: SCREENING -> DUE_DILIGENCE
  const updatedDeal = await checkAndAdvanceDeal(id);

  return NextResponse.json(updatedDeal);
}
