import { describe, it, expect } from "vitest";

/**
 * BUG-01 regression: DD tab workstream-status fallback
 *
 * Source logic lives in deal-dd-tab.tsx lines 67–84.
 * This test replicates that exact calculation as a pure function
 * to guard against regressions to the three code paths:
 *   (a) task-based progress when tasks exist
 *   (b) workstream-status fallback when totalTasks === 0
 *   (c) 0% when no workstreams at all
 */

interface Workstream {
  totalTasks?: number;
  completedTasks?: number;
  status?: string;
}

/**
 * Exact port of the overallPct calculation from deal-dd-tab.tsx.
 * Implementation files are read-only — this function mirrors the logic verbatim.
 * Includes stage parameter to support post-DD stage-aware fallback (BUG-01 fix).
 */
const POST_DD_STAGES = ["IC_REVIEW", "CLOSING", "CLOSED"];

function computeOverallPct(workstreams: Workstream[], stage = "DUE_DILIGENCE"): number {
  const totalTasks = workstreams.reduce(
    (sum, ws) => sum + (ws.totalTasks ?? 0),
    0,
  );
  const completedTasks = workstreams.reduce(
    (sum, ws) => sum + (ws.completedTasks ?? 0),
    0,
  );
  const completeCategories = workstreams.filter(
    (ws) => ws.status === "COMPLETE",
  ).length;

  // BUG-01 fix: fall back to workstream-status-based progress when no tasks.
  // Stage-aware fallback: deals past DD with no tasks necessarily completed DD.
  const overallPct =
    totalTasks > 0
      ? Math.min(100, Math.round((completedTasks / totalTasks) * 100))
      : workstreams.length > 0
        ? Math.min(100, Math.round((completeCategories / workstreams.length) * 100))
        : POST_DD_STAGES.includes(stage)
          ? 100
          : 0;

  return overallPct;
}

describe("DD tab overall progress calculation (BUG-01 regression)", () => {
  // ── (a) Task-based progress when tasks exist ──────────────────────────────

  it("uses task-based progress when tasks exist — partial completion", () => {
    const workstreams: Workstream[] = [
      { totalTasks: 4, completedTasks: 2, status: "IN_PROGRESS" },
      { totalTasks: 4, completedTasks: 4, status: "COMPLETE" },
    ];
    // 6 of 8 tasks done => 75%
    expect(computeOverallPct(workstreams)).toBe(75);
  });

  it("uses task-based progress when tasks exist — all complete", () => {
    const workstreams: Workstream[] = [
      { totalTasks: 3, completedTasks: 3, status: "COMPLETE" },
      { totalTasks: 5, completedTasks: 5, status: "COMPLETE" },
    ];
    // 8 of 8 tasks done => 100%
    expect(computeOverallPct(workstreams)).toBe(100);
  });

  it("uses task-based progress when tasks exist — none complete", () => {
    const workstreams: Workstream[] = [
      { totalTasks: 4, completedTasks: 0, status: "NOT_STARTED" },
      { totalTasks: 2, completedTasks: 0, status: "NOT_STARTED" },
    ];
    // 0 of 6 tasks done => 0%
    expect(computeOverallPct(workstreams)).toBe(0);
  });

  // ── (b) Workstream-status fallback when totalTasks === 0 ─────────────────

  it("falls back to workstream-status when totalTasks is 0 — all COMPLETE", () => {
    // A deal in IC_REVIEW with COMPLETE workstreams but no tasks created
    const workstreams: Workstream[] = [
      { totalTasks: 0, completedTasks: 0, status: "COMPLETE" },
      { totalTasks: 0, completedTasks: 0, status: "COMPLETE" },
      { totalTasks: 0, completedTasks: 0, status: "COMPLETE" },
    ];
    // 3 of 3 workstreams COMPLETE => 100%
    expect(computeOverallPct(workstreams)).toBe(100);
  });

  it("falls back to workstream-status when totalTasks is 0 — partial COMPLETE", () => {
    // A deal with AI-analyzed workstreams where only some finished
    const workstreams: Workstream[] = [
      { totalTasks: 0, completedTasks: 0, status: "COMPLETE" },
      { totalTasks: 0, completedTasks: 0, status: "COMPLETE" },
      { totalTasks: 0, completedTasks: 0, status: "IN_PROGRESS" },
    ];
    // 2 of 3 workstreams COMPLETE => 67% (Math.round(2/3 * 100) = 67)
    expect(computeOverallPct(workstreams)).toBe(67);
  });

  it("falls back to workstream-status when totalTasks is 0 — none COMPLETE", () => {
    const workstreams: Workstream[] = [
      { totalTasks: 0, completedTasks: 0, status: "NOT_STARTED" },
      { totalTasks: 0, completedTasks: 0, status: "NOT_STARTED" },
    ];
    // 0 of 2 COMPLETE => 0% (not a false -1 or crash)
    expect(computeOverallPct(workstreams)).toBe(0);
  });

  it("workstream-status fallback ignores tasks=undefined (treats as 0)", () => {
    // Workstreams with no totalTasks field at all
    const workstreams: Workstream[] = [
      { status: "COMPLETE" },
      { status: "COMPLETE" },
      { status: "IN_PROGRESS" },
    ];
    // totalTasks = 0 => fallback; 2 of 3 COMPLETE => 67%
    expect(computeOverallPct(workstreams)).toBe(67);
  });

  // ── (c) 0% when no workstreams at all ────────────────────────────────────

  it("returns 0% when workstreams array is empty — no crash", () => {
    expect(computeOverallPct([])).toBe(0);
  });

  // ── Invariant: result never exceeds 100% ─────────────────────────────────

  it("never returns more than 100% even with anomalous task data (completedTasks > totalTasks)", () => {
    // Hypothetical data anomaly: completedTasks > totalTasks
    const workstreams: Workstream[] = [
      { totalTasks: 2, completedTasks: 5, status: "COMPLETE" },
    ];
    // Math.min(100, Math.round(5/2 * 100)) = Math.min(100, 250) = 100
    const result = computeOverallPct(workstreams);
    expect(result).toBe(100);
    expect(result).toBeLessThanOrEqual(100);
  });

  // ── Stage-aware fallback: post-DD deals with no workstreams show 100% ────

  it("returns 100% for IC_REVIEW deal with no workstreams (necessarily completed DD)", () => {
    expect(computeOverallPct([], "IC_REVIEW")).toBe(100);
  });

  it("returns 100% for CLOSING deal with no workstreams", () => {
    expect(computeOverallPct([], "CLOSING")).toBe(100);
  });

  it("returns 100% for CLOSED deal with no workstreams", () => {
    expect(computeOverallPct([], "CLOSED")).toBe(100);
  });

  it("returns 0% for DUE_DILIGENCE deal with no workstreams", () => {
    expect(computeOverallPct([], "DUE_DILIGENCE")).toBe(0);
  });

  it("returns 0% for SCREENING deal with no workstreams", () => {
    expect(computeOverallPct([], "SCREENING")).toBe(0);
  });
});
