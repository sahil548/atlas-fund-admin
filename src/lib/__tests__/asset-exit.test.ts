import { describe, it, expect } from "vitest";
import { calculateExitMetrics, getExitClosingTasks } from "../asset-exit-utils";

describe("calculateExitMetrics", () => {
  it("calculates MOIC as exitProceeds / costBasis", () => {
    const result = calculateExitMetrics(
      1_000_000,        // costBasis
      2_500_000,        // exitProceeds
      new Date("2020-01-01"),
      new Date("2023-01-01"),
    );
    expect(result.moic).toBe(2.5);
  });

  it("calculates hold period in days from entry to exit date", () => {
    const entryDate = new Date("2020-01-01");
    const exitDate = new Date("2022-01-01"); // 731 days (2020 is leap year)
    const result = calculateExitMetrics(1_000_000, 2_000_000, entryDate, exitDate);
    expect(result.holdPeriodDays).toBe(731);
  });

  it("calculates gain/loss as exitProceeds minus costBasis", () => {
    const result = calculateExitMetrics(
      1_000_000,
      1_500_000,
      new Date("2021-01-01"),
      new Date("2023-01-01"),
    );
    expect(result.gainLoss).toBe(500_000);
  });

  it("calculates a loss when exitProceeds < costBasis", () => {
    const result = calculateExitMetrics(
      2_000_000,
      800_000,
      new Date("2021-06-01"),
      new Date("2023-06-01"),
    );
    expect(result.gainLoss).toBe(-1_200_000);
    expect(result.moic).toBe(0.4);
  });

  it("returns moic = 0 when costBasis is zero (edge case)", () => {
    const result = calculateExitMetrics(
      0,
      500_000,
      new Date("2021-01-01"),
      new Date("2022-01-01"),
    );
    expect(result.moic).toBe(0);
  });

  it("returns holdPeriodDays = 0 when entryDate is null", () => {
    const result = calculateExitMetrics(
      1_000_000,
      1_500_000,
      null,
      new Date("2023-01-01"),
    );
    expect(result.holdPeriodDays).toBe(0);
  });
});

describe("getExitClosingTasks", () => {
  it("returns an array of task title strings", () => {
    const tasks = getExitClosingTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    tasks.forEach((title) => expect(typeof title).toBe("string"));
  });

  it("includes a task for distributing exit proceeds to LPs", () => {
    const tasks = getExitClosingTasks();
    expect(tasks.some((t) => t.toLowerCase().includes("proceeds"))).toBe(true);
  });

  it("includes a task for filing tax documents", () => {
    const tasks = getExitClosingTasks();
    expect(tasks.some((t) => t.toLowerCase().includes("tax"))).toBe(true);
  });

  it("includes a task for notifying LPs", () => {
    const tasks = getExitClosingTasks();
    expect(tasks.some((t) => t.toLowerCase().includes("lp"))).toBe(true);
  });
});
