# Codebase Concerns

**Analysis Date:** 2026-03-08

## Tech Debt

**AI Service Timeout Handling (BUG-03):**
- Issue: 90-second timeout on IC memo generation can leave "Generating..." spinner stuck if timeout expires
- Files: `src/app/api/deals/[id]/extract-metadata/route.ts`, `src/app/api/deals/[id]/dd-analyze/route.ts`, `src/app/(gp)/deals/[id]/page.tsx:253`
- Impact: Users see indefinite loading state; must refresh page to recover
- Fix approach: Implement Promise.race timeout with proper UI error handling instead of silent failure. Return error response from API that frontend catches and displays as toast.
- Status: Marked as BUG-03 regression in code; needs re-verification per CLAUDE.md

**Type Safety Regression - Heavy use of `any`:**
- Issue: Multiple components use `any` type for API response fields to bypass type-checking, particularly for nested structures from workstreams and analysis results
- Files: `src/components/features/deals/deal-dd-tab.tsx:17`, `src/components/features/deals/deal-notes-tab.tsx:11`, `src/components/features/deals/deal-documents-tab.tsx:29`, `src/components/features/deals/deal-activity-tab.tsx:45`, `src/components/features/deals/deal-ic-review-tab.tsx:13`
- Impact: Refactoring becomes risky; missing fields go unnoticed; harder to track data shape changes
- Fix approach: Define explicit interface types for all API responses; phase out `any` types. Use shared type definitions in `src/lib/schemas.ts` or new dedicated types file.

**Untyped PDF-Parse Import:**
- Issue: `pdf-parse` import uses `as any` cast to suppress type errors
- Files: `src/lib/document-extraction.ts:23`
- Impact: Breaks document text extraction if API changes; errors not caught at compile time
- Fix approach: Install `@types/pdf-parse` or create type stub; remove `as any` cast

**Progress Calculation May Exceed 100%:**
- Issue: Task-based progress calculation in deal-dd-tab does not clamp result to 100% when completedTasks > totalTasks (data anomaly)
- Files: `src/components/features/deals/deal-dd-tab.tsx:93-100`
- Impact: UI displays >100% progress if DB is corrupted; workstream-status fallback path IS bounded, task path IS NOT
- Fix approach: Add Math.min(100, result) guard to task-based calculation path. Test documented in `src/lib/__tests__/deal-dd-progress.test.ts:137-143`
- Status: BUG-01 regression - partially guarded but not fully. Re-verification needed.

**Pipeline Conversion Rate May Exceed 100%:**
- Issue: Math.min(100) guard IS present in conversion rate calculations, but test documents potential for future regression
- Files: `src/app/api/deals/route.ts:90-103`
- Impact: Pipeline pass rates show >100% under anomalous data conditions
- Fix approach: Guard is already in place; ensure it is never removed. Tests in `src/lib/__tests__/pipeline-conversion-rates.test.ts` verify this.
- Status: BUG-02 regression - appears fixed but regression tests exist for verification

**DD Tab Shows 0% for Completed Deals:**
- Issue: DD progress calculation shows NOT_STARTED/0% for deals past DD stage (e.g., in IC_REVIEW or CLOSING)
- Files: `src/components/features/deals/deal-dd-tab.tsx:67-84`
- Impact: Confusing UX - closed/completed deals show incomplete DD progress
- Fix approach: Fall back to workstream-status when tasks are 0; filter out IC_MEMO workstreams. Logic appears to handle this, but needs re-verification per CLAUDE.md
- Status: BUG-01 regression - needs re-verification

**Console Logging in Production:**
- Issue: Extensive use of console.log/warn/error throughout codebase for debugging (373 total occurrences across 170 files)
- Files: `src/lib/ai-service.ts`, `src/lib/slack.ts`, `src/lib/auth.ts`, `src/lib/audit.ts`, and many others
- Impact: Logs clutter browser DevTools; secrets may leak if sensitive data logged; performance overhead
- Fix approach: Replace with structured logging system (Winston, Pino) for production; only log at ERROR level; sanitize error messages
- Priority: Medium - not breaking but impacts observability

---

## Known Bugs

**IC Memo Spinner Hangs on Timeout (BUG-03):**
- Symptoms: "Generating..." text persists indefinitely; page must be refreshed to recover
- Files: `src/app/(gp)/deals/[id]/page.tsx:259`, `src/app/api/deals/[id]/extract-metadata/route.ts:105-108`
- Trigger: IC memo analysis exceeds 90 seconds (Vercel Hobby timeout limit); AI call times out
- Workaround: Refresh page; reduce document size or improve AI prompt efficiency
- Status: Documented as BUG-03 but marked as "needs re-verification" in CLAUDE.md

**Workstream Progress Calculation Fallback (BUG-01):**
- Symptoms: DD tab shows 0% for deals past DD stage; calculator should fallback to workstream-status when tasks=0
- Files: `src/components/features/deals/deal-dd-tab.tsx:104`, `src/lib/__tests__/deal-dd-progress.test.ts:37`
- Trigger: Deal moves to IC_REVIEW/CLOSING with no tasks created on workstreams
- Workaround: Create dummy tasks to trigger task-based calculation
- Status: Fallback logic is implemented but needs re-verification

**Pipeline Conversion Rate Anomaly (BUG-02):**
- Symptoms: Pipeline pass rates may exceed 100% under data anomalies
- Files: `src/lib/__tests__/pipeline-conversion-rates.test.ts:126-145`
- Trigger: Data corruption where pastScreening > totalDeals (should not occur with correct stage logic)
- Workaround: Math.min(100) guard already present; data anomaly must be fixed upstream
- Status: Regression tests in place; appears fixed but guarded

---

## Security Considerations

**No Explicit Role Enforcement at API Level:**
- Risk: Auth check uses firm ID and user existence but does not validate role/permissions on API routes
- Files: Multiple API routes in `src/app/api/` reference role in schemas but don't enforce in route handlers
- Current mitigation: Clerk middleware enforces authentication; `getAuthUser()` retrieves user; role check is partial in some routes
- Recommendations:
  - Add explicit role check middleware for GP-only vs LP-only routes
  - Create helper function `requireGPRole()` and `requireLPRole()` for all protected routes
  - Add permission matrix test covering all 6 roles

**Unvalidated File Upload Categories:**
- Risk: Document category field accepts `any` value; no validation that it matches predefined categories
- Files: `src/app/api/documents/route.ts:117`, `src/app/api/deals/[id]/documents/route.ts:79`
- Current mitigation: Zod schema exists but `category: category as any` bypasses it
- Recommendations: Remove `as any` cast; use discriminated union for valid categories; add test for rejected invalid categories

**Slack Signature Verification Incomplete:**
- Risk: Signature verification has console.warn but continues execution if secrets not configured
- Files: `src/lib/slack.ts:220-227`
- Current mitigation: Returns early if SLACK_SIGNING_SECRET not set; still processes request with warning
- Recommendations: Reject request with 403 if signature cannot be verified; don't fall through with warning

**AI Model Access Not Scoped to Firm:**
- Risk: AI configuration is per-firm but no explicit check that AI response is scoped to requesting firm's context
- Files: `src/lib/ai-service.ts`, `src/lib/ai-config.ts`
- Current mitigation: AI prompt includes deal context but doesn't explicitly exclude data from other firms
- Recommendations: Add firm ID to AI request payload; document that AI responses are read-only analysis

---

## Performance Bottlenecks

**DD Tab Component Size (1,563 lines):**
- Problem: `deal-dd-tab.tsx` is largest component in codebase
- Files: `src/components/features/deals/deal-dd-tab.tsx`
- Cause: All workstream management, task management, AI analysis UI, modal logic bundled together
- Improvement path:
  - Extract workstream list into `<WorkstreamList>` component
  - Extract task panel into `<TaskPanel>` component
  - Extract modal logic into separate modal components
  - Use code splitting at tab level to lazy-load DD tab only when selected

**Entities Page Size (1,212 lines):**
- Problem: `[id]/page.tsx` combines entity overview, accounting, attribution, navigation all in one file
- Files: `src/app/(gp)/entities/[id]/page.tsx`
- Cause: Tab architecture loads all content upfront
- Improvement path: Lazy-load tab components with `React.lazy()` + `Suspense`

**Multiple Promise.all Queries Without Timeout:**
- Problem: Promise.all chains wait indefinitely if one query hangs
- Files: Multiple API routes use `Promise.all([query1, query2, query3])` without timeout
- Examples: `src/lib/agent-registry.ts:193`, `src/app/api/dashboard/stats/route.ts:35`
- Improvement path: Wrap Promise.all in Promise.race with timeout; add maxDuration export on all API routes

**No Pagination on List Pages:**
- Problem: Tasks, documents, activities load ALL records; no limit/offset pagination
- Files: `src/app/(gp)/tasks/page.tsx`, `src/app/(gp)/documents/page.tsx`
- Impact: Slow initial load; memory spike as list grows to thousands
- Fix approach: Implement cursor-based pagination; add `take`, `skip` to all list queries

---

## Fragile Areas

**Workstream & Task Status Synchronization:**
- Files: `src/components/features/deals/deal-dd-tab.tsx`, `src/lib/deal-stage-engine.ts`
- Why fragile: Workstream status (NOT_STARTED, IN_PROGRESS, COMPLETE) can drift from task counts if tasks are created/deleted without workstream status update; frontend and DB can disagree
- Safe modification: Always update workstream status atomically with task mutations; add database constraint that triggers error if mismatch detected
- Test coverage: `src/lib/__tests__/deal-dd-progress.test.ts` covers calculation but not sync verification

**AI Response JSON Parsing:**
- Files: `src/app/api/deals/[id]/dd-analyze/route.ts:243`, `src/lib/dd-analysis-service.ts`
- Why fragile: Uses `jsonrepair()` to fix malformed JSON from LLM; if repair fails silently or returns invalid shape, parsing continues with garbage data
- Safe modification: Validate parsed JSON against Zod schema before saving; log full error if validation fails; never silently accept malformed data
- Test coverage: No tests for malformed JSON recovery

**Slack Integration Error Handling:**
- Files: `src/lib/slack.ts`
- Why fragile: All errors caught internally with console.warn; never raises exception so calling code doesn't know if IC message posted successfully
- Safe modification: Return null on error so caller can check; add error field to SlackPostResult type; don't swallow errors silently
- Test coverage: Cannot test without real Slack workspace (marked UNTESTABLE)

**Vercel 60-Second Route Timeout:**
- Files: `src/app/api/deals/[id]/extract-metadata/route.ts:7`, `src/app/api/deals/[id]/dd-analyze/route.ts:18`
- Why fragile: Both routes have `maxDuration = 60` but AI calls inside may exceed 60s on large documents; timeout race condition with Promise.race(aiCall, timeout)
- Safe modification: Reduce maxDuration to 55 to allow timeout handler to execute; implement retry logic with exponential backoff
- Test coverage: Timeout tested locally but not on Vercel production

---

## Scaling Limits

**Single Database Query per Page Load:**
- Current capacity: Supports ~100 concurrent users before query latency exceeds 1s
- Limit: No connection pooling visible in Prisma config; each request opens new connection
- Scaling path: Configure Prisma connection pool; use `@prisma/adapter-pg` (already installed); add PgBouncer or similar
- Priority: Medium - addresses database connection exhaustion

**No Caching Layer for Read-Heavy Operations:**
- Current capacity: Dashboard aggregations (stats, portfolio metrics) recalculate on every page load
- Limit: As portfolio size grows (100+ assets), dashboard takes 5+ seconds to load
- Scaling path: Add Redis cache layer; invalidate on mutations; use SWR with longer TTL for analytics endpoints
- Priority: High - dashboard is main entry point

**File Storage Unlimited:**
- Current capacity: `@vercel/blob` bucket has no quota enforcement visible
- Limit: No cleanup for deleted documents; old versions accumulate
- Scaling path: Implement file retention policy; delete from blob storage on document.delete(); monitor costs
- Priority: Medium - cost explosion risk

---

## Dependencies at Risk

**OpenAI/Anthropic SDK Dependency:**
- Risk: Both OpenAI and Anthropic SDKs installed; code assumes OpenAI but accepts Anthropic via config
- Impact: SDK versions may diverge; response formats incompatible; AI feature breaks on upgrade
- Migration plan:
  - Standardize on single SDK with adapter pattern
  - Or: Use LiteLLM library for universal LLM interface
  - Add integration tests for both providers

**Prisma 7.4.2:**
- Risk: Prisma is 3+ minor versions behind latest; using `@prisma/adapter-pg` at same version but schema may have changed
- Impact: Security patches not applied; new query optimizations unavailable
- Migration plan: Test upgrade to Prisma 8 in staging; check for schema compatibility; run full regression suite

**pdf-parse v2.4.5:**
- Risk: No TypeScript types; forces `as any` cast; may not support all PDF features
- Impact: If used on unusual PDFs, extraction may silently fail without error message
- Migration plan: Evaluate pdfjs-dist (better maintained) or use cloud PDF service (aws-textract) instead

**Zod v4.3.6:**
- Risk: Major version constraint; Zod 5 is available but has breaking changes
- Impact: Upgrade requires schema refactoring; worth evaluating when planning type cleanup
- Migration plan: Consider upgrade alongside type safety improvements (removing `any`)

---

## Missing Critical Features

**Error Boundaries for Frontend Routes:**
- Problem: No error boundary on page-level routes; JS error crashes entire page
- Blocks: Users cannot gracefully recover from component errors; must hard-refresh
- Files affected: All routes under `src/app/(gp)/` and `src/app/(lp)/`
- Fix approach: Wrap each page in ErrorBoundary; log to error tracking service

**Role-Based Access Control Enforcement:**
- Problem: Roles defined (GP_ADMIN, GP_TEAM, LP_LIMITED, LP_FULL, etc.) but not enforced at route level
- Blocks: LP users can access GP endpoints if they know URLs; GP_TEAM cannot be prevented from viewing sensitive LP data
- Files affected: All API routes in `src/app/api/`
- Fix approach: Create `requireRole(role)` middleware; apply to all protected routes

**Audit Trail Completeness:**
- Problem: `src/lib/audit.ts` logs some actions but many mutations don't trigger audit events
- Blocks: Cannot audit who changed what data; compliance risk for family office
- Files affected: Capital calls, distributions, investor modifications, document uploads
- Fix approach: Add audit hook to all mutation API routes; record user, timestamp, before/after values

**API Rate Limiting:**
- Problem: No rate limiting on any routes; DoS attack possible
- Blocks: Bad actor could spam AI endpoints and incur costs
- Files affected: All API routes, especially `dd-analyze`, `extract-metadata`, `screen`
- Fix approach: Use Vercel rateLimit or upstash redis; limit per user/IP

---

## Test Coverage Gaps

**AI Integration Untested:**
- What's not tested: OpenAI/Anthropic response parsing, timeout handling, malformed JSON recovery
- Files: `src/lib/ai-service.ts`, `src/lib/dd-analysis-service.ts`, `src/app/api/deals/[id]/dd-analyze/route.ts`
- Risk: AI features break silently; timeout hangs UI indefinitely; malformed responses corrupt data
- Priority: High - affects core deal workflow

**Financial Calculations Unverified:**
- What's not tested: IRR, waterfall, capital accounts computed correctly; only basic unit tests exist
- Files: `src/lib/computations/irr.ts`, `src/lib/computations/performance-attribution.ts`
- Risk: LPs see incorrect returns; fund accounting is wrong; catastrophic for investor relations
- Priority: Critical - financial correctness is non-negotiable

**Permission System Untested:**
- What's not tested: Each role actually restricted to correct endpoints; cross-firm data leakage not caught
- Files: `src/lib/permissions.ts`, `src/lib/__tests__/permissions.test.ts` (exists but incomplete)
- Risk: Security boundary violations; data exposure
- Priority: Critical - security is non-negotiable

**Slack Integration Untested:**
- What's not tested: Message posting, signature verification, IC voting workflow
- Files: `src/lib/slack.ts`, integration endpoints
- Risk: Cannot be tested without real Slack workspace; code paths never executed; changes break silently
- Priority: Medium - marked UNTESTABLE but could be mocked with jest-mock-slack

**End-to-End Workflows Untested:**
- What's not tested: Deal SCREENING → DUE_DILIGENCE → IC_REVIEW → CLOSING → CLOSED transition with all side effects
- Files: Multiple files across deals, documents, workstreams, capital calls
- Risk: State transitions silently fail; deals get stuck; LPs not notified
- Priority: High - affects production workflows

---

*Concerns audit: 2026-03-08*
