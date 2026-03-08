/**
 * K-1 filename matching utilities.
 * Extracted from src/app/api/k1/upload/route.ts for testability.
 */

/**
 * Normalize a name for fuzzy matching:
 * replace underscores/hyphens with spaces, trim, lowercase
 */
export function normalizeName(name: string): string {
  return name.replace(/[_-]/g, " ").trim().toLowerCase();
}

/**
 * Extract investor name from filename pattern.
 * e.g. "K1_InvestorName_2025.pdf" → "investorname"
 *      "K1_John_Smith_2025.pdf"   → "john smith"
 */
export function extractInvestorNameFromFilename(filename: string): string | null {
  // Remove extension
  const base = filename.replace(/\.[^.]+$/, "");

  // Pattern: K1_<name>_<year> where year is 4 digits
  const match = base.match(/^[Kk]1?[_-](.+?)[_-](\d{4})$/);
  if (match) {
    return normalizeName(match[1]);
  }

  // Fallback: K1_<name> (no year)
  const matchNoYear = base.match(/^[Kk]1?[_-](.+)$/);
  if (matchNoYear) {
    return normalizeName(matchNoYear[1]);
  }

  return null;
}

/**
 * Fuzzy match: check if investor name contains extracted name or vice versa
 */
export function matchInvestor(
  extractedName: string,
  investors: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const normalizedExtracted = extractedName.toLowerCase();

  for (const investor of investors) {
    const normalizedInvestor = normalizeName(investor.name);

    // Exact match
    if (normalizedInvestor === normalizedExtracted) return investor;

    // Investor name contains extracted name (or vice versa)
    if (
      normalizedInvestor.includes(normalizedExtracted) ||
      normalizedExtracted.includes(normalizedInvestor)
    ) {
      return investor;
    }
  }

  return null;
}
