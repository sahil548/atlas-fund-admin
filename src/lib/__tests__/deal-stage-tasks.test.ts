import { describe, it, expect } from "vitest";
import { getDDAutoTasks, getClosingAutoTasks, getExitAutoTasks } from "../deal-auto-tasks";

describe("getDDAutoTasks", () => {
  it("returns an array of auto-tasks for Due Diligence stage", () => {
    const tasks = getDDAutoTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("each DD task has a title and priority", () => {
    const tasks = getDDAutoTasks();
    tasks.forEach((task) => {
      expect(typeof task.title).toBe("string");
      expect(task.title.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(task.priority);
    });
  });

  it("includes a task for requesting financial statements", () => {
    const tasks = getDDAutoTasks();
    expect(tasks.some((t) => t.title.toLowerCase().includes("financial"))).toBe(true);
  });

  it("includes a task for management interviews", () => {
    const tasks = getDDAutoTasks();
    expect(tasks.some((t) => t.title.toLowerCase().includes("interview") || t.title.toLowerCase().includes("management"))).toBe(true);
  });
});

describe("getClosingAutoTasks", () => {
  it("returns an array of auto-tasks for Closing stage", () => {
    const tasks = getClosingAutoTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("each closing task has a title and priority", () => {
    const tasks = getClosingAutoTasks();
    tasks.forEach((task) => {
      expect(typeof task.title).toBe("string");
      expect(task.title.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(task.priority);
    });
  });

  it("includes a HIGH priority task for the SPA or term sheet", () => {
    const tasks = getClosingAutoTasks();
    const highPriorityTitles = tasks.filter((t) => t.priority === "HIGH").map((t) => t.title);
    expect(highPriorityTitles.some((t) => t.toLowerCase().includes("term") || t.toLowerCase().includes("spa") || t.toLowerCase().includes("draft"))).toBe(true);
  });

  it("includes a task for wire transfer or funding", () => {
    const tasks = getClosingAutoTasks();
    expect(tasks.some((t) => t.title.toLowerCase().includes("wire") || t.title.toLowerCase().includes("transfer") || t.title.toLowerCase().includes("fund"))).toBe(true);
  });
});

describe("getExitAutoTasks", () => {
  it("returns an array of auto-tasks for asset exit", () => {
    const tasks = getExitAutoTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("each exit task has a title and priority", () => {
    const tasks = getExitAutoTasks();
    tasks.forEach((task) => {
      expect(typeof task.title).toBe("string");
      expect(task.title.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(task.priority);
    });
  });

  it("includes a task for distributing exit proceeds to LPs", () => {
    const tasks = getExitAutoTasks();
    expect(tasks.some((t) => t.title.toLowerCase().includes("proceeds") || (t.title.toLowerCase().includes("distribut") && t.title.toLowerCase().includes("lp")))).toBe(true);
  });

  it("includes a task for filing tax documents", () => {
    const tasks = getExitAutoTasks();
    expect(tasks.some((t) => t.title.toLowerCase().includes("tax"))).toBe(true);
  });

  it("auto-tasks have correct titles as strings (not objects)", () => {
    const tasks = getExitAutoTasks();
    const titles = tasks.map((t) => t.title);
    expect(titles.every((t) => typeof t === "string")).toBe(true);
  });
});

describe("auto-task assignee behavior (pure function contract)", () => {
  it("getDDAutoTasks returns tasks without assigneeId (unassigned by default)", () => {
    const tasks = getDDAutoTasks();
    // Pure functions return task templates — no assigneeId on the definition
    tasks.forEach((task) => {
      expect(Object.keys(task)).not.toContain("assigneeId");
    });
  });

  it("getClosingAutoTasks returns tasks without assigneeId (unassigned by default)", () => {
    const tasks = getClosingAutoTasks();
    tasks.forEach((task) => {
      expect(Object.keys(task)).not.toContain("assigneeId");
    });
  });
});
