# Codebase Structure

**Analysis Date:** 2026-03-08

## Directory Layout

```
atlas/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (gp)/                      # GP admin portal (group route)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── deals/page.tsx
│   │   │   ├── deals/[id]/page.tsx
│   │   │   ├── assets/page.tsx
│   │   │   ├── entities/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── accounting/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── meetings/page.tsx
│   │   │   ├── directory/page.tsx
│   │   │   ├── companies/[id]/page.tsx
│   │   │   ├── investors/[id]/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── ...
│   │   ├── (lp)/                      # LP investor portal (group route)
│   │   │   ├── lp-dashboard/page.tsx
│   │   │   ├── lp-account/page.tsx
│   │   │   ├── lp-portfolio/page.tsx
│   │   │   ├── lp-activity/page.tsx
│   │   │   ├── lp-documents/page.tsx
│   │   │   └── lp-settings/page.tsx
│   │   ├── sign-in/page.tsx            # Clerk auth pages
│   │   ├── sign-up/page.tsx
│   │   ├── api/                        # API route handlers (73+ routes)
│   │   │   ├── deals/route.ts
│   │   │   ├── deals/[id]/route.ts
│   │   │   ├── assets/[id]/route.ts
│   │   │   ├── entities/[id]/route.ts
│   │   │   ├── capital-calls/route.ts
│   │   │   ├── distributions/route.ts
│   │   │   ├── documents/[dealId]/route.ts
│   │   │   ├── auth/me/route.ts
│   │   │   ├── firms/route.ts
│   │   │   └── ... (see `.planning/DATA-MODEL.md` for full route list)
│   │   ├── layout.tsx                  # Root layout, provider setup
│   │   └── globals.css                 # Tailwind + globals
│   ├── components/
│   │   ├── ui/                         # Primitive UI components
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── file-upload.tsx
│   │   │   ├── select.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   └── ... (10+ primitives)
│   │   ├── layout/                     # App shell components
│   │   │   ├── app-shell.tsx           # Main layout wrapper
│   │   │   ├── sidebar.tsx
│   │   │   └── top-bar.tsx
│   │   ├── features/                   # Domain-specific feature components
│   │   │   ├── deals/
│   │   │   │   ├── deal-overview-tab.tsx
│   │   │   │   ├── deal-dd-tab.tsx
│   │   │   │   ├── deal-ic-review-tab.tsx
│   │   │   │   ├── deal-closing-tab.tsx
│   │   │   │   ├── deal-documents-tab.tsx
│   │   │   │   ├── deal-activity-tab.tsx
│   │   │   │   ├── deal-notes-tab.tsx
│   │   │   │   ├── edit-deal-form.tsx
│   │   │   │   ├── add-workstream-form.tsx
│   │   │   │   ├── kill-deal-modal.tsx
│   │   │   │   ├── close-deal-modal.tsx
│   │   │   │   ├── inline-edit-field.tsx
│   │   │   │   └── ... (15+ deal-related)
│   │   │   ├── assets/ (asset detail, performance tab, etc.)
│   │   │   ├── entities/ (entity form, entity list, etc.)
│   │   │   ├── dashboard/ (entity cards, portfolio aggregates, lp comparison)
│   │   │   ├── documents/ (document list, upload, preview)
│   │   │   ├── command-bar/ (command bar provider, discovery, UI)
│   │   │   ├── accounting/ (accounting connect, trial balance)
│   │   │   ├── capital/ (capital calls, distributions)
│   │   │   ├── lp/ (lp-specific components)
│   │   │   └── ... (20+ feature directories)
│   │   └── providers/                  # Context providers
│   │       ├── firm-provider.tsx       # Multi-tenancy
│   │       ├── user-provider.tsx       # Auth user context
│   │       ├── clerk-wrapper.tsx       # Clerk setup
│   │       └── theme-provider.tsx      # Dark/light mode
│   ├── lib/                            # Shared utilities & business logic
│   │   ├── routes.ts                   # CENTRAL: route registry (40+ routes)
│   │   ├── prisma.ts                   # Prisma singleton
│   │   ├── api-helpers.ts              # parseBody(req, schema)
│   │   ├── auth.ts                     # getAuthUser(), auth utilities
│   │   ├── schemas.ts                  # 50+ Zod schemas (Deal, Entity, Asset, etc.)
│   │   ├── constants.ts                # Labels, colors, mappings
│   │   ├── utils.ts                    # fmt(), pct(), cn()
│   │   ├── fetcher.ts                  # SWR fetcher with error handling
│   │   ├── mutations.ts                # apiMutate() helper
│   │   │
│   │   ├── deal-stage-engine.ts        # Deal workflow state machine
│   │   ├── capital-activity-engine.ts  # Capital call/distribution logic
│   │   ├── deal-types.ts               # Deal-related type definitions
│   │   │
│   │   ├── ai-service.ts               # OpenAI/Anthropic integration
│   │   ├── ai-config.ts                # AI client setup
│   │   ├── command-discovery.ts        # Command bar dynamic discovery
│   │   ├── command-bar-types.ts        # Types for command bar
│   │   │
│   │   ├── permissions.ts              # Role-based access control
│   │   ├── permissions-types.ts        # Permission type definitions
│   │   ├── audit.ts                    # logAudit() for activity tracking
│   │   │
│   │   ├── notifications.ts            # notifyGPTeam(), notifyLP()
│   │   ├── notification-types.ts       # Notification type definitions
│   │   ├── notification-delivery.ts    # Delivery implementation
│   │   ├── slack.ts                    # Slack posting, IC voting
│   │   ├── email.ts                    # Email sending via Resend
│   │   ├── email-templates.ts          # Email template strings
│   │   ├── sms.ts                      # SMS sending
│   │   │
│   │   ├── pagination.ts               # Cursor-based pagination
│   │   ├── rate-limit.ts               # API rate limiting
│   │   ├── dd-analysis-service.ts      # Due diligence analysis
│   │   ├── dd-templates.ts             # DD workstream templates
│   │   ├── default-dd-categories.ts    # Seeded DD categories
│   │   │
│   │   ├── document-extraction.ts      # PDF/Excel text extraction
│   │   ├── excel-export.ts             # Export to Excel
│   │   ├── pdf/ (directory)            # PDF generation via @react-pdf
│   │   ├── docusign.ts                 # DocuSign OAuth + signing
│   │   │
│   │   ├── accounting/                 # Accounting integrations
│   │   │   ├── qbo-client.ts
│   │   │   ├── xero-client.ts
│   │   │   └── nav-calculator.ts
│   │   ├── computations/               # Financial calculations
│   │   │   ├── irr-calculator.ts
│   │   │   ├── waterfall.ts
│   │   │   ├── capital-accounts.ts
│   │   │   └── performance-attribution.ts
│   │   ├── integrations/               # External API clients
│   │   │   ├── plaid.ts                # Bank data
│   │   │   └── svix.ts                 # Webhooks
│   │   │
│   │   ├── intake-service.ts           # Deal intake & screening
│   │   ├── agent-registry.ts           # Available AI agents
│   │   ├── k1-matching.ts              # K-1 tax document matching
│   │   ├── formation-templates.ts      # Entity formation boilerplate
│   │   ├── closing-templates.ts        # Deal closing checklists
│   │   └── default-prompt-templates.ts # AI prompt defaults
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── use-mutation.ts             # useMutation(url, options)
│   │   └── use-global-dialogs.ts       # GlobalDialogsProvider
│   │
│   └── types/                          # TypeScript type definitions
│       └── ... (as needed)
│
├── prisma/
│   ├── schema.prisma                   # 57 data models, relationships
│   ├── seed.ts                         # Development seed data
│   └── seed-tenant.ts                  # Multi-tenant seeding
│
├── public/                             # Static assets
│   ├── favicon.ico
│   └── ...
│
├── scripts/                            # Utility scripts
│   ├── seed.ts
│   └── ...
│
├── .planning/                          # GSD planning docs
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── UI-GUIDE.md
│   └── AUDIT.md
│
├── .claude/                            # Claude-specific context
│   ├── rules/
│   │   ├── coding-patterns.md
│   │   └── project-structure.md
│   └── projects/ (session state)
│
├── .next/                              # Next.js build output (generated)
├── .git/                               # Git repository
├── node_modules/                       # Dependencies (generated)
│
├── package.json                        # Dependencies, scripts
├── tsconfig.json                       # TypeScript config
├── next.config.ts                      # Next.js config
├── tailwind.config.ts                  # Tailwind CSS config (not found; using default)
├── vitest.config.ts                    # Vitest (unit tests)
├── eslint.config.mjs                   # ESLint rules
├── prisma.config.ts                    # Prisma config file
└── README.md                           # Project description
```

## Directory Purposes

**`src/app/(gp)/`** — GP admin pages
- 14 main pages (dashboard, deals, assets, entities, etc.)
- Detail pages with dynamic routes: `deals/[id]`, `assets/[id]`, `entities/[id]`, `investors/[id]`, `companies/[id]`
- Each detail page has tabs (overview, documents, notes, activity) managed by component state
- Pattern: All marked `"use client"`; call `useFirm()` for firmId; fetch with SWR; render feature components

**`src/app/(lp)/`** — LP investor portal pages
- 6 pages (lp-dashboard, lp-account, lp-portfolio, lp-activity, lp-documents, lp-settings)
- Subset of data visible to LP users only (own capital account, portfolio assignments, documents)
- Pattern: Same as GP but with LP-specific data filtering and components

**`src/app/api/`** — API route handlers
- 73+ routes covering deals, assets, entities, capital activity, documents, accounting, auth
- Each resource has `route.ts` (list/create) and `[id]/route.ts` (detail/update/delete)
- Pattern: Validate with Zod schemas, authenticate with Clerk, authorize with role checks, filter by firmId
- All responses are `NextResponse.json()`; errors are 4xx/5xx status codes

**`src/components/ui/`** — Primitive UI components
- Reusable elements: Button, Badge, Modal, Toast, FileUpload, Select, DatePicker, Confirm Dialog, Error Boundary
- No business logic; accept props only
- Styled with Tailwind CSS; use Lucide React for icons
- Example: `Button` with `variant`, `size`, `disabled`, `onClick` props

**`src/components/layout/`** — App shell & navigation
- `app-shell.tsx`: Wraps all non-auth pages; detects auth, routes LP users, renders Sidebar + TopBar + PageErrorBoundary
- `sidebar.tsx`: Derives navigation from `routes.ts`; portal switcher (GP/LP)
- `top-bar.tsx`: Page title, breadcrumbs, user profile menu

**`src/components/features/`** — Domain-specific feature components
- One directory per domain: `deals/`, `assets/`, `entities/`, `documents/`, `accounting/`, `capital/`, `command-bar/`, `lp/`, etc.
- Each directory contains tabs, forms, modals, and helper components
- Example: `deals/deal-overview-tab.tsx`, `deals/deal-ic-review-tab.tsx`, `deals/edit-deal-form.tsx`
- Pattern: Components receive data as props or fetch via SWR; no hardcoded firm IDs

**`src/components/providers/`** — Context providers
- `firm-provider.tsx`: Multi-tenancy context; exports `useFirm()` hook
- `user-provider.tsx`: Auth user context; exports `useUser()` hook
- `clerk-wrapper.tsx`: Wraps Clerk authentication
- `theme-provider.tsx`: Dark/light mode toggle

**`src/lib/`** — Shared business logic and utilities
- **Core:** `routes.ts` (route registry), `prisma.ts` (DB singleton), `schemas.ts` (Zod validation), `constants.ts` (mappings)
- **Auth:** `auth.ts` (getAuthUser), `permissions.ts` (role checks)
- **Deal Workflow:** `deal-stage-engine.ts` (state machine), `dd-analysis-service.ts` (DD workstreams)
- **Accounting:** `accounting/` directory (QBO, Xero clients), `computations/` directory (IRR, waterfall, capital accounts)
- **AI:** `ai-service.ts` (OpenAI/Anthropic), `command-discovery.ts` (dynamic command bar)
- **Notifications:** `notifications.ts` (dispatch), `slack.ts` (Slack posting), `email.ts` (Resend), `audit.ts` (activity logging)
- **Utilities:** `utils.ts` (fmt, pct, cn), `pagination.ts` (cursor-based), `rate-limit.ts` (throttling), `mutations.ts` (client-side mutation helper)

**`src/hooks/`** — Custom React hooks
- `use-mutation.ts`: useMutation(url, options) → { trigger, isLoading, error, reset }
- `use-global-dialogs.ts`: GlobalDialogsProvider for shared modal/dialog state

**`prisma/`** — Database schema & seeding
- `schema.prisma`: 57 models (Firm, User, Deal, Asset, Entity, Investor, Document, CapitalCall, Distribution, etc.), enums, relationships
- `seed.ts`: Development seed data (demo firms, users, deals, entities)
- `seed-tenant.ts`: Multi-tenant seeding for tenant isolation tests

**`.planning/`** — GSD workflow documentation
- `PROJECT.md`: Project context, decisions, architecture overview
- `REQUIREMENTS.md`: All features with REQ-IDs
- `ROADMAP.md`: 7-phase roadmap, success criteria
- `STATE.md`: Current phase, accumulated session context
- `ARCHITECTURE.md`: Entity architecture, ownership models, roles
- `DATA-MODEL.md`: All 57 Prisma models + 73 API routes
- `UI-GUIDE.md`: UI components, testing workflows
- `AUDIT.md`: Scorecard — what's strong, weak, missing

**`.claude/`** — Claude context for future sessions
- `rules/coding-patterns.md`: Must-follow patterns to prevent crashes
- `rules/project-structure.md`: File layout, checklists for adding pages/routes
- `projects/`: Session-specific state (ephemeral)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout, provider setup
- `src/app/(gp)/dashboard/page.tsx`: GP dashboard (main entry point for authenticated users)
- `src/app/(lp)/lp-dashboard/page.tsx`: LP dashboard

**Configuration:**
- `src/lib/routes.ts`: Route registry (40+ routes)
- `tsconfig.json`: TypeScript strict mode, path aliases (`@/*` → `./src/*`)
- `prisma/schema.prisma`: Data model (57 models)
- `next.config.ts`: Next.js config (proxyClientMaxBodySize for 25MB uploads)

**Core Logic:**
- `src/lib/deal-stage-engine.ts`: Deal workflow state machine
- `src/lib/capital-activity-engine.ts`: Capital call/distribution logic
- `src/lib/ai-service.ts`: AI command bar + screening
- `src/lib/accounting/`: QBO/Xero clients
- `src/lib/computations/`: IRR, waterfall, capital accounts

**Validation & Schemas:**
- `src/lib/schemas.ts`: 50+ Zod schemas (CreateDealSchema, UpdateAssetSchema, etc.)
- `src/lib/api-helpers.ts`: parseBody() for request validation

**Testing:**
- `src/lib/__tests__/`: Unit tests for computations and utilities
- `vitest.config.ts`: Vitest configuration

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (not `index.tsx`)
- API routes: `route.ts` (not `index.ts`)
- Components: PascalCase (e.g., `DealOverviewTab.tsx`)
- Utilities/services: camelCase (e.g., `deal-stage-engine.ts`, `api-helpers.ts`)
- Hooks: camelCase with `use-` prefix (e.g., `use-mutation.ts`)
- Types: PascalCase in `*.ts` or `*.tsx` files (no separate `.d.ts` unless large)

**Directories:**
- Feature components: kebab-case matching domain (e.g., `deal-dd-tab.tsx` in `features/deals/`)
- Lib services: kebab-case (e.g., `deal-stage-engine.ts`, `capital-activity-engine.ts`)
- Config/setup: kebab-case with descriptive name (e.g., `firm-provider.tsx`, `error-boundary.tsx`)

**Classes/Types:**
- Components: PascalCase (e.g., `DealDetailPage`, `EditDealForm`)
- Zod schemas: PascalCase with `Schema` suffix (e.g., `CreateDealSchema`, `UpdateAssetSchema`)
- Enums: PascalCase (e.g., `DealStage`, `AssetClass` — defined in Prisma schema)
- Context/Providers: PascalCase with `Context` or `Provider` suffix (e.g., `FirmContext`, `FirmProvider`)

**Functions:**
- React hooks: camelCase with `use` prefix (e.g., `useFirm()`, `useMutation()`)
- Utility functions: camelCase (e.g., `fmt()`, `pct()`, `cn()`, `parseBody()`)
- Service methods: camelCase (e.g., `checkAndAdvanceDeal()`, `notifyGPTeam()`)
- API handlers: named `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (Next.js convention)

## Where to Add New Code

**New Feature Page (e.g., Reports):**
1. Create `src/app/(gp)/reports/page.tsx` with `"use client"` directive
2. Add entry to `APP_ROUTES` in `src/lib/routes.ts`:
   ```typescript
   { path: "/reports", label: "Reports", description: "Generate and download reports",
     keywords: ["reports", "pdf", "export"], icon: "FileText", sidebarIcon: "▣", portal: "gp", priority: 79 }
   ```
   Sidebar, command bar, AI prompt auto-update.

**New API Route (e.g., POST /api/deals/screening):**
1. Create `src/app/api/deals/screening/route.ts`
2. Define Zod schema in `src/lib/schemas.ts` if needed
3. Implement POST handler: validate with `parseBody()`, authenticate with `getAuthUser()`, check permission with `checkPermission()`, call Prisma, return `NextResponse.json()`
4. Ensure all Prisma queries filter by `firmId`

**New Tab in Existing Page (e.g., Deal Detail):**
1. Add tab ID to `TABS` array in `src/app/(gp)/deals/[id]/page.tsx`
2. Add tab button in tab bar UI
3. Create tab panel: `{tab === "new-tab" && <NewTabComponent dealId={deal.id} />}`
4. Create new component: `src/components/features/deals/deal-new-tab.tsx`

**New Feature Component:**
1. Create file in appropriate `src/components/features/{domain}/` directory
2. Mark as `"use client"` if using hooks (useSWR, useState, etc.)
3. Accept data as props (no hardcoded firm ID or user ID)
4. Use SWR for data fetching: `const { data, isLoading } = useSWR(url, fetcher)`
5. Guard rendering: `if (isLoading || !data) return <Loading />`

**New UI Primitive Component:**
1. Create file in `src/components/ui/`
2. Export single component with clear props interface
3. No business logic; pure UI only
4. Use Tailwind CSS classes; export `cn()` utility for conditional classes
5. Example: Button, Badge, Modal, Toast

**New Business Logic Service:**
1. Create file in `src/lib/` or `src/lib/{domain}/` subdirectory
2. Export named functions (not classes)
3. Depend on `prisma` singleton, external APIs, utilities
4. Call from API routes or other services
5. Example: `src/lib/deal-stage-engine.ts`, `src/lib/capital-activity-engine.ts`

**New Database Model:**
1. Add model to `prisma/schema.prisma`
2. Define enums as needed
3. Add relationships with other models using `@relation`
4. Run: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset`
5. Run: `npx prisma generate && npx prisma db seed`
6. Create Zod schema in `src/lib/schemas.ts` for validation
7. Create API routes in `src/app/api/{resource}/route.ts`

## Special Directories

**`src/lib/computations/`** — Financial calculations (generated)
- `irr-calculator.ts`: IRR computation for assets
- `waterfall.ts`: Waterfall distribution logic
- `capital-accounts.ts`: LP capital account tracking
- `performance-attribution.ts`: Asset performance attribution
- Pattern: Pure functions, no side effects, heavily tested

**`src/lib/accounting/`** — Accounting integrations (generated)
- `qbo-client.ts`: QuickBooks Online OAuth + API
- `xero-client.ts`: Xero OAuth + API
- `nav-calculator.ts`: NAV calculation from trial balance
- Pattern: External API clients; async functions; error handling for API failures

**`src/lib/integrations/`** — External service clients (generated)
- `plaid.ts`: Bank connectivity
- `svix.ts`: Webhook receiver
- Pattern: API clients with auth, error handling, retry logic

**`src/lib/pdf/`** — PDF generation (generated)
- Uses `@react-pdf/renderer`
- Components map React to PDF elements
- Pattern: No client-side rendering; server-side via API route

**`prisma/`** — NOT committed to .git (except schema.prisma)
- Generated: `node_modules/.prisma/`
- Migrations: Not used (using `db push`)
- Seeding: Run `npx prisma db seed` after schema changes
- Committed: Only `schema.prisma`, `seed.ts`, `seed-tenant.ts`

**`.next/`** — Build artifacts (generated, NOT committed)
- Created: `npm run build`
- Consumed: `npm start`
- Contains: Bundled pages, API routes, source maps

---

*Structure analysis: 2026-03-08*
