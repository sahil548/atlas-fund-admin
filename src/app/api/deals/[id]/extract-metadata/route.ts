import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createAIClient, getModelForFirm } from "@/lib/ai-config";
import { getAuthUser } from "@/lib/auth";

// Vercel Hobby plan caps at 60s
export const maxDuration = 60;

// Max chars of document text to send to AI (avoid token limits)
const MAX_DOC_TEXT_LENGTH = 30_000;

/**
 * POST /api/deals/[id]/extract-metadata
 *
 * Triggers AI extraction of structured deal metadata from uploaded documents.
 * Saves the result to deal.dealMetadata JSON field.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Fetch deal with documents
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      documents: {
        select: { id: true, name: true, extractedText: true, category: true },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Check for extractable document text
  const docsWithText = deal.documents.filter((d) => d.extractedText && d.extractedText.trim().length > 0);
  if (docsWithText.length === 0) {
    return NextResponse.json(
      { error: "No document text available for extraction. Upload documents with text content first." },
      { status: 400 },
    );
  }

  // Determine firmId for AI config
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || deal.firmId || "";

  // Get AI client
  const client = await createAIClient(firmId);
  if (!client) {
    return NextResponse.json(
      { error: "AI not configured. Add an API key in Settings to enable metadata extraction." },
      { status: 400 },
    );
  }

  const model = await getModelForFirm(firmId);

  // Concatenate document texts, truncated to limit
  let combinedText = "";
  for (const doc of docsWithText) {
    const header = `\n--- Document: ${doc.name} (${doc.category}) ---\n`;
    const remaining = MAX_DOC_TEXT_LENGTH - combinedText.length - header.length;
    if (remaining <= 0) break;
    const text = doc.extractedText!.slice(0, remaining);
    combinedText += header + text;
  }

  // Asset-class-specific field guidance
  const assetClassFields: Record<string, string> = {
    REAL_ESTATE: "propertyType, location, capRate, noi, squareFootage, occupancyRate, buildYear",
    INFRASTRUCTURE: "projectType, location, contractLength, regulatoryStatus, concessionTerms",
    OPERATING_BUSINESS: "revenue, ebitda, ownershipPercent, growthRate, employeeCount, customerCount",
    PUBLIC_SECURITIES: "ticker, marketCap, sector, peRatio, dividendYield",
    COMMODITIES: "commodityType, volume, pricePerUnit, contractTerms",
    DIVERSIFIED: "subAssetClasses, allocationBreakdown, correlationNotes",
    NON_CORRELATED: "strategyType, hedgeRatio, correlationMetrics",
    CASH_AND_EQUIVALENTS: "yieldRate, maturityProfile, creditRating",
  };

  const specificFields = assetClassFields[deal.assetClass] || "";
  const debtExtra = deal.capitalInstrument === "DEBT"
    ? "\nFor debt instruments, also extract: principal, interestRate, maturityDate, ltv, covenants (summary of key covenants)."
    : "";

  const systemPrompt = `You are a deal metadata extractor for a fund administration platform. Extract structured deal metadata from the following document text.

Return a JSON object with these standard fields (use null if not found):
- dealSize: total deal/raise size (string, e.g. "$50M")
- targetReturn: expected return (string, e.g. "2.5x" or "25% IRR")
- projectedCashFlow: projected cash flow if mentioned (string)
- investmentStructure: description of the investment structure
- keyTerms: summary of key terms and conditions (string)

Also extract asset-class-specific fields for ${deal.assetClass}:
${specificFields}${debtExtra}

Include any other quantitative or structural fields you find relevant. Use short, clean values.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no explanation — just the JSON starting with {.`;

  // Call AI with 55-second timeout (BUG-03 fix: leaves 5s buffer before Vercel's 60s maxDuration)
  const aiTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT")), 55_000),
  );

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const aiCall = (client as any).chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract deal metadata from these documents for the deal "${deal.name}" (${deal.assetClass}):\n\n${combinedText}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.2,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const response = await Promise.race([aiCall, aiTimeout]);
    const raw = response.choices?.[0]?.message?.content || "{}";

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(raw);
    } catch {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON. Try again." },
          { status: 500 },
        );
      }
    }

    // Save to deal.dealMetadata
    const updated = await prisma.deal.update({
      where: { id },
      data: { dealMetadata: extracted as any },
    });

    // Log activity
    await prisma.dealActivity.create({
      data: {
        dealId: id,
        activityType: "GENERAL",
        description: `AI extracted deal metadata from ${docsWithText.length} document${docsWithText.length !== 1 ? "s" : ""}.`,
        metadata: {
          documentsUsed: docsWithText.map((d) => d.name),
          fieldsExtracted: Object.keys(extracted).length,
        },
      },
    });

    return NextResponse.json({
      dealMetadata: updated.dealMetadata,
      documentsUsed: docsWithText.length,
      fieldsExtracted: Object.keys(extracted).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during metadata extraction";
    if (message === "TIMEOUT") {
      return NextResponse.json(
        { error: "AI generation timed out. Try again with a smaller document." },
        { status: 504 },
      );
    }
    console.error("[extract-metadata] Error:", message);
    return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
  }
}
