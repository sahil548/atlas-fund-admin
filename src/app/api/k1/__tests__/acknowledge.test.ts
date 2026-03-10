import { describe, it, expect } from "vitest";

describe("K-1 Acknowledgment API (LP-08)", () => {
  it.todo("POST /api/k1/acknowledge batch-updates acknowledgedAt and acknowledgedByInvestorId on matching TAX documents");
  it.todo("rejects request with empty documentIds array");
  it.todo("rejects request when documents do not belong to the specified investor");
  it.todo("returns count of acknowledged documents and timestamp");
});
