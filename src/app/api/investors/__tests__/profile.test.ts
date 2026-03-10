import { describe, it, expect } from "vitest";

describe("LP Profile API (LP-09)", () => {
  it.todo("GET /api/investors/{id}/profile returns investor profile with legalName, email, phone, mailingAddress, taxId, entityAffiliations");
  it.todo("GET returns 404 for non-existent investor");
  it.todo("PUT /api/investors/{id}/profile updates mailingAddress, taxId, phone");
  it.todo("PUT validates input with Zod schema and rejects invalid data");
});
