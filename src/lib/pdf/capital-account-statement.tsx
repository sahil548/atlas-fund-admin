/**
 * Capital Account Statement PDF template.
 * White-label: entity name only, no Atlas branding.
 * Matches LP portal capital account view:
 *   - Period summary at top
 *   - Running ledger table
 *   - Per-entity breakdown
 */

import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  styles as s,
  formatCurrency,
  formatDate,
} from "./shared-styles";

// ── Types ─────────────────────────────────────────────────

export interface CapitalAccountStatementData {
  entityName: string;
  investorName?: string; // omit for "all investors" version
  period: string; // e.g. "2025" or "Q4 2025"
  generatedAt: string;
  periodSummary: {
    openingBalance: number;
    contributions: number;
    distributions: number;
    fees: number;
    closingBalance: number;
  };
  ledgerEntries: Array<{
    date: string;
    type: string; // CONTRIBUTION | DISTRIBUTION | FEE | ADJUSTMENT
    description: string;
    amount: number;
    balance: number;
  }>;
  perEntityBreakdown: Array<{
    entityName: string;
    commitment: number;
    called: number;
    distributed: number;
    balance: number;
  }>;
}

// ── Sub-components ─────────────────────────────────────────

const PageHeader = ({
  entityName,
  investorName,
  period,
}: {
  entityName: string;
  investorName?: string;
  period: string;
}) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: "#1e3a5f",
      paddingBottom: 8,
    }}
  >
    <View>
      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a5f" }}>
        {entityName}
      </Text>
      <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 1 }}>
        Capital Account Statement
        {investorName ? ` — ${investorName}` : ""}
      </Text>
    </View>
    <Text style={{ fontSize: 8, color: "#6b7280" }}>{period}</Text>
  </View>
);

const PageFooter = ({
  entityName,
  generatedAt,
}: {
  entityName: string;
  generatedAt: string;
}) => (
  <View
    fixed
    style={{
      position: "absolute",
      bottom: 24,
      left: 48,
      right: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
      paddingTop: 6,
    }}
  >
    <Text style={{ fontSize: 7, color: "#9ca3af" }}>
      {entityName} — Confidential
    </Text>
    <Text
      style={{ fontSize: 7, color: "#9ca3af" }}
      render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber} of ${totalPages}`
      }
    />
    <Text style={{ fontSize: 7, color: "#9ca3af" }}>
      Generated {formatDate(generatedAt)}
    </Text>
  </View>
);

const TYPE_COLORS: Record<string, string> = {
  CONTRIBUTION: "#065f46",
  DISTRIBUTION: "#1d4ed8",
  FEE: "#92400e",
  ADJUSTMENT: "#374151",
};

const TYPE_LABELS: Record<string, string> = {
  CONTRIBUTION: "Contribution",
  DISTRIBUTION: "Distribution",
  FEE: "Fee",
  ADJUSTMENT: "Adjustment",
};

// ── Main Export ───────────────────────────────────────────

export function CapitalAccountStatement({
  data,
}: {
  data: CapitalAccountStatementData;
}) {
  const {
    entityName,
    investorName,
    period,
    generatedAt,
    periodSummary: ps,
    ledgerEntries: le,
    perEntityBreakdown: peb,
  } = data;

  return (
    <Document
      title={`${entityName} — Capital Account Statement ${period}`}
      author={entityName}
      subject={`Capital Account Statement ${period}`}
      keywords="capital account statement fund"
      creator="Fund Administration Platform"
    >
      <Page size="A4" style={s.page}>
        {/* Cover header */}
        <View style={s.coverBox}>
          <Text style={s.coverTitle}>{entityName}</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverSubtitle}>
            Capital Account Statement — {period}
            {investorName ? ` | ${investorName}` : ""}
          </Text>
          <Text style={s.coverMeta}>
            Confidential | For Authorized Recipients Only
          </Text>
          <Text style={{ ...s.coverMeta, marginTop: 4 }}>
            Generated: {formatDate(generatedAt)}
          </Text>
        </View>

        {/* Period Summary */}
        <Text style={s.h2}>Period Summary</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={{ ...s.tableHeaderCell, flex: 3 }}>Description</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
              Amount
            </Text>
          </View>
          {[
            { label: "Opening Balance", value: ps.openingBalance, bold: false },
            { label: "Contributions (Capital Called)", value: ps.contributions, bold: false },
            { label: "Distributions (Capital Returned)", value: ps.distributions, bold: false },
            { label: "Fees & Expenses", value: ps.fees, bold: false },
          ].map((row, i) => (
            <View key={row.label} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={{ ...s.tableCell, flex: 3 }}>{row.label}</Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {formatCurrency(row.value)}
              </Text>
            </View>
          ))}
          <View style={s.tableFooter}>
            <Text style={{ ...s.tableCellBold, flex: 3 }}>Closing Balance (NAV)</Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(ps.closingBalance)}
            </Text>
          </View>
        </View>

        <PageFooter entityName={entityName} generatedAt={generatedAt} />
      </Page>

      {/* Ledger Page */}
      <Page size="A4" style={s.page}>
        <PageHeader
          entityName={entityName}
          investorName={investorName}
          period={period}
        />

        <Text style={s.h2}>Transaction Ledger</Text>

        {le.length === 0 ? (
          <Text style={{ ...s.body, color: "#9ca3af" }}>
            No transactions recorded for this period.
          </Text>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={{ ...s.tableHeaderCell, flex: 1.2 }}>Date</Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1.5 }}>Type</Text>
              <Text style={{ ...s.tableHeaderCell, flex: 3 }}>Description</Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1.2, textAlign: "right" }}>
                Amount
              </Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1.2, textAlign: "right" }}>
                Balance
              </Text>
            </View>

            {le.map((entry, i) => (
              <View
                key={`${entry.date}-${i}`}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={{ ...s.tableCell, flex: 1.2 }}>
                  {formatDate(entry.date)}
                </Text>
                <Text
                  style={{
                    ...s.tableCell,
                    flex: 1.5,
                    color: TYPE_COLORS[entry.type] || "#374151",
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {TYPE_LABELS[entry.type] || entry.type}
                </Text>
                <Text style={{ ...s.tableCell, flex: 3, color: "#6b7280" }}>
                  {entry.description}
                </Text>
                <Text
                  style={{
                    ...s.tableCellRight,
                    flex: 1.2,
                    color: entry.amount < 0 ? "#991b1b" : "#065f46",
                  }}
                >
                  {formatCurrency(entry.amount)}
                </Text>
                <Text style={{ ...s.tableCellRightBold, flex: 1.2 }}>
                  {formatCurrency(entry.balance)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Per-entity breakdown */}
        {peb.length > 0 && (
          <>
            <Text style={{ ...s.h2, marginTop: 20 }}>Per-Entity Breakdown</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Entity</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                  Commitment
                </Text>
                <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                  Called
                </Text>
                <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                  Distributed
                </Text>
                <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                  Balance
                </Text>
              </View>
              {peb.map((eb, i) => (
                <View
                  key={eb.entityName}
                  style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
                >
                  <Text style={{ ...s.tableCell, flex: 2 }}>{eb.entityName}</Text>
                  <Text style={{ ...s.tableCellRight, flex: 1 }}>
                    {formatCurrency(eb.commitment)}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 1 }}>
                    {formatCurrency(eb.called)}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 1 }}>
                    {formatCurrency(eb.distributed)}
                  </Text>
                  <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
                    {formatCurrency(eb.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 }}>
          <Text style={{ fontSize: 7, color: "#9ca3af" }}>
            This document is confidential and prepared solely for the named recipient(s).
            Figures are unaudited and subject to change. This is not a tax document.
            Consult your tax advisor for K-1 and Schedule reporting.
          </Text>
        </View>

        <PageFooter entityName={entityName} generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}
