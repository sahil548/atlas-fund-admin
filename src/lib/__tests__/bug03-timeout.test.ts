import { describe, it, expect, vi, afterEach } from "vitest";

// BUG-03: IC Memo spinner hangs on timeout
// This test validates the raceWithTimeout pattern used in the fix.
// Pattern: Promise.race([aiCall, timeoutReject]) — on timeout, return 504 error response.
//
// Reference: src/app/api/deals/[id]/extract-metadata/route.ts uses maxDuration=60
// Fix pattern: wrap AI call in raceWithTimeout(aiCall, 55_000) to surface 504 before
// Vercel kills the function at 60s.

/**
 * raceWithTimeout: races a promise against a timeout.
 * - If the promise resolves before timeoutMs, returns the resolved value.
 * - If the timeout fires first, rejects with an Error("TIMEOUT").
 * - If the promise rejects before timeout, propagates the original error.
 */
function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    ),
  ]);
}

describe("raceWithTimeout — BUG-03 timeout pattern", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns resolved value when promise resolves before timeout", async () => {
    vi.useFakeTimers();

    const fastPromise = Promise.resolve("ai result");
    const racePromise = raceWithTimeout(fastPromise, 5000);

    // Advance time — promise already resolved, well before timeout
    vi.advanceTimersByTime(100);

    const result = await racePromise;
    expect(result).toBe("ai result");
  });

  it("throws TIMEOUT error when promise exceeds the timeout duration", async () => {
    vi.useFakeTimers();

    const slowPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("too late"), 10_000)
    );

    const racePromise = raceWithTimeout(slowPromise, 1000);

    // Advance past the timeout
    vi.advanceTimersByTime(2000);

    await expect(racePromise).rejects.toThrow("TIMEOUT");
  });

  it("throws original error when promise rejects before timeout fires", async () => {
    vi.useFakeTimers();

    const failingPromise = Promise.reject(new Error("AI API error: rate limited"));
    const racePromise = raceWithTimeout(failingPromise, 5000);

    vi.advanceTimersByTime(0);

    await expect(racePromise).rejects.toThrow("AI API error: rate limited");
  });

  it("timeout error is distinguishable from AI errors via message check", async () => {
    vi.useFakeTimers();

    const slowPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("done"), 60_000)
    );

    const racePromise = raceWithTimeout(slowPromise, 1000);
    vi.advanceTimersByTime(2000);

    try {
      await racePromise;
      expect.fail("Should have thrown");
    } catch (e: unknown) {
      const error = e as Error;
      // API route uses this check to return 504 vs 500
      expect(error.message).toBe("TIMEOUT");
      const is504 = error.message === "TIMEOUT";
      expect(is504).toBe(true);
    }
  });

  it("resolves with complex object values (not just strings)", async () => {
    vi.useFakeTimers();

    const aiResult = {
      summary: "This is a strong deal",
      sections: [{ title: "Overview", content: "..." }],
      recommendation: "Proceed",
    };
    const fastPromise = Promise.resolve(aiResult);
    const racePromise = raceWithTimeout(fastPromise, 5000);

    vi.advanceTimersByTime(0);

    const result = await racePromise;
    expect(result).toEqual(aiResult);
  });

  it("resolves immediately when promise resolves synchronously", async () => {
    // No fake timers needed — fast resolved promise should not hit timeout
    const immediatePromise = Promise.resolve(42);
    const result = await raceWithTimeout(immediatePromise, 100);
    expect(result).toBe(42);
  });
});

// Integration pattern test: verify the API-level pattern produces 504 response
describe("raceWithTimeout — API 504 response pattern", () => {
  it("simulates the route handler returning 504 on timeout", async () => {
    vi.useFakeTimers();

    // Simulates what the API route does:
    // const result = await raceWithTimeout(aiCall(), 55_000);
    // catch (e): if (e.message === "TIMEOUT") return 504
    async function simulateRouteHandler(timeoutMs: number): Promise<{ status: number; body: object }> {
      const slowAiCall = new Promise<object>((resolve) =>
        setTimeout(() => resolve({ memo: "..." }), 120_000)
      );

      try {
        const data = await raceWithTimeout(slowAiCall, timeoutMs);
        return { status: 200, body: data };
      } catch (e: unknown) {
        const error = e as Error;
        if (error.message === "TIMEOUT") {
          return { status: 504, body: { error: "AI generation timed out. Try again with a smaller document." } };
        }
        return { status: 500, body: { error: error.message } };
      }
    }

    const routePromise = simulateRouteHandler(1000);
    vi.advanceTimersByTime(2000);

    const response = await routePromise;
    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      error: "AI generation timed out. Try again with a smaller document.",
    });

    vi.useRealTimers();
  });
});
