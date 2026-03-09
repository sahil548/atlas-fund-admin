import { describe, it, expect } from "vitest";
import { categorizeLeaseExpiry, isOverdueReview } from "../asset-monitoring-utils";

const DAY_MS = 1000 * 60 * 60 * 24;

function daysFromNow(days: number, now: Date): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

describe("categorizeLeaseExpiry", () => {
  const now = new Date("2024-06-01T00:00:00Z");

  it("categorizes a lease expiring within 90 days as critical", () => {
    const leaseEnd = daysFromNow(45, now); // 45 days out
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("critical");
  });

  it("categorizes a lease expiring on exactly day 90 as critical", () => {
    const leaseEnd = daysFromNow(90, now);
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("critical");
  });

  it("categorizes a lease expiring between 91 and 180 days as warning", () => {
    const leaseEnd = daysFromNow(120, now); // 120 days out
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("warning");
  });

  it("categorizes a lease expiring on exactly day 91 as warning", () => {
    const leaseEnd = daysFromNow(91, now);
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("warning");
  });

  it("categorizes a lease expiring on exactly day 180 as warning", () => {
    const leaseEnd = daysFromNow(180, now);
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("warning");
  });

  it("categorizes a lease expiring beyond 180 days as safe", () => {
    const leaseEnd = daysFromNow(300, now); // > 180 days
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("safe");
  });

  it("categorizes a lease already expired as expired", () => {
    const leaseEnd = daysFromNow(-10, now); // 10 days ago
    expect(categorizeLeaseExpiry(leaseEnd, now)).toBe("expired");
  });
});

describe("isOverdueReview", () => {
  const now = new Date("2024-06-01T00:00:00Z");

  it("returns true when nextReview is in the past", () => {
    const pastDate = new Date(now.getTime() - DAY_MS); // yesterday
    expect(isOverdueReview(pastDate, now)).toBe(true);
  });

  it("returns false when nextReview is in the future", () => {
    const futureDate = new Date(now.getTime() + DAY_MS); // tomorrow
    expect(isOverdueReview(futureDate, now)).toBe(false);
  });

  it("returns false when nextReview is null (no review scheduled)", () => {
    expect(isOverdueReview(null, now)).toBe(false);
  });

  it("returns true for a review overdue by many months", () => {
    const longPast = new Date("2023-01-01T00:00:00Z");
    expect(isOverdueReview(longPast, now)).toBe(true);
  });
});
