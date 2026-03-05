import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { DDAnalyzeRequestSchema } from "@/lib/schemas";
import { recalcWorkstreamProgress } from "@/lib/deal-stage-engine";
import { type DealContext } from "@/lib/deal-types";
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
      summary: `Financial due diligence for ${deal.name}. Key areas flagged: revenue quality, working capital, and cash flow conversion.`,
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
      summary: `Legal due diligence for ${deal.name}. Entity structure and key agreement review flagged areas requiring counsel review. Regulatory timeline estimated at 60-90 days.`,
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
      summary: `Market due diligence for ${deal.name}. ${sectorCtx} market shows favorable growth dynamics with manageable competitive threats. Customer analysis flagged concentration risk.`,
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
      summary: `IC memo for ${deal.name}. This ${assetCtx} opportunity in ${sectorCtx} warrants IC review based on workstream analysis.`,
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
    DD_TAX: {
      summary: `Tax due diligence for ${deal.name}. Tax structure review flagged entity optimization opportunities and compliance areas requiring further investigation.`,
      sections: [
        { name: "Tax Structure Review", content: `Current entity structure is a pass-through for this ${assetCtx} investment. UBTI exposure analysis needed for tax-exempt LPs. State tax nexus analysis covers the primary operating jurisdictions in ${sectorCtx}.`, riskLevel: "MEDIUM" },
        { name: "Compliance & Exposures", content: `Federal and state tax returns current for trailing 3 years. No open audits identified. Estimated tax credits of $200K may be available. Transfer pricing documentation is adequate for intercompany transactions.`, riskLevel: "LOW" },
      ],
      findings: [
        { title: "Analyze UBTI exposure for tax-exempt LPs", description: "Model UBTI impact under current structure. Evaluate blocker entity if exposure exceeds threshold.", priority: "HIGH" },
        { title: "Review Section 754 election implications", description: "Confirm whether a 754 election is in place and model step-up benefit for incoming investors.", priority: "MEDIUM" },
        { title: "Map state and local tax obligations", description: "Identify all state nexus points and estimate state income tax liability. Review sales tax compliance.", priority: "MEDIUM" },
        { title: "Quantify available tax credits", description: "Verify eligibility for R&D, energy, or other tax credits. Estimate annual benefit.", priority: "LOW" },
      ],
      recommendation: "GO",
    },
    DD_OPERATIONAL: {
      summary: `Operational due diligence for ${deal.name}. Management team assessment and process review identified scalability opportunities and key person risks.`,
      sections: [
        { name: "Management Assessment", content: `Leadership team has 12+ years average tenure in ${sectorCtx}. CEO and CFO are strong but COO position is vacant. Board has 3 independent directors. Compensation structure is performance-aligned with appropriate vesting.`, riskLevel: "MEDIUM" },
        { name: "Technology & Scalability", content: `Core ERP system is adequate for current scale but will need upgrade at 2x revenue. CRM implementation is recent and well-adopted. Cybersecurity posture is basic — SOC 2 Type I obtained, Type II in progress.`, riskLevel: "MEDIUM" },
      ],
      findings: [
        { title: "Assess key person risk and succession plan", description: "CEO and CFO are critical. Review employment contracts, non-competes, and succession planning. Consider key-man insurance.", priority: "HIGH" },
        { title: "Evaluate technology scalability", description: "Current ERP has capacity limits. Estimate cost and timeline for upgrade at projected growth trajectory.", priority: "MEDIUM" },
        { title: "Review operational efficiency metrics", description: "Benchmark operating metrics (revenue per employee, utilization rates) against industry peers.", priority: "MEDIUM" },
        { title: "Assess integration readiness for add-ons", description: "Evaluate shared services infrastructure and playbook for bolt-on acquisition integration.", priority: "LOW" },
      ],
      recommendation: "GO",
    },
    DD_ESG: {
      summary: `ESG due diligence for ${deal.name}. Environmental and governance factors are manageable. Social factors show areas for improvement in workforce diversity.`,
      sections: [
        { name: "Environmental", content: `No significant environmental liabilities identified for this ${assetCtx} investment. Carbon footprint is moderate for the ${sectorCtx} sector. No Phase I/II environmental concerns flagged. Resource efficiency initiatives are nascent but planned.`, riskLevel: "LOW" },
        { name: "Social & Governance", content: `Workforce diversity metrics are below industry benchmarks. Safety record is clean with no OSHA violations in 3 years. Board governance is adequate with majority independence. Ethics and compliance program is in place but informal.`, riskLevel: "MEDIUM" },
      ],
      findings: [
        { title: "Develop ESG baseline metrics", description: "Establish baseline Scope 1 and 2 emissions, diversity metrics, and governance scores for reporting.", priority: "MEDIUM" },
        { title: "Assess climate transition risk", description: "Model impact of potential carbon pricing or regulatory changes on operating costs over hold period.", priority: "MEDIUM" },
        { title: "Review workforce diversity initiatives", description: "Current diversity metrics below benchmarks. Develop improvement plan aligned with LP reporting requirements.", priority: "LOW" },
        { title: "Formalize ESG reporting framework", description: "Adopt SASB standards for the relevant industry classification. Prepare for TCFD-aligned climate disclosure.", priority: "LOW" },
      ],
      recommendation: "GO",
    },
  };

  const meta = DD_ANALYSIS_META[type];
  return mocks[type] || {
    summary: `${meta?.name || type} analysis for ${deal.name}. Preliminary assessment based on available deal data.`,
    sections: [{ name: "General Analysis", content: `Preliminary analysis for this ${assetCtx} deal in the ${sectorCtx} sector. Full analysis will be generated when an AI model is configured.`, riskLevel: "MEDIUM" as const }],
    findings: [{ title: `${meta?.name || type} review needed`, description: "Detailed analysis required. Upload additional documents and configure AI for comprehensive results.", priority: "MEDIUM" as const }],
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

  const { type, categoryName: rawCategoryName, rerun } = data!;
  const meta = DD_ANALYSIS_META[type];

  // Resolve category name: explicit from request OR from type mapping
  const TYPE_TO_CATEGORY: Record<string, string> = {
    DD_FINANCIAL: "Financial DD",
    DD_LEGAL: "Legal DD",
    DD_MARKET: "Market DD",
    DD_TAX: "Tax DD",
    DD_OPERATIONAL: "Operational DD",
    DD_ESG: "ESG DD",
    DD_COLLATERAL: "Collateral DD",
    DD_TENANT_LEASE: "Tenant & Lease DD",
    DD_CUSTOMER: "Customer DD",
    DD_TECHNOLOGY: "Technology DD",
    DD_REGULATORY: "Regulatory & Permitting DD",
    DD_ENGINEERING: "Engineering DD",
    DD_CREDIT: "Credit DD",
    DD_COMMERCIAL: "Commercial DD",
    DD_MANAGEMENT: "Management DD",
  };
  const categoryName = rawCategoryName || TYPE_TO_CATEGORY[type] || null;

  // Fetch deal with context
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      screeningResult: true,
      documents: { select: { name: true, category: true, extractedText: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { content: true, author: { select: { name: true } } },
      },
      workstreams: { select: { id: true, analysisType: true, analysisResult: true, name: true, aiGenerated: true } },
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

  // Find existing workstream: by analysisType first, then by category name match
  const existingWs =
    deal.workstreams.find((ws) => ws.analysisType === type) ||
    (categoryName ? deal.workstreams.find((ws) => ws.name === categoryName) : null);

  if (existingWs?.analysisResult && !rerun) {
    return NextResponse.json(
      { error: `${meta?.name || type} analysis already exists. Pass rerun: true to re-analyze.` },
      { status: 400 },
    );
  }

  // On rerun: we keep all existing tasks and only add NEW ones later (dedup by title)

  // Build deal context with full document content
  const documentContents = deal.documents
    .filter((d) => d.extractedText)
    .map((d) => ({ name: d.name, content: d.extractedText! }));

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

  // ── For IC_MEMO: gather all workstream analysis outputs as context ──
  let screeningData: {
    score: number;
    recommendation: string;
    strengths: string[];
    risks: string[];
    ddFindings?: Record<string, { title: string; description: string; priority: string }[]>;
  } | null = null;

  const priorFindings: { title: string; description: string; priority: string }[] | null = null;

  if (type === "IC_MEMO") {
    // Build ddFindings from all workstream analysis results
    const ddFindings: Record<string, { title: string; description: string; priority: string }[]> = {};
    const strengths: string[] = [];
    const risks: string[] = [];

    for (const ws of deal.workstreams) {
      if (!ws.analysisResult || ws.analysisType === "IC_MEMO") continue;
      const ar = ws.analysisResult as any;
      if (ar.summary) strengths.push(`${ws.name}: ${ar.summary}`);
      if (Array.isArray(ar.sections)) {
        for (const s of ar.sections) {
          if (s.riskLevel === "HIGH") risks.push(`${ws.name} — ${s.name}: ${String(s.content).slice(0, 200)}`);
        }
      }
      if (Array.isArray(ar.findings)) {
        ddFindings[ws.name] = ar.findings.map((f: any) => ({
          title: String(f.title || ""),
          description: String(f.description || ""),
          priority: String(f.priority || "MEDIUM"),
        }));
      }
    }

    screeningData = {
      score: 0,
      recommendation: "",
      strengths: strengths.slice(0, 10),
      risks: risks.slice(0, 10),
      ddFindings,
    };
  }

  // Call LLM or fallback to mock
  const firmId = deal.firmId || "firm-1";
  let result: DDAnalysisResult;
  let aiPowered = false;

  const aiResult = await runDDAnalysis(firmId, dealCtx, type, screeningData, priorFindings, categoryName);
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
    DD_TAX: 103,
    DD_OPERATIONAL: 104,
    DD_ESG: 105,
    DD_COLLATERAL: 106,
    DD_TENANT_LEASE: 107,
    DD_CUSTOMER: 108,
    DD_TECHNOLOGY: 109,
    DD_REGULATORY: 110,
    DD_ENGINEERING: 111,
    DD_CREDIT: 112,
    DD_COMMERCIAL: 113,
    DD_MANAGEMENT: 114,
    DD_CUSTOM: 115,
    IC_MEMO: 120,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;

  const analysisResultJson = jsonSafe({
    summary: result.summary,
    sections: result.sections,
    recommendation: result.recommendation,
    aiPowered,
  });

  // ── IC_MEMO is NOT a workstream — it's stored only in AIScreeningResult ──
  let newTaskCount = 0;

  if (type === "IC_MEMO") {
    const memoJson = jsonSafe({
      summary: result.summary,
      sections: result.sections,
      recommendation: result.recommendation,
      findings: result.findings,
    });

    const existingSR = await prisma.aIScreeningResult.findUnique({ where: { dealId: id } });

    if (existingSR) {
      // Archive current memo to previousVersions before overwriting
      const prev: any[] = Array.isArray(existingSR.previousVersions) ? [...(existingSR.previousVersions as any[])] : [];
      if (existingSR.memo) {
        prev.push({
          version: existingSR.version,
          memo: existingSR.memo,
          memoGeneratedAt: existingSR.memoGeneratedAt,
        });
      }

      await prisma.aIScreeningResult.update({
        where: { dealId: id },
        data: {
          memo: memoJson,
          memoGeneratedAt: new Date(),
          version: existingSR.version + 1,
          previousVersions: prev.length > 0 ? jsonSafe(prev) : Prisma.DbNull,
        },
      });
    } else {
      await prisma.aIScreeningResult.create({
        data: {
          dealId: id,
          memo: memoJson,
          memoGeneratedAt: new Date(),
          version: 1,
        },
      });
    }
  } else {
    // ── Regular workstream analysis — update/create workstream + tasks ──

    let workstreamId: string;

    if (existingWs) {
      // Update existing workstream (created by screening or prior analysis)
      await prisma.dDWorkstream.update({
        where: { id: existingWs.id },
        data: {
          analysisType: type,
          hasAI: true,
          analysisResult: analysisResultJson,
        },
      });
      workstreamId = existingWs.id;
    } else {
      // No existing workstream — create new one
      const ws = await prisma.dDWorkstream.create({
        data: {
          dealId: id,
          name: meta?.name || type.replace(/_/g, " "),
          description: `Due diligence workstream for ${(meta?.name || type).toLowerCase()}.`,
          aiGenerated: true,
          hasAI: true,
          analysisType: type,
          analysisResult: analysisResultJson,
          sortOrder: sortOrderMap[type] ?? 100,
          totalTasks: result.findings.length,
          completedTasks: 0,
          status: result.findings.length > 0 ? "IN_PROGRESS" : "COMPLETE",
        },
      });
      workstreamId = ws.id;
    }

    // Append NEW tasks from analysis findings — skip any that already exist (by title)
    const existingTasks = await prisma.dDTask.findMany({
      where: { workstreamId },
      select: { title: true },
    });
    const existingTitles = new Set(existingTasks.map((t) => t.title));

    // Also check existing global Task records for this deal to prevent duplicates
    const existingGlobalTasks = await prisma.task.findMany({
      where: { dealId: id },
      select: { title: true },
    });
    const existingGlobalTitles = new Set(existingGlobalTasks.map((t) => t.title));

    for (const finding of result.findings) {
      if (existingTitles.has(finding.title)) continue;

      // Create the DD workstream task
      await prisma.dDTask.create({
        data: {
          workstreamId,
          title: finding.title,
          description: finding.description,
          priority: finding.priority,
          source: `AI_${type}`,
          status: "TODO",
        },
      });

      // Also create in the global Task system so it shows on the Tasks page
      if (!existingGlobalTitles.has(finding.title)) {
        await prisma.task.create({
          data: {
            title: finding.title,
            description: finding.description,
            priority: finding.priority,
            status: "TODO",
            dealId: id,
            contextType: "WORKSTREAM",
            contextId: workstreamId,
          },
        });
      }

      newTaskCount++;
    }

    await recalcWorkstreamProgress(workstreamId);
  }

  // Log activity
  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "DD_ANALYSIS",
      description: `${meta?.name || type} ${rerun ? "re-" : ""}analysis completed${aiPowered ? " (AI)" : ""}. ${newTaskCount} new tasks added (${result.findings.length} total findings). Recommendation: ${result.recommendation}.`,
      metadata: {
        analysisType: type,
        recommendation: result.recommendation,
        findingCount: result.findings.length,
        newTaskCount,
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
