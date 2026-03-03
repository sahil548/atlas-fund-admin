import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ScreeningConfigSchema } from "@/lib/schemas";
import { checkAndAdvanceDeal, recalcWorkstreamProgress } from "@/lib/deal-stage-engine";
import {
  screenDealWithAI,
  type ScreeningCategory,
  type DealContext,
  type ScreeningResult,
  type ScreeningFinding,
} from "@/lib/screening-service";
import {
  runDDAnalysis,
  type DDAnalysisResult,
} from "@/lib/dd-analysis-service";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
 * Generate a mock IC Memo when no API key is configured.
 */
function generateMockICMemo(
  deal: { name: string; assetClass: string; sector?: string | null },
  screeningScore: number,
  screeningRecommendation: string,
): DDAnalysisResult {
  const sectorCtx = deal.sector || "general";
  const assetCtx = deal.assetClass.replace(/_/g, " ").toLowerCase();

  return {
    summary: `Mock IC memo for ${deal.name}. This ${assetCtx} opportunity in ${sectorCtx} scored ${screeningScore}/100 (${screeningRecommendation.replace(/_/g, " ")}). Configure an API key for a real AI-generated IC memo.`,
    sections: [
      { name: "Executive Summary", content: `${deal.name} is a ${assetCtx} investment opportunity in the ${sectorCtx} sector. The deal scored ${screeningScore}/100 in AI screening with a recommendation of ${screeningRecommendation.replace(/_/g, " ")}. Key investment thesis centers on organic growth and operational improvement potential.`, riskLevel: "LOW" },
      { name: "Investment Highlights", content: `1. Experienced management team with 15+ years sector experience\n2. Attractive entry valuation below comparable transaction medians\n3. Multiple value creation levers identified (pricing, operational efficiency, add-on acquisitions)\n4. Strong recurring revenue base with high retention`, riskLevel: "LOW" },
      { name: "Key Risks & Mitigants", content: `Primary risks: customer concentration (mitigated by diversification plan), execution risk on growth initiatives (mitigated by experienced team), and market cyclicality (mitigated by contractual revenue base). Overall risk profile: moderate.`, riskLevel: "MEDIUM" },
      { name: "Financial Summary & Returns", content: `Based on preliminary analysis: entry at ~8x EBITDA, target exit at 10-12x over 4-5 year hold. Projected gross IRR: 18-22%. Projected gross MOIC: 2.0-2.5x. Downside case (6x exit): 8% IRR / 1.3x MOIC.`, riskLevel: "LOW" },
      { name: "Recommendation", content: `Recommend APPROVE WITH CONDITIONS. Conditions: (1) Complete financial model with audited financials, (2) Obtain updated legal DD summary, (3) Finalize allocation recommendation across fund entities.`, riskLevel: "MEDIUM" },
    ],
    findings: [],
    recommendation: "APPROVE_WITH_CONDITIONS",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;

/**
 * POST /api/deals/[id]/screen
 *
 * Trigger AI screening: calls real LLM (if API key configured) or falls back
 * to mock findings. Produces TWO outputs:
 * 1. Screening score, strengths, risks, financials, DD findings → auto-creates workstreams/tasks
 * 2. IC Memo → formatted investment committee memo stored on the screening result
 *
 * On rerun: snapshots the current result into previousVersions, increments version,
 * deletes + recreates AI-generated workstreams/tasks.
 * Advances SCREENING → DUE_DILIGENCE on first run.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse body
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

  // ── Handle rerun: snapshot current result + delete old workstreams ──
  let previousVersions: any[] = [];
  let newVersion = 1;

  if (deal.screeningResult) {
    if (!rerun) {
      return NextResponse.json(
        { error: "Screening already completed. Pass { rerun: true } to rescreen." },
        { status: 400 },
      );
    }

    // Snapshot current result into previousVersions
    const curr = deal.screeningResult;
    previousVersions = Array.isArray(curr.previousVersions) ? (curr.previousVersions as any[]) : [];
    previousVersions.push({
      version: curr.version ?? 1,
      score: curr.score,
      summary: curr.summary,
      strengths: curr.strengths,
      risks: curr.risks,
      recommendation: curr.recommendation,
      financials: curr.financials,
      ddFindings: curr.ddFindings,
      memo: curr.memo,
      memoGeneratedAt: curr.memoGeneratedAt,
      inputContext: curr.inputContext,
      screeningConfig: curr.screeningConfig,
      processedAt: curr.processedAt,
    });
    newVersion = (curr.version ?? 1) + 1;

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
  }

  // ── Build deal context for LLM ──
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

  // ── Call real LLM or fall back to mock ──
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
    result = generateMockResult(deal, enabledCategories);
  }

  // ── Generate IC Memo (second LLM call, or mock) ──
  const screeningData = {
    score: result.score,
    recommendation: result.recommendation,
    strengths: result.strengths,
    risks: result.risks,
  };

  let memoResult: DDAnalysisResult | null = null;

  if (aiPowered) {
    // Real LLM — pass screening data as context
    memoResult = await runDDAnalysis(firmId, dealCtx, "IC_MEMO", screeningData);
  }

  // Fall back to mock if LLM failed or wasn't available
  if (!memoResult) {
    memoResult = generateMockICMemo(deal, result.score, result.recommendation);
  }

  // ── Store screening result + IC Memo ──
  const screeningData_ = {
    score: result.score,
    summary: result.summary,
    strengths: result.strengths,
    risks: result.risks,
    recommendation: result.recommendation,
    financials: jsonSafe(result.financials),
    ddFindings: jsonSafe(result.ddFindings),
    inputContext: jsonSafe(inputContext),
    screeningConfig: screeningConfig ? jsonSafe(screeningConfig) : undefined,
    version: newVersion,
    memo: jsonSafe({
      summary: memoResult.summary,
      sections: memoResult.sections,
      recommendation: memoResult.recommendation,
    }),
    memoGeneratedAt: new Date(),
    previousVersions: previousVersions.length > 0 ? jsonSafe(previousVersions) : undefined,
  };

  if (deal.screeningResult) {
    // Rerun — update in place
    await prisma.aIScreeningResult.update({
      where: { dealId: id },
      data: { ...screeningData_, processedAt: new Date() },
    });
  } else {
    // First run — create
    await prisma.aIScreeningResult.create({
      data: { dealId: id, ...screeningData_ },
    });
  }

  // ── Create DDWorkstream + DDTask for each enabled category ──
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

  // ── Log activity ──
  const totalFindings = Object.values(result.ddFindings).flat().length;

  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "AI_SCREENING",
      description: `${aiPowered ? "AI" : "Mock"} screening ${rerun ? "(v" + newVersion + " rerun) " : ""}completed with score ${result.score}/100 (${result.recommendation}). IC Memo generated. ${enabledCategories.length} workstreams and ${totalFindings} tasks auto-generated.`,
      metadata: {
        score: result.score,
        recommendation: result.recommendation,
        workstreamCount: enabledCategories.length,
        taskCount: totalFindings,
        aiPowered,
        rerun,
        version: newVersion,
        memoGenerated: true,
      },
    },
  });

  // Auto-advance: SCREENING -> DUE_DILIGENCE
  const updatedDeal = await checkAndAdvanceDeal(id);

  return NextResponse.json(updatedDeal);
}
