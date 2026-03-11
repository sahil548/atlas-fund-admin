import { prisma } from "@/lib/prisma";
import { createUserAIClient, createAIClient, getModelForFirm } from "@/lib/ai-config";
import { logger } from "@/lib/logger";

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
    logger.error(`[document-extraction] Failed to extract ${fileName}`, { error: err instanceof Error ? err.message : String(err) });
  }

  return "";
}

// ── Universal summarization ──────────────────────────────────────────────────

const SUMMARIZATION_PROMPT = `You are a senior financial analyst reviewing a document uploaded to an investment management platform. Your task is to produce a comprehensive, detailed summary of this document.

Your response MUST be a JSON object with exactly these fields:

{
  "documentType": "A short label for the type of document (e.g. 'Confidential Information Memorandum', 'Lease Agreement', 'Schedule K-1', 'Board Resolution', 'Quarterly Report', 'Operating Agreement', 'Subscription Agreement', etc.)",
  "summary": "A thorough, multi-paragraph summary of the entire document. Be as detailed and extensive as possible — cover all major sections, key terms, financial figures, dates, parties involved, obligations, conditions, and any other material information. Do not abbreviate or skip content. Aim for 500–1500 words.",
  "keyPoints": ["An array of the most important takeaways, findings, terms, or action items from the document. Include 5–15 bullet points."],
  "parties": ["Names of all individuals, companies, or entities mentioned in the document"],
  "financialFigures": ["Any dollar amounts, percentages, rates, multiples, or other quantitative metrics mentioned, with context (e.g. '$50M total commitment', '8.5% preferred return', '1.5x target multiple')"],
  "keyDates": ["Any important dates mentioned, with context (e.g. 'Closing date: March 15, 2025', 'Lease expires: December 31, 2030')"],
  "risks": ["Any risks, concerns, caveats, or conditions mentioned in the document"]
}

Important rules:
- The "summary" field should be EXTENSIVE. You have plenty of space — use it to capture every important detail.
- If a field has no relevant data, use an empty array [] or empty string "".
- Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON.`;

/**
 * All document categories are eligible for AI summarization,
 * as long as there is extracted text to process.
 */
export function shouldExtractAI(_category: string): boolean {
  return true;
}

// ── Main extraction function ───────────────────────────────────────────────────

/**
 * Summarize a document using AI.
 * Called async (fire-and-forget) from upload endpoints.
 * Updates the Document record directly with the summary.
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
  if (!extractedText) {
    // No text to summarize
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

    // AI call with 90-second timeout
    const aiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI summarization timed out after 90 seconds")), 90_000),
    );

    const aiCall = client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SUMMARIZATION_PROMPT },
        {
          role: "user",
          content: `Document category: ${category}\n\n--- DOCUMENT TEXT ---\n\n${truncatedText}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
      temperature: 0.2,
    });

    const response = await Promise.race([aiCall, aiTimeout]);
    const raw = response.choices?.[0]?.message?.content || "{}";

    // Parse JSON with regex fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI summarization response as JSON");
      }
    }

    // Store the summary in extractedFields
    const extractedFields = {
      documentType: parsed.documentType || category,
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      financialFigures: Array.isArray(parsed.financialFigures) ? parsed.financialFigures : [],
      keyDates: Array.isArray(parsed.keyDates) ? parsed.keyDates : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    };

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

    logger.info(`[doc-extraction] Summarization complete for document ${documentId} (${category})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[doc-extraction] Summarization failed for document ${documentId}`, { error: message });
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: "FAILED",
        extractionError: message,
      },
    }).catch((updateErr) => {
      logger.error("[doc-extraction] Failed to update document extraction status", { error: updateErr instanceof Error ? updateErr.message : String(updateErr) });
    });
  }
}
