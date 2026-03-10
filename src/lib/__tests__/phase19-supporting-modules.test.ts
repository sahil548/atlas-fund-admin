import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Pure helper: groupReportsByEntityThenPeriod
// Mirrors the function extracted in reports/page.tsx
// ============================================================

interface Report {
  id: string;
  name: string;
  entityId?: string | null;
  entity?: { id: string; name: string } | null;
  period?: string | null;
  createdAt: string;
}

/**
 * Groups a flat list of reports into Map<entityKey, Map<period, Report[]>>.
 * entityKey = entity.id if present, otherwise "unknown".
 * period = report.period if present, otherwise "No Period".
 */
function groupReportsByEntityThenPeriod(
  reports: Report[]
): Map<string, { entityName: string; periods: Map<string, Report[]> }> {
  const result = new Map<
    string,
    { entityName: string; periods: Map<string, Report[]> }
  >();

  for (const report of reports) {
    const entityKey = report.entity?.id ?? report.entityId ?? "unknown";
    const entityName = report.entity?.name ?? "Unknown Entity";
    const period = report.period ?? "No Period";

    if (!result.has(entityKey)) {
      result.set(entityKey, { entityName, periods: new Map() });
    }

    const entityGroup = result.get(entityKey)!;
    if (!entityGroup.periods.has(period)) {
      entityGroup.periods.set(period, []);
    }
    entityGroup.periods.get(period)!.push(report);
  }

  return result;
}

// ============================================================
// Tests for groupReportsByEntityThenPeriod
// ============================================================

describe("groupReportsByEntityThenPeriod", () => {
  it("groups reports by entity and period correctly", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Report A",
        entity: { id: "e1", name: "Fund I" },
        period: "Q4 2025",
        createdAt: "2025-12-01",
      },
      {
        id: "r2",
        name: "Report B",
        entity: { id: "e1", name: "Fund I" },
        period: "Q3 2025",
        createdAt: "2025-09-01",
      },
      {
        id: "r3",
        name: "Report C",
        entity: { id: "e2", name: "Fund II" },
        period: "Q4 2025",
        createdAt: "2025-12-01",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);

    expect(result.size).toBe(2);
    expect(result.has("e1")).toBe(true);
    expect(result.has("e2")).toBe(true);

    const fundI = result.get("e1")!;
    expect(fundI.entityName).toBe("Fund I");
    expect(fundI.periods.size).toBe(2);
    expect(fundI.periods.get("Q4 2025")).toHaveLength(1);
    expect(fundI.periods.get("Q3 2025")).toHaveLength(1);

    const fundII = result.get("e2")!;
    expect(fundII.entityName).toBe("Fund II");
    expect(fundII.periods.size).toBe(1);
    expect(fundII.periods.get("Q4 2025")).toHaveLength(1);
  });

  it("groups multiple reports with same entity+period together (version count)", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Q4 Report v1",
        entity: { id: "e1", name: "Fund I" },
        period: "Q4 2025",
        createdAt: "2025-12-01",
      },
      {
        id: "r2",
        name: "Q4 Report v2",
        entity: { id: "e1", name: "Fund I" },
        period: "Q4 2025",
        createdAt: "2025-12-05",
      },
      {
        id: "r3",
        name: "Q4 Report v3",
        entity: { id: "e1", name: "Fund I" },
        period: "Q4 2025",
        createdAt: "2025-12-10",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);

    const fundI = result.get("e1")!;
    const q4Reports = fundI.periods.get("Q4 2025")!;
    // All 3 reports should be grouped together
    expect(q4Reports).toHaveLength(3);
    // Version count is 3
    expect(q4Reports.length).toBe(3);
  });

  it("handles reports with no entity (groups under 'unknown')", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Orphan Report",
        entity: null,
        entityId: null,
        period: "Q4 2025",
        createdAt: "2025-12-01",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);

    expect(result.has("unknown")).toBe(true);
    const unknownGroup = result.get("unknown")!;
    expect(unknownGroup.entityName).toBe("Unknown Entity");
  });

  it("handles reports with no period (groups under 'No Period')", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Fund Summary",
        entity: { id: "e1", name: "Fund I" },
        period: null,
        createdAt: "2025-12-01",
      },
      {
        id: "r2",
        name: "Fund Summary 2",
        entity: { id: "e1", name: "Fund I" },
        period: undefined,
        createdAt: "2025-12-05",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);

    const fundI = result.get("e1")!;
    expect(fundI.periods.has("No Period")).toBe(true);
    expect(fundI.periods.get("No Period")).toHaveLength(2);
  });

  it("handles both missing entity and missing period gracefully", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Ghost Report",
        entity: null,
        entityId: null,
        period: null,
        createdAt: "2025-12-01",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);

    expect(result.has("unknown")).toBe(true);
    const unknownGroup = result.get("unknown")!;
    expect(unknownGroup.periods.has("No Period")).toBe(true);
    expect(unknownGroup.periods.get("No Period")).toHaveLength(1);
  });

  it("returns empty map for empty input", () => {
    const result = groupReportsByEntityThenPeriod([]);
    expect(result.size).toBe(0);
  });

  it("uses entityId fallback when entity object is null but entityId is set", () => {
    const reports: Report[] = [
      {
        id: "r1",
        name: "Report",
        entity: null,
        entityId: "e-fallback",
        period: "Q1 2025",
        createdAt: "2025-03-01",
      },
    ];

    const result = groupReportsByEntityThenPeriod(reports);
    expect(result.has("e-fallback")).toBe(true);
    // Name falls back to "Unknown Entity" since no entity object
    expect(result.get("e-fallback")!.entityName).toBe("Unknown Entity");
  });
});

// ============================================================
// SUPP-06: Zero window.confirm() calls in src/ (grep-as-test)
// Extends the Phase 11 FOUND-03 pattern
// ============================================================

describe("SUPP-06: zero window.confirm() calls in source", () => {
  it("has no window.confirm( calls anywhere in src/ (excluding tests)", () => {
    function walkDir(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (
          entry.isDirectory() &&
          entry.name !== "node_modules" &&
          entry.name !== "__tests__"
        ) {
          files.push(...walkDir(full));
        } else if (
          entry.isFile() &&
          /\.(tsx?|jsx?)$/.test(entry.name) &&
          !entry.name.includes(".test.")
        ) {
          files.push(full);
        }
      }
      return files;
    }

    const srcDir = path.resolve(__dirname, "../../");
    const sourceFiles = walkDir(srcDir);
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines
        if (
          line.trimStart().startsWith("//") ||
          line.trimStart().startsWith("*")
        )
          continue;
        // Match window.confirm( specifically
        if (/window\.confirm\s*\(/.test(line)) {
          violations.push(
            `${path.relative(srcDir, file)}:${i + 1}: ${line.trim()}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ============================================================
// SUPP-05: AI config test connection route exists and exports POST
// ============================================================

describe("SUPP-05: AI config test connection route", () => {
  it("route file exists at src/app/api/settings/ai-config/test/route.ts", () => {
    const routePath = path.resolve(
      __dirname,
      "../../app/api/settings/ai-config/test/route.ts"
    );
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("route file exports a POST handler", () => {
    const routePath = path.resolve(
      __dirname,
      "../../app/api/settings/ai-config/test/route.ts"
    );
    const content = fs.readFileSync(routePath, "utf-8");
    // Must export an async POST function
    expect(content).toMatch(/export\s+async\s+function\s+POST/);
  });
});
