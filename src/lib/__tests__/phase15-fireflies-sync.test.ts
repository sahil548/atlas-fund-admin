/**
 * Phase 15 — Fireflies Sync & Meeting Intelligence Tests
 * Wave 0 stubs — filled in by Plans 04, 06
 */

import { encryptApiKey, decryptApiKey } from "@/lib/ai-config";
import { parseActionItems } from "@/lib/fireflies";

describe("Phase 15: Fireflies Sync", () => {
  describe("MTG-01: Fireflies API key management", () => {
    const hasEncryptionKey =
      typeof process.env.AI_ENCRYPTION_KEY === "string" &&
      process.env.AI_ENCRYPTION_KEY.length === 64;

    it("encryptApiKey produces encrypted string, IV, and tag", () => {
      const plaintext = "test-api-key-12345";
      const result = encryptApiKey(plaintext);
      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("tag");
      // In dev mode (no encryption key), encrypted === plaintext
      if (!hasEncryptionKey) {
        expect(result.encrypted).toBe(plaintext);
      } else {
        expect(result.encrypted).not.toBe(plaintext);
      }
    });

    it("decryptApiKey recovers original plaintext", () => {
      const plaintext = "test-api-key-12345";
      const { encrypted, iv, tag } = encryptApiKey(plaintext);
      const recovered = decryptApiKey(encrypted, iv, tag);
      expect(recovered).toBe(plaintext);
    });
  });

  describe("MTG-03: Action item parsing", () => {
    it("parseActionItems splits newline-delimited text into array", () => {
      const text = "Follow up with LP\nSchedule board meeting\nReview term sheet";
      const items = parseActionItems(text);
      expect(items).toHaveLength(3);
      expect(items[0]).toBe("Follow up with LP");
    });

    it("parseActionItems strips numbered prefixes (1. or 1))", () => {
      const text = "1. Follow up with LP\n2) Schedule board meeting\n3. Review term sheet";
      const items = parseActionItems(text);
      expect(items[0]).toBe("Follow up with LP");
      expect(items[1]).toBe("Schedule board meeting");
    });

    it("parseActionItems filters out lines shorter than 4 chars", () => {
      const text = "Follow up with LP\n-\n\nOK\nSchedule board meeting";
      const items = parseActionItems(text);
      expect(items).toHaveLength(2);
    });

    it("parseActionItems returns empty array for null input", () => {
      expect(parseActionItems(null)).toEqual([]);
    });
  });

  describe("MTG-05: Meeting deduplication", () => {
    it.skip("meetings with same firefliesId are not created twice", () => {
      // Plan 04 fills this in — integration-level, may remain skipped
    });
  });
});
