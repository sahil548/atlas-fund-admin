# Atlas — Audit Summary & Scorecard

Honest assessment of where Atlas stands as of 2026-03-05 (corrected). Based on full codebase audit of all 57 Prisma models, 73 API routes, ~19 GP pages, 5 LP pages.

---

## Overall Scorecard

| Category | Score | Summary |
|----------|-------|---------|
| Implementation Completeness | 8/10 | Core features work. Deal desk strong. Auth works in production. Financial computation code exists (needs verification). |
| Code Quality | 6.5/10 | Strong API patterns (Zod, parseBody, firmId scoping). Some duplication. No error boundaries. No tests. |
| Architecture | 7/10 | Route registry excellent. Feature folders clear. Missing middleware, rate limiting, pagination. |
| Styling & UX | 6/10 | Tailwind clean and consistent. Dark mode works. Needs design tokens, accessibility work. |
| Scalability | 5/10 | Multi-tenancy works but no pagination = performance problem at scale. No background jobs. |
| Documentation | 7/10 | CLAUDE.md and coding patterns excellent for development. Missing API docs (Swagger), component guide (Storybook). |
| **Overall** | **7/10** | Production-deployed with real auth and data. Strong foundation. Needs verification of existing features and infrastructure hardening. |

---

## What's Strong

### Route Registry Pattern (Excellent)
`src/lib/routes.ts` is a single source of truth. Add one entry and sidebar, command bar, AI routing, and page titles all auto-update. This is the best architectural pattern in the codebase.

### API Design Patterns (Strong)
- Every POST/PUT uses `parseBody(req, ZodSchema)` for validation
- Every query filters by `firmId` for multi-tenancy
- Specific Prisma error codes (P2002 = conflict, P2025 = not found)
- Proper HTTP status codes (201 for create, 400 for validation, 404 for not found)

### Deal Desk (Most Complete Feature)
- Full pipeline: Screening → DD → IC Review → Closing → Closed
- AI-powered workstream analysis with IC memo generation
- IC voting with threaded Q&A
- DD workstream templates per asset class
- Stage progression with visual progress bar

### Authentication (Production-Ready)
- Clerk 7 works in production with real data
- Mock UserProvider for local dev with 8 pre-seeded users
- Middleware configured, webhook handler, auto-provisioning
- Sign-in/sign-up pages functional

### Multi-Tenancy (Well Implemented)
- FirmProvider context used consistently
- firmId scoping on all API queries
- No hardcoded "firm-1" in the codebase

### Domain Model Comprehensiveness
- 57 Prisma models covering every domain area
- Complex asset ownership (multi-entity allocations)
- Contract-level detail (leases, credit agreements, covenants)
- Full capital flow models (calls, distributions, waterfalls, fees)

### Financial Computation Code (Exists)
- XIRR/IRR calculation with Newton-Raphson method (`computations/irr.ts`)
- Waterfall distribution with multi-tier LP/GP splits (`computations/waterfall.ts`)
- Capital account roll-forward logic (`computations/capital-accounts.ts`)
- API endpoints wired to computation functions
- **Caveat: correctness not verified**

---

## What's Weak

### Unverified Features (Primary Concern)
Many features have code but have never been tested end-to-end. The user has focused on screening/DD — later deal stages, capital workflows, and computation engines are untested. Phase 1 of the new roadmap addresses this.

### No Role Enforcement
Clerk auth works, but no middleware enforces role-based access. Any authenticated user can access any route. GP_ADMIN, GP_TEAM, SERVICE_PROVIDER distinctions exist in the model but not in practice.

### No Pagination
Every data list loads all records at once. With 10 LPs and 12 assets this is fine. With 1,000 transactions or 100 deals, the app will slow significantly.

### No Error Boundaries
A single malformed API response can crash the entire page. No graceful degradation anywhere.

### No Tests
Zero test files. Only validation is `npm run build` (TypeScript checking). No unit tests, no integration tests, no E2E tests.

### Some Code Duplication
- Stage configuration (STAGE_CONFIG object) defined in 3+ files
- Deal/asset list table headers copy-pasted
- Some Zod schemas defined inline rather than reused from `schemas.ts`

### Toast Error Handling
API errors can be objects (Zod validation results), not strings. Passing an object to `toast.error()` crashes React. Not all error handlers check the type.

---

## What's Not Built

### Integrations
- QBO/Xero real OAuth and API (UI-only today)
- Email/SMS notification delivery (no SendGrid/Twilio)
- DocuSign for closing docs (stub endpoint, no real API)
- Meeting transcription (Fireflies model exists, no webhook)

### Infrastructure
- API rate limiting (especially on AI endpoints)
- Request timeouts for long-running AI analysis
- Background job processing (for accounting sync, notifications)
- Code splitting / lazy loading
- Performance monitoring / error tracking

### UX Polish
- Loading skeletons (tables flash on refetch)
- Empty states for all pages (some pages show nothing when data is empty)
- Keyboard navigation for forms
- Accessibility (ARIA labels, color contrast in some badges)
- Mobile responsive layout (not tested)

---

## Known Bugs (Need Re-verification)

These were documented March 5 but status is unknown — they may have been fixed.

| Bug | Severity | Where |
|-----|----------|-------|
| DD tab shows 0%/NOT_STARTED for deals past DD stage | Critical | `deal-dd-tab.tsx` — workstream status not synced with deal stage |
| Pipeline pass rate shows 300% | Critical | `deals/page.tsx` — calculation divides incorrectly |
| IC Memo "Generating..." spinner stuck on some deals | High | `deal-overview-tab.tsx` — no timeout or error fallback |

---

## Top Improvement Priorities (by Impact)

### Immediate (Phase 1 — Verify & Stabilize)
1. **Verify computation engines** — Test IRR, waterfall, capital accounts against known-good inputs
2. **Test full deal pipeline** — Screen → DD → IC → Close → Asset creation end-to-end
3. **Re-check known bugs** — Fix if still present
4. **Test capital workflows** — Capital calls, distributions, waterfall calculations

### Short-term (Phases 2-3)
5. **Deal-to-asset auto-creation** — Core workflow gap (deal closes but asset not created — or is it?)
6. **Wire computation engines to UI** — Replace seeded display values with computed values
7. **Fee calculation engine** — Model exists, no logic
8. **Return metrics wired end-to-end** — TVPI, DPI, RVPI, MOIC from actual cash flows

### Medium-term (Phase 4)
9. **Role enforcement** — Required for multi-user security
10. **Pagination** — Required before data grows
11. **Error boundaries** — Required for production reliability

### Longer-term (Phases 5-7)
12. **QBO/Xero real OAuth** — Required for real financial data
13. **LP portal with computed data** — Currently may show seeded metrics
14. **Notification delivery** — Capital call/distribution notices
15. **Reports and exports** — PDF/Excel generation

---

## Architecture Recommendations

### Keep (These are working well)
- Route registry pattern
- Zod + parseBody API validation
- SWR for client data fetching
- FirmProvider multi-tenancy
- Feature folder component organization
- Prisma singleton import
- Clerk auth setup

### Add
- Error boundaries at page level (catch malformed responses)
- Pagination helper (reusable across all list endpoints)
- API middleware (logging, timing, rate limiting)
- Toast error type checking (always check `typeof error === "string"`)
- Background job runner (for accounting sync, AI analysis, notifications)

### Consider
- Adding a thin service layer between API routes and Prisma (for computation logic)
- Financial calculations already in `src/lib/computations/` — good pattern, extend it
- Adding end-to-end tests for critical workflows (deal lifecycle, capital calls)
