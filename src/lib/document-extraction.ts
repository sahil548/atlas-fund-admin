import { prisma } from "@/lib/prisma";
import { createUserAIClient, createAIClient, getModelForFirm } from "@/lib/ai-config";

const MAX_EXTRACTED_CHARS = 50_000;

/**
 * Extract text content from an uploaded file buffer.
 * Supports: PDF, Excel (.xlsx/.xls), CSV, plain text.
 * Returns empty string for unsupported formats.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string | null,
): Promise<string> {
  if (!buffer || buffer.length === 0) return "";

  try {
    // PDF
    if (
      mimeType === "application/pdf" ||
      fileName.toLowerCase().endsWith(".pdf")
    ) {
      // pdf-parse v2 exports PDFParse as a class (not a callable function)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PDFParse } = await import("pdf-parse") as any;
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return (result.text || "").slice(0, MAX_EXTRACTED_CHARS);
      } finally {
        await parser.destroy();
      }
    }

    // Excel
    if (
      mimeType?.includes("spreadsheet") ||
      mimeType?.includes("excel") ||
      fileName.toLowerCase().endsWith(".xlsx") ||
      fileName.toLowerCase().endsWith(".xls")
    ) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer);
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += `--- ${sheetName} ---\n`;
        text += XLSX.utils.sheet_to_csv(sheet) + "\n\n";
      }
      return text.slice(0, MAX_EXTRACTED_CHARS);
    }

    // CSV / plain text
    if (
      mimeType?.startsWith("text/") ||
      fileName.toLowerCase().endsWith(".csv") ||
      fileName.toLowerCase().endsWith(".txt") ||
      fileName.toLowerCase().endsWith(".md")
    ) {
      return buffer.toString("utf-8").slice(0, MAX_EXTRACTED_CHARS);
    }
  } catch (err) {
    console.error(`[document-extraction] Failed to extract ${fileName}:`, err);
  }

  return "";
}

// ── Type-specific extraction schemas ──────────────────────────────────────────
// Locked decision: CIMs, leases, credit docs, K-1s are the primary use cases.
// Maps to existing DocumentCategory enum: FINANCIAL, LEGAL, TAX
// Do NOT add new enum values to DocumentCategory.

interface ExtractionField {
  key: string;
  label: string;
}

interface ExtractionSchema {
  description: string;
  fields: ExtractionField[];
  systemPrompt: string;
}

const CIM_EXTRACTION: ExtractionSchema = {
  description: "CIM / Information Memorandum — deal terms",
  fields: [
    { key: "dealSize", label: "Deal Size" },
    { key: "targetReturn", label: "Target Return" },
    { key: "investmentStructure", label: "Investment Structure" },
    { key: "keyTerms", label: "Key Terms" },
    { key: "assetClass", label: "Asset Class" },
    { key: "holdPeriod", label: "Hold Period" },
    { key: "projectedIRR", label: "Projected IRR" },
    { key: "projectedMultiple", label: "Projected Multiple" },
  ],
  systemPrompt: `You are a deal analyst extracting structured information from a Confidential Information Memorandum (CIM) or investment memo. Extract the following fields from the document text. Return a JSON object where each key maps to an object with "value" (the extracted value as a string) and "confidence" (high/medium/low). If a field is not found in the document, set value to null. Fields to extract: dealSize, targetReturn, investmentStructure, keyTerms, assetClass, holdPeriod, projectedIRR, projectedMultiple.`,
};

const LEASE_EXTRACTION: ExtractionSchema = {
  description: "Lease Agreement — dates and terms",
  fields: [
    { key: "tenantName", label: "Tenant Name" },
    { key: "leaseType", label: "Lease Type" },
    { key: "leaseStartDate", label: "Lease Start Date" },
    { key: "leaseEndDate", label: "Lease End Date" },
    { key: "baseRentMonthly", label: "Base Rent (Monthly)" },
    { key: "rentEscalation", label: "Rent Escalation" },
    { key: "renewalOptions", label: "Renewal Options" },
    { key: "squareFeet", label: "Square Feet" },
  ],
  systemPrompt: `You are a real estate analyst extracting structured lease information. Extract the following fields from this lease agreement. Return a JSON object where each key maps to an object with "value" (the extracted value as a string) and "confidence" (high/medium/low). If a field is not found, set value to null. Fields to extract: tenantName, leaseType, leaseStartDate, leaseEndDate, baseRentMonthly, rentEscalation, renewalOptions, squareFeet.`,
};

const CREDIT_EXTRACTION: ExtractionSchema = {
  description: "Credit Document — covenants and loan terms",
  fields: [
    { key: "borrowerName", label: "Borrower Name" },
    { key: "principal", label: "Principal Amount" },
    { key: "interestRate", label: "Interest Rate" },
    { key: "maturityDate", label: "Maturity Date" },
    { key: "ltv", label: "Loan-to-Value Ratio" },
    { key: "covenants", label: "Covenants" },
    { key: "subordination", label: "Subordination" },
    { key: "agreementType", label: "Agreement Type" },
  ],
  systemPrompt: `You are a credit analyst extracting structured information from a credit agreement or loan document. Extract the following fields. Return a JSON object where each key maps to an object with "value" (the extracted value as a string) and "confidence" (high/medium/low). If a field is not found, set value to null. Fields to extract: borrowerName, principal, interestRate, maturityDate, ltv, covenants, subordination, agreementType.`,
};

const K1_EXTRACTION: ExtractionSchema = {
  description: "K-1 Tax Document — LP tax information",
  fields: [
    { key: "taxYear", label: "Tax Year" },
    { key: "partnerName", label: "Partner Name" },
    { key: "partnershipName", label: "Partnership Name" },
    { key: "ordinaryIncome", label: "Ordinary Income" },
    { key: "capitalGains", label: "Capital Gains" },
    { key: "distributionsReceived", label: "Distributions Received" },
    { key: "endingCapitalAccount", label: "Ending Capital Account" },
  ],
  systemPrompt: `You are a tax specialist extracting structured information from a Schedule K-1 tax document. Extract the following fields. Return a JSON object where each key maps to an object with "value" (the extracted value as a string) and "confidence" (high/medium/low). If a field is not found, set value to null. Fields to extract: taxYear, partnerName, partnershipName, ordinaryIncome, capitalGains, distributionsReceived, endingCapitalAccount.`,
};

// ── Helper functions ───────────────────────────────────────────────────────────

// Categories that get AI extraction
// FINANCIAL covers CIMs and credit docs; LEGAL covers leases; TAX covers K-1s
const AI_EXTRACTABLE_CATEGORIES = ["FINANCIAL", "LEGAL", "TAX"];

export function shouldExtractAI(category: string): boolean {
  return AI_EXTRACTABLE_CATEGORIES.includes(category);
}

function getExtractionSchema(category: string): ExtractionSchema | null {
  switch (category) {
    case "FINANCIAL":
      return CIM_EXTRACTION; // Handles CIMs and credit docs (combined FINANCIAL schema)
    case "LEGAL":
      return LEASE_EXTRACTION;
    case "TAX":
      return K1_EXTRACTION;
    default:
      return null;
  }
}

// ── Main extraction function ───────────────────────────────────────────────────

/**
 * Extract structured fields from a document using AI.
 * Called async (fire-and-forget) from upload endpoints.
 * Updates the Document record directly with extraction results.
 *
 * NOTE: On Vercel serverless, background work may be killed after the HTTP
 * response is sent. For critical extraction, use the retry endpoint.
 */
export async function extractDocumentFields(
  documentId: string,
  category: string,
  extractedText: string,
  firmId: string,
  userId?: string,
): Promise<void> {
  const schema = getExtractionSchema(category);
  if (!schema || !extractedText) {
    // No extraction schema for this category, or no text to extract from
    return;
  }

  try {
    // Mark as PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionStatus: "PROCESSING" },
    });

    // Get AI client — use user-specific config if userId provided, otherwise firm-level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any;
    let model: string;

    if (userId) {
      const result = await createUserAIClient(userId, firmId);
      if (!result) {
        // No AI key available — mark as NONE (not FAILED, since it's expected)
        await prisma.document.update({
          where: { id: documentId },
          data: { extractionStatus: "NONE", extractionError: "No AI API key configured" },
        });
        return;
      }
      client = result.client;
      model = result.model;
    } else {
      client = await createAIClient(firmId);
      if (!client) {
        await prisma.document.update({
          where: { id: documentId },
          data: { extractionStatus: "NONE", extractionError: "No AI API key configured" },
        });
        return;
      }
      model = await getModelForFirm(firmId);
    }

    // Truncate text to avoid token limits (50K chars)
    const truncatedText = extractedText.slice(0, 50000);

    // AI call with 90-second timeout — follows the extract-metadata/route.ts pattern
    const aiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI extraction timed out after 90 seconds")), 90_000),
    );

    const aiCall = client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: schema.systemPrompt },
        { role: "user", content: truncatedText },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.2,
    });

    const response = await Promise.race([aiCall, aiTimeout]);
    const raw = response.choices?.[0]?.message?.content || "{}";

    // Parse JSON with regex fallback (same pattern as extract-metadata route)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI extraction response as JSON");
      }
    }

    // Transform into extractedFields format: { fieldKey: { aiValue, label, confidence } }
    const extractedFields: Record<string, { aiValue: string | null; label: string; confidence?: string }> = {};
    for (const field of schema.fields) {
      const fieldData = parsed[field.key];
      if (fieldData && typeof fieldData === "object") {
        extractedFields[field.key] = {
          aiValue: fieldData.value ?? null,
          label: field.label,
          confidence: fieldData.confidence,
        };
      } else if (fieldData !== undefined) {
        // Handle flat response (just values, no confidence object)
        extractedFields[field.key] = {
          aiValue: String(fieldData),
          label: field.label,
        };
      } else {
        extractedFields[field.key] = {
          aiValue: null,
          label: field.label,
        };
      }
    }

    // Save extraction results
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: "COMPLETE",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedFields: extractedFields as any,
        extractionError: null,
      },
    });

    console.log(`[doc-extraction] Extraction complete for document ${documentId} (${category})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[doc-extraction] Extraction failed for document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: "FAILED",
        extractionError: message,
      },
    }).catch(console.error);
  }
}
