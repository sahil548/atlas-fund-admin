import { describe, it, expect } from "vitest";
import {
  capitalCallEmailHtml,
  distributionPaidEmailHtml,
  reportAvailableEmailHtml,
  k1AvailableEmailHtml,
  taskAssignedEmailHtml,
} from "@/lib/email-templates";

// ── capitalCallEmailHtml ────────────────────────────────────

describe("capitalCallEmailHtml", () => {
  const baseArgs = {
    entityName: "Acme Fund II",
    callNumber: "CC-003",
    amount: 250000,
    dueDate: "March 31, 2025",
  };

  it("includes the entity name in the output", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html).toContain("Acme Fund II");
  });

  it("includes the formatted currency amount", () => {
    const html = capitalCallEmailHtml(baseArgs);
    // $250,000 formatted with Intl.NumberFormat
    expect(html).toContain("$250,000");
  });

  it("includes the call reference number", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html).toContain("CC-003");
  });

  it("includes the due date", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html).toContain("March 31, 2025");
  });

  it("includes wiring instructions when provided", () => {
    const html = capitalCallEmailHtml({
      ...baseArgs,
      wiringInstructions: "Bank: First National\nAccount: 123456",
    });
    expect(html).toContain("Wiring Instructions");
    expect(html).toContain("Bank: First National");
  });

  it("omits wiring instructions section when not provided", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html).not.toContain("Wiring Instructions");
  });

  it("does not contain Atlas branding", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html.toLowerCase()).not.toContain("atlas");
  });

  it("includes mobile-responsive meta viewport tag", () => {
    const html = capitalCallEmailHtml(baseArgs);
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });
});

// ── distributionPaidEmailHtml ──────────────────────────────

describe("distributionPaidEmailHtml", () => {
  const baseArgs = {
    entityName: "Growth Partners LP",
    distributionDate: "February 15, 2025",
    grossAmount: 1000000,
    netToLPs: 850000,
  };

  it("includes the net to LPs amount", () => {
    const html = distributionPaidEmailHtml(baseArgs);
    expect(html).toContain("$850,000");
  });

  it("includes the gross distribution amount", () => {
    const html = distributionPaidEmailHtml(baseArgs);
    expect(html).toContain("$1,000,000");
  });

  it("includes the entity name", () => {
    const html = distributionPaidEmailHtml(baseArgs);
    expect(html).toContain("Growth Partners LP");
  });

  it("does not contain Atlas branding", () => {
    const html = distributionPaidEmailHtml(baseArgs);
    expect(html.toLowerCase()).not.toContain("atlas");
  });

  it("includes mobile-responsive meta viewport tag", () => {
    const html = distributionPaidEmailHtml(baseArgs);
    expect(html).toContain('name="viewport"');
  });
});

// ── reportAvailableEmailHtml ──────────────────────────────

describe("reportAvailableEmailHtml", () => {
  const baseArgs = {
    entityName: "Summit Ventures III",
    reportType: "Quarterly Report",
    period: "Q4 2024",
    portalUrl: "https://portal.example.com/reports",
  };

  it("includes the report type", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html).toContain("Quarterly Report");
  });

  it("includes the period", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html).toContain("Q4 2024");
  });

  it("includes a link to the portal URL", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html).toContain("https://portal.example.com/reports");
  });

  it("includes the entity name", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html).toContain("Summit Ventures III");
  });

  it("does not contain Atlas branding", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html.toLowerCase()).not.toContain("atlas");
  });

  it("includes mobile-responsive meta viewport tag", () => {
    const html = reportAvailableEmailHtml(baseArgs);
    expect(html).toContain('name="viewport"');
  });
});

// ── k1AvailableEmailHtml ──────────────────────────────────

describe("k1AvailableEmailHtml", () => {
  const baseArgs = {
    entityName: "Maple Street Fund I",
    taxYear: 2024,
    portalUrl: "https://portal.example.com/k1",
  };

  it("includes the tax year", () => {
    const html = k1AvailableEmailHtml(baseArgs);
    expect(html).toContain("2024");
  });

  it("includes a link to the portal URL", () => {
    const html = k1AvailableEmailHtml(baseArgs);
    expect(html).toContain("https://portal.example.com/k1");
  });

  it("includes the entity name", () => {
    const html = k1AvailableEmailHtml(baseArgs);
    expect(html).toContain("Maple Street Fund I");
  });

  it("does not contain Atlas branding", () => {
    const html = k1AvailableEmailHtml(baseArgs);
    expect(html.toLowerCase()).not.toContain("atlas");
  });

  it("includes mobile-responsive meta viewport tag", () => {
    const html = k1AvailableEmailHtml(baseArgs);
    expect(html).toContain('name="viewport"');
  });
});

// ── taskAssignedEmailHtml ─────────────────────────────────

describe("taskAssignedEmailHtml", () => {
  const baseArgs = {
    assigneeName: "Sarah Mitchell",
    taskTitle: "Review investment memo",
    portalUrl: "http://localhost:3000",
  };

  it("renders assignee name and task title", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).toContain("Sarah Mitchell");
    expect(html).toContain("Review investment memo");
  });

  it("includes due date when provided", () => {
    const html = taskAssignedEmailHtml({ ...baseArgs, dueDate: "March 31, 2025" });
    expect(html).toContain("March 31, 2025");
    expect(html).toContain("Due:");
  });

  it("includes context label when provided", () => {
    const html = taskAssignedEmailHtml({ ...baseArgs, contextLabel: "Deal: Acme Acquisition" });
    expect(html).toContain("Acme Acquisition");
    expect(html).toContain("Context:");
  });

  it("omits due date section when not provided", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).not.toContain("Due:");
  });

  it("omits context label section when not provided", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).not.toContain("Context:");
  });

  it("includes priority when provided", () => {
    const html = taskAssignedEmailHtml({ ...baseArgs, priority: "HIGH" });
    expect(html).toContain("HIGH");
    expect(html).toContain("Priority:");
  });

  it("omits priority section when not provided", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).not.toContain("Priority:");
  });

  it("includes a link to the tasks page", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).toContain("http://localhost:3000/tasks");
  });

  it("includes mobile-responsive meta viewport tag", () => {
    const html = taskAssignedEmailHtml(baseArgs);
    expect(html).toContain('name="viewport"');
  });
});
