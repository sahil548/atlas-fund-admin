import { NextResponse } from "next/server";

// Mock AI screening endpoint — scaffolding for future LLM integration
export async function POST(req: Request) {
  const body = await req.json();
  const { dealId, documents, systemPrompt } = body as {
    dealId?: string;
    documents?: string[];
    systemPrompt?: string;
  };

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  // Simulated AI screening response
  const mockResult = {
    dealId,
    score: Math.floor(Math.random() * 30) + 65, // 65-95
    summary: "This is a mock AI screening result. In production, this endpoint will process uploaded deal documents through an LLM pipeline using the configured system prompt to generate investment screening analysis.",
    strengths: [
      "Strong market position in target sector",
      "Experienced management team with track record",
      "Favorable deal structure and terms",
    ],
    risks: [
      "Market concentration risk in primary revenue stream",
      "Regulatory environment may shift in next 12-18 months",
      "Integration complexity with existing portfolio",
    ],
    financials: {
      revenueGrowth: "18% CAGR (3Y)",
      ebitdaMargin: "24%",
      leverage: "3.2x Net Debt / EBITDA",
    },
    recommendation: "PROCEED_TO_DD",
    modelConfig: {
      model: systemPrompt ? "custom-prompt" : "default",
      documentsProcessed: documents?.length || 0,
      processingTime: `${(Math.random() * 2 + 1).toFixed(1)}s`,
    },
    processedAt: new Date().toISOString(),
  };

  return NextResponse.json(mockResult);
}
