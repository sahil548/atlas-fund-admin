import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { ScreeningConfigSchema } from "@/lib/schemas";
import { checkAndAdvanceDeal, recalcWorkstreamProgress } from "@/lib/deal-stage-engine";

interface ScreeningCategory {
  name: string;
  instructions?: string;
  enabled: boolean;
}

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
 * Generate mock AI findings contextual to the deal.
 */
function generateMockFindings(
  deal: { name: string; dealCategory: string; sector?: string | null; targetSize?: string | null },
  categories: ScreeningCategory[],
) {
  const sectorContext = deal.sector || "general";
  const categoryContext = deal.dealCategory.replace(/_/g, " ").toLowerCase();

  const findingsMap: Record<string, { title: string; description: string; priority: string }[]> = {
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

  const ddFindings: Record<string, { title: string; description: string; priority: string }[]> = {};
  for (const cat of categories) {
    if (!cat.enabled) continue;
    ddFindings[cat.name] = findingsMap[cat.name] || [
      { title: `${cat.name} — initial review needed`, description: `Detailed ${cat.name.toLowerCase()} analysis required for ${deal.name}. ${cat.instructions || ""}`.trim(), priority: "MEDIUM" },
    ];
  }

  return ddFindings;
}

/**
 * POST /api/deals/[id]/screen
 * Trigger AI screening: create structured screening result with DD findings,
 * auto-create workstreams and tasks, then advance SCREENING -> DUE_DILIGENCE.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse optional screening config from body
  let screeningCategories: ScreeningCategory[] = DEFAULT_CATEGORIES;
  let screeningConfig: object | undefined = undefined;

  try {
    const { data } = await parseBody(req, ScreeningConfigSchema);
    if (data) {
      screeningCategories = data.categories;
      screeningConfig = {
        categories: data.categories,
        customInstructions: data.customInstructions,
      };
    }
  } catch {
    // No body or invalid body — use defaults
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      screeningResult: true,
      documents: true,
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.screeningResult) {
    return NextResponse.json(
      { error: "Screening already completed for this deal" },
      { status: 400 },
    );
  }

  // Build input context from deal data
  const inputContext = {
    dealName: deal.name,
    dealCategory: deal.dealCategory,
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

  // Generate mock AI screening results
  const score = Math.floor(Math.random() * 30) + 65; // 65-94
  const recommendation =
    score >= 85 ? "STRONG_PROCEED" : score >= 70 ? "PROCEED" : "PROCEED_WITH_CAUTION";

  const strengths = [
    "Experienced management team with sector expertise",
    "Attractive valuation relative to comparable transactions",
    "Strong revenue growth trajectory",
  ];
  const risks = [
    "Market competition intensifying",
    "Customer concentration risk to be monitored",
    "Integration complexity post-close",
  ];

  // Generate structured DD findings per category
  const enabledCategories = screeningCategories.filter((c) => c.enabled);
  const ddFindings = generateMockFindings(deal, enabledCategories);

  // Create AIScreeningResult with enriched data
  await prisma.aIScreeningResult.create({
    data: {
      dealId: id,
      score,
      summary: `AI screening completed with a score of ${score}/100. The deal shows ${recommendation === "STRONG_PROCEED" ? "strong" : "moderate"} fundamentals with manageable risk factors. ${enabledCategories.length} due diligence workstreams have been auto-generated with specific findings.`,
      strengths,
      risks,
      recommendation,
      financials: {},
      ddFindings,
      inputContext,
      screeningConfig: screeningConfig ?? undefined,
    },
  });

  // Create DDWorkstream for each enabled category + DDTask for each finding
  for (let i = 0; i < enabledCategories.length; i++) {
    const cat = enabledCategories[i];
    const findings = ddFindings[cat.name] || [];

    const workstream = await prisma.dDWorkstream.create({
      data: {
        dealId: id,
        name: cat.name,
        description: `AI-generated workstream for ${cat.name.toLowerCase()} due diligence.`,
        aiGenerated: true,
        customInstructions: cat.instructions || null,
        sortOrder: i,
        totalTasks: findings.length,
        completedTasks: 0,
        status: findings.length > 0 ? "NOT_STARTED" : "COMPLETE",
      },
    });

    // Create DDTask for each finding
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

    // Recalculate workstream progress
    await recalcWorkstreamProgress(workstream.id);
  }

  // Create DealActivity record for the screening event
  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "AI_SCREENING",
      description: `AI screening completed with score ${score}/100 (${recommendation}). ${enabledCategories.length} workstreams and ${Object.values(ddFindings).flat().length} tasks auto-generated.`,
      metadata: {
        score,
        recommendation,
        workstreamCount: enabledCategories.length,
        taskCount: Object.values(ddFindings).flat().length,
      },
    },
  });

  // Auto-advance: SCREENING -> DUE_DILIGENCE
  const updatedDeal = await checkAndAdvanceDeal(id);

  return NextResponse.json(updatedDeal);
}
