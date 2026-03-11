/**
 * Shared styles and utility components for React-PDF report templates.
 * White-label design: entity name only, no Atlas branding.
 */

import { StyleSheet } from "@react-pdf/renderer";

// ── Style Definitions ──────────────────────────────────────

export const styles = StyleSheet.create({
  // Layout
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 48,
    backgroundColor: "#ffffff",
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },

  // Typography
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  h2: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  h3: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 6,
  },
  body: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 7.5,
    color: "#6b7280",
  },
  label: {
    fontSize: 7.5,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 2,
  },
  valueSmall: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 8.5,
    color: "#374151",
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  tableCellRight: {
    fontSize: 8.5,
    color: "#374151",
    textAlign: "right",
  },
  tableCellRightBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    textAlign: "right",
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },

  // Stat card
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  statCardAccent: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f8fafc",
  },

  // Cover page
  coverBox: {
    backgroundColor: "#1e3a5f",
    padding: 40,
    borderRadius: 4,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 13,
    color: "#93c5fd",
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 9,
    color: "#bfdbfe",
    marginTop: 12,
  },
  coverDivider: {
    height: 1,
    backgroundColor: "#3b82f6",
    marginVertical: 12,
  },

  // Badges
  badgeBlue: {
    backgroundColor: "#dbeafe",
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
    color: "#1d4ed8",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  badgeGreen: {
    backgroundColor: "#d1fae5",
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
    color: "#065f46",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  thinDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 6,
  },
});

// ── Formatting Helpers ─────────────────────────────────────

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatMultiple(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}x`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateShort(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
