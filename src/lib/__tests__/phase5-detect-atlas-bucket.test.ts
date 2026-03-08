import { describe, it, expect } from "vitest";
import {
  detectAtlasBucket,
  type ChartOfAccountsEntry,
} from "@/lib/accounting/provider-types";

/**
 * Phase 5 — ACCT-02, ACCT-03, ASSET-03
 * Requirement: detectAtlasBucket auto-classifies provider accounts into 5 Atlas
 * balance-sheet buckets (CASH, INVESTMENTS_AT_COST, OTHER_ASSETS, LIABILITIES,
 * EQUITY_PARTNERS_CAPITAL) and returns null for income-statement accounts.
 */

function makeEntry(overrides: Partial<ChartOfAccountsEntry>): ChartOfAccountsEntry {
  return {
    accountId: "1",
    accountName: "Default Account",
    accountType: "Other",
    currentBalance: 0,
    classification: "Asset",
    isActive: true,
    ...overrides,
  };
}

// ── CASH bucket ────────────────────────────────────────────────

describe("detectAtlasBucket — CASH classification", () => {
  it("classifies accountType 'Bank' as CASH", () => {
    const entry = makeEntry({ accountType: "Bank", classification: "Asset" });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("classifies accountType 'bank' (lowercase) as CASH", () => {
    const entry = makeEntry({ accountType: "bank", classification: "Asset" });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("classifies subType containing 'cash' as CASH", () => {
    const entry = makeEntry({
      accountType: "Other Current Asset",
      accountSubType: "CashOnHand",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("classifies subType containing 'checking' as CASH", () => {
    const entry = makeEntry({
      accountType: "Other Current Asset",
      accountSubType: "Checking",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("classifies subType containing 'savings' as CASH", () => {
    const entry = makeEntry({
      accountType: "Other Current Asset",
      accountSubType: "Savings",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("classifies subType containing 'money market' as CASH", () => {
    const entry = makeEntry({
      accountType: "Other Current Asset",
      accountSubType: "Money Market",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });
});

// ── INVESTMENTS_AT_COST bucket ─────────────────────────────────

describe("detectAtlasBucket — INVESTMENTS_AT_COST classification", () => {
  it("classifies account name containing 'investment' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Long-Term Investments",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("classifies account name containing 'portfolio' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Portfolio Holdings",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("classifies subType containing 'investment' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Securities",
      accountType: "Other Asset",
      accountSubType: "Investments - Other",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("classifies asset account with name containing 'equity' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Equity in Subsidiaries",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("classifies asset account with name containing 'loan' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Loan to ABC Fund",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("classifies asset account with name containing 'note receivable' as INVESTMENTS_AT_COST", () => {
    const entry = makeEntry({
      accountName: "Note Receivable - Fund II",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });
});

// ── LIABILITIES bucket ─────────────────────────────────────────

describe("detectAtlasBucket — LIABILITIES classification", () => {
  it("classifies classification 'Liability' as LIABILITIES", () => {
    const entry = makeEntry({
      accountName: "Accounts Payable",
      accountType: "Accounts Payable",
      classification: "Liability",
    });
    expect(detectAtlasBucket(entry)).toBe("LIABILITIES");
  });

  it("classifies classification 'liability' (lowercase) as LIABILITIES", () => {
    const entry = makeEntry({
      accountName: "Accrued Expenses",
      accountType: "Other Current Liability",
      classification: "liability",
    });
    expect(detectAtlasBucket(entry)).toBe("LIABILITIES");
  });

  it("classifies long-term liabilities as LIABILITIES", () => {
    const entry = makeEntry({
      accountName: "Long Term Debt",
      accountType: "Long Term Liability",
      classification: "Liability",
    });
    expect(detectAtlasBucket(entry)).toBe("LIABILITIES");
  });
});

// ── EQUITY_PARTNERS_CAPITAL bucket ─────────────────────────────

describe("detectAtlasBucket — EQUITY_PARTNERS_CAPITAL classification", () => {
  it("classifies classification 'Equity' as EQUITY_PARTNERS_CAPITAL", () => {
    const entry = makeEntry({
      accountName: "Retained Earnings",
      accountType: "Equity",
      classification: "Equity",
    });
    expect(detectAtlasBucket(entry)).toBe("EQUITY_PARTNERS_CAPITAL");
  });

  it("classifies accountType containing 'equity' as EQUITY_PARTNERS_CAPITAL", () => {
    const entry = makeEntry({
      accountName: "Share Capital",
      accountType: "Owner Equity",
      classification: "Equity",
    });
    expect(detectAtlasBucket(entry)).toBe("EQUITY_PARTNERS_CAPITAL");
  });

  it("classifies account name containing 'partner' as EQUITY_PARTNERS_CAPITAL", () => {
    const entry = makeEntry({
      accountName: "Partners Capital Account",
      accountType: "Other",
      classification: "Other",
    });
    expect(detectAtlasBucket(entry)).toBe("EQUITY_PARTNERS_CAPITAL");
  });

  it("classifies account name containing 'capital' as EQUITY_PARTNERS_CAPITAL", () => {
    const entry = makeEntry({
      accountName: "Capital Contributions",
      accountType: "Other",
      classification: "Other",
    });
    expect(detectAtlasBucket(entry)).toBe("EQUITY_PARTNERS_CAPITAL");
  });
});

// ── OTHER_ASSETS bucket (catch-all) ────────────────────────────

describe("detectAtlasBucket — OTHER_ASSETS classification (catch-all for assets)", () => {
  it("classifies generic asset account as OTHER_ASSETS", () => {
    const entry = makeEntry({
      accountName: "Prepaid Expenses",
      accountType: "Other Current Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("OTHER_ASSETS");
  });

  it("classifies accounts receivable as OTHER_ASSETS", () => {
    const entry = makeEntry({
      accountName: "Accounts Receivable",
      accountType: "Accounts Receivable",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("OTHER_ASSETS");
  });

  it("classifies fixed assets as OTHER_ASSETS", () => {
    const entry = makeEntry({
      accountName: "Office Equipment",
      accountType: "Fixed Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("OTHER_ASSETS");
  });
});

// ── null return for Revenue/Expense ────────────────────────────

describe("detectAtlasBucket — returns null for income statement accounts", () => {
  it("returns null for Revenue classification", () => {
    const entry = makeEntry({
      accountName: "Service Revenue",
      accountType: "Income",
      classification: "Revenue",
    });
    expect(detectAtlasBucket(entry)).toBeNull();
  });

  it("returns null for Expense classification", () => {
    const entry = makeEntry({
      accountName: "Office Supplies",
      accountType: "Expense",
      classification: "Expense",
    });
    expect(detectAtlasBucket(entry)).toBeNull();
  });

  it("returns null for Cost of Goods Sold (Expense variant)", () => {
    const entry = makeEntry({
      accountName: "Cost of Goods Sold",
      accountType: "Cost of Goods Sold",
      classification: "Expense",
    });
    expect(detectAtlasBucket(entry)).toBeNull();
  });
});

// ── Priority / edge cases ──────────────────────────────────────

describe("detectAtlasBucket — priority and edge cases", () => {
  it("CASH beats INVESTMENTS_AT_COST when subType has 'cash'", () => {
    // Even if name has 'investment', subType 'cash' wins because CASH check is first
    const entry = makeEntry({
      accountName: "Investment Cash Account",
      accountType: "Other Current Asset",
      accountSubType: "Cash and cash equivalents",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("CASH");
  });

  it("handles missing accountSubType gracefully", () => {
    const entry = makeEntry({
      accountName: "Regular Asset",
      accountType: "Other Asset",
      classification: "Asset",
      accountSubType: undefined,
    });
    expect(detectAtlasBucket(entry)).toBe("OTHER_ASSETS");
  });

  it("INVESTMENTS_AT_COST beats OTHER_ASSETS for asset with 'loan' in name", () => {
    const entry = makeEntry({
      accountName: "Loan to Fund III",
      accountType: "Other Asset",
      classification: "Asset",
    });
    expect(detectAtlasBucket(entry)).toBe("INVESTMENTS_AT_COST");
  });

  it("LIABILITIES beats EQUITY_PARTNERS_CAPITAL when classification is liability", () => {
    // Even if name has 'partner', classification 'Liability' is checked first
    const entry = makeEntry({
      accountName: "Partner Distribution Payable",
      accountType: "Other Current Liability",
      classification: "Liability",
    });
    expect(detectAtlasBucket(entry)).toBe("LIABILITIES");
  });
});
