/**
 * Wave 0 tests — AI features: intent classification and alert freshness.
 * Tests for:
 *  - classifyIntent(): routing short queries to fuzzy_search, NL questions to
 *    nl_query, and action phrases to nl_action
 *  - getUnseenAlertCount(): counting alerts newer than a lastSeenAt timestamp
 */

import { describe, it, expect } from "vitest";
import { classifyIntent, getUnseenAlertCount } from "../ai-nl-intent";

// ── Intent Classification ─────────────────────────────────

describe("classifyIntent", () => {
  // Short queries (1-2 words, no NL signal) → fuzzy_search
  it('routes "deals" to fuzzy_search', () => {
    expect(classifyIntent("deals")).toBe("fuzzy_search");
  });

  it('routes "Fund III" to fuzzy_search', () => {
    expect(classifyIntent("Fund III")).toBe("fuzzy_search");
  });

  // Natural language questions → nl_query
  it('routes "show me all deals over $10M" to nl_query', () => {
    expect(classifyIntent("show me all deals over $10M")).toBe("nl_query");
  });

  it('routes "what\'s our total NAV" to nl_query', () => {
    expect(classifyIntent("what's our total NAV")).toBe("nl_query");
  });

  it('routes "how many assets do we have" to nl_query', () => {
    expect(classifyIntent("how many assets do we have")).toBe("nl_query");
  });

  it('routes "list all entities" to nl_query', () => {
    expect(classifyIntent("list all entities")).toBe("nl_query");
  });

  it('routes "summarize this deal" to nl_query', () => {
    expect(classifyIntent("summarize this deal")).toBe("nl_query");
  });

  it('routes "what should I do next on this deal" to nl_query', () => {
    expect(classifyIntent("what should I do next on this deal")).toBe("nl_query");
  });

  // Action phrases → nl_action
  it('routes "create a deal called Acme" to nl_action', () => {
    expect(classifyIntent("create a deal called Acme")).toBe("nl_action");
  });

  it('routes "assign task to Sarah" to nl_action', () => {
    expect(classifyIntent("assign task to Sarah")).toBe("nl_action");
  });

  it('routes "log a note on this deal" to nl_action', () => {
    expect(classifyIntent("log a note on this deal")).toBe("nl_action");
  });

  it('routes "delete deal Acme" to nl_action', () => {
    expect(classifyIntent("delete deal Acme")).toBe("nl_action");
  });

  it('routes "draft LP update for Fund III" to nl_action', () => {
    expect(classifyIntent("draft LP update for Fund III")).toBe("nl_action");
  });

  it('routes "generate DD summary" to nl_action', () => {
    expect(classifyIntent("generate DD summary")).toBe("nl_action");
  });
});

// ── Alert Freshness ───────────────────────────────────────

describe("getUnseenAlertCount", () => {
  const alerts = [
    { createdAt: "2026-03-02T10:00:00Z" },
    { createdAt: "2026-03-03T10:00:00Z" },
    { createdAt: "2026-02-28T10:00:00Z" }, // before lastSeenAt
  ];

  it("counts alerts created after lastSeenAt", () => {
    const lastSeenAt = "2026-03-01T00:00:00Z";
    // Only March 2 and March 3 are after March 1
    expect(getUnseenAlertCount(alerts, lastSeenAt)).toBe(2);
  });

  it("treats all alerts as new when lastSeenAt is null (first visit)", () => {
    expect(getUnseenAlertCount(alerts, null)).toBe(3);
  });

  it("returns 0 when all alerts are before lastSeenAt", () => {
    const lastSeenAt = "2026-03-10T00:00:00Z";
    expect(getUnseenAlertCount(alerts, lastSeenAt)).toBe(0);
  });

  it("returns 0 for empty alerts array", () => {
    expect(getUnseenAlertCount([], "2026-03-01T00:00:00Z")).toBe(0);
  });

  it("returns 0 for empty alerts with null lastSeenAt", () => {
    expect(getUnseenAlertCount([], null)).toBe(0);
  });
});
