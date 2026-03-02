# Atlas — Fund Administration Platform

## What This Is

Atlas is a full-stack fund administration platform for a family office GP managing ~9 fund entities (main funds, sidecars, SPVs) with ~10 LPs, scaling toward $1B AUM. It replaces spreadsheets, portals, and emails with a single operating system covering asset management, deal pipeline, LP relations, accounting integration, and capital activity.

The architecture reference is at `docs/architecture-spec.md` — consult it for the full data model, entity relationships, holding structures, contract-level detail, access control, and phased build plan.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript (strict) | 5.x |
| UI | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Database | PostgreSQL via Prisma ORM | Prisma 7.x |
| Prisma Adapter | `@prisma/adapter-pg` (pg driver) | 7.x |
| Validation | Zod | 4.x |
| Data Fetching | SWR | 2.x |
| Charts | Recharts | 3.x |
| Package Manager | npm | — |

---

## Project Structure

```
atlas/
├── prisma/
│   ├── schema.prisma          # Data model (47+ models, all enums)
│   └── seed.ts                # Database seeding
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (ToastProvider → FirmProvider → AppShell)
│   │   ├── globals.css        # Tailwind imports, Geist font, theme
│   │   ├── (gp)/              # GP admin portal (route group, no URL prefix)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── entities/
│   │   │   ├── assets/
│   │   │   ├── deals/
│   │   │   ├── directory/
│   │   │   ├── documents/
│   │   │   ├── tasks/
│   │   │   ├── accounting/
│   │   │   ├── meetings/
│   │   │   ├── waterfall/
│   │   │   └── settings/
│   │   ├── (lp)/              # LP investor portal
│   │   │   ├── lp-dashboard/
│   │   │   ├── lp-account/
│   │   │   ├── lp-portfolio/
│   │   │   ├── lp-activity/
│   │   │   └── lp-documents/
│   │   └── api/               # API routes (~57 files)
│   ├── components/
│   │   ├── ui/                # Reusable primitives (Button, Badge, Modal, Toast, etc.)
│   │   ├── layout/            # AppShell, Sidebar, TopBar
│   │   ├── providers/         # FirmProvider (multi-tenant context)
│   │   └── features/          # Domain components grouped by feature
│   │       ├── deals/
│   │       ├── assets/
│   │       ├── entities/
│   │       ├── investors/
│   │       ├── accounting/
│   │       ├── capital/
│   │       ├── dashboard/
│   │       ├── waterfall/
│   │       ├── meetings/
│   │       └── funds/
│   ├── lib/                   # Shared utilities and business logic
│   │   ├── prisma.ts          # Prisma singleton (hot-reload safe)
│   │   ├── api-helpers.ts     # parseBody(req, zodSchema)
│   │   ├── schemas.ts         # All Zod schemas + taxonomy constants
│   │   ├── constants.ts       # Labels, colors, demo IDs
│   │   ├── utils.ts           # fmt(), pct(), cn()
│   │   ├── fetcher.ts         # SWR fetcher
│   │   ├── mutations.ts       # apiMutate() for POST/PUT/PATCH/DELETE
│   │   ├── notifications.ts   # createNotification(), notifyGPTeam()
│   │   ├── slack.ts           # Slack IC voting integration
│   │   ├── deal-stage-engine.ts  # Deal workflow state machine
│   │   ├── dd-templates.ts    # Due diligence checklist templates
│   │   ├── closing-templates.ts  # Closing checklist templates
│   │   └── formation-templates.ts # Entity formation checklist templates
│   └── hooks/
│       └── use-mutation.ts    # useMutation() hook wrapping apiMutate
└── docs/
    └── architecture-spec.md   # Full architecture reference
```

---

## Critical Patterns (MUST follow)

### 1. Toast Usage

`useToast()` returns an object with `.success()` and `.error()` methods. Do NOT destructure.

```typescript
// CORRECT
const toast = useToast();
toast.success("Deal created");
toast.error("Failed to update");

// WRONG — will crash
const { toast } = useToast();          // NO
const { success, error } = useToast(); // NO — 'error' shadows React state
```

### 2. API Route Body Parsing

Always use `parseBody()` from `@/lib/api-helpers` with a Zod schema:

```typescript
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;  // Returns NextResponse 400

  const deal = await prisma.deal.create({ data: { ...data! } });
  return NextResponse.json(deal, { status: 201 });
}
```

### 3. Dynamic Route Params (Next.js 16 / React 19)

Params are a `Promise` — must await:

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ...
}
```

### 4. SWR Data Fetching

```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());
const { data, isLoading } = useSWR("/api/deals?firmId=firm-1", fetcher);

if (isLoading || !data) return <div>Loading...</div>;
```

### 5. Mutations

```typescript
// Option A: Direct fetch + SWR mutate
import { mutate } from "swr";

const res = await fetch(`/api/deals/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) throw new Error("Failed");
mutate(`/api/deals/${id}`);

// Option B: useMutation hook
import { useMutation } from "@/hooks/use-mutation";

const { trigger, isLoading } = useMutation("/api/tasks", {
  method: "POST",
  revalidateKeys: ["/api/tasks"],
});
await trigger({ title: "New task" });
```

### 6. Prisma Singleton

```typescript
import { prisma } from "@/lib/prisma";
// Always import from here — never instantiate PrismaClient directly
```

After schema changes, ALWAYS run:
```bash
npx prisma db push --force-reset  # Dev only (resets DB)
npx prisma generate               # Regenerate client types
npx prisma db seed                 # Re-seed data
```
Env var required: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes"`

### 7. Utility Functions

```typescript
import { fmt, pct, cn } from "@/lib/utils";

fmt(1500000)    // "$1.5M"
fmt(250000)     // "$250K"
pct(0.15)       // "15.0%"
cn("base", isActive && "text-white", className)  // conditional classes
```

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `deal-stage-engine.ts`, `create-deal-wizard.tsx` |
| Components | PascalCase | `StatCard`, `AssetAllocationChart` |
| API routes | `route.ts` in folder | `src/app/api/deals/[id]/route.ts` |
| Prisma models | PascalCase | `Deal`, `ICProcess`, `DDWorkstream` |
| Prisma enums | PascalCase names, UPPER_SNAKE values | `DealStage.DUE_DILIGENCE` |
| Zod schemas | PascalCase with Create/Update prefix | `CreateDealSchema`, `UpdateEntitySchema` |
| Hooks | `use-` prefix, kebab-case file | `use-mutation.ts` |
| Constants | UPPER_SNAKE or camelCase | `ASSET_CLASS_LABELS`, `INVESTOR_ID` |
| CSS classes | Tailwind utility classes | No custom CSS classes |

---

## Prisma Schema Conventions

- IDs: `String @id @default(cuid())`
- Timestamps: always `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Optional fields: `String?` (nullable)
- Flexible metadata: `Json?` type
- Indexes: `@@index([field])` on frequently filtered columns
- Relations: explicit `@relation` with named relations when multiple FKs to same model
- Enums: defined in schema, values are UPPER_SNAKE_CASE

---

## Component Architecture

### Layout Hierarchy
```
ToastProvider
  └─ FirmProvider (multi-tenant context)
       └─ AppShell (sidebar + topbar + content area)
            └─ (gp)/layout.tsx or (lp)/layout.tsx
                 └─ page.tsx
```

### Component Organization
- **`components/ui/`** — Stateless, reusable primitives. Accept `className` prop. Use `cn()`.
- **`components/features/{domain}/`** — Domain-specific, stateful, integrate with SWR/APIs.
- **`components/layout/`** — App shell, sidebar, topbar.
- **`components/providers/`** — React context providers.

### Page Component Pattern
```typescript
"use client";

import useSWR from "swr";
// ... imports

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PageName() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR(`/api/resource?firmId=${firmId}`, fetcher);
  const toast = useToast();

  if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Content */}
    </div>
  );
}
```

---

## Styling Guide

### Color System
| Purpose | Classes |
|---------|---------|
| Primary action | `bg-indigo-600 text-white hover:bg-indigo-700` |
| Success | `bg-emerald-600 text-white` or `bg-green-50 text-green-800` |
| Danger | `bg-red-600 text-white` or `bg-red-50 text-red-700` |
| Warning | `bg-amber-500` or `bg-yellow-50 text-yellow-800` |
| Info | `bg-blue-50 text-blue-800` |
| Sidebar | `bg-slate-900 text-slate-400` (active: `text-white bg-slate-800`) |
| Cards | `bg-white rounded-xl border border-gray-200 p-5` |
| Page background | `bg-gray-50` (via layout) |

### Common Patterns
```
Card:        bg-white rounded-xl border border-gray-200 p-5
Button:      px-3 py-1.5 rounded-lg text-xs font-medium
Badge:       text-xs px-2 py-0.5 rounded-full
Table:       text-xs text-gray-500 (headers), text-sm (cells)
Page:        space-y-5 (vertical rhythm)
Grid:        grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4
Text sizes:  text-[9px], text-[10px], text-xs, text-sm, text-lg, text-2xl
```

---

## API Design Patterns

### Standard CRUD
```
GET    /api/{resource}              → List (with query filters)
POST   /api/{resource}              → Create
GET    /api/{resource}/[id]         → Get one (with includes)
PUT    /api/{resource}/[id]         → Full update
PATCH  /api/{resource}/[id]         → Partial update or action
DELETE /api/{resource}/[id]         → Delete
```

### Action-Based PATCH
For state machine transitions, use `action` field in body:
```typescript
// PATCH /api/deals/[id]
{ action: "KILL" }
{ action: "ADVANCE_TO_CLOSING" }
{ action: "CLOSE" }
```

### Query Parameter Filtering
```typescript
const url = new URL(req.url);
const firmId = url.searchParams.get("firmId");
const status = url.searchParams.get("status");
```

### Error Response Format
```json
{ "error": "Human-readable message" }
{ "error": { "fieldErrors": {}, "formErrors": [] } }
```

---

## Business Logic

### Deal Stage Engine (`src/lib/deal-stage-engine.ts`)
```
SCREENING → (AI screening completes) → DUE_DILIGENCE
DUE_DILIGENCE → (manual: Send to IC) → IC_REVIEW
IC_REVIEW → APPROVED → CLOSING
IC_REVIEW → REJECTED → DEAD
IC_REVIEW → SEND_BACK → DUE_DILIGENCE
CLOSING → (all checklist items done) → CLOSED (creates Asset)
Any stage → (manual: Kill) → DEAD
```

All transitions log `DealActivity` records and send non-blocking `notifyGPTeam()` notifications.

### Entity Formation Workflow
```
NOT_STARTED → FORMING (9 formation tasks created) → FORMED → REGISTERED
```
Templates in `src/lib/formation-templates.ts`. Tasks use `contextType: "FORMATION"`.

### Task System
Polymorphic via `contextType` + `contextId`, plus direct `dealId` / `entityId` FKs. Statuses: `TODO → IN_PROGRESS → DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

---

## Key Constants & Taxonomy

### Asset Classes
`REAL_ESTATE`, `PUBLIC_SECURITIES`, `OPERATING_BUSINESS`, `INFRASTRUCTURE`, `COMMODITIES`, `DIVERSIFIED`, `NON_CORRELATED`, `CASH_AND_EQUIVALENTS`

### Capital Instruments
`DEBT`, `EQUITY`

### Participation Structures
`DIRECT_GP`, `CO_INVEST_JV_PARTNERSHIP`, `LP_STAKE_SILENT_PARTNER`

### Entity Types
`MAIN_FUND`, `SIDECAR`, `SPV`, `CO_INVEST_VEHICLE`, `GP_ENTITY`, `HOLDING_COMPANY`

### Demo IDs (for development)
- Firm: `firm-1`
- Current user: `user-jk` (James Kim, GP Admin)
- LP investor: `investor-1`

Labels and colors for all taxonomies are in `src/lib/constants.ts`.

---

## Development Commands

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build (validates types)
npm run lint           # ESLint
npx prisma studio      # Visual DB browser
npx prisma db push     # Push schema changes (dev)
npx prisma generate    # Regenerate Prisma client
npx prisma db seed     # Seed database
```

### After Schema Changes
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset && npx prisma generate && npx prisma db seed
```
Then restart the dev server — Prisma client is cached in development.

---

## Standing Requirements

1. **Push to git** after every version.
2. **After every response**, provide a testing checklist for the current version and suggest next steps.
3. **Before executing any large change or feature set**, develop a plan first (use plan mode).
4. **Run `npm run build`** after making changes to verify zero TypeScript errors before committing.
