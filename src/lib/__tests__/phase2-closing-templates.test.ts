import { describe, it, expect } from "vitest";
import { CLOSING_CHECKLIST_TEMPLATES } from "@/lib/closing-templates";

// ── CLOSING_CHECKLIST_TEMPLATES (DEAL-02) ────────────────────
// Requirement: Closing checklist items focused on transactional mechanics
// (not DD-focused items — DD belongs in workstreams)

describe("CLOSING_CHECKLIST_TEMPLATES — transactional closing mechanics", () => {
  it("exports exactly 8 closing template items", () => {
    expect(CLOSING_CHECKLIST_TEMPLATES).toHaveLength(8);
  });

  it("all items have a title and order field", () => {
    for (const item of CLOSING_CHECKLIST_TEMPLATES) {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.order).toBe("number");
    }
  });

  it("items are ordered sequentially from 1 to 8", () => {
    const orders = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("includes transactional closing item: Execute Purchase / Sale Agreement", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title);
    expect(titles).toContain("Execute Purchase / Sale Agreement");
  });

  it("includes transactional closing item: Wire Transfer / Capital Deployment", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title);
    expect(titles).toContain("Wire Transfer / Capital Deployment");
  });

  it("includes transactional closing item: Transfer of Title / Ownership", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title);
    expect(titles).toContain("Transfer of Title / Ownership");
  });

  it("does NOT include DD-focused items (those belong in workstreams)", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title.toLowerCase());
    // Verify none of the template items are DD-focused
    const ddKeywords = ["due diligence", "escrow setup", "legal due diligence"];
    for (const keyword of ddKeywords) {
      const hasDDItem = titles.some((t) => t.includes(keyword));
      expect(hasDDItem).toBe(false);
    }
  });

  it("includes post-closing item for completeness", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title);
    expect(titles).toContain("Post-Closing Deliverables & Booking");
  });

  it("includes Entity Operating Agreement Execution as transactional step", () => {
    const titles = CLOSING_CHECKLIST_TEMPLATES.map((t) => t.title);
    expect(titles).toContain("Entity Operating Agreement Execution");
  });
});
