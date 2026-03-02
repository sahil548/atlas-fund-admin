# Atlas — Fund Administration Platform

## What This Is

Atlas is your family office operating system. It replaces spreadsheets, portals, and emails with one app covering deal pipeline, asset management, LP relations, accounting (QBO sync), capital activity, and entity management. Built for ~9 fund entities, ~10 LPs, scaling toward $1B AUM.

---

## Architecture Reference

`docs/architecture-spec.md` is the architectural source of truth. **Consult it before building anything involving data models, entity relationships, or new domain features.** Key sections:

| Section | What It Tells You |
|---------|------------------|
| §3 Entity & Accounting Architecture | Entity hierarchy, AccountingConnection, AccountMapping schemas |
| §4 Asset Ownership Model | AssetEntityAllocation, complex ownership chains across funds/SPVs |
| §5 Holding Structures | 5 holding types (direct, through_own_vehicle, lp_in_external_fund, co_invest, through_counterparty) — determines UI behavior |
| §6 Contract-Level Detail | Lease schema (25+ fields), CreditAgreement (35+ fields), Covenant schema |
| §7 Access Control | 5 roles (GP_ADMIN, GP_TEAM, SERVICE_PROVIDER, LP_INVESTOR, AUDITOR) + permissions matrix |
| §8 IC Process | Slack-integrated voting flow, webhook capture, vote recording |
| §9 LP Notifications | Notification preferences schema, delivery methods |
| §14 Schema Summary | Complete table list by domain — use this as the database map |

**Rule**: When adding a Prisma model, check §14 first. When building asset/entity UI, check §4–§5 for ownership logic. When touching capital flows, check §3 for accounting relationships.

---

## Tech Stack

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Zod 4 · SWR 2 · Recharts 3

---

## Project Structure

```
src/
├── app/(gp)/              # GP admin pages
├── app/(lp)/              # LP investor portal
├── app/api/               # ~57 REST API route files
├── components/ui/         # Primitives (Button, Badge, Modal, Toast, FileUpload)
├── components/layout/     # AppShell, Sidebar, TopBar
├── components/features/   # Domain components (deals/, assets/, entities/, etc.)
├── components/providers/  # FirmProvider (multi-tenant context)
├── lib/
│   ├── routes.ts          # ⭐ SINGLE SOURCE OF TRUTH — all app routes
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

**Most important file for adding pages.** Add one entry → sidebar, command bar, AI prompt, page titles, URL validation all auto-update.

```typescript
// src/lib/routes.ts — add entry to APP_ROUTES:
{ path: "/new-page", label: "New Page", description: "What it does",
  keywords: ["search", "terms"], icon: "Icon", sidebarIcon: "◻", portal: "gp", priority: 50 }
```

Consumed by: `sidebar.tsx`, `app-shell.tsx`, `command-discovery.ts`, `ai-service.ts`, `command-bar.tsx`

---

## Critical Coding Patterns

### Toast — will crash if destructured
```typescript
const toast = useToast();
toast.success("Saved");  toast.error("Failed");
// NEVER: const { toast } = useToast()  ← CRASHES (shadows React internals)
```

### API Route Body Parsing — always use parseBody + Zod
```typescript
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;  // auto 400 with field errors
  const deal = await prisma.deal.create({ data: { ...data! } });
  return NextResponse.json(deal, { status: 201 });
}
```

### Dynamic Route Params — Next.js 16 requires await
```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // MUST await — it's a Promise now
}
```

### SWR + FirmProvider — never hardcode firm-1
```typescript
const { firmId } = useFirm();  // from @/components/providers/firm-provider
const { data, isLoading } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);
if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;
```

### Mutations — two patterns, both valid
```typescript
// Pattern A: fetch + SWR revalidation
const res = await fetch(`/api/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
if (!res.ok) throw new Error("Failed");
mutate(`/api/deals/${id}`);

// Pattern B: useMutation hook
const { trigger } = useMutation("/api/tasks", { method: "POST", revalidateKeys: ["/api/tasks"] });
await trigger({ title: "New task" });
```

### File Upload — FormData pattern
```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("name", file.name);
formData.append("category", "CIM");
await fetch(`/api/deals/${dealId}/documents`, { method: "POST", body: formData });
// Do NOT set Content-Type header — browser sets multipart boundary automatically
```

### Prisma — singleton import + schema change workflow
```typescript
import { prisma } from "@/lib/prisma";  // always from here
```
```bash
# After ANY schema.prisma change:
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate && npx prisma db seed
# Then restart dev server
```

### Utilities
```typescript
import { fmt, pct, cn } from "@/lib/utils";
fmt(1500000)  // "$1.5M"    pct(0.15)  // "15.0%"
cn("base", isActive && "text-white")  // conditional Tailwind classes
```

### New Page Checklist
1. Create `src/app/(gp)/your-page/page.tsx` with `"use client"` directive
2. Add entry to `APP_ROUTES` in `src/lib/routes.ts`
3. That's it — sidebar, command bar, AI, page titles auto-update

### New API Route Checklist
1. Create `src/app/api/your-resource/route.ts`
2. Define Zod schema in `src/lib/schemas.ts`
3. Use `parseBody()` for POST/PUT/PATCH
4. Always filter by `firmId` from query params
5. Return `NextResponse.json()` with appropriate status codes

---

## Deal Stage Engine

```
SCREENING → DUE_DILIGENCE → IC_REVIEW → CLOSING → CLOSED (creates Asset)
                                ↓
                     REJECTED or SEND_BACK
Any stage → DEAD (kill deal)
```

All transitions log `DealActivity` + notifications. Logic in `deal-stage-engine.ts`.

---

## Dev Commands

```bash
npm run dev            # Dev server on port 3000
npm run build          # Production build — catches ALL type errors
npx prisma studio      # Visual database browser
npx prisma db seed     # Re-seed demo data
```

---

## Parallel Agent Strategy

**Use multiple agents in parallel whenever possible to save time.** Specifically:

- **Research in parallel**: When exploring code before making changes, launch parallel Explore agents (e.g., one searching components, one searching API routes, one searching lib files)
- **Independent file edits**: When a task touches files that don't depend on each other, edit them concurrently
- **Build + verify**: After code changes, run build validation and preview verification in parallel
- **Plan before execute**: For any feature touching 3+ files, enter plan mode first to identify all touchpoints — then execute edits in parallel batches

**Anti-pattern**: Don't serialize work that can be parallelized. If you need to update `routes.ts`, `sidebar.tsx`, and `command-discovery.ts` independently, do all three at once.

---

## Likely Failure Points & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Page crashes with "undefined" | SWR data not loaded yet | Add `if (isLoading \|\| !data) return <Loading />` guard |
| Toast crashes entire page | Destructured useToast | Change to `const toast = useToast()` (no destructuring) |
| New page missing from sidebar | Not in routes.ts | Add entry to `APP_ROUTES` in `src/lib/routes.ts` |
| AI suggests 404 URLs | Route not in registry | Add to `routes.ts` — AI prompt auto-generates from it |
| Wrong tenant data | Hardcoded "firm-1" | Use `const { firmId } = useFirm()` instead |
| Prisma errors after schema edit | Stale generated client | Run full reset: `db push --force-reset && generate && seed` |
| Build type errors | Missing await, wrong imports | Run `npm run build` — error shows exact file:line |
| File upload broken | Wrong component or missing FormData | Use `FileUpload` from `ui/file-upload`, upload via FormData |
| Command bar is a modal | Old createPortal code | `command-bar-provider.tsx` must NOT use createPortal |

---

## Common Anti-Patterns (NEVER do these)

```typescript
// ❌ Hardcoding firm ID
const { data } = useSWR("/api/deals?firmId=firm-1", fetcher);
// ✅ Dynamic firm ID
const { firmId } = useFirm();
const { data } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);

// ❌ Setting Content-Type on FormData (breaks multipart boundary)
await fetch(url, { method: "POST", headers: { "Content-Type": "multipart/form-data" }, body: formData });
// ✅ Let browser handle it
await fetch(url, { method: "POST", body: formData });

// ❌ Forgetting loading guard (crashes on first render)
export default function Page() {
  const { data } = useSWR("/api/stuff", fetcher);
  return <div>{data.items.map(...)}</div>;  // 💥 data is undefined on first render
}
// ✅ Always guard
const { data, isLoading } = useSWR("/api/stuff", fetcher);
if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;

// ❌ Direct PrismaClient instantiation
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();  // creates new connection every hot-reload
// ✅ Singleton
import { prisma } from "@/lib/prisma";

// ❌ Client component without directive (silently breaks hooks)
import useSWR from "swr";
export default function Page() { ... }
// ✅ Must have "use client" at top of file
"use client";
import useSWR from "swr";

// ❌ Mutating SWR cache without revalidation (stale UI)
await fetch(`/api/deals/${id}`, { method: "DELETE" });
// ✅ Revalidate after mutation
await fetch(`/api/deals/${id}`, { method: "DELETE" });
mutate(`/api/deals?firmId=${firmId}`);  // refresh the list

// ❌ Nested fetch in useEffect (race conditions, no caching)
useEffect(() => { fetch("/api/deals").then(r => r.json()).then(setData); }, []);
// ✅ Use SWR (handles caching, dedup, revalidation, loading state)
const { data } = useSWR("/api/deals?firmId=${firmId}", fetcher);

// ❌ Catching Prisma errors generically
try { await prisma.deal.create({ data }) } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
// ✅ Return specific errors
try { ... } catch (e: any) {
  if (e.code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
  if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ error: e.message }, { status: 500 });
}
```

---

## Adding Tabs to an Existing Page

Many pages use a tab pattern. To add a new tab:

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

For the full data model and all available relations, see `prisma/schema.prisma` or architecture-spec.md §14.

---

## Standing Requirements

1. **`npm run build`** after changes — zero errors before committing
2. **After every version**, tell me in plain english: what changed, what to test (specific clickthrough steps), what might break, and suggest what to build next
3. **Before large changes**: plan mode first
4. **Commit + push to git** after every version
5. **Never hardcode firm-1** — always `useFirm()` hook
6. **New pages → routes.ts** — single source of truth
7. **Consult architecture-spec.md** before adding models, entities, or capital flow logic
8. **Use parallel agents** for research, independent edits, and build+verify
9. **Never create a page component without `"use client"`** if it uses hooks, SWR, or state
10. **Always revalidate SWR** after any mutation (POST, PUT, PATCH, DELETE)
