# Architecture

**Analysis Date:** 2026-03-08

## Pattern Overview

**Overall:** Next.js 16 full-stack monolith with multi-tenancy support (firm isolation), built-in role-based access control, and real-time data synchronization via SWR.

**Key Characteristics:**
- **Next.js App Router:** Client-side pages under `src/app/(gp)/` and `src/app/(lp)/` with API routes in `src/app/api/`
- **Multi-tenancy:** Firm context injected via FirmProvider, all queries filtered by `firmId` at API layer
- **React Context + SWR:** Client-side state management via context providers and SWR for server-side data caching
- **Type-safe validation:** Zod schemas for all API inputs, TypeScript strict mode enforced
- **Centralized routing:** Single route registry (`routes.ts`) drives sidebar, command bar, AI prompts, page titles
- **Stage-driven UI:** Deal workflow driven by state machine (deal-stage-engine.ts), tab visibility determined by stage
- **Audit + Permissions:** Request logging, role-based access checks, activity tracking

## Layers

**Presentation Layer (Client Components):**
- Location: `src/app/(gp)/`, `src/app/(lp)/`, `src/components/`
- Contains: React Server Components (RSC) pages, client components with "use client" directive
- Depends on: API routes, context providers, UI components
- Used by: End users (browsers)
- Example: `src/app/(gp)/deals/[id]/page.tsx` - Tabbed deal detail page with SWR data fetching

**API Layer (Route Handlers):**
- Location: `src/app/api/`
- Contains: Next.js route handlers, request validation, authentication/authorization, database queries
- Depends on: Prisma ORM, auth context, Zod schemas, business logic services
- Used by: Client pages, internal server-side operations
- Example: `src/app/api/deals/route.ts` - GET with pagination, POST with validation; filters by `firmId`

**Business Logic Layer:**
- Location: `src/lib/` (deal-stage-engine.ts, capital-activity-engine.ts, ai-service.ts, etc.)
- Contains: State machines, computations, external API integrations, data transformations
- Depends on: Prisma, external services (OpenAI, Slack, etc.)
- Used by: API routes, scheduled tasks
- Example: `src/lib/deal-stage-engine.ts` - Transitions deals through stages based on IC decisions, triggers notifications

**Data Access Layer:**
- Location: `src/lib/prisma.ts` (singleton), `prisma/schema.prisma`
- Contains: Prisma Client instance, 57 data models, relationships
- Depends on: PostgreSQL database
- Used by: API routes, business logic
- Pattern: Always import singleton `import { prisma } from "@/lib/prisma"` — never instantiate PrismaClient elsewhere

**UI Component Library:**
- Location: `src/components/ui/` (primitives), `src/components/features/` (domain components)
- Contains: Button, Badge, Modal, Toast, FileUpload, Select, DatePicker; domain-specific features (DealDetailCard, EntityForm, etc.)
- Depends on: Tailwind CSS, React, Lucide icons
- Used by: All pages
- Pattern: Reusable, composable, no business logic

## Data Flow

**Dashboard Load:**

1. User navigates to `/dashboard`
2. RSC page loads `DashboardPage` client component
3. Component calls `useFirm()` → reads `FirmContext` for `firmId`
4. Component calls `useSWR("/api/dashboard/entity-cards?firmId={firmId}", fetcher)`
5. Browser sends GET request to API route handler
6. Handler:
   - Extracts `firmId` from query params
   - Calls `getAuthUser()` to verify permission
   - Queries Prisma: `prisma.entity.findMany({ where: { firmId }, include: {...} })`
   - Returns paginated JSON
7. SWR caches response, triggers re-render
8. Page displays entity cards with loading skeleton

**Deal Workflow State Transition:**

1. User posts IC review decision (APPROVED/REJECTED/SEND_BACK) to `/api/deals/{id}/ic-process`
2. API route validates payload with Zod schema
3. Route calls `checkAndAdvanceDeal(dealId)` from deal-stage-engine
4. State machine:
   - Reads deal + IC process from DB
   - If IC_REVIEW + APPROVED: `update { stage: "CLOSING" }`
   - If IC_REVIEW + REJECTED: `update { stage: "DEAD" }`
   - Creates `dealActivity` audit record
   - Calls `notifyGPTeam()` (async, non-blocking)
   - Returns updated deal
5. API response triggers `mutate()` to revalidate SWR cache
6. UI re-renders with new stage, tabs change visibility per `stageTabs` mapping

**Form Submission (Mutation):**

1. User submits form → triggers `useMutation("/api/deals/{id}", { method: "PUT" })`
2. `useMutation` hook calls `apiMutate(url, data, options)`
3. Client sends PUT request with JSON body
4. API route handler:
   - Calls `parseBody(req, EditDealSchema)` — validates with Zod
   - If validation fails: returns 400 with field errors
   - If valid: calls `prisma.deal.update({ where: { id }, data: { ...validated } })`
   - Returns updated record
5. SWR key revalidation: `mutate("/api/deals/{id}")`
6. UI updates immediately with returned data, toast confirms success

**State Management:**

- **Global:** FirmContext (firm ID, list of accessible firms)
- **User:** UserProvider (authenticated user, role, firmId)
- **Server Cache:** SWR (handles fetching, caching, revalidation, loading states)
- **Local:** Component `useState()` for transient UI state (active tabs, open modals, form inputs)
- **Anti-pattern:** Redux, Zustand, or other external stores — use React Context + SWR

## Key Abstractions

**FirmProvider (Multi-tenancy):**
- Purpose: Isolate data by firm, prevent cross-tenant leakage
- Location: `src/components/providers/firm-provider.tsx`
- Exports: `useFirm()` hook → `{ firmId, firmName, firms, setFirmId, isLoading }`
- Pattern: Every API call includes `?firmId={firmId}` query param or request body; API layer filters results
- Usage: All pages must call `const { firmId } = useFirm()` before fetching data

**UserProvider (Authentication):**
- Purpose: Manage authenticated user state, sync with Clerk auth
- Location: `src/components/providers/user-provider.tsx`
- Exports: `useUser()` hook → `{ user, isLoading }` where user contains `id, role, firmId, email`
- Pattern: Drives FirmProvider initialization, controls portal routing (LP vs GP)
- Dev mode: Mock user provider with 8 pre-seeded users

**Routes Registry (Route Authority):**
- Purpose: Single source of truth for all app routes; drives sidebar, command bar, AI, page titles
- Location: `src/lib/routes.ts`
- Exports: `APP_ROUTES` array, `getSidebarNav()`, `getPageTitle()`, `generateAIRouteList()`
- Pattern: Adding a new page requires one entry in `APP_ROUTES` — everything auto-updates
- Usage: Don't hardcode route paths in components; always derive from registry

**parseBody (Request Validation):**
- Purpose: Validate API request bodies against Zod schemas, return typed data or 400 error
- Location: `src/lib/api-helpers.ts`
- Signature: `async function parseBody<T>(req: Request, schema: ZodType<T>) → { data: T | null, error: NextResponse | null }`
- Pattern: Every POST/PUT/PATCH route must use this; auto-formats validation errors as Zod flatten structure
- Usage: `const { data, error } = await parseBody(req, CreateDealSchema); if (error) return error;`

**Deal Stage Engine (State Machine):**
- Purpose: Orchestrate deal workflow transitions, enforce stage rules, trigger side effects
- Location: `src/lib/deal-stage-engine.ts`
- Exports: `checkAndAdvanceDeal(dealId)` — reads deal state, applies rules, updates stage, logs activity, notifies team
- Rules: SCREENING→DUE_DILIGENCE (direct), IC_REVIEW+APPROVED→CLOSING, IC_REVIEW+REJECTED→DEAD, IC_REVIEW+SEND_BACK→DUE_DILIGENCE
- Pattern: Called after IC vote is posted; handles state transition, audit trail, notifications atomically

**Capital Activity Engine (Financial Calculations):**
- Purpose: Track capital calls, distributions, and fund liquidity events
- Location: `src/lib/capital-activity-engine.ts`
- Exports: Functions for issuing capital calls, recording distributions, recalculating capital accounts
- Pattern: Used by `/api/capital-calls/` and `/api/distributions/` routes

**AI Service (Command Bar + Deal Screening):**
- Purpose: Enrich command bar with database context, power deal screening and memo generation
- Location: `src/lib/ai-service.ts`
- Depends on: OpenAI, Anthropic (selectable per firm)
- Pattern: Gathers portfolio aggregates from DB (deal counts by stage, entity breakdown, etc.), streams AI response
- Usage: Command bar on every page, IC Review tab memo generation

**Error Boundary (Graceful Degradation):**
- Purpose: Catch React component errors, prevent full-page crashes
- Location: `src/components/ui/error-boundary.tsx`
- Exports: `PageErrorBoundary` (wraps entire page), `SectionErrorBoundary` (wraps card/section)
- Pattern: PageErrorBoundary in app-shell.tsx at layout level; SectionErrorBoundary around data-fetching sections
- Behavior: Shows error message + "Retry" button; logs to console

**Pagination (Cursor-based):**
- Purpose: Handle large result sets efficiently
- Location: `src/lib/pagination.ts`
- Pattern: Query params `cursor`, `limit`, `search`, `orderBy`; returns paginated results + `hasNext` boolean
- Usage: Deal list, entity list, document list pages use cursor-based pagination for large datasets

## Entry Points

**User Browser → App:**
- Location: `src/app/layout.tsx` (RootLayout)
- Triggers: Page load, user navigation
- Responsibilities:
  1. Wraps children in provider chain: ThemeProvider → ClerkWrapper → ToastProvider → UserProvider → FirmProvider → CommandBarProvider → GlobalDialogsProvider → AppShell
  2. Loads global CSS and fonts
  3. Sets metadata (title, description)

**AppShell (Layout):**
- Location: `src/components/layout/app-shell.tsx`
- Triggers: Every page render (wraps all non-auth pages)
- Responsibilities:
  1. Detects auth routes (sign-in, sign-up) and renders them bare (no sidebar)
  2. Routes LP users to `/lp-dashboard` (portal routing)
  3. Renders Sidebar + TopBar + page content
  4. Wraps page in PageErrorBoundary

**Page Routes (App Router):**
- Location: `src/app/(gp)/{feature}/page.tsx` and `src/app/(gp)/{feature}/[id]/page.tsx`
- Example: `src/app/(gp)/deals/page.tsx`, `src/app/(gp)/deals/[id]/page.tsx`
- Triggers: User navigation or direct URL access
- Pattern: All marked `"use client"`; call `useFirm()` to get firmId; fetch data with SWR; render tabs/sections
- Responsibilities: Call API routes, manage local UI state, compose feature components

**API Routes (Route Handlers):**
- Location: `src/app/api/{resource}/route.ts` and `src/app/api/{resource}/[id]/route.ts`
- Triggers: Client-side fetch(), form submissions, SWR calls
- Pattern: GET (list/detail), POST (create), PUT/PATCH (update), DELETE (delete)
- Responsibilities:
  1. Validate request (parseBody for POST/PUT/PATCH, query params for GET)
  2. Authenticate (getAuthUser())
  3. Authorize (checkPermission if GP_TEAM)
  4. Fetch/modify data (Prisma queries, include relations)
  5. Return NextResponse.json() or NextResponse.json(error, { status: 4xx/5xx })

**Background/Server Operations:**
- Cron jobs: Not yet integrated; future use
- Webhooks: Slack (ice-voting), Svix (external events) — handlers in `src/lib/`
- Seeding: `prisma/seed.ts` and `prisma/seed-tenant.ts` — run via `npx prisma db seed`

## Error Handling

**Strategy:** Layered validation and graceful degradation.

**Patterns:**

1. **Request Validation (API):** `parseBody()` returns `{ data, error }` tuple; if error, return early with 400 status and Zod flatten structure

2. **Database Errors (Prisma):** Catch in try-catch blocks; return specific HTTP status:
   - `P2002` (unique constraint) → 409 Conflict
   - `P2025` (record not found) → 404 Not Found
   - Other → 500 Internal Server Error with generic message

3. **Client-side SWR Errors:** If fetch fails, SWR sets `error` state; components should check `isLoading || !data` before rendering

4. **Component Error Boundaries:** Catch any unhandled errors in render phase; show retry UI instead of white screen

5. **API Response Errors:** Check `res.ok` before calling `.json()`; throw with descriptive message

6. **Toast Error Messages:** Never pass object to toast (will crash); extract message string first: `typeof data.error === "string" ? data.error : "Failed"`

## Cross-Cutting Concerns

**Logging:** `logAudit(description, metadata)` records all state changes, called in deal-stage-engine, capital-activity-engine, etc.

**Validation:** Zod schemas centralized in `src/lib/schemas.ts`; applied at request boundary via `parseBody()`

**Authentication:** Clerk in production; mock UserProvider in dev. All API routes call `getAuthUser()` to verify token.

**Authorization:** Role-based via GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR; checked in API routes with `checkPermission(perms, resource, action)`

**Filtering (Multi-tenancy):** All Prisma queries include `where: { firmId }` condition; FirmProvider ensures `firmId` is available on every page

**Notifications:** `notifyGPTeam(type, subject)` for Slack; `notifyLP(investorId, message)` for LP emails (async, non-blocking)

**Rate Limiting:** `src/lib/rate-limit.ts` — limits API calls per user per window; used in expensive routes

---

*Architecture analysis: 2026-03-08*
