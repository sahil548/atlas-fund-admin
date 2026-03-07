# Project Structure & Checklists

---

## GSD Planning Directory

```
.planning/
├── PROJECT.md          # Project context, requirements, decisions
├── REQUIREMENTS.md     # All requirements with REQ-IDs
├── ROADMAP.md          # 7-phase roadmap with success criteria
├── STATE.md            # Current position and accumulated context
├── ARCHITECTURE.md     # Entity architecture, ownership, contracts, roles
├── DATA-MODEL.md       # All 56 Prisma models + 64+ API routes
├── UI-GUIDE.md         # UI components + step-by-step testing workflows
├── AUDIT.md            # Honest scorecard — what's strong, weak, missing
└── config.json         # GSD workflow configuration
```

### Checking Project State

- Before suggesting next work: read `.planning/STATE.md`
- Before planning a feature: read `.planning/ROADMAP.md` for phase context
- After completing a feature: update `.planning/STATE.md` position

---

## File Layout

```
src/
├── app/(gp)/              # GP admin pages
├── app/(lp)/              # LP investor portal
├── app/api/               # 73 REST API route files
├── components/ui/         # Primitives (Button, Badge, Modal, Toast, FileUpload, etc.)
├── components/layout/     # AppShell, Sidebar, TopBar
├── components/features/   # Domain components (deals/, assets/, entities/, etc.)
├── components/providers/  # FirmProvider, UserProvider
├── lib/
│   ├── routes.ts          # SINGLE SOURCE OF TRUTH — all app routes
│   ├── prisma.ts          # DB singleton (never instantiate PrismaClient elsewhere)
│   ├── schemas.ts         # Zod schemas + taxonomy constants
│   ├── ai-service.ts      # OpenAI: command bar + deal screening
│   ├── deal-stage-engine.ts # Deal workflow state machine
│   ├── api-helpers.ts     # parseBody(req, zodSchema)
│   ├── constants.ts       # Labels, colors, demo IDs
│   └── utils.ts           # fmt(), pct(), cn()
└── hooks/use-mutation.ts
```

---

## Route Registry — routes.ts

**Most important file for adding pages.** Add one entry and sidebar, command bar, AI prompt, page titles, URL validation all auto-update.

```typescript
// src/lib/routes.ts — add entry to APP_ROUTES:
{ path: "/new-page", label: "New Page", description: "What it does",
  keywords: ["search", "terms"], icon: "Icon", sidebarIcon: "X", portal: "gp", priority: 50 }
```

Consumed by: `sidebar.tsx`, `app-shell.tsx`, `command-discovery.ts`, `ai-service.ts`, `command-bar.tsx`

---

## Checklists

### New Page

1. Create `src/app/(gp)/your-page/page.tsx` with `"use client"` directive
2. Add entry to `APP_ROUTES` in `src/lib/routes.ts`
3. That's it — sidebar, command bar, AI, page titles auto-update

### New API Route

1. Create `src/app/api/your-resource/route.ts`
2. Define Zod schema in `src/lib/schemas.ts`
3. Use `parseBody()` for POST/PUT/PATCH
4. Always filter by `firmId` from query params
5. Return `NextResponse.json()` with appropriate status codes

### Adding Tabs to an Existing Page

```typescript
// 1. Add tab ID to the tabs array at top of the page component
const TABS = ["overview", "documents", "workstreams", "closing", "new-tab"] as const;

// 2. Add the tab button in the tab bar
<button onClick={() => setTab("new-tab")}
  className={cn("px-3 py-1.5 text-xs font-medium rounded-lg", tab === "new-tab" ? "bg-white shadow text-gray-900" : "text-gray-500")}>
  New Tab
</button>

// 3. Add the tab panel
{tab === "new-tab" && <NewTabComponent dealId={deal.id} />}
```

---

## Prisma Relations & Includes

When fetching related data, use `include` (not separate queries):

```typescript
// ❌ Two separate queries
const deal = await prisma.deal.findUnique({ where: { id } });
const docs = await prisma.document.findMany({ where: { dealId: id } });

// ✅ Single query with include
const deal = await prisma.deal.findUnique({
  where: { id },
  include: { documents: true, activities: { orderBy: { createdAt: "desc" }, take: 20 }, team: { include: { user: true } } },
});
```

For the full data model and all available relations, see `prisma/schema.prisma` or `.planning/DATA-MODEL.md`.

---

## Key Provider Hooks

```typescript
// Multi-tenancy — always use, never hardcode firm-1
const { firmId } = useFirm();  // from @/components/providers/firm-provider

// User context (Clerk in production, mock for dev)
const { user } = useUser();  // from @/components/providers/user-provider
// Dev users: user-jk (James Kim, GP_ADMIN), user-sm (Sarah Mitchell, GP_TEAM), user-al (Alex Lee, GP_TEAM) + 5 LP users
```
