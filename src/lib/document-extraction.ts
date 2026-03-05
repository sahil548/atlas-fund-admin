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
      // pdf-parse has no default export in some builds — handle both
      const mod = await import("pdf-parse");
      const pdfParse = typeof mod === "function" ? mod : mod.default;
      const data = await pdfParse(buffer);
      return (data.text || "").slice(0, MAX_EXTRACTED_CHARS);
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
