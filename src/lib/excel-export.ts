import * as XLSX from "xlsx";

/**
 * Core export function: converts a data array to an XLSX workbook and triggers browser download.
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string,
): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const ensuredFileName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, ensuredFileName);
}

/**
 * Convenience wrapper that uses "Data" as the default sheet name and ensures .xlsx extension.
 */
export function downloadExcel(
  data: Record<string, unknown>[],
  fileName: string,
): void {
  exportToExcel(data, "Data", fileName);
}
