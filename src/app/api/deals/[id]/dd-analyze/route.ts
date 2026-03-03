import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { DDAnalyzeRequestSchema } from "@/lib/schemas";
import { recalcWorkstreamProgress } from "@/lib/deal-stage-engine";
import { type DealContext } from "@/lib/screening-service";
import {
  runDDAnalysis,
  DD_ANALYSIS_META,
  type DDAnalysisResult,
} from "@/lib/dd-analysis-service";

// ── Mock generators ─────────────────────────────────

function generateMockAnalysis(
  deal: { name: string; assetClass: string; sector?: string | null },
  type: string,
): DDAnalysisResult {
  const sectorCtx = deal.sector || "general";
  const assetCtx = deal.assetClass.replace(/_/g, " ").toLowerCase();

  const mocks: Record<string, DDAnalysisResult> = {
    DD_FINANCIAL: {
      summary: `Mock financial DD for ${deal.name}. Configure an API key in Settings → AI Configuration for real analysis. Key areas flagged: revenue quality, working capital, and cash flow conversion.`,
      sections: [
        { name: "Quality of Earnings", content: `Revenue for this ${assetCtx} deal in ${sectorCtx} shows mixed signals. Top-line growth appears organic but EBITDA adjustments of ~15% warrant further investigation. Add-backs include one-time consulting fees and restructuring charges.`, riskLevel: "MEDIUM" },
        { name: "Balance Sheet Analysis", content: `Asset quality appears sound. Current ratio of 1.8x is adequate. Key concern: $2.5M in intercompany receivables that need to be eliminated for clean valuation. Debt maturity schedule is manageable.`, riskLevel: "LOW" },
        { name: "Cash Flow & Projections", content: `FCF conversion rate of 65% is below ${sectorCtx} sector median of 75%. Capex split is 60% maintenance / 40% growth. Management projections assume 20% revenue CAGR vs our estimate of 12-15%.`, riskLevel: "HIGH" },
      ],
      findings: [
        { title: "Validate EBITDA add-backs with supporting documentation", description: "~15% of reported EBITDA consists of add-backs. Request detailed supporting documentation for each adjustment over $100K.", priority: "HIGH" },
        { title: "Analyze customer concentration risk", description: "Top 3 customers represent estimated 45% of revenue. Request customer-level revenue breakdown for trailing 24 months.", priority: "HIGH" },
        { title: "Review working capital normalization", description: "Working capital cycle has extended by 12 days. Determine if this is seasonal or structural.", priority: "MEDIUM" },
        { title: "Stress test management projections", description: "Build independent base case with 12-15% revenue CAGR vs management's 20%. Model downside at 8%.", priority: "MEDIUM" },
        { title: "Confirm off-balance-sheet items", description: "Request confirmation of any operating leases, guarantees, or contingent liabilities not reflected on the balance sheet.", priority: "LOW" },
      ],
      recommendation: "NEEDS_MORE_INFO",
    },
    DD_LEGAL: {
      summary: `Mock legal DD for ${deal.name}. Entity structure and key agreement review flagged areas requiring counsel review. Regulatory timeline estimated at 60-90 days.`,
      sections: [
        { name: "Entity Structure Review", content: `Holding structure for this ${assetCtx} investment involves a blocker entity for tax efficiency. UBTI exposure analysis needed for tax-exempt LPs. Jurisdictional review of the ${sectorCtx} sector operating entities is recommended.`, riskLevel: "MEDIUM" },
        { name: "Key Agreements", content: `Purchase agreement draft contains standard reps & warranties with a 12-month survival period. Indemnification cap at 10% of purchase price is within market norms. Side letter provisions to be reviewed.`, riskLevel: "LOW" },
        { name: "Regulatory & Compliance", content: `No pending litigation identified. Required permits and licenses appear current. OFAC screening completed — no matches. Environmental Phase I recommended for real assets.`, riskLevel: "LOW" },
      ],
      findings: [
        { title: "Review entity structure tax implications", description: "Confirm blocker entity setup is optimal for LP base. Model UBTI exposure for tax-exempt investors.", priority: "HIGH" },
        { title: "Negotiate indemnification provisions", description: "Current 12-month survival period and 10% cap are market but consider pushing for 18-month/15% given deal profile.", priority: "MEDIUM" },
        { title: "Complete regulatory approval timeline", description: `Map required regulatory approvals for ${sectorCtx} sector. Estimate 60-90 day timeline to closing.`, priority: "MEDIUM" },
        { title: "Review change of control provisions", description: "Confirm all material contracts survive change of control. Identify any that require consent.", priority: "HIGH" },
      ],
      recommendation: "GO",
    },
    DD_MARKET: {
      summary: `Mock market DD for ${deal.name}. ${sectorCtx} market shows favorable growth dynamics with manageable competitive threats. Customer analysis flagged concentration risk.`,
      sections: [
        { name: "Market Sizing", content: `TAM estimated at $15B for the broader ${sectorCtx} market, with SAM of ~$4B for the addressable segment. Market growing at 8-12% CAGR driven by digitalization and demographic shifts. Currently in growth phase of cycle.`, riskLevel: "LOW" },
        { name: "Competitive Landscape", content: `Five major competitors identified. Target holds estimated 8-12% market share. Primary moat is customer relationships and switching costs. Two well-funded new entrants in adjacent segments bear monitoring.`, riskLevel: "MEDIUM" },
        { name: "Customer & Industry Trends", content: `Customer retention rate of 92% is strong. However, top 5 customers represent ~35% of revenue. Key tailwinds: regulatory requirements driving demand. Headwind: potential margin compression from new entrants.`, riskLevel: "MEDIUM" },
      ],
      findings: [
        { title: "Commission independent market sizing study", description: "Validate TAM/SAM estimates with third-party research. Current estimates based on management data only.", priority: "HIGH" },
        { title: "Map competitive threat from new entrants", description: "Two well-funded competitors entering adjacent markets. Assess likelihood and timeline of direct competition.", priority: "HIGH" },
        { title: "Analyze customer cohort retention", description: "Overall 92% retention masks potential cohort-level variance. Request 3-year cohort analysis.", priority: "MEDIUM" },
        { title: "Assess pricing power sustainability", description: "Current pricing appears defensible but evaluate sensitivity to competitive pressure and customer alternatives.", priority: "MEDIUM" },
        { title: "Review industry regulatory pipeline", description: `Map upcoming ${sectorCtx} regulatory changes that could create tailwinds or headwinds over the hold period.`, priority: "LOW" },
      ],
      recommendation: "GO",
    },
    IC_MEMO: {
      summary: `Mock IC memo for ${deal.name}. This ${assetCtx} opportunity in ${sectorCtx} warrants IC review. Configure an API key for a real AI-generated IC memo.`,
      sections: [
        { name: "Executive Summary", content: `${deal.name} is a ${assetCtx} investment opportunity in the ${sectorCtx} sector. The deal offers attractive risk-adjusted returns with a target entry at reasonable valuations. Key investment thesis centers on organic growth and operational improvement potential.`, riskLevel: "LOW" },
        { name: "Investment Highlights", content: `1. Experienced management team with 15+ years sector experience\n2. Attractive entry valuation below comparable transaction medians\n3. Multiple value creation levers identified (pricing, operational efficiency, add-on acquisitions)\n4. Strong recurring revenue base with high retention`, riskLevel: "LOW" },
        { name: "Key Risks & Mitigants", content: `Primary risks: customer concentration (mitigated by diversification plan), execution risk on growth initiatives (mitigated by experienced team), and market cyclicality (mitigated by contractual revenue base). Overall risk profile: moderate.`, riskLevel: "MEDIUM" },
        { name: "Financial Summary & Returns", content: `Based on preliminary analysis: entry at ~8x EBITDA, target exit at 10-12x over 4-5 year hold. Projected gross IRR: 18-22%. Projected gross MOIC: 2.0-2.5x. Downside case (6x exit): 8% IRR / 1.3x MOIC.`, riskLevel: "LOW" },
        { name: "Recommendation", content: `Recommend APPROVE WITH CONDITIONS. Conditions: (1) Complete financial model with audited financials, (2) Obtain updated legal DD summary, (3) Finalize allocation recommendation across fund entities.`, riskLevel: "MEDIUM" },
      ],
      findings: [
        { title: "Finalize financial model with stress scenarios", description: "Complete the base/bull/bear case models with audited financials before IC vote.", priority: "HIGH" },
        { title: "Obtain updated legal DD summary from counsel", description: "Confirm no deal-breaker legal findings. Summarize key negotiation points for IC discussion.", priority: "HIGH" },
        { title: "Prepare allocation recommendation", description: "Determine which fund entities participate, allocation amounts, and LP co-invest opportunity.", priority: "MEDIUM" },
        { title: "Draft term sheet with key protections", description: "Include board seat, protective provisions, information rights, and anti-dilution.", priority: "MEDIUM" },
      ],
      recommendation: "APPROVE_WITH_CONDITIONS",
    },
    COMP_ANALYSIS: {
      summary: `Mock comparable analysis for ${deal.name}. Transaction and public comps suggest a valuation range. Configure an API key for real AI-powered comp analysis.`,
      sections: [
        { name: "Transaction Comps", content: `Identified 8 relevant transactions in ${sectorCtx} over the past 3 years. Median EV/EBITDA: 9.2x (range: 7.0x - 13.5x). Median EV/Revenue: 2.8x (range: 1.5x - 4.2x). Recent trend shows slight multiple compression.`, riskLevel: "MEDIUM" },
        { name: "Public Market Comps", content: `5 publicly traded comparables identified. Median trading EV/EBITDA: 11.4x (25% premium reflecting liquidity). Median revenue growth: 12%. Target's growth rate of ~15% supports a slight premium to median.`, riskLevel: "LOW" },
        { name: "Valuation Benchmark", content: `Proposed entry at ~8x EBITDA represents a 13% discount to transaction comp median of 9.2x. Discount justified by: smaller scale, customer concentration risk, and private market illiquidity. Implied fair value range: $40M - $55M EV.`, riskLevel: "LOW" },
      ],
      findings: [
        { title: "Source additional transaction comps", description: "Current dataset of 8 transactions may be incomplete. Engage data provider for comprehensive sector deal history.", priority: "MEDIUM" },
        { title: "Validate comparability of selected comps", description: "Confirm size, geography, and business model alignment of each comp. Remove outliers with documented rationale.", priority: "HIGH" },
        { title: "Model sensitivity on exit multiple", description: "Show IRR/MOIC sensitivity table for exit multiples from 7x to 12x EBITDA.", priority: "HIGH" },
        { title: "Assess multiple expansion/compression trend", description: "Determine if current sector multiples are at a cyclical high. Consider through-cycle average for exit assumption.", priority: "MEDIUM" },
      ],
      recommendation: "GO",
    },
  };

  const meta = DD_ANALYSIS_META[type];
  return mocks[type] || {
    summary: `Mock ${meta?.name || type} analysis for ${deal.name}.`,
    sections: [{ name: "General Analysis", content: "Configure an API key for real analysis.", riskLevel: "MEDIUM" as const }],
    findings: [{ title: `${meta?.name || type} review needed`, description: "Detailed analysis required.", priority: "MEDIUM" as const }],
    recommendation: "NEEDS_MORE_INFO",
  };
}

// ── POST /api/deals/[id]/dd-analyze ─────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await parseBody(req, DDAnalyzeRequestSchema);
  if (error) return error;

  const { type, rerun } = data!;
  const meta = DD_ANALYSIS_META[type];

  // Fetch deal with context
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
      workstreams: { select: { id: true, analysisType: true, name: true, customInstructions: true, aiGenerated: true } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Must be DUE_DILIGENCE or later
  const allowedStages = ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"];
  if (!allowedStages.includes(deal.stage)) {
    return NextResponse.json(
      { error: `DD analysis requires Due Diligence stage or later (currently ${deal.stage})` },
      { status: 400 },
    );
  }

  // Handle existing analysis
  const existingWs = deal.workstreams.find((ws) => ws.analysisType === type);
  if (existingWs) {
    if (!rerun) {
      return NextResponse.json(
        { error: `${meta?.name || type} analysis already exists. Pass rerun: true to re-analyze.` },
        { status: 400 },
      );
    }
    await prisma.dDTask.deleteMany({ where: { workstreamId: existingWs.id } });
    await prisma.dDWorkstream.delete({ where: { id: existingWs.id } });
  }

  // Build deal context
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

  // Screening data for IC Memo context
  const screeningData = deal.screeningResult
    ? {
        score: deal.screeningResult.score ?? 0,
        recommendation: deal.screeningResult.recommendation ?? "",
        strengths: Array.isArray(deal.screeningResult.strengths)
          ? (deal.screeningResult.strengths as string[])
          : [],
        risks: Array.isArray(deal.screeningResult.risks)
          ? (deal.screeningResult.risks as string[])
          : [],
      }
    : null;

  // ── Extract prior screening findings for this analysis type ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TYPE_TO_CATEGORY: Record<string, string> = {
    DD_FINANCIAL: "Financial DD",
    DD_LEGAL: "Legal DD",
    DD_MARKET: "Market DD",
    DD_TAX: "Tax DD",
    DD_OPERATIONAL: "Operational DD",
    DD_ESG: "ESG DD",
  };

  const categoryName = TYPE_TO_CATEGORY[type];
  const ddFindingsRaw = deal.screeningResult?.ddFindings;
  let priorFindings: { title: string; description: string; priority: string }[] | null = null;

  if (categoryName && ddFindingsRaw && typeof ddFindingsRaw === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (ddFindingsRaw as Record<string, unknown>)[categoryName];
    if (Array.isArray(raw)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priorFindings = raw.map((f: any) => ({
        title: String(f.title || ""),
        description: String(f.description || ""),
        priority: String(f.priority || "MEDIUM"),
      }));
    }
  }

  // Get customInstructions from the screening workstream for this category (if any)
  const matchingScreeningWs = deal.workstreams.find(
    (ws) => ws.name === categoryName && ws.aiGenerated && !ws.analysisType,
  );
  const categoryInstructions = matchingScreeningWs?.customInstructions || null;

  // Call LLM or fallback to mock
  const firmId = deal.firmId || "firm-1";
  let result: DDAnalysisResult;
  let aiPowered = false;

  const aiResult = await runDDAnalysis(firmId, dealCtx, type, screeningData, priorFindings, categoryInstructions);
  if (aiResult) {
    result = aiResult;
    aiPowered = true;
  } else {
    result = generateMockAnalysis(deal, type);
  }

  // Sort order: DD types after screening workstreams
  const sortOrderMap: Record<string, number> = {
    DD_FINANCIAL: 100,
    DD_LEGAL: 101,
    DD_MARKET: 102,
    IC_MEMO: 103,
    COMP_ANALYSIS: 104,
  };

  // Create workstream with analysis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;

  const workstream = await prisma.dDWorkstream.create({
    data: {
      dealId: id,
      name: meta?.name || type.replace(/_/g, " "),
      description: `${aiPowered ? "AI" : "Mock"}-generated ${(meta?.name || type).toLowerCase()} analysis.`,
      aiGenerated: true,
      hasAI: true,
      analysisType: type,
      analysisResult: jsonSafe({
        summary: result.summary,
        sections: result.sections,
        recommendation: result.recommendation,
      }),
      sortOrder: sortOrderMap[type] ?? 100,
      totalTasks: result.findings.length,
      completedTasks: 0,
      status: result.findings.length > 0 ? "NOT_STARTED" : "COMPLETE",
    },
  });

  // Create DDTasks for findings
  for (const finding of result.findings) {
    await prisma.dDTask.create({
      data: {
        workstreamId: workstream.id,
        title: finding.title,
        description: finding.description,
        priority: finding.priority,
        source: `AI_${type}`,
        status: "TODO",
      },
    });
  }

  await recalcWorkstreamProgress(workstream.id);

  // Log activity
  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "DD_ANALYSIS",
      description: `${aiPowered ? "AI" : "Mock"} ${meta?.name || type} ${rerun ? "re-" : ""}analysis completed. ${result.findings.length} findings generated. Recommendation: ${result.recommendation}.`,
      metadata: {
        analysisType: type,
        recommendation: result.recommendation,
        findingCount: result.findings.length,
        sectionCount: result.sections.length,
        aiPowered,
        rerun,
      },
    },
  });

  // Return updated deal for SWR (matches GET /api/deals/[id] includes)
  const updatedDeal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: {
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { name: "asc" },
      },
      screeningResult: true,
      icProcess: {
        include: {
          votes: { include: { user: true } },
          decidedBy: { select: { id: true, name: true, initials: true } },
        },
      },
      closingChecklist: true,
      documents: true,
      notes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      dealLead: { select: { id: true, name: true, initials: true } },
    },
  });

  return NextResponse.json(updatedDeal);
}
