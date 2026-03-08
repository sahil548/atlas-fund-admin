import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase 5 — ACCT-01, ACCT-04
 * Requirements:
 *   - QBOProvider.getAuthorizationUrl builds correct Intuit OAuth2 URL
 *   - QBOProvider.fetchTrialBalance correctly parses QBO report format
 *     (row parsing, debit/credit extraction, isBalanced computation)
 */

// ── Test Setup ─────────────────────────────────────────────────

// We need to set environment variables BEFORE importing QBOProvider
// because the module reads process.env at construction time.

beforeEach(() => {
  vi.stubEnv("QBO_CLIENT_ID", "test-client-id");
  vi.stubEnv("QBO_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("QBO_REDIRECT_URI", "https://app.example.com/api/integrations/qbo/callback");
  vi.stubEnv("QBO_ENVIRONMENT", "sandbox");
});

// ── getAuthorizationUrl ────────────────────────────────────────

describe("QBOProvider.getAuthorizationUrl — builds correct OAuth2 authorization URL", () => {
  it("returns URL with Intuit OAuth2 base", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "state-abc");
    expect(url).toContain("https://appcenter.intuit.com/connect/oauth2");
  });

  it("includes client_id from environment", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "state-abc");
    expect(url).toContain("client_id=test-client-id");
  });

  it("includes redirect_uri from environment", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "state-abc");
    expect(url).toContain(
      "redirect_uri=" + encodeURIComponent("https://app.example.com/api/integrations/qbo/callback")
    );
  });

  it("includes response_type=code", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "state-abc");
    expect(url).toContain("response_type=code");
  });

  it("includes QBO accounting scope", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "state-abc");
    expect(url).toContain("scope=com.intuit.quickbooks.accounting");
  });

  it("includes the state parameter", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "my-csrf-state");
    expect(url).toContain("state=my-csrf-state");
  });

  it("builds a parseable URL with all required OAuth2 params", async () => {
    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const url = provider.getAuthorizationUrl("entity-1", "test-state");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("com.intuit.quickbooks.accounting");
    expect(parsed.searchParams.get("state")).toBe("test-state");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/integrations/qbo/callback"
    );
  });
});

// ── fetchTrialBalance parsing ──────────────────────────────────

describe("QBOProvider.fetchTrialBalance — parses QBO report response correctly", () => {
  it("extracts entries from data rows with 3+ columns", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            ColData: [
              { value: "Checking Account" },
              { value: "15000.00" },
              { value: "" },
            ],
          },
          {
            ColData: [
              { value: "Accounts Payable" },
              { value: "" },
              { value: "3000.00" },
            ],
          },
        ],
      },
    };

    // Mock global fetch
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "test-token",
      refreshToken: "test-refresh",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].accountName).toBe("Checking Account");
    expect(result.entries[0].debit).toBe(15000);
    expect(result.entries[0].credit).toBe(0);
    expect(result.entries[0].balance).toBe(15000); // debit - credit
    expect(result.entries[1].accountName).toBe("Accounts Payable");
    expect(result.entries[1].debit).toBe(0);
    expect(result.entries[1].credit).toBe(3000);
    expect(result.entries[1].balance).toBe(-3000); // debit - credit
  });

  it("computes totalDebits and totalCredits correctly", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            ColData: [
              { value: "Cash" },
              { value: "10000" },
              { value: "0" },
            ],
          },
          {
            ColData: [
              { value: "Revenue" },
              { value: "0" },
              { value: "7000" },
            ],
          },
          {
            ColData: [
              { value: "Supplies" },
              { value: "3000" },
              { value: "0" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "test-token",
      refreshToken: "test-refresh",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.totalDebits).toBe(13000); // 10000 + 3000
    expect(result.totalCredits).toBe(7000);
  });

  it("reports isBalanced=true when debits equal credits", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            ColData: [
              { value: "Cash" },
              { value: "5000" },
              { value: "0" },
            ],
          },
          {
            ColData: [
              { value: "Revenue" },
              { value: "0" },
              { value: "5000" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.isBalanced).toBe(true);
  });

  it("reports isBalanced=false when debits and credits differ by more than 0.01", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            ColData: [
              { value: "Cash" },
              { value: "5000" },
              { value: "0" },
            ],
          },
          {
            ColData: [
              { value: "Revenue" },
              { value: "0" },
              { value: "4000" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.isBalanced).toBe(false);
  });

  it("skips Section and GrandTotal rows", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            type: "Section",
            ColData: [
              { value: "ASSETS" },
              { value: "" },
              { value: "" },
            ],
          },
          {
            ColData: [
              { value: "Cash" },
              { value: "1000" },
              { value: "0" },
            ],
          },
          {
            type: "GrandTotal",
            ColData: [
              { value: "Total" },
              { value: "1000" },
              { value: "0" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    // Only the Cash row should be included (Section and GrandTotal skipped)
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].accountName).toBe("Cash");
  });

  it("skips rows with fewer than 3 columns", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            ColData: [{ value: "Header Only" }, { value: "100" }], // Only 2 columns
          },
          {
            ColData: [
              { value: "Valid Account" },
              { value: "500" },
              { value: "0" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].accountName).toBe("Valid Account");
  });

  it("uses Header.EndPeriod as periodDate when available", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-01-31" },
      Rows: { Row: [] },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.periodDate).toBe("2026-01-31");
  });

  it("falls back to asOfDate when Header.EndPeriod is missing", async () => {
    const mockResponse = {
      Header: {},
      Rows: { Row: [] },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    expect(result.periodDate).toBe("2026-02-28");
  });

  it("throws on non-OK HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "expired",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    await expect(
      provider.fetchTrialBalance(tokens, "2026-02-28")
    ).rejects.toThrow("QBO trial balance failed (401)");
  });

  it("uses sandbox API base URL in sandbox environment", async () => {
    vi.stubEnv("QBO_ENVIRONMENT", "sandbox");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ Header: {}, Rows: { Row: [] } }),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-999",
    };

    await provider.fetchTrialBalance(tokens, "2026-02-28");

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("sandbox-quickbooks.api.intuit.com");
    expect(fetchCall[0]).toContain("realm-999");
  });

  it("skips rows with empty account name and keeps rows with empty debit/credit", async () => {
    const mockResponse = {
      Header: { EndPeriod: "2026-02-28" },
      Rows: {
        Row: [
          {
            // Row with empty account name -- should be skipped
            ColData: [
              { value: "" },
              { value: "100" },
              { value: "0" },
            ],
          },
          {
            // Row with valid name but empty debit/credit -- should be kept with 0s
            ColData: [
              { value: "Uncategorized" },
              { value: "" },
              { value: "" },
            ],
          },
        ],
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { QBOProvider } = await import("@/lib/accounting/qbo-provider");
    const provider = new QBOProvider();
    const tokens = {
      accessToken: "t",
      refreshToken: "r",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z",
      refreshTokenExpiresAt: "2099-01-01T00:00:00Z",
      realmId: "realm-123",
    };

    const result = await provider.fetchTrialBalance(tokens, "2026-02-28");

    // Empty-name row skipped, "Uncategorized" row kept with debit=0, credit=0
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].accountName).toBe("Uncategorized");
    expect(result.entries[0].debit).toBe(0);
    expect(result.entries[0].credit).toBe(0);
    expect(result.entries[0].balance).toBe(0);
  });
});
