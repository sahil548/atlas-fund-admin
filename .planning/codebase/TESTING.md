# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Environment: Node.js (server-side testing)

**Assertion Library:**
- Vitest built-in expect API (no separate assertion library)

**Run Commands:**
```bash
npm run test              # Run all tests (vitest run)
npm run test -- --watch  # Watch mode (requires manual modification of scripts)
npm run test -- --coverage  # Coverage report (if configured)
```

## Test File Organization

**Location:**
- Tests co-located with source code using `__tests__` directory pattern
- Example: `src/lib/__tests__/pagination.test.ts`, `src/lib/computations/__tests__/irr.test.ts`
- Alternative suffix pattern: `.test.ts` in same directory as source (less common, but present)

**Naming:**
- Test files: `<unit-name>.test.ts` (e.g., `irr.test.ts`, `pagination.test.ts`)
- Test directories: `__tests__/` nested within source directory

**Structure:**
```
src/lib/
├── irr.ts
├── computations/
│   ├── irr.ts
│   ├── capital-accounts.ts
│   ├── waterfall.ts
│   └── __tests__/
│       ├── irr.test.ts
│       ├── capital-accounts.test.ts
│       └── waterfall.test.ts
├── __tests__/
│   ├── pagination.test.ts
│   ├── phase2-schemas.test.ts
│   ├── email-templates.test.ts
│   └── ... (more tests)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";
import { computeCapitalAccount } from "../capital-accounts";

describe("computeCapitalAccount — capital account roll-forward", () => {
  // Grouped by feature or behavior
  // ─── Basic roll-forward ──────────────────────────────────────────────
  it("produces correct ending balance for a standard period", () => {
    const result = computeCapitalAccount(100_000, 50_000, 10_000, 20_000, 30_000, 5_000);
    expect(result.endingBalance).toBeCloseTo(145_000, 2);
  });

  // ─── Edge cases ──────────────────────────────────────────────────────
  it("returns zero ending balance when all inputs are zero", () => {
    const result = computeCapitalAccount(0, 0, 0, 0, 0, 0);
    expect(result.endingBalance).toBe(0);
  });
});
```

**Patterns:**
- One `describe()` block per unit/function being tested
- Describe block names include the unit name and a brief description (format: `"unitName — brief description"`)
- Tests grouped into logical sections with ASCII comment dividers
- Each `it()` block tests a single behavior or edge case
- Test names use present tense: "returns", "handles", "rejects", "produces"

**Naming Convention for describe:**
- Format: `"<FunctionName> — <what it does>"`
- Examples:
  - `"xirr — XIRR computation engine"`
  - `"computeCapitalAccount — capital account roll-forward"`
  - `"proRataShare — pro-rata share calculation"`
  - `"parsePaginationParams"`

## Test Structure Example

From `src/lib/__tests__/pagination.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  parsePaginationParams,
  buildPrismaArgs,
  buildPaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

// ── parsePaginationParams ──────────────────────────────────────────────

describe("parsePaginationParams", () => {
  it("returns default limit of 50 when no limit is provided", () => {
    const params = new URLSearchParams("firmId=firm-1");
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(50);
  });

  it("parses cursor from URL search params", () => {
    const params = new URLSearchParams("cursor=clxabc123&limit=10");
    const result = parsePaginationParams(params);
    expect(result.cursor).toBe("clxabc123");
  });

  // ... more tests
});

// ── buildPrismaArgs ────────────────────────────────────────────────────

describe("buildPrismaArgs", () => {
  it("sets take to limit+1 to detect hasMore", () => {
    const params: PaginationParams = { limit: 10 };
    const args = buildPrismaArgs(params);
    expect(args.take).toBe(11);
  });

  // ... more tests
});

// ── buildPaginatedResult ───────────────────────────────────────────────

describe("buildPaginatedResult", () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` }));

  it("returns hasMore=false and nextCursor=null when rawData length equals limit", () => {
    const items = makeItems(10);
    const result = buildPaginatedResult(items, 10, 10);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
```

## Assertion Patterns

**Common Matchers:**
- `expect(value).toBe(expected)` — exact equality (for primitives)
- `expect(value).toEqual(expected)` — deep equality (for objects/arrays)
- `expect(value).toBeCloseTo(expected, decimalPlaces)` — for floating point with tolerance
- `expect(value).toBeNull()` — strict null check
- `expect(value).toBeUndefined()` — undefined check
- `expect(value).toBeDefined()` — opposite of undefined
- `expect(value).not.toBe(expected)` — negation
- `expect(() => fn()).toThrow()` — exception testing
- `expect(array).toHaveLength(n)` — array length
- `expect(object).toHaveProperty("key")` — property existence

**Floating Point Testing:**
```typescript
// For financial calculations and IRR computations
const rate = xirr(cashFlows);
expect(rate!).toBeCloseTo(0.10, 2);  // within 2 decimal places
expect(rate!).toBeGreaterThan(0.12);
expect(rate!).toBeLessThan(0.20);
```

**Object/Array Assertions:**
```typescript
// Test object properties individually
expect(result.beginningBalance).toBe(100_000);
expect(result.contributions).toBe(50_000);

// Test array contents
expect(result.filters).toEqual({ stage: "SCREENING", assetClass: "PE" });
```

## Mocking

**Framework:** Vitest has mocking built-in (no separate library)

**Patterns:**
- Manual test fixtures and factory functions preferred over mocks
- For pagination tests: `makeItems(count)` factory creates test data
- For schema tests: inline test objects with valid/invalid data
- Mocking used sparingly — mostly for external dependencies (not implemented yet in this codebase)

**What to Mock:**
- External HTTP calls (API integration tests)
- Database calls in unit tests (use fixtures instead)
- Date/time dependencies
- Random number generators

**What NOT to Mock:**
- Core business logic (always test real implementation)
- Zod schema parsing (test against actual schemas)
- Calculation engines (test with real cash flow data)
- Prisma query builders (use real types)

## Fixtures and Factories

**Test Data Creation:**
```typescript
// Factory function pattern (from pagination tests)
const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` }));

// Usage
const items = makeItems(11);
const result = buildPaginatedResult(items, 10, 100);
```

**Inline Test Objects:**
```typescript
// From schema tests
const result = KillDealSchema.safeParse({
  action: "KILL",
  killReason: "Pricing",
});
```

**Domain-Specific Test Data:**
```typescript
// From IRR tests - realistic cash flow scenarios
const cashFlows = [
  { date: new Date("2023-01-01"), amount: -100_000 },
  { date: new Date("2023-07-01"), amount:  -50_000 },
  { date: new Date("2025-01-01"), amount:  200_000 },
];
```

**Location:**
- Test fixtures defined inline in test files
- Shared factories extracted to top of test file
- No separate fixtures directory (co-located with tests)

## Coverage

**Requirements:** Not enforced (no coverage threshold configured)

**View Coverage:**
```bash
# Not configured in vitest.config.ts
# To add coverage, would run:
npm run test -- --coverage
```

**Approach:**
- Full coverage of business logic (financial calculations, pagination, schema validation)
- Partial coverage of integration points (API routes, component integration)
- Minimal coverage of UI rendering (most component testing done manually)

## Test Types

**Unit Tests:**
- Scope: Single function or class in isolation
- Approach: Test inputs → outputs with various edge cases
- Location: `src/lib/__tests__/`, `src/lib/computations/__tests__/`
- Examples: IRR calculation, pagination parsing, schema validation, capital account math
- Quantity: ~20 test files covering core business logic

**Integration Tests:**
- Scope: Multiple functions working together (Zod + API + Prisma)
- Approach: Test full request → response flow
- Location: `src/app/api/__tests__/` (minimal, mostly schemas)
- Current status: Mostly via schema tests and manual testing
- Examples: Deal creation with validation, pagination with filtering

**E2E Tests:**
- Framework: Not implemented
- Approach: Would test full user workflows (browser automation)
- Current status: Manual testing via localhost browser

## Common Patterns

**Testing Zod Schemas:**
```typescript
import { KillDealSchema } from "@/lib/schemas";

describe("KillDealSchema — kill deal requires a reason", () => {
  it("accepts valid kill payload with required reason", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
      killReason: "Pricing",
    });
    expect(result.success).toBe(true);
  });

  it("rejects kill payload missing killReason", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
    });
    expect(result.success).toBe(false);
  });
});
```

**Testing Async/Financial Calculations:**
```typescript
import { describe, it, expect } from "vitest";
import { xirr } from "../irr";

describe("xirr — XIRR computation engine", () => {
  it("returns ~10% IRR for a simple 1-year 10% return", () => {
    const cashFlows = [
      { date: new Date("2023-01-01"), amount: -100_000 },
      { date: new Date("2024-01-01"), amount:  110_000 },
    ];
    const rate = xirr(cashFlows);
    expect(rate).not.toBeNull();
    expect(rate!).toBeCloseTo(0.10, 2);
  });

  // Edge case: not enough data
  it("returns null when fewer than 2 cash flows are provided", () => {
    expect(xirr([])).toBeNull();
    expect(xirr([{ date: new Date("2023-01-01"), amount: -100_000 }])).toBeNull();
  });

  // Edge case: no investment
  it("returns null when all cash flows are positive (no investment)", () => {
    const cashFlows = [
      { date: new Date("2023-01-01"), amount: 50_000 },
      { date: new Date("2024-01-01"), amount: 60_000 },
    ];
    expect(xirr(cashFlows)).toBeNull();
  });
});
```

**Testing Error Cases:**
```typescript
// From capital accounts test
it("converts negative distributions to absolute values (Math.abs)", () => {
  const resultPositive = computeCapitalAccount(100_000, 0, 0, 0,  30_000, 0);
  const resultNegative = computeCapitalAccount(100_000, 0, 0, 0, -30_000, 0);
  expect(resultPositive.endingBalance).toBeCloseTo(resultNegative.endingBalance, 2);
});
```

## Test Execution

**Import Style:**
- Always use named imports from vitest: `import { describe, it, expect } from "vitest"`
- Import units under test from relative paths: `import { xirr } from "../irr"`
- Import types when needed: `import type { PaginationParams } from "@/lib/pagination"`

**Test Isolation:**
- No global state mutations between tests
- Each test creates fresh data (factories called within `it()`)
- No test interdependencies

**Debugging:**
- `.only` on single test to run only that test: `it.only("test name", () => { ... })`
- `.skip` to skip a test: `it.skip("test name", () => { ... })`
- Run with: `npm run test -- --reporter=verbose`

## Current Test Coverage

**Well-Tested:**
- Financial computations: IRR (`irr.test.ts`), capital accounts (`capital-accounts.test.ts`), waterfall logic
- Pagination: complete test coverage for all three functions (`pagination.test.ts`)
- Schema validation: Zod schemas extensively tested (`phase2-schemas.test.ts`)
- Email templates: template formatting and variable substitution
- K1 matching: investor K1 reconciliation logic
- Notification preferences: API endpoint validation

**Partially Tested:**
- API routes: mostly validation via schema tests, some route tests
- Closing workflows and DD analysis

**Not Tested:**
- React components (UI testing — manual only)
- API integration (would require mocking Prisma)
- End-to-end workflows (would require E2E framework)
- Authentication flow (requires Clerk mocking)

## Adding New Tests

**Checklist:**
1. Create test file in `__tests__` subdirectory or `.test.ts` suffix
2. Import: `import { describe, it, expect } from "vitest"`
3. Structure: `describe("Unit — what it does", () => { it("...", () => { ... }); })`
4. Use factories for complex data: `const makeItem = () => ({})`
5. Test happy path first, then edge cases
6. Run: `npm run test`

**Example:**
```typescript
// src/lib/__tests__/my-function.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "../my-function";

describe("myFunction — does something", () => {
  // ─── Happy path ───────────────────────────────────────────────────────
  it("returns expected result for valid input", () => {
    const result = myFunction("input");
    expect(result).toBe("output");
  });

  // ─── Edge cases ───────────────────────────────────────────────────────
  it("handles null input gracefully", () => {
    const result = myFunction(null);
    expect(result).toBeNull();
  });
});
```

---

*Testing analysis: 2026-03-08*
