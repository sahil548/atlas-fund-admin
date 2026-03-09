# Coding Conventions

**Analysis Date:** 2026-03-08

## Naming Patterns

**Files:**
- Component files: `kebab-case.tsx` (e.g., `form-field.tsx`, `deal-overview-tab.tsx`)
- Library/utility files: `kebab-case.ts` (e.g., `api-helpers.ts`, `schemas.ts`, `pagination.ts`)
- Test files: `*.test.ts` or `*.spec.ts` with `__tests__` directory prefix (e.g., `/src/lib/__tests__/pagination.test.ts`)
- Config files: either `.js`/`.ts`/`.mjs` (e.g., `tsconfig.json`, `next.config.ts`, `vitest.config.ts`)

**Functions and Variables:**
- camelCase universally (e.g., `parseBody()`, `buildPrismaArgs()`, `computeCapitalAccount()`)
- Private functions: no special prefix, rely on encapsulation
- React hooks: `use` prefix (e.g., `useSWR()`, `useToast()`, `useFirm()`)
- Event handlers: `on` prefix (e.g., `onClick()`, `onChange()`)

**Types and Interfaces:**
- PascalCase for types and interfaces (e.g., `FormFieldProps`, `FirmContextType`, `DealForOverviewTab`)
- Suffix with `Props` for component prop interfaces
- Suffix with `Type` for context types
- Exported enums and unions are also PascalCase (e.g., `ASSET_CLASSES`, `CAPITAL_INSTRUMENTS` as const arrays)

**Constants:**
- UPPER_SNAKE_CASE for values exported as constants (e.g., `ASSET_CLASS_LABELS`, `ASSET_CLASS_COLORS`, `PARTICIPATION_LABELS`)
- Define color and label mappings as `Record<string, string>` objects
- Status constants: `const STATUS_COLORS`, `const STATUS_LABELS`, `const STATUS_CYCLE` pattern

**Variables (module/component scope):**
- camelCase (e.g., `firmId`, `stageLabel`, `baseWhere`, `paginated`)

## Code Style

**Formatting:**
- ESLint 9 configured with Next.js core web vitals + TypeScript rules
- Config: `eslint.config.mjs` (flat config format)
- No Prettier config detected — styling enforced via ESLint only
- Indentation: 2 spaces (inferred from tsconfig and existing code)

**Linting Rules:**
- Next.js best practices enforced by `eslint-config-next/core-web-vitals`
- TypeScript strict mode enforced via `eslint-config-next/typescript`
- Run with: `npm run lint`

**Spacing and Braces:**
- Opening brace on same line: `function foo() {`
- Single-line conditionals allowed: `if (!data) return null;`
- Multi-line object literals: properties on separate lines

**Quotes:**
- Double quotes for JSX attributes and string literals
- Template literals for string interpolation

## Import Organization

**Order:**
1. React/Next.js imports (e.g., `import { useState } from "react"`)
2. Third-party UI/utility imports (e.g., `import useSWR from "swr"`)
3. Internal library imports from `@/lib` (e.g., `import { prisma } from "@/lib/prisma"`)
4. Internal component imports from `@/components` (e.g., `import { Button } from "@/components/ui/button"`)
5. Type imports using `import type` when possible
6. Relative imports for same-module code

**Path Aliases:**
- `@/` maps to `./src/` (defined in `tsconfig.json`)
- Always use `@/` for imports, never relative paths from src
- Example: `import { fmt } from "@/lib/utils"` not `import { fmt } from "../../../lib/utils"`

**Import Style:**
- Named imports preferred: `import { parseBody } from "@/lib/api-helpers"`
- Default imports used for React components and context providers
- Type imports for interfaces/types: `import type { FirmContextType } from "@/components/providers/firm-provider"`
- Barrel files allowed in component directories for re-exporting

## Error Handling

**API Route Pattern:**
- All POST/PUT/PATCH routes use `parseBody(req, ZodSchema)` from `@/lib/api-helpers`
- Returns `{ data: T | null, error: NextResponse | null }`
- Check error first and return early: `if (error) return error`
- Validation errors automatically formatted as 400 with Zod flatten output

```typescript
export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;
  // Proceed with validated data
  const deal = await prisma.deal.create({ data: data! });
  return NextResponse.json(deal, { status: 201 });
}
```

**Prisma Error Handling:**
- Wrap Prisma operations in try/catch when needed
- Return specific Prisma error codes with appropriate HTTP status:
  - `P2002`: Unique constraint violation → 409 Conflict
  - `P2025`: Record not found → 404 Not Found
  - Generic errors → 500 Internal Server Error

**Auth Errors:**
- `unauthorized()` helper for missing auth
- `forbidden()` helper for permission denied
- Both return NextResponse with appropriate status codes

**Client-Side Error Handling:**
- Toast errors must be strings, never objects
- Guard against undefined data before accessing nested properties
- Type check error objects before passing to toast:
  ```typescript
  const msg = typeof data.error === "string" ? data.error : "Failed to do X";
  toast.error(msg);
  ```

## Logging

**Framework:** console (no structured logging library)

**Patterns:**
- Error logs: `console.error("Context: what happened", error)`
- Debug logs: rarely used in code, prefer explicit control flow
- Audit logging: `logAudit(firmId, userId, action, entityType, entityId, metadata)`
  - Signature: `logAudit(firmId: string, userId: string, action: string, entity: string, entityId: string, metadata: Record<string, unknown>)`
  - Location: `@/lib/audit`
  - Fire-and-forget pattern (no await)

**When to Log:**
- CREATE, UPDATE, DELETE operations (audit trail)
- Auth failures (for security)
- Unexpected state transitions (errors only)
- Do NOT log sensitive data (passwords, API keys, PII)

## Comments

**When to Comment:**
- Complex algorithms with mathematical operations (e.g., IRR calculation, capital account roll-forward)
- Non-obvious business logic requiring domain context
- Tricky edge cases or workarounds
- State machine transitions (e.g., deal workflow stages)

**JSDoc/TSDoc:**
- Used minimally — only for public library functions
- Exported utility functions get JSDoc blocks with example usage
- Component prop interfaces documented inline
- Example from `@/lib/utils`:
  ```typescript
  export function fmt(n: number): string {
    // Formats number as currency with M/B/K suffixes
  }
  ```

**Comment Style:**
- Single-line comments: `// Description`
- Block comments for sections: `// ─── Section Name ───────────────────────`
- ASCII dividers used in test files for organization

## Function Design

**Size:**
- Functions should do one thing well
- API route handlers typically 30-100 lines (includes Prisma includes + pagination logic)
- Component functions typically 40-150 lines with JSX
- Utility functions: as small as possible, often single-expression

**Parameters:**
- Named parameters for functions with 3+ parameters
- Use destructuring for objects: `function foo({ a, b, c })`
- Optional parameters marked with `?` in TypeScript
- Constants defined inline where they are used (e.g., `stageLabel`, `ASSET_CLASS_FIELDS` in component files)

**Return Values:**
- Functions return data or null/undefined (no throwing in utils)
- API routes return NextResponse (status code always explicit)
- SWR hooks return `{ data, isLoading, error }` pattern
- Zod parse returns `{ success: boolean, data?: T, error?: ZodError }`

## Module Design

**Exports:**
- Named exports for utility functions: `export function parseBody()`
- Default exports for React components
- Type exports explicit: `export type FirmContextType = { ... }`

**Barrel Files:**
- Not used at `src/` level
- Limited use in component directories for convenience
- Avoid re-exporting when possible

**File Cohesion:**
- API routes co-located with Prisma models (organized by domain under `/src/app/api/`)
- Components organized by feature domain: `/src/components/features/deals/`, `/src/components/features/assets/`
- Shared utilities in `/src/lib/` (schemas, constants, helpers)
- Tests co-located with source: either `__tests__` subdirectory or `.test.ts` suffix

## TypeScript Patterns

**Strict Mode:**
- Enabled globally in `tsconfig.json`
- No `any` except where explicitly needed with ESLint override comment
- Type assertions with `as` only when absolutely necessary
- Use `unknown` then narrow type instead of `any`

**Generic Types:**
- Used sparingly, mostly in utility functions and providers
- API helpers use generics: `parseBody<T>(req, schema: ZodType<T>)`
- Pagination helpers use generics: `buildPaginatedResult<T>`

**Union Types:**
- Used for status enums: `"SCREENING" | "DUE_DILIGENCE" | "IC_REVIEW" | "CLOSING"`
- Const assertions for literal types: `const ASSET_CLASSES = [...] as const`

## Testing Conventions

- All test files follow pattern: `describe("Unit Name — brief description", () => { ... })`
- Test names use present tense: "returns...", "handles...", "rejects..."
- Tests grouped into logical sections with comment dividers
- Edge cases and error conditions tested explicitly
- See TESTING.md for comprehensive test structure

## React Component Patterns

**Client Components:**
- All interactive components require `"use client"` directive at top
- Components in `/components/ui/` are client components
- Components in `/components/features/` typically client components

**Hooks:**
- `useFirm()` for accessing current tenant's firm ID (never hardcode `firm-1`)
- `useUser()` for auth context
- `useSWR()` for data fetching (not `useEffect` + `fetch`)
- `useToast()` never destructured — always `const toast = useToast()`

**Props Pattern:**
- Define interface with `Props` suffix
- Destructure in function signature
- Example: `interface FormFieldProps { label: string; error?: string; children: ReactNode }`

**State Management:**
- SWR for fetching (provides caching, dedup, revalidation)
- useState for local UI state (form values, modal open/close, tabs)
- Context providers for global state (FirmProvider, UserProvider)

## Special Patterns

**Optional Field Handling:**
- Empty strings (`""`) transform to `undefined` in Zod schemas
- Use helper: `const optionalStr = z.string().transform((v) => (v === "" ? undefined : v)).optional()`
- Use helper for enums: `const optionalEnum = <T extends readonly [string, ...]>(values: T) => z.enum(values).or(z.literal("")).transform((v) => (v === "" ? undefined : v)).optional()`

**Multi-Tenancy:**
- Always filter by `firmId` in queries
- Get `firmId` from `useFirm()` hook or auth context
- Never hardcode `firm-1` or any specific firm ID

**Pagination:**
- Use `parsePaginationParams(searchParams)` to extract limit, cursor, search
- Use `buildPrismaArgs(params)` to build Prisma query
- Use `buildPaginatedResult(items, limit, total)` to format response
- All pagination helpers in `@/lib/pagination`

---

*Convention analysis: 2026-03-08*
