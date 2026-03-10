import { describe, it, expect } from "vitest";
import { isOverdue } from "../overdue-detection";

describe("isOverdue", () => {
  const pastDate = "2025-01-01T00:00:00Z";
  const futureDate = "2099-01-01T00:00:00Z";

  it("returns true for DRAFT call past due date", () => {
    expect(isOverdue({ status: "DRAFT", dueDate: pastDate })).toBe(true);
  });

  it("returns true for ISSUED call past due date", () => {
    expect(isOverdue({ status: "ISSUED", dueDate: pastDate })).toBe(true);
  });

  it("returns false for FUNDED call past due date", () => {
    expect(isOverdue({ status: "FUNDED", dueDate: pastDate })).toBe(false);
  });

  it("returns false for PARTIALLY_FUNDED call past due date", () => {
    expect(isOverdue({ status: "PARTIALLY_FUNDED", dueDate: pastDate })).toBe(false);
  });

  it("returns false for DRAFT call with future due date", () => {
    expect(isOverdue({ status: "DRAFT", dueDate: futureDate })).toBe(false);
  });

  it("returns false for ISSUED call with future due date", () => {
    expect(isOverdue({ status: "ISSUED", dueDate: futureDate })).toBe(false);
  });
});
