/**
 * Fund Summary One-Pager PDF template.
 * White-label: entity name only, no Atlas branding.
 * One-pager: entity name, fund size, deployment %, NAV, IRR/TVPI/DPI, top 5 holdings, recent activity.
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

export interface FundSummaryData {
  entityName: string;
  generatedAt: string;
  overview: {
    fundSize: number; // total committed
    deploymentPercent: number; // decimal, e.g. 0.72
    nav: number;
    irr: number | null; // decimal
    tvpi: number | null;
    dpi: number | null;
  };
  topHoldings: Array<{
    assetName: string;
    costBasis: number;
    fairValue: number;
    irr: number | null; // decimal
  }>;
  recentActivity: Array<{
    date: string;
    type: string;
    description: string;
    amount: number;
  }>;
}

// ── Helpers ───────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  CAPITAL_CALL: "Capital Call",
  DISTRIBUTION: "Distribution",
  FEE: "Fee",
  TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
};

const StatBox = ({
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

// ── Main Export ───────────────────────────────────────────

export function FundSummaryReport({ data }: { data: FundSummaryData }) {
  const {
    entityName,
    generatedAt,
    overview: ov,
    topHoldings: th,
    recentActivity: ra,
  } = data;

  const deployPct = Math.min(100, ov.deploymentPercent * 100);
  const dryPowder = ov.fundSize * (1 - Math.min(1, ov.deploymentPercent));

  return (
    <Document
      title={`${entityName} — Fund Summary`}
      author={entityName}
      subject="Fund Summary One-Pager"
      keywords="fund summary performance holdings"
      creator="Fund Administration Platform"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.coverBox}>
          <Text style={s.coverTitle}>{entityName}</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverSubtitle}>Fund Summary</Text>
          <Text style={s.coverMeta}>
            Confidential | Generated: {formatDate(generatedAt)}
          </Text>
        </View>

        {/* Key Metrics */}
        <Text style={s.h2}>Fund Overview</Text>
        <View style={s.statGrid}>
          <StatBox
            label="Fund Size"
            value={formatCurrency(ov.fundSize)}
            sub="Total committed"
          />
          <StatBox
            label="NAV"
            value={formatCurrency(ov.nav)}
            sub="Net asset value"
          />
          <StatBox
            label="Deployment"
            value={`${deployPct.toFixed(1)}%`}
            sub={`${formatCurrency(dryPowder)} dry powder`}
          />
        </View>

        <View style={s.statGrid}>
          <StatBox
            label="IRR (Net)"
            value={ov.irr != null ? formatPercent(ov.irr) : "—"}
            sub="Since inception"
          />
          <StatBox
            label="TVPI"
            value={formatMultiple(ov.tvpi)}
            sub="Total value / paid-in"
          />
          <StatBox
            label="DPI"
            value={formatMultiple(ov.dpi)}
            sub="Distributions / paid-in"
          />
        </View>

        {/* Deployment bar */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ ...s.caption, marginBottom: 4 }}>
            Capital Deployment: {deployPct.toFixed(1)}% ({formatCurrency(ov.fundSize * Math.min(1, ov.deploymentPercent))} deployed)
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: "#e5e7eb",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${deployPct}%`,
                backgroundColor: "#1e3a5f",
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        {/* Top Holdings */}
        <Text style={s.h2}>Top Holdings</Text>
        {th.length === 0 ? (
          <Text style={{ ...s.body, color: "#9ca3af", marginBottom: 16 }}>
            No assets on record.
          </Text>
        ) : (
          <View style={{ ...s.table, marginBottom: 16 }}>
            <View style={s.tableHeader}>
              <Text style={{ ...s.tableHeaderCell, flex: 2.5 }}>Asset</Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: "right" }}>
                Cost Basis
              </Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: "right" }}>
                Fair Value
              </Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                IRR
              </Text>
              <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: "right" }}>
                G/L
              </Text>
            </View>
            {th.slice(0, 5).map((holding, i) => {
              const gl = holding.fairValue - holding.costBasis;
              return (
                <View
                  key={holding.assetName}
                  style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
                >
                  <Text style={{ ...s.tableCell, flex: 2.5 }}>
                    {holding.assetName}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 1.5 }}>
                    {formatCurrency(holding.costBasis)}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 1.5 }}>
                    {formatCurrency(holding.fairValue)}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 1 }}>
                    {holding.irr != null ? formatPercent(holding.irr) : "—"}
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
          </View>
        )}

        {/* Recent Activity */}
        <Text style={s.h2}>Recent Activity</Text>
        {ra.length === 0 ? (
          <Text style={{ ...s.body, color: "#9ca3af" }}>No recent activity.</Text>
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
            {ra.slice(0, 5).map((activity, i) => (
              <View
                key={`${activity.date}-${i}`}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={{ ...s.tableCell, flex: 1.2 }}>
                  {formatDate(activity.date)}
                </Text>
                <Text style={{ ...s.tableCell, flex: 1.5 }}>
                  {TYPE_LABELS[activity.type] || activity.type}
                </Text>
                <Text style={{ ...s.tableCell, flex: 3, color: "#6b7280" }}>
                  {activity.description}
                </Text>
                <Text
                  style={{
                    ...s.tableCellRight,
                    flex: 1.2,
                    color: activity.amount < 0 ? "#991b1b" : "#065f46",
                  }}
                >
                  {formatCurrency(activity.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View
          style={{
            marginTop: 20,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            paddingTop: 8,
          }}
        >
          <Text style={{ fontSize: 7, color: "#9ca3af" }}>
            This document is confidential and prepared solely for authorized recipients.
            Performance figures are unaudited. Past performance is not indicative of future results.
          </Text>
        </View>

        {/* Page footer */}
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
          <Text style={{ fontSize: 7, color: "#9ca3af" }}>
            Generated {formatDate(generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
