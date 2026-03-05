import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { DDAnalyzeRequestSchema } from "@/lib/schemas";
import { recalcWorkstreamProgress } from "@/lib/deal-stage-engine";
import { type DealContext } from "@/lib/deal-types";
import { getAuthUser } from "@/lib/auth";
import {
  runDDAnalysis,
  DD_ANALYSIS_META,
  type DDAnalysisResult,
  type DDAnalysisReturn,
  type PriorResponse,
} from "@/lib/dd-analysis-service";

// Vercel Hobby plan caps at 60s; set explicitly to match
export const maxDuration = 60;

// ── Mock generators ─────────────────────────────────

function generateMockWorkstream(
  deal: { name: string; assetClass: string; sector?: string | null },
  type: string,
): DDAnalysisResult {
  const sectorCtx = deal.sector || "general";
  const assetCtx = deal.assetClass.replace(/_/g, " ").toLowerCase();
  const meta = DD_ANALYSIS_META[type];

  return {
    summary: `Preliminary ${meta?.name || type} analysis for ${deal.name}. This ${assetCtx} deal in the ${sectorCtx} sector requires further data to produce comprehensive analysis. Upload relevant documents and configure an AI model in Settings for full results.`,
    openQuestions: [
      { title: `Provide key ${(meta?.name || type).toLowerCase()} documentation`, description: "Upload relevant documents to enable detailed analysis.", priority: "HIGH" as const },
      { title: `Review ${(meta?.name || type).toLowerCase()} assumptions`, description: "Verify that deal parameters and context are accurate and complete.", priority: "MEDIUM" as const },
    ],
    score: 0,
    sections: [],
    recommendation: "",
  };
}

function generateMockICMemo(
  deal: { name: string; assetClass: string; sector?: string | null },
): DDAnalysisResult {
  const sectorCtx = deal.sector || "general";
  const assetCtx = deal.assetClass.replace(/_/g, " ").toLowerCase();

  return {
    summary: `IC memo for ${deal.name}. This ${assetCtx} opportunity in the ${sectorCtx} sector requires AI configuration and completed workstream analyses for a comprehensive IC memo.`,
    openQuestions: [],
    score: 50,
    sections: [
      { name: "Executive Summary", content: `${deal.name} is a ${assetCtx} investment opportunity in the ${sectorCtx} sector. Configure an AI model in Settings to generate a detailed IC memo.`, riskLevel: "MEDIUM" },
      { name: "Recommendation", content: "Insufficient data for a recommendation. Complete workstream analyses and configure AI to generate the full memo.", riskLevel: "MEDIUM" },
    ],
    recommendation: "APPROVE_WITH_CONDITIONS",
  };
}

// ── POST /api/deals/[id]/dd-analyze ─────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const routeStart = performance.now();
  const { id } = await params;

  const { data, error } = await parseBody(req, DDAnalyzeRequestSchema);
  if (error) return error;

  const { type, categoryName: rawCategoryName, rerun } = data!;
  const meta = DD_ANALYSIS_META[type];
  const isICMemo = type === "IC_MEMO";

  // Resolve category name
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
      workstreams: {
        include: { tasks: { select: { id: true, title: true, resolution: true, status: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // No stage restriction — analysis can run from SCREENING onward

  // Find existing workstream
  const existingWs =
    deal.workstreams.find((ws) => ws.analysisType === type) ||
    (categoryName ? deal.workstreams.find((ws) => ws.name === categoryName) : null);

  if (existingWs?.analysisResult && !rerun) {
    return NextResponse.json(
      { error: `${meta?.name || type} analysis already exists. Pass rerun: true to re-analyze.` },
      { status: 400 },
    );
  }

  // Build deal context
  const documentContents = isICMemo
    ? []
    : deal.documents
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
    investmentRationale: isICMemo ? null : deal.investmentRationale,
    additionalContext: isICMemo ? null : deal.additionalContext,
    thesisNotes: isICMemo ? null : deal.thesisNotes,
    documents: deal.documents.map((d) => ({ name: d.name, category: d.category })),
    notes: isICMemo
      ? []
      : deal.notes.map((n) => ({ content: n.content, author: n.author?.name || null })),
    documentContents,
  };

  // ── Build options for LLM call ──
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || deal.firmId || "";

  let priorResponses: PriorResponse[] | undefined;
  let workstreamSummaries: { name: string; summary: string; openQuestions?: { title: string; answer?: string | null }[] }[] | undefined;

  if (isICMemo) {
    // Gather all workstream summaries + resolved questions for IC memo context
    // IMPORTANT: Skip workstreams with mock/sample data — only include AI-powered analyses
    workstreamSummaries = [];
    for (const ws of deal.workstreams) {
      if (!ws.analysisResult || ws.analysisType === "IC_MEMO") continue;
      const ar = ws.analysisResult as Record<string, unknown>;
      if (!ar.aiPowered) continue; // Skip mock/sample workstreams
      const summary = String(ar.summary || "");
      if (!summary) continue;

      // Collect open questions with user responses from DDTask records
      const openQuestions: { title: string; answer?: string | null }[] = [];
      // Check new format (openQuestions) and legacy format (findings)
      const questions = Array.isArray(ar.openQuestions) ? ar.openQuestions : Array.isArray(ar.findings) ? ar.findings : [];
      for (const q of questions) {
        const title = String((q as Record<string, unknown>).title || "");
        // Find matching task to get user resolution
        const matchingTask = ws.tasks.find((t) => t.title === title);
        openQuestions.push({
          title,
          answer: matchingTask?.resolution || null,
        });
      }

      workstreamSummaries.push({ name: ws.name, summary, openQuestions });
    }
  } else if (rerun && existingWs) {
    // On rerun: pass existing task titles + user resolutions as prior responses
    priorResponses = existingWs.tasks
      .filter((t) => t.title)
      .map((t) => ({
        question: t.title,
        answer: t.resolution || null,
      }));
  }

  // Guard: refuse IC memo if no workstreams have real AI analysis
  if (isICMemo && workstreamSummaries && workstreamSummaries.length === 0) {
    return NextResponse.json(
      { error: "Cannot generate IC memo — no workstreams have AI analysis yet. Run workstream analyses first, then generate the IC memo." },
      { status: 400 },
    );
  }

  // Call LLM or fallback to mock
  let result: DDAnalysisResult;
  let aiPowered = false;
  let mockReason: string | null = null;
  const dbSetupMs = performance.now() - routeStart;

  const aiReturn = await runDDAnalysis(firmId, dealCtx, type, {
    categoryName,
    priorResponses,
    workstreamSummaries,
  });
  if (aiReturn.result) {
    result = aiReturn.result;
    aiPowered = true;
  } else {
    result = isICMemo ? generateMockICMemo(deal) : generateMockWorkstream(deal, type);
    mockReason = aiReturn.errorReason || "AI analysis failed — try re-analyzing.";
    console.warn(`[dd-analyze] ${type} for deal ${id}: fell back to mock data. firmId=${firmId} reason=${mockReason}`);
  }

  // Sort order
  const sortOrderMap: Record<string, number> = {
    DD_FINANCIAL: 100, DD_LEGAL: 101, DD_MARKET: 102, DD_TAX: 103,
    DD_OPERATIONAL: 104, DD_ESG: 105, DD_COLLATERAL: 106, DD_TENANT_LEASE: 107,
    DD_CUSTOMER: 108, DD_TECHNOLOGY: 109, DD_REGULATORY: 110, DD_ENGINEERING: 111,
    DD_CREDIT: 112, DD_COMMERCIAL: 113, DD_MANAGEMENT: 114, DD_CUSTOM: 115,
    IC_MEMO: 120,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;

  let newTaskCount = 0;

  if (isICMemo) {
    // ── IC_MEMO → store in AIScreeningResult + write score to Deal ──
    const memoJson = jsonSafe({
      score: result.score,
      summary: result.summary,
      sections: result.sections,
      recommendation: result.recommendation,
    });

    const existingSR = await prisma.aIScreeningResult.findUnique({ where: { dealId: id } });

    if (existingSR) {
      const prev: unknown[] = Array.isArray(existingSR.previousVersions) ? [...(existingSR.previousVersions as unknown[])] : [];
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
          score: result.score,
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
          score: result.score,
          memo: memoJson,
          memoGeneratedAt: new Date(),
          version: 1,
        },
      });
    }

    // Write score to Deal for easy access
    await prisma.deal.update({
      where: { id },
      data: { aiScore: result.score },
    });

    // Auto-advance from SCREENING → DUE_DILIGENCE after IC memo
    if (deal.stage === "SCREENING") {
      await prisma.deal.update({
        where: { id },
        data: { stage: "DUE_DILIGENCE" },
      });
      await prisma.dealActivity.create({
        data: {
          dealId: id,
          activityType: "STAGE_TRANSITION",
          description: "Deal auto-advanced to Due Diligence after IC memo generation",
          metadata: { fromStage: "SCREENING", toStage: "DUE_DILIGENCE" },
        },
      });
    }
  } else {
    // ── Workstream analysis → update/create workstream + tasks ──
    const analysisResultJson = jsonSafe({
      summary: result.summary,
      openQuestions: result.openQuestions,
      aiPowered,
      ...(mockReason ? { mockReason } : {}),
    });

    let workstreamId: string;

    if (existingWs) {
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
          totalTasks: result.openQuestions.length,
          completedTasks: 0,
          status: result.openQuestions.length > 0 ? "IN_PROGRESS" : "COMPLETE",
        },
      });
      workstreamId = ws.id;
    }

    // Append NEW tasks from open questions — skip duplicates by title
    const existingTasks = await prisma.dDTask.findMany({
      where: { workstreamId },
      select: { title: true },
    });
    const existingTitles = new Set(existingTasks.map((t) => t.title));

    const existingGlobalTasks = await prisma.task.findMany({
      where: { dealId: id },
      select: { title: true },
    });
    const existingGlobalTitles = new Set(existingGlobalTasks.map((t) => t.title));

    for (const question of result.openQuestions) {
      if (existingTitles.has(question.title)) continue;

      await prisma.dDTask.create({
        data: {
          workstreamId,
          title: question.title,
          description: question.description,
          priority: question.priority,
          source: `AI_QUESTION_${type}`,
          status: "TODO",
        },
      });

      if (!existingGlobalTitles.has(question.title)) {
        await prisma.task.create({
          data: {
            title: question.title,
            description: question.description,
            priority: question.priority,
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
      description: isICMemo
        ? `IC Memo ${rerun ? "re" : ""}generated${aiPowered ? " (AI)" : ""}. Score: ${result.score}/100. Recommendation: ${result.recommendation}.`
        : `${meta?.name || type} ${rerun ? "re-" : ""}analysis completed${aiPowered ? " (AI)" : ""}. ${newTaskCount} new open questions added.`,
      metadata: {
        analysisType: type,
        recommendation: result.recommendation || undefined,
        openQuestionCount: result.openQuestions.length,
        newTaskCount,
        score: result.score || undefined,
        aiPowered,
        rerun,
      },
    },
  });

  const dbWriteMs = performance.now() - routeStart - dbSetupMs;

  // Return updated deal
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

  const totalRouteMs = performance.now() - routeStart;
  const label = rawCategoryName || type;
  console.log(
    `[dd-analyze] ${label} for deal ${id}: ` +
    `total=${(totalRouteMs / 1000).toFixed(1)}s | ` +
    `dbSetup=${(dbSetupMs / 1000).toFixed(1)}s llm+parse=${((totalRouteMs - dbSetupMs - dbWriteMs) / 1000).toFixed(1)}s ` +
    `dbWrite=${(dbWriteMs / 1000).toFixed(1)}s | ` +
    `ai=${aiPowered ? "yes" : "mock"}`
  );

  return NextResponse.json(updatedDeal);
}
