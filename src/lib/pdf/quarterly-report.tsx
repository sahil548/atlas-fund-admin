/**
 * Quarterly Report PDF template (4-6 pages).
 * White-label: entity name only, no Atlas branding.
 *
 * Pages:
 *   1. Cover + Financial Summary
 *   2. Capital Account Statement (per-investor)
 *   3. Portfolio Allocation
 *   4. Transaction Ledger
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
  formatPercent,
  formatMultiple,
  formatDate,
} from "./shared-styles";

// ── Types ─────────────────────────────────────────────────

export interface QuarterlyReportData {
  entityName: string;
  period: string; // e.g. "Q4 2025"
  generatedAt: string;
  financialSummary: {
    nav: number;
    irr: number | null; // decimal, e.g. 0.152
    tvpi: number | null;
    dpi: number | null;
    rvpi: number | null;
    totalCommitted: number;
    totalCalled: number;
    totalDistributed: number;
  };
  capitalAccountStatement: Array<{
    investorName: string;
    commitment: number;
    called: number;
    distributed: number;
    nav: number;
    irr: number | null; // decimal
  }>;
  portfolioAllocation: Array<{
    assetName: string;
    costBasis: number;
    fairValue: number;
    weight: number; // decimal, e.g. 0.35
  }>;
  transactionLedger: Array<{
    date: string;
    type: string;
    description: string;
    amount: number;
  }>;
}

// ── Sub-components ─────────────────────────────────────────

const PageHeader = ({
  entityName,
  period,
  title,
}: {
  entityName: string;
  period: string;
  title: string;
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
        {title}
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

const StatCard = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <View style={s.statCard}>
    <Text style={s.label}>{label}</Text>
    <Text style={s.value}>{value}</Text>
    {sub && <Text style={{ ...s.caption, marginTop: 2 }}>{sub}</Text>}
  </View>
);

// ── Cover + Financial Summary (Page 1) ─────────────────────

const CoverPage = ({
  data,
}: {
  data: QuarterlyReportData;
}) => {
  const { entityName, period, generatedAt, financialSummary: fs } = data;
  const deploymentPct =
    fs.totalCommitted > 0
      ? Math.min(100, (fs.totalCalled / fs.totalCommitted) * 100)
      : 0;

  return (
    <Page size="A4" style={s.page}>
      {/* Cover box */}
      <View style={s.coverBox}>
        <Text style={s.coverTitle}>{entityName}</Text>
        <View style={s.coverDivider} />
        <Text style={s.coverSubtitle}>Quarterly Report — {period}</Text>
        <Text style={s.coverMeta}>
          Prepared for investors of record | Confidential
        </Text>
        <Text style={{ ...s.coverMeta, marginTop: 4 }}>
          Generated: {formatDate(generatedAt)}
        </Text>
      </View>

      {/* Financial Summary */}
      <Text style={s.h2}>Financial Summary</Text>

      {/* Top metrics row */}
      <View style={s.statGrid}>
        <StatCard
          label="Net Asset Value"
          value={formatCurrency(fs.nav)}
          sub="Current period"
        />
        <StatCard
          label="IRR (Net)"
          value={fs.irr != null ? formatPercent(fs.irr) : "—"}
          sub="Since inception"
        />
        <StatCard
          label="TVPI"
          value={formatMultiple(fs.tvpi)}
          sub="Total value / paid-in"
        />
      </View>

      <View style={s.statGrid}>
        <StatCard
          label="DPI"
          value={formatMultiple(fs.dpi)}
          sub="Distributions / paid-in"
        />
        <StatCard
          label="RVPI"
          value={formatMultiple(fs.rvpi)}
          sub="Residual value / paid-in"
        />
        <StatCard
          label="Deployment"
          value={`${deploymentPct.toFixed(1)}%`}
          sub={`${formatCurrency(fs.totalCalled)} called of ${formatCurrency(fs.totalCommitted)}`}
        />
      </View>

      {/* Capital Activity */}
      <Text style={s.h2}>Capital Activity</Text>
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Metric</Text>
          <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
            Amount
          </Text>
        </View>
        {[
          { label: "Total Committed Capital", value: fs.totalCommitted },
          { label: "Total Capital Called", value: fs.totalCalled },
          { label: "Total Distributions Paid", value: fs.totalDistributed },
          { label: "Unfunded Commitment", value: fs.totalCommitted - fs.totalCalled },
        ].map((row, i) => (
          <View key={row.label} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={{ ...s.tableCell, flex: 2 }}>{row.label}</Text>
            <Text style={{ ...s.tableCellRight, flex: 1 }}>
              {formatCurrency(row.value)}
            </Text>
          </View>
        ))}
      </View>

      <PageFooter entityName={entityName} generatedAt={generatedAt} />
    </Page>
  );
};

// ── Capital Account Statement (Page 2) ────────────────────

const CapitalAccountPage = ({
  data,
}: {
  data: QuarterlyReportData;
}) => {
  const { entityName, period, generatedAt, capitalAccountStatement: cas } = data;

  const totals = cas.reduce(
    (acc, inv) => ({
      commitment: acc.commitment + inv.commitment,
      called: acc.called + inv.called,
      distributed: acc.distributed + inv.distributed,
      nav: acc.nav + inv.nav,
    }),
    { commitment: 0, called: 0, distributed: 0, nav: 0 }
  );

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        entityName={entityName}
        period={period}
        title="Capital Account Statement"
      />

      <Text style={s.h2}>Investor Capital Accounts — {period}</Text>

      {cas.length === 0 ? (
        <Text style={{ ...s.body, color: "#9ca3af" }}>
          No investor commitments on record.
        </Text>
      ) : (
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Investor</Text>
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
              NAV
            </Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
              IRR
            </Text>
          </View>

          {cas.map((inv, i) => (
            <View
              key={inv.investorName}
              style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
            >
              <Text style={{ ...s.tableCell, flex: 2 }}>{inv.investorName}</Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {formatCurrency(inv.commitment)}
              </Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {formatCurrency(inv.called)}
              </Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {formatCurrency(inv.distributed)}
              </Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {formatCurrency(inv.nav)}
              </Text>
              <Text style={{ ...s.tableCellRight, flex: 1 }}>
                {inv.irr != null ? formatPercent(inv.irr) : "—"}
              </Text>
            </View>
          ))}

          {/* Totals row */}
          <View style={s.tableFooter}>
            <Text style={{ ...s.tableCellBold, flex: 2 }}>Total</Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(totals.commitment)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(totals.called)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(totals.distributed)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(totals.nav)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>—</Text>
          </View>
        </View>
      )}

      <PageFooter entityName={entityName} generatedAt={generatedAt} />
    </Page>
  );
};

// ── Portfolio Allocation (Page 3) ─────────────────────────

const PortfolioPage = ({
  data,
}: {
  data: QuarterlyReportData;
}) => {
  const { entityName, period, generatedAt, portfolioAllocation: pa } = data;

  const totals = pa.reduce(
    (acc, a) => ({
      costBasis: acc.costBasis + a.costBasis,
      fairValue: acc.fairValue + a.fairValue,
    }),
    { costBasis: 0, fairValue: 0 }
  );

  const sorted = [...pa].sort((a, b) => b.fairValue - a.fairValue);

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        entityName={entityName}
        period={period}
        title="Portfolio Allocation"
      />

      <Text style={s.h2}>Portfolio Holdings — {period}</Text>
      <Text style={{ ...s.caption, marginBottom: 10 }}>
        Fair value as of period end. Allocations reflect entity ownership percentages.
      </Text>

      {pa.length === 0 ? (
        <Text style={{ ...s.body, color: "#9ca3af" }}>No assets on record.</Text>
      ) : (
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={{ ...s.tableHeaderCell, flex: 3 }}>Asset</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: "right" }}>
              Cost Basis
            </Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: "right" }}>
              Fair Value
            </Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
              Weight
            </Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
              Unrealized G/L
            </Text>
          </View>

          {sorted.map((asset, i) => {
            const gl = asset.fairValue - asset.costBasis;
            return (
              <View
                key={asset.assetName}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={{ ...s.tableCell, flex: 3 }}>{asset.assetName}</Text>
                <Text style={{ ...s.tableCellRight, flex: 1.5 }}>
                  {formatCurrency(asset.costBasis)}
                </Text>
                <Text style={{ ...s.tableCellRight, flex: 1.5 }}>
                  {formatCurrency(asset.fairValue)}
                </Text>
                <Text style={{ ...s.tableCellRight, flex: 1 }}>
                  {formatPercent(asset.weight, 1)}
                </Text>
                <Text
                  style={{
                    ...s.tableCellRight,
                    flex: 1,
                    color: gl >= 0 ? "#065f46" : "#991b1b",
                  }}
                >
                  {formatCurrency(gl)}
                </Text>
              </View>
            );
          })}

          <View style={s.tableFooter}>
            <Text style={{ ...s.tableCellBold, flex: 3 }}>Total</Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1.5 }}>
              {formatCurrency(totals.costBasis)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1.5 }}>
              {formatCurrency(totals.fairValue)}
            </Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>100.0%</Text>
            <Text style={{ ...s.tableCellRightBold, flex: 1 }}>
              {formatCurrency(totals.fairValue - totals.costBasis)}
            </Text>
          </View>
        </View>
      )}

      <PageFooter entityName={entityName} generatedAt={generatedAt} />
    </Page>
  );
};

// ── Transaction Ledger (Page 4) ───────────────────────────

const TransactionPage = ({
  data,
}: {
  data: QuarterlyReportData;
}) => {
  const { entityName, period, generatedAt, transactionLedger: tl } = data;

  const TYPE_LABELS: Record<string, string> = {
    CAPITAL_CALL: "Capital Call",
    DISTRIBUTION: "Distribution",
    FEE: "Fee",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment",
  };

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        entityName={entityName}
        period={period}
        title="Transaction Ledger"
      />

      <Text style={s.h2}>Transaction History — {period}</Text>

      {tl.length === 0 ? (
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
          </View>

          {tl.map((tx, i) => (
            <View
              key={`${tx.date}-${i}`}
              style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
            >
              <Text style={{ ...s.tableCell, flex: 1.2 }}>
                {formatDate(tx.date)}
              </Text>
              <Text style={{ ...s.tableCell, flex: 1.5 }}>
                {TYPE_LABELS[tx.type] || tx.type}
              </Text>
              <Text style={{ ...s.tableCell, flex: 3, color: "#6b7280" }}>
                {tx.description}
              </Text>
              <Text
                style={{
                  ...s.tableCellRight,
                  flex: 1.2,
                  color: tx.amount < 0 ? "#991b1b" : "#065f46",
                }}
              >
                {formatCurrency(tx.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 }}>
        <Text style={{ ...s.caption, color: "#9ca3af" }}>
          This document is confidential and prepared solely for the named recipient(s).
          Performance figures are unaudited. Past performance is not indicative of future results.
          This is not an offer to sell or a solicitation of an offer to buy any security.
        </Text>
      </View>

      <PageFooter entityName={entityName} generatedAt={generatedAt} />
    </Page>
  );
};

// ── Main Export ───────────────────────────────────────────

export function QuarterlyReport({ data }: { data: QuarterlyReportData }) {
  return (
    <Document
      title={`${data.entityName} — Quarterly Report ${data.period}`}
      author={data.entityName}
      subject={`Quarterly Report ${data.period}`}
      keywords="quarterly report fund performance"
      creator="Fund Administration Platform"
    >
      <CoverPage data={data} />
      <CapitalAccountPage data={data} />
      <PortfolioPage data={data} />
      <TransactionPage data={data} />
    </Document>
  );
}
