# Phase 20: Schema Cleanup & UI Polish - Research

**Researched:** 2026-03-10
**Domain:** Integration audit, Prisma schema hardening, UI component upgrade, TypeScript safety, structured logging
**Confidence:** HIGH (findings from direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UI Visual Target**
- Selective component upgrades — replace the weakest UI primitives (modals, selects, dropdowns, date pickers) with shadcn/ui-inspired alternatives, but don't do a full library migration
- All pages treated equally — systematic pass across every GP and LP page, no page left behind
- Visual reference: shadcn/ui + 21st.dev aesthetic — clean, modern, minimal (think Linear, Vercel Dashboard, Stripe)
- Full dark mode audit — every page verified in dark mode, fix all contrast/readability issues, ensure charts/badges/forms look correct in both themes
- Existing shared components (PageHeader, SectionPanel, EmptyState, TableSkeleton, ConfirmDialog) stay — they were established in Phase 11 and work

**Schema Hardening**
- Formalize ALL JSON blob fields with Zod schemas — every JSON column gets a defined shape validated on read/write (waterfall configs, AI extraction results, deal metadata, side letter adjustments, etc.)
- Add database-level constraints AND indexes — unique constraints, check constraints, and performance indexes on frequently-queried columns (firmId, status, dealId, entityId, date ranges)
- Zod validation on EVERY API route — all 73+ routes get Zod input validation on request body and query params, no `as any` bypasses, uniform error responses
- Orphaned fields/models: Claude's discretion — remove clearly dead fields via migration, document ambiguous ones for future cleanup

**Integration Audit**
- Fix ALL 3 known bugs with regression tests:
  - BUG-01: DD progress shows 0% for post-DD deals (fallback to workstream-status)
  - BUG-02: Pipeline conversion rate >100% anomaly (verify guard holds)
  - BUG-03: IC memo spinner hangs on 90s timeout (proper error handling + UI recovery)
- Structured logging — replace 373 console.log/warn/error calls with a logger utility supporting error/warn/info/debug levels; debug only in dev, errors in prod
- Full cross-module verification — trace key workflows end-to-end: deal → asset transition, capital call lifecycle → LP metrics, AI command bar → all data, dashboard aggregation accuracy
- Dead code: full cleanup — remove all unused imports, dead functions, commented-out code, unreferenced files across entire codebase

**Type Safety & Code Quality**
- Eliminate `any` types pragmatically — define explicit TypeScript interfaces for all API response shapes and data models; allow runtime Zod validation for genuinely dynamic content (AI responses, third-party payloads)
- Error boundaries on every page route — wrap each route with ErrorBoundary so JS errors show friendly recovery UI instead of blank page
- Untyped imports fixed — install proper type definitions or create stubs (pdf-parse, etc.)

### Claude's Discretion
- Whether to refactor oversized components (DD tab 1,563 lines, entity page 1,212 lines) — decide based on fragility risk and whether it improves the hardening pass
- Which orphaned schema fields to remove vs document
- Exact structured logging implementation (Winston, Pino, or custom)
- Specific shadcn/ui-inspired component designs (as long as they match the reference aesthetic)

### Deferred Ideas (OUT OF SCOPE)
- Role-based access control enforcement at API level (requireGPRole/requireLPRole middleware) — documented in CONCERNS.md, deferred to security-focused phase
- Full test suite (unit + integration + e2e) — build validation via `npm run build` sufficient for current scale
- Redis caching layer for dashboard aggregations — not needed at current user count
- Prisma 7 → 8 upgrade — evaluate in v3.0
- Connection pooling (PgBouncer) — not needed for current ~10 concurrent users
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEG-01 | Fix BUG-01: DD progress shows 0% for post-DD deals | `deal-dd-tab.tsx:67-84` has fallback logic but needs re-verification; test at line 130 verifies clamping |
| INTEG-02 | Fix BUG-02: Pipeline conversion rate >100% anomaly | `deals/route.ts:90-103` has Math.min guard; regression test at `pipeline-conversion-rates.test.ts:126-145` |
| INTEG-03 | Fix BUG-03: IC memo spinner hangs on 90s timeout | `api/deals/[id]/extract-metadata/route.ts` uses 60s maxDuration; Promise.race timeout not surfaced to UI |
| INTEG-04 | Replace 210+ console.log/warn/error calls with structured logger | 111 files affected; logger utility to be created in `src/lib/logger.ts` |
| INTEG-05 | End-to-end workflow verification: deal → asset transition | `CloseDealSchema` exists; sourceAssets relation verified but full lifecycle needs tracing |
| INTEG-06 | End-to-end workflow verification: capital call lifecycle → LP metrics | LP dashboard test failing (metricSnapshot.findMany mock mismatch) |
| INTEG-07 | End-to-end workflow verification: AI command bar → all data queries | Phase 18 complete; page context, intent routing patterns established |
| INTEG-08 | End-to-end workflow verification: dashboard aggregation accuracy | Phase 19 complete; Deal.targetSize is String so totalValue always 0 is a documented quirk |
| INTEG-09 | Dead code removal: unused imports, dead functions, commented-out code | Full sweep across 26 GP pages + 8 LP pages + 111 files with console usage |
| SCHEMA-01 | Zod schemas for ALL 39 JSON blob fields in Prisma schema | 39 Json/Json? fields identified; most have inline comments but no enforced Zod shapes |
| SCHEMA-02 | Zod validation on ALL 166 API route files (currently ~172 found, parseBody used in ~172 of calls but ~25 routes use raw req.json()) | Gap: 25+ routes use raw req.json() without parseBody/Zod |
| SCHEMA-03 | Add database indexes on frequently-queried columns lacking them | Current: 63 total @@index/@@unique in schema; gaps identified below |
| SCHEMA-04 | Audit and remove orphaned/mistyped schema fields | Candidate: DealCategory removed comment exists; various nullable fields with unclear usage |
| UIPOL-01 | Upgrade modal component to shadcn/ui-inspired design | Current modal.tsx uses createPortal with basic styling; no animation, no accessible focus trap |
| UIPOL-02 | Upgrade select component to shadcn/ui-inspired design | Current select.tsx is native HTML select; no custom dropdown, no multi-select support |
| UIPOL-03 | Full dark mode audit across all GP pages (26) and LP pages (8) | LP pages (lp-activity, lp-portfolio, lp-settings) have hardcoded bg-white/bg-gray-50 without dark: variants |
| UIPOL-04 | Wire PageErrorBoundary to all page routes | PageErrorBoundary exists in app-shell.tsx wrapping all pages; SectionErrorBoundary used on some but not all sections |
| UIPOL-05 | Fix untyped pdf-parse import | `src/lib/document-extraction.ts:23` uses `as any` cast; install @types/pdf-parse or create stub |
| UIPOL-06 | Eliminate `as any` bypasses in API route bodies | 39 occurrences of `as any` across codebase; concentrated in document categories and AI response handling |
</phase_requirements>

---

## Summary

Phase 20 is the final hardening pass for Atlas v2.0. The codebase has grown through 9 rapid-development phases (11-19) and has accumulated specific, well-documented technical debt. This is not a speculative audit — the issues are catalogued in `.planning/codebase/CONCERNS.md` and are confirmed by direct inspection.

**Track 1 (Integration Audit):** Three specific bugs are documented with known file/line locations. Structured logging replacement is mechanical (210+ console calls across 111 files). The real integration audit work is tracing 4 end-to-end workflows to find any cross-phase regressions that slipped through individual phase verification. The existing vitest suite (734 passing tests, 7 failing) gives a baseline — the 7 failing tests are a known gap in the LP dashboard mock that needs fixing.

**Track 2 (Schema):** 39 JSON blob fields identified in the 1,991-line schema — only a handful have documented shapes in inline comments, none have enforced Zod validation at the read/write boundary. Approximately 25+ API route files bypass `parseBody` and use raw `req.json()`. The schema has 63 existing indexes but key FK columns (entityId, assetId, dealId on join tables without composite indexes) are missing. No orphaned models were found, but individual nullable fields with unclear usage need judgment calls.

**Track 3 (UI):** The UI primitives are functional but sparse. The `select.tsx` is a native HTML select — the weakest primitive by far. `modal.tsx` uses createPortal with no animation, no focus trap, and basic styling. The `tabs.tsx` has no dark mode on the active state. LP pages (lp-activity, lp-portfolio, lp-settings) have hardcoded light backgrounds without dark: variants. The `PageErrorBoundary` already wraps all content via `app-shell.tsx` — page-level coverage is actually already solved. The gap is `SectionErrorBoundary` usage on individual sections.

**Primary recommendation:** Work Track 1 first (bugs and dead code), then Track 2 (schema + Zod audit), then Track 3 (UI polish). This order ensures functional correctness is locked before cosmetic work begins.

---

## Standard Stack

### Core (already installed — verified from package.json)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Zod | 4.3.6 | Schema validation | Partial coverage — expand to all routes and JSON fields |
| Prisma | 7.4.2 | ORM + schema migrations | In use; `db push --force-reset` required for schema changes |
| Tailwind CSS | 4.x | Utility styling | Full coverage; dark: variants pattern established |
| Vitest | 4.0.18 | Test runner | 734 passing, 7 failing — baseline for regression tests |
| lucide-react | 0.575.0 | Icons | Already imported across all features |
| SWR | 2.4.1 | Client-side data fetching | Established pattern throughout |

### Logging Decision (Claude's Discretion)

| Option | Bundle Impact | Setup | Log Levels | Recommendation |
|--------|--------------|-------|-----------|----------------|
| Custom logger (no deps) | Zero | Trivial | Manual | Best for this scale |
| Pino | ~20KB | Low | Built-in | Good if structured JSON needed |
| Winston | ~80KB | Medium | Built-in | Overkill for this scale |

**Recommendation:** Custom logger utility (`src/lib/logger.ts`). Zero dependency cost. Supports `error/warn/info/debug` levels. In development, all levels log. In production (`NODE_ENV === "production"`), only `error` and `warn` log. Simple to implement, easy to swap for Pino/Winston later if structured JSON becomes needed.

```typescript
// src/lib/logger.ts pattern
const isDev = process.env.NODE_ENV !== "production";
export const logger = {
  error: (msg: string, meta?: unknown) => console.error(`[ERROR] ${msg}`, meta ?? ""),
  warn:  (msg: string, meta?: unknown) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  info:  (msg: string, meta?: unknown) => { if (isDev) console.log(`[INFO] ${msg}`, meta ?? ""); },
  debug: (msg: string, meta?: unknown) => { if (isDev) console.log(`[DEBUG] ${msg}`, meta ?? ""); },
};
```

### UI Component Strategy (shadcn/ui-inspired, no migration)

No new packages required. shadcn/ui-inspired = Tailwind + Radix primitives design language applied manually. Key upgrades to existing primitives:

| Component | Current Weakness | Upgrade Target |
|-----------|-----------------|----------------|
| `select.tsx` | Native HTML `<select>` — no custom dropdown, browser-styled | Custom dropdown with chevron icon, option hover states, keyboard nav |
| `modal.tsx` | No CSS animation, no focus trap, basic close button | Fade-in backdrop + slide-up panel, `autoFocus` on first interactive element |
| `tabs.tsx` | Active state has no dark: variant | Add `dark:bg-indigo-500 dark:text-white` to active state |
| `badge.tsx` | Already good — has dark variants | Minor: ensure charts/status badges render in dark |
| `button.tsx` | Missing `ghost` and `outline` variants needed on some pages | Add ghost variant for icon-only buttons |

**Do NOT install:** `@radix-ui/*`, `cmdk`, `class-variance-authority`, or any shadcn/ui packages. The design language is the target, not the library.

---

## Architecture Patterns

### Zod JSON Schema Pattern

For each JSON blob field, define a Zod schema at module level and validate on both read (API GET) and write (API POST/PUT):

```typescript
// Source: existing Zod 4 patterns in src/lib/schemas.ts
import { z } from "zod";

// Define shape
export const DealMetadataSchema = z.object({
  targetSize: z.string().optional(),
  expectedClose: z.string().optional(),
  sector: z.string().optional(),
}).nullable();

// Validate on read (API route)
const meta = DealMetadataSchema.safeParse(deal.dealMetadata);
const dealMetadata = meta.success ? meta.data : null;

// Validate on write
const UpdateDealSchema = z.object({
  dealMetadata: DealMetadataSchema.optional(),
});
```

### API Route Zod Pattern (standardized)

Routes currently using raw `req.json()` should be upgraded to `parseBody`:

```typescript
// Current gap (25+ routes):
const body = await req.json();
// Becomes:
const { data, error } = await parseBody(req, YourSchema);
if (error) return error;  // auto 400 with field errors
```

**Uniform error response shape** (already in `parseBody` — maintain it):
```json
{ "error": { "formErrors": [], "fieldErrors": { "field": ["message"] } } }
```

### Structured Logger Pattern

Replace all `console.log/warn/error` with logger calls:

```typescript
// Current:
console.log("AI extraction started", documentId);
console.error("Failed to fetch deals:", e);

// After:
import { logger } from "@/lib/logger";
logger.info("AI extraction started", { documentId });
logger.error("Failed to fetch deals", { error: e.message });
```

### BUG-03 Fix Pattern (IC Memo Timeout)

The current pattern in `dd-analyze` returns a response after 60 seconds via `maxDuration = 60`. The UI polling for completion does not handle the timeout error case:

```typescript
// API route fix: return explicit error on timeout
const result = await Promise.race([
  aiCall(),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT")), 55_000)
  ),
]);
// On catch: return NextResponse.json({ error: "AI generation timed out" }, { status: 504 })

// Frontend fix: handle 504 explicitly
if (res.status === 504) {
  setGenerating(false);
  toast.error("AI generation timed out. Try again with a smaller document.");
  return;
}
```

### Dark Mode Audit Pattern

LP pages missing dark: variants follow a clear pattern — `bg-white` without `dark:bg-gray-900` and `bg-gray-50` without `dark:bg-gray-800`:

```typescript
// Current (LP pages - lp-activity, lp-portfolio, lp-settings):
<div className="bg-white rounded-xl border border-gray-200">
// Fix:
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">

// Current:
<tr className="border-t border-gray-50 hover:bg-gray-50">
// Fix:
<tr className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
```

### Recommended Project Structure (no changes needed)

Existing structure is correct. Phase 20 adds:
```
src/
├── lib/
│   └── logger.ts           # NEW: structured logger utility
│   └── json-schemas.ts     # NEW: Zod schemas for all JSON blob fields
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible modal focus trap | Custom focus management | Leverage existing `document.addEventListener` + `tabIndex` | The current modal uses `createPortal` correctly; add `autoFocus` to first input and trap tab with keydown handler |
| Custom select dropdown | Complex virtualized list | Simple `<div role="listbox">` with keyboard nav | At this scale (< 50 options), no virtualization needed |
| Logging framework | Complex structured logger | Custom 10-line logger in `src/lib/logger.ts` | Zero deps, same interface, trivially swappable |
| JSON validation middleware | Per-route custom parsing | Extend existing `parseBody` + define Zod schemas in `src/lib/json-schemas.ts` | Pattern already established; just needs coverage |

---

## Common Pitfalls

### Pitfall 1: Prisma Force-Reset Wipes AiConfig
**What goes wrong:** Any `prisma db push --force-reset` clears the AiConfig table. The tenant AI key must be re-entered in Settings after any schema migration.
**Why it happens:** Force-reset truncates all tables before re-creating schema.
**How to avoid:** Document in plan. For schema changes in Phase 20, plan step must include "re-enter AI key in Settings after migration."
**Warning signs:** Command bar stops working after schema push; AI features return "No API key configured."

### Pitfall 2: Zod 4 `z.record()` Syntax
**What goes wrong:** `z.record(z.unknown())` causes TypeScript error in Zod 4.
**Why it happens:** Zod 4 changed the `z.record()` API to require explicit key + value types.
**How to avoid:** Always use `z.record(z.string(), z.unknown())` — discovered in Phase 19.
**Warning signs:** TypeScript build error on `z.record(...)` usage.

### Pitfall 3: LP Dashboard Test Failing (Known Issue)
**What goes wrong:** `src/app/api/lp/__tests__/dashboard.test.ts` fails with `prisma.metricSnapshot.findMany is not a function` (7 tests, 1 test file).
**Why it happens:** The mock in the test file doesn't include `findMany` on `metricSnapshot` — the route was updated in Phase 17 to call `findMany` but the test mock was not updated.
**How to avoid:** Fix the mock in Phase 20. Add `findMany: vi.fn().mockResolvedValue([])` to the `metricSnapshot` mock object.
**Warning signs:** `npm run test` shows 7 failing tests in `lp/__tests__/dashboard.test.ts`.

### Pitfall 4: `as any` in Document Category Upload
**What goes wrong:** `src/app/api/documents/route.ts:117` uses `category: category as any` to bypass Zod.
**Why it happens:** The category enum was added to Zod schema but the cast was never removed.
**How to avoid:** In Phase 20, remove the `as any` cast and ensure `DocumentCategory` enum is properly validated via `z.nativeEnum(DocumentCategory)` from Prisma.

### Pitfall 5: console.log in Client Components Goes to Browser DevTools
**What goes wrong:** 210 console calls are in 111 files — some are in server-side API routes, some in client components. Client-side logs are visible in browser DevTools and may include sensitive data.
**Why it happens:** No distinction between server/client logging environments was enforced during development.
**How to avoid:** The custom logger should check `typeof window === "undefined"` to distinguish server vs client context if needed, or simply replace all with `logger.*` uniformly.

### Pitfall 6: Dark Mode Requires Tailwind `dark` Class on `<html>`
**What goes wrong:** Dark mode classes don't activate if `class="dark"` is not on the `<html>` element.
**Why it happens:** Tailwind 4's `darkMode: 'class'` strategy requires a DOM ancestor with `class="dark"`.
**How to avoid:** Before the dark mode audit, verify the theme toggle sets `document.documentElement.classList.toggle("dark")`. Confirm dark mode is actually activating before auditing each page.

### Pitfall 7: PageErrorBoundary Already Covers All Routes
**What goes wrong:** The plan might redundantly wrap individual pages with `PageErrorBoundary` when it's already applied globally.
**Why it happens:** `app-shell.tsx:71` already wraps `{children}` in `<PageErrorBoundary>`. Individual pages don't need their own page-level boundary.
**How to avoid:** The correct gap is `SectionErrorBoundary` on individual sections (charts, data panels) — not re-wrapping the page. Check which panels inside each page lack `SectionErrorBoundary`.

---

## Code Examples

### Zod for JSON Blob Validation

```typescript
// src/lib/json-schemas.ts — define all 39 JSON field shapes here

// Deal.dealMetadata
export const DealMetadataSchema = z.object({
  extractedSize: z.string().optional(),
  expectedReturn: z.string().optional(),
  structure: z.string().optional(),
}).nullable().default(null);

// Entity.navProxyConfig
export const NavProxyConfigSchema = z.object({
  cashPercent: z.number().min(0).max(100),
  otherAssetsPercent: z.number().min(0).max(100),
  liabilitiesPercent: z.number().min(0).max(100),
}).nullable().default(null);

// Entity.regulatoryFilings — array of filing objects
export const RegulatoryFilingSchema = z.object({
  type: z.string(),
  filedDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
export const RegulatoryFilingsSchema = z.array(RegulatoryFilingSchema).nullable().default(null);

// Meeting.decisions
export const MeetingDecisionsSchema = z.object({
  actionItemsText: z.string().optional(),
  actionItemsList: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
}).nullable().default(null);

// Document.extractedFields
export const ExtractedFieldSchema = z.object({
  aiValue: z.unknown(),
  label: z.string(),
});
export const ExtractedFieldsSchema = z.record(z.string(), ExtractedFieldSchema).nullable().default(null);
```

### Custom Logger

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV !== "production";

type LogMeta = Record<string, unknown> | string | number | undefined;

export const logger = {
  error: (msg: string, meta?: LogMeta) => {
    console.error(`[ERROR] ${msg}`, meta ?? "");
  },
  warn: (msg: string, meta?: LogMeta) => {
    console.warn(`[WARN] ${msg}`, meta ?? "");
  },
  info: (msg: string, meta?: LogMeta) => {
    if (isDev) console.log(`[INFO] ${msg}`, meta ?? "");
  },
  debug: (msg: string, meta?: LogMeta) => {
    if (isDev) console.log(`[DEBUG] ${msg}`, meta ?? "");
  },
};
```

### Upgraded Select Component (shadcn/ui-inspired)

```typescript
// Key design target: custom dropdown with Tailwind, keyboard nav, chevron icon
// No Radix dependency — pure Tailwind + React
"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption { value: string; label: string; }
interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Select({ options, value, onChange, placeholder, error, disabled, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm",
          "bg-white dark:bg-gray-800 border rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
          error ? "border-red-300" : "border-gray-200 dark:border-gray-600",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn(!selected && "text-gray-400 dark:text-gray-500")}>
          {selected?.label ?? placeholder ?? "Select..."}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                value === opt.value && "text-indigo-600 dark:text-indigo-400 font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Prisma Index Gaps to Address

From direct schema inspection, these high-query columns are missing dedicated indexes:

```prisma
// Add to schema.prisma:

model Asset {
  // existing @@index([assetClass]) and @@index([status]) exist
  // MISSING: firmId (assets always queried with firmId filter)
  @@index([firmId])  // ADD THIS
  @@index([firmId, status])  // ADD THIS for list page filters
}

model CapitalCall {
  // MISSING: status index (overdue call queries filter by status)
  @@index([status])  // ADD THIS
  @@index([entityId, status])  // ADD THIS for entity-scoped queries
}

model Deal {
  // existing @@index([stage]) and @@index([firmId]) exist — good
  // MISSING: composite for common query pattern
  @@index([firmId, stage])  // ADD THIS
}

model Document {
  // MISSING: firmId index (documents always queried with firmId)
  @@index([firmId])  // ADD THIS
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser `confirm()` | `ConfirmDialog` component | Phase 11 | All destructive actions safe |
| Raw `req.json()` everywhere | `parseBody(req, Schema)` via `api-helpers.ts` | Phase 11 | Most POST/PUT routes validated |
| Hardcoded `"firm-1"` strings | `useFirm()` hook throughout | v1.0 | Multi-tenancy correct |
| `react-organizational-chart` library | Custom CSS flex layout | Phase 15 | Library reference kept but not used |
| Native `console.*` logging | Still console.* (Phase 20 target) | Not yet | 210 calls need replacement |

**Deprecated/outdated in this codebase:**
- `DealCategory` enum: Removed — replaced by `AssetClass + CapitalInstrument + ParticipationStructure`. Comment in schema at line 97 confirms removal.
- `SyncStatus.SYNCING`: Enum value exists in schema but no code path sets it — appears dead.
- `InviteStatus.PENDING`: Used in `User.inviteStatus` but no invite workflow exists in current codebase.

---

## Open Questions

1. **Oversized Component Refactor (Claude's Discretion)**
   - What we know: `deal-dd-tab.tsx` is 1,561 lines; `entities/[id]/page.tsx` is 1,554 lines. Both work correctly.
   - What's unclear: Does refactoring improve the hardening pass, or just move risk around?
   - Recommendation: Refactor the DD tab — it has complex state and is the primary location of BUG-01. Splitting workstream list, task panel, and modal logic into sub-components will make the bug fix cleaner. Entity page can stay monolithic since it's mostly read-only tabs.

2. **Orphaned Fields Determination**
   - What we know: `SyncStatus.SYNCING` value exists but no code sets it. `InviteStatus.PENDING` used but no invite flow exists.
   - What's unclear: Whether future features might use these, or whether they are truly dead.
   - Recommendation: Document (add comments) rather than remove. Removing enum values requires migration and may break if any existing records hold those values.

3. **LP Dashboard Test Mock Fix**
   - What we know: 7 vitest tests fail in `lp/__tests__/dashboard.test.ts` because `metricSnapshot.findMany` is missing from the Prisma mock.
   - What's unclear: Whether the LP dashboard route's `findMany` call was added after the tests were written.
   - Recommendation: Fix the mock in Wave 0/1 of Phase 20 as the first task. Add `findMany: vi.fn().mockResolvedValue([])` to the `metricSnapshot` object in the mock. Verify all 7 tests then pass.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | No explicit config file — uses package.json `"test": "vitest run"` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` (all tests run in ~1.45s) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTEG-01 | DD progress never exceeds 100%, falls back correctly | unit | `npm run test -- --reporter=verbose` | ✅ `deal-dd-progress.test.ts` |
| INTEG-02 | Pipeline conversion rate capped at 100% | unit | `npm run test -- --reporter=verbose` | ✅ `pipeline-conversion-rates.test.ts` |
| INTEG-03 | IC memo timeout returns error response, UI recovers | manual smoke | Open deal, generate IC memo, verify no infinite spinner | ❌ Wave 0 |
| INTEG-04 | Logger replaces console.* calls | unit (grep) | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| INTEG-05 | deal → asset transition works end-to-end | manual smoke | Close a deal, verify asset created | ❌ Wave 0 |
| INTEG-06 | LP dashboard metrics compute from real data | unit | `npm run test -- --reporter=verbose` | ✅ (fix mock first) `lp/__tests__/dashboard.test.ts` |
| SCHEMA-01 | JSON blob fields parse correctly with Zod schemas | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| SCHEMA-02 | All API routes reject malformed bodies with 400 | integration | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| SCHEMA-03 | Database indexes applied (verify via prisma studio or pg_indexes query) | manual | `npx prisma studio` + inspect indexes | n/a |
| UIPOL-01 | Modal renders with animation in both light and dark | manual smoke | Open any modal in dark mode | n/a |
| UIPOL-02 | Select shows custom dropdown in both light and dark | manual smoke | Open any select in dark mode | n/a |
| UIPOL-03 | All LP pages render correctly in dark mode | manual smoke | Toggle dark mode on each LP page | n/a |
| UIPOL-05 | pdf-parse types installed, no `as any` cast | build | `npm run build` | n/a — confirmed by build |
| UIPOL-06 | Zero `as any` bypasses in API routes | build + grep | `npm run build` | n/a |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run build`
- **Phase gate:** Full suite green + `npm run build` zero errors before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/logger.test.ts` — covers INTEG-04: logger.error always logs, logger.info/debug only in dev
- [ ] `src/lib/__tests__/json-schemas.test.ts` — covers SCHEMA-01: each JSON blob Zod schema parses valid and rejects invalid shapes
- [ ] Fix `src/app/api/lp/__tests__/dashboard.test.ts` — add `findMany: vi.fn().mockResolvedValue([])` to metricSnapshot mock (covers INTEG-06)
- [ ] `src/lib/__tests__/bug03-timeout.test.ts` — covers INTEG-03: API returns 504 on timeout, not hanging promise

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified by reading actual files
  - `prisma/schema.prisma` (1,991 lines, 39 Json fields confirmed)
  - `src/components/ui/` (24 primitives inspected)
  - `src/lib/__tests__/` (33 test files, vitest run confirmed 734 passing / 7 failing)
  - `src/app/api/` (166 route files found, ~25 bypass parseBody confirmed)
  - `.planning/codebase/CONCERNS.md` (bugs documented with file:line references)
  - `package.json` (exact library versions confirmed)
  - `src/components/layout/app-shell.tsx` (PageErrorBoundary confirmed already wrapping all pages)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` accumulated context — decisions from Phases 11-19 that constrain Phase 20 implementation
- `.planning/codebase/CONCERNS.md` — documented 2026-03-08, verified against current code

### Tertiary (LOW confidence)
- shadcn/ui design reference (21st.dev aesthetic) — subjective visual quality target, no formal spec

---

## Metadata

**Confidence breakdown:**
- Integration audit scope: HIGH — bugs have known file:line locations; console count directly measured (210 calls, 111 files)
- Schema gaps: HIGH — 39 Json fields counted directly; 25+ routes with raw req.json() confirmed by grep
- UI upgrade targets: HIGH — components inspected directly; dark mode gaps confirmed in LP pages
- Test infrastructure: HIGH — vitest run executed; 7 failing tests confirmed; test files listed
- Logging recommendation: MEDIUM — custom logger is lowest risk but Winston/Pino are viable alternatives

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable codebase — no external API dependencies for this phase)
