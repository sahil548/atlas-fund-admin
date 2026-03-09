/**
 * IC Memo PDF template for deal Investment Committee memos.
 * Generates a professional, confidential document for external sharing.
 *
 * Pages:
 *   1. Cover: deal name, recommendation badge, executive summary
 *   2+: Each IC memo section (financial, market, legal, etc.)
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { styles as s, formatDate } from "./shared-styles";

// ── Types ──────────────────────────────────────────────────

export interface ICMemoSection {
  title?: string;
  name?: string;
  content: string;
  riskLevel?: string | null;
}

export interface ICMemoData {
  dealName: string;
  recommendation: string | null;
  executiveSummary: string | null;
  sections: ICMemoSection[];
  generatedAt: string;
  dealLead?: string | null;
  targetSize?: string | null;
  assetClass?: string | null;
  stage?: string | null;
}

// ── Local styles ───────────────────────────────────────────

const local = StyleSheet.create({
  // Cover box
  coverBox: {
    backgroundColor: "#1e3a5f",
    padding: 40,
    borderRadius: 4,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  coverDivider: {
    height: 1,
    backgroundColor: "#3b82f6",
    marginVertical: 12,
  },
  coverSubtitle: {
    fontSize: 11,
    color: "#93c5fd",
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 9,
    color: "#bfdbfe",
    marginTop: 4,
  },
  // Recommendation badge variants
  recApprove: {
    backgroundColor: "#d1fae5",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: "#065f46",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  recDecline: {
    backgroundColor: "#fee2e2",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: "#991b1b",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  recDefer: {
    backgroundColor: "#fef3c7",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: "#92400e",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  recDefault: {
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: "#374151",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  // Section
  sectionContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  sectionContent: {
    padding: 10,
  },
  riskHigh: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#991b1b",
    backgroundColor: "#fee2e2",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  riskMedium: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  riskLow: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
    backgroundColor: "#d1fae5",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  // Deal meta grid
  metaGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metaCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  // Executive summary box
  summaryBox: {
    backgroundColor: "#f8faff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#4338ca",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  disclaimer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
});

// ── Helpers ────────────────────────────────────────────────

function getRecStyle(rec: string | null) {
  if (!rec) return local.recDefault;
  const upper = rec.toUpperCase();
  if (upper.includes("APPROVE") || upper === "GO") return local.recApprove;
  if (upper.includes("DECLINE") || upper === "NO_GO") return local.recDecline;
  if (upper.includes("DEFER") || upper.includes("CONDITION") || upper.includes("MORE")) return local.recDefer;
  return local.recDefault;
}

function getRiskStyle(riskLevel: string | null | undefined) {
  if (!riskLevel) return null;
  if (riskLevel === "HIGH") return local.riskHigh;
  if (riskLevel === "LOW") return local.riskLow;
  return local.riskMedium;
}

function formatRec(rec: string | null): string {
  if (!rec) return "PENDING REVIEW";
  return rec.replace(/_/g, " ");
}

// ── Footer ─────────────────────────────────────────────────

const PageFooter = ({ dealName, generatedAt }: { dealName: string; generatedAt: string }) => (
  <View fixed style={local.footer}>
    <Text style={local.footerText}>{dealName} — Confidential</Text>
    <Text
      style={local.footerText}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
    <Text style={local.footerText}>Generated {formatDate(generatedAt)}</Text>
  </View>
);

// ── Cover Page ─────────────────────────────────────────────

const CoverPage = ({ data }: { data: ICMemoData }) => {
  const recStyle = getRecStyle(data.recommendation);

  return (
    <Page size="A4" style={s.page}>
      {/* Cover box */}
      <View style={local.coverBox}>
        <Text style={local.coverTitle}>{data.dealName}</Text>
        <View style={local.coverDivider} />
        <Text style={local.coverSubtitle}>Investment Committee Memorandum</Text>
        <Text style={local.coverMeta}>Confidential — For IC Use Only</Text>
        <Text style={{ ...local.coverMeta, marginTop: 4 }}>
          Generated: {formatDate(data.generatedAt)}
        </Text>
        {/* Recommendation badge inside cover */}
        <View style={recStyle}>
          <Text>{formatRec(data.recommendation)}</Text>
        </View>
      </View>

      {/* Deal metadata */}
      {(data.dealLead || data.targetSize || data.assetClass || data.stage) && (
        <View style={local.metaGrid}>
          {data.assetClass && (
            <View style={local.metaCard}>
              <Text style={local.metaLabel}>Asset Class</Text>
              <Text style={local.metaValue}>{data.assetClass}</Text>
            </View>
          )}
          {data.targetSize && (
            <View style={local.metaCard}>
              <Text style={local.metaLabel}>Target Size</Text>
              <Text style={local.metaValue}>{data.targetSize}</Text>
            </View>
          )}
          {data.dealLead && (
            <View style={local.metaCard}>
              <Text style={local.metaLabel}>Deal Lead</Text>
              <Text style={local.metaValue}>{data.dealLead}</Text>
            </View>
          )}
          {data.stage && (
            <View style={local.metaCard}>
              <Text style={local.metaLabel}>Stage</Text>
              <Text style={local.metaValue}>{data.stage}</Text>
            </View>
          )}
        </View>
      )}

      {/* Executive Summary */}
      {data.executiveSummary && (
        <View style={local.summaryBox}>
          <Text style={local.summaryLabel}>Executive Summary</Text>
          <Text style={local.summaryText}>{data.executiveSummary}</Text>
        </View>
      )}

      {/* Section index preview */}
      {data.sections.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ ...s.h2, fontSize: 11 }}>Sections Covered</Text>
          <View style={{ marginTop: 6 }}>
            {data.sections.map((section, idx) => {
              const title = section.title || section.name || `Section ${idx + 1}`;
              return (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: "#6b7280", width: 18 }}>{idx + 1}.</Text>
                  <Text style={{ fontSize: 8.5, color: "#374151" }}>{title}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <PageFooter dealName={data.dealName} generatedAt={data.generatedAt} />
    </Page>
  );
};

// ── Sections Page(s) ──────────────────────────────────────

const SectionsPage = ({ data }: { data: ICMemoData }) => (
  <Page size="A4" style={s.page}>
    <View style={{ marginBottom: 16, borderBottomWidth: 2, borderBottomColor: "#1e3a5f", paddingBottom: 8 }}>
      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a5f" }}>
        {data.dealName}
      </Text>
      <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 1 }}>
        IC Memorandum — Analysis Sections
      </Text>
    </View>

    {data.sections.map((section, idx) => {
      const title = section.title || section.name || `Section ${idx + 1}`;
      const riskStyle = getRiskStyle(section.riskLevel);

      return (
        <View key={idx} style={local.sectionContainer} wrap={false}>
          <View style={local.sectionHeader}>
            <Text style={local.sectionTitle}>{title}</Text>
            {riskStyle && section.riskLevel && (
              <Text style={riskStyle}>{section.riskLevel} RISK</Text>
            )}
          </View>
          <View style={local.sectionContent}>
            <Text style={s.body}>{section.content || "No content provided."}</Text>
          </View>
        </View>
      );
    })}

    {/* Legal disclaimer */}
    <View style={local.disclaimer}>
      <Text style={local.disclaimerText}>
        This Investment Committee Memorandum is strictly confidential and has been prepared solely for the
        use of the Investment Committee. It may not be reproduced, distributed, or shared with any third
        party without prior written consent. The information herein is based on sources believed to be
        reliable but is not guaranteed. This document does not constitute an offer to buy or sell any security.
        Past performance is not indicative of future results.
      </Text>
    </View>

    <PageFooter dealName={data.dealName} generatedAt={data.generatedAt} />
  </Page>
);

// ── Main Export ───────────────────────────────────────────

export function ICMemoPDF({ data }: { data: ICMemoData }) {
  return (
    <Document
      title={`IC Memo — ${data.dealName}`}
      author="Fund Administration Platform"
      subject="Investment Committee Memorandum"
      keywords="ic memo investment committee confidential"
      creator="Atlas Fund Administration"
    >
      <CoverPage data={data} />
      {data.sections.length > 0 && <SectionsPage data={data} />}
    </Document>
  );
}
