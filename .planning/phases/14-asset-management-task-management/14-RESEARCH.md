# Phase 14: Asset Management & Task Management - Research

**Researched:** 2026-03-09
**Domain:** Asset lifecycle management (exits, holding-type adaptive UI, monitoring), task management (context linking, drag-and-drop, auto-creation, subtasks, notifications)
**Confidence:** HIGH — all findings based on direct codebase inspection and authoritative library docs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Asset Exit Workflow**
- Minimal exit fields: exit date, exit proceeds, optional exit notes
- MOIC auto-calculated from proceeds vs cost basis
- Exit is a deliberate action — modal flow triggered from action menu (similar to close-deal modal), not a casual button
- Exit modal shows live preview of final MOIC, hold period, and gain/loss as GP enters proceeds
- After exit, the overview tab shows an exit performance card: entry date → exit date, hold period, total invested, exit proceeds, final MOIC, final IRR (like a deal tombstone)
- Exited assets stay inline in the asset list with dimmed/greyed styling and "EXITED" badge — status filter lets GP show/hide them
- Asset exit auto-creates closing tasks (e.g., "File exit paperwork", "Notify LPs", "Record final distribution")
- Full exits only — no partial exits for this phase
- New schema fields needed: `exitDate`, `exitProceeds`, `exitNotes` on Asset model

**Holding Type-Adaptive UI**
- Shared tab structure across all asset types (Overview, Contracts, Performance, Documents, Tasks, Activity) with adaptive content inside each tab based on asset type
- Real Estate: lease roll schedule, rent escalation timeline, tenant payment status, vacancy tracking; NOI/cap rate
- Fund LP Positions: GP reporting tracker, commitment lifecycle, internal vs GP-reported NAV comparison
- Credit/Loans: payment & covenant tracking, maturity countdown, interest rate reset dates
- Equity/Venture: valuation & milestone tracking, last valuation date, valuation history chart, next review date

**Ownership Stake**
- Add `ownershipPercent` field to Asset model
- Also track `shareCount` / `unitCount` where applicable

**Per-Asset Review Schedule**
- Add `reviewFrequency` field to Asset model
- Explicit "Mark Reviewed" button: logs review date, auto-advances nextReview, creates audit trail
- Type-aware review suggestions when review is due

**Unified Monitoring Panel (Assets Page)**
- Collapsible panel with badge count at top of assets page
- Disappears entirely when no alerts exist
- Shows: covenant breaches, lease expirations (90/180 day windows), loan maturities approaching, overdue asset reviews
- Organized by severity then type
- Each alert deep-links to specific asset + relevant tab

**Lease Expiration Forward View**
- Both table and timeline views with a toggle
- Table (default): all leases sorted by expiration date, with 90-day and 180-day badges, filterable by asset
- Timeline view: horizontal calendar with color coding — red (<90 days), yellow (90-180 days), green (>180 days)

**Covenant Status Display**
- Status display only (compliant/breached/waived) — GP manually updates status
- No covenant test history tracking

**Asset List Column Sorting**
- All data columns sortable: Name, Asset Class, Instrument, Participation, Sector, Entities, Cost Basis, Fair Value, Unrealized, MOIC, IRR, Status
- Click column header to toggle asc/desc, with sort direction indicator
- Client-side sorting (instant, no API calls)
- Default sort: by name alphabetically

**Valuation History Chart**
- Fair value over time line chart on all asset types (if 2+ valuations exist)
- Hover to see exact value and date
- Uses Recharts 3 (already in stack)

**Asset Detail Page Layout**
- Tab order: Overview, Contracts, Performance, Documents, Tasks, Activity
- Overview tab: main content + sidebar (asset notes, next review date, key dates)
- Contracts tab: default Stessa-style cards with Active/Expired/Draft filter pills; toggle to table view

**Task Context Linking**
- Tasks linked two-way: task shows context as clickable link AND detail pages show Tasks section
- Inline quick-add from within deal/asset/entity detail pages
- Context filter dropdown on main tasks page

**Task Drag-and-Drop**
- Default table/list view with drag-and-drop reordering (uses `order` field on Task model)
- Toggle to kanban board view: three columns (To Do, In Progress, Done), drag between columns to change status

**Task Auto-Creation**
- Key deal stage transitions only: Screening → Due Diligence, IC Approved → Closing
- Asset exit also auto-creates closing tasks
- Auto-created tasks assigned to deal lead or asset manager; if no lead, left unassigned

**Task Subtasks (Checklist Items)**
- Tasks support checklist items (like GitHub issue checkboxes)
- Shows progress: "3/5 items complete"

**Task Notifications**
- Email notification when a task is assigned to someone
- Due date reminder email the day before task is due
- Overdue notification when task passes due date
- Uses existing Resend email infrastructure

### Claude's Discretion
- Exact closing task templates for deal transitions and asset exits
- Loading skeleton design for new components
- Kanban board layout details and card design
- Chart axis formatting and responsive behavior
- Monitoring panel exact visual styling and animation
- Type-aware review suggestion text per asset class
- Mobile/responsive considerations for drag-and-drop

### Deferred Ideas (OUT OF SCOPE)
- Structured insurance policy model
- Mortgage/loan tracking per RE asset
- Tax assessment tracking
- Partial exits
- Borrower health metrics for credit (DSCR, LTV, collateral value tracking, watchlist, risk tier)
- Portfolio company operating metrics for equity/venture
- Configurable task templates per stage transition
- Covenant test history tracking
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ASSET-04 | GP can record asset exit (exit date, exit proceeds, final MOIC) and mark asset as EXITED | Schema migration needed (exitDate, exitProceeds, exitNotes on Asset); new PATCH /api/assets/[id]/exit endpoint; modal UI with live MOIC preview; auto-task creation |
| ASSET-05 | Asset detail pages show context-appropriate controls based on holding type | Tab restructure from current mixed-type tabs to unified tabs (Overview, Contracts, Performance, Documents, Tasks, Activity) with adaptive content per assetClass/participationStructure |
| ASSET-06 | Asset list supports column sorting | Client-side sort state with sort key + direction toggle on column headers; no API changes needed |
| ASSET-07 | Covenant breach monitor shows portfolio-level view across all assets | New /api/assets/monitoring endpoint to aggregate breached covenants, lease expirations, overdue reviews; collapsible panel on assets page |
| ASSET-08 | Lease expiry forward view shows expirations in 90/180 day windows | Uses existing Lease model; table + timeline toggle view; date-based color coding |
| ASSET-09 | Valuation history chart displays on asset detail page | Recharts 3 LineChart with Valuation data already fetched in /api/assets/[id] GET; no API changes needed |
| TASK-01 | Tasks linked to their context with navigation back to source | Task model already has assetId/dealId/entityId; tasks page context column already shows deal/entity links; gap is assetId not shown and inline Tasks section on asset detail pages not fully linked |
| TASK-02 | Tasks can be created from within deal, asset, and entity detail pages | create-task-form.tsx exists for assets; needs upgrade to inline quick-add pattern with proper context pre-linking |
| TASK-03 | Tasks have drag-and-drop reordering and status changes | No DnD library installed — must install @dnd-kit/core + @dnd-kit/sortable; order field on Task model already exists |
| TASK-04 | Tasks filterable by context | Tasks API already supports dealId/entityId/assetId query params; needs context filter dropdown UI on tasks page |
| TASK-05 | Tasks auto-created from deal stage transitions | deal-stage-engine.ts needs new auto-task creation hooks on SCREENING→DUE_DILIGENCE and IC_APPROVED→CLOSING transitions; new TaskChecklistItem model needed for subtasks |
</phase_requirements>

---

## Summary

Phase 14 is a dense but well-scoped phase with a codebase that has strong foundations to build on. The Asset model is close to ready but missing 5 fields (exitDate, exitProceeds, exitNotes, ownershipPercent, shareCount, reviewFrequency). The Task model has all context foreign keys already. The main gaps are: (1) no drag-and-drop library installed, (2) asset detail page needs a full tab restructure, (3) the monitoring panel and lease expiry view are entirely new components, and (4) task auto-creation hooks don't exist yet in deal-stage-engine.ts.

The most complex piece is the asset detail page restructure — the current page has separate type-specific tabs (loan, property, equity, fund) rather than the unified tab structure required. This requires reorganizing ~650 lines of existing tab code into the new Overview/Contracts/Performance/Documents/Tasks/Activity structure with adaptive content inside.

The second most complex piece is drag-and-drop. No DnD library is installed. @dnd-kit is the modern standard (React 18+/19 compatible, no deprecated lifecycle APIs, well-maintained), and must be installed and implemented for both the list reordering view and the kanban board view.

**Primary recommendation:** Implement in this wave order: (1) schema migration + exit modal, (2) asset list column sorting + monitoring panel, (3) asset detail page tab restructure, (4) DnD installation + tasks kanban, (5) task auto-creation + subtasks + notifications.

---

## Standard Stack

### Core (Confirmed present in codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, API routes | Project foundation |
| React | 19.2.3 | UI components | Project foundation |
| Prisma | 7.4.2 | Schema migrations, DB queries | Project ORM |
| SWR | 2.4.1 | Data fetching, cache invalidation | All list pages use this pattern |
| Recharts | 3.7.0 | Line charts for valuation history | Already installed, used in analytics page |
| Zod | 4.3.6 | API request validation | All API routes use parseBody + Zod |
| Resend | 6.9.3 | Email delivery for task notifications | email.ts + email-templates.ts already wired |
| Tailwind CSS | 4 | Styling | Project UI framework |

### New Library Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @dnd-kit/core | latest (~6.3.x) | Drag-and-drop primitive | No DnD library currently installed; @dnd-kit is the modern standard for React 19, accessibility-first, no deprecated lifecycle APIs |
| @dnd-kit/sortable | latest (~8.0.x) | Sortable list abstraction | Companion to core for sortable list use case |
| @dnd-kit/utilities | latest | CSS transform utilities for drag | Companion utility package |

### Existing Patterns Confirmed

| Pattern | Location | How Phase Uses It |
|---------|----------|------------------|
| Modal component | `src/components/ui/modal.tsx` | Exit modal, monitoring panel drill-down |
| Badge component | `src/components/ui/badge.tsx` | EXITED badge, alert severity badges |
| Tabs component | `src/components/ui/tabs.tsx` | Asset detail tab navigation |
| StatCard component | `src/components/ui/stat-card.tsx` | Exit performance card metrics |
| Toast | `src/components/ui/toast.tsx` | Always use `const toast = useToast()` — NEVER destructure |
| sendEmail + templates | `src/lib/email.ts`, `src/lib/email-templates.ts` | Task assignment + due date notifications |
| deal-stage-engine.ts | `src/lib/deal-stage-engine.ts` | Hook point for auto-task creation |
| parsePaginationParams | `src/lib/pagination.ts` | Monitoring panel API |
| useMutation hook | `src/hooks/use-mutation.ts` | Form submissions |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Architecture Patterns

### Recommended Feature Component Structure

```
src/components/features/assets/
├── exit-asset-modal.tsx           # Exit workflow modal with live MOIC preview
├── asset-monitoring-panel.tsx     # Collapsible alert panel for assets page
├── lease-expiry-view.tsx          # Table + timeline toggle for lease expirations
├── asset-overview-tab.tsx         # Unified overview tab with sidebar
├── asset-contracts-tab.tsx        # Contracts tab with Stessa-style cards
├── asset-active-management/
│   ├── re-management-panel.tsx    # Real estate specific: lease roll, NOI
│   ├── fund-lp-panel.tsx          # Fund LP: GP reporting, commitment lifecycle
│   ├── credit-management-panel.tsx # Credit: payment schedule, covenant status
│   └── equity-management-panel.tsx # Equity/Venture: valuation, milestones
├── valuation-history-chart.tsx    # Recharts LineChart for valuations
└── create-task-form.tsx           # (EXISTING) Extend for inline quick-add

src/components/features/tasks/
├── tasks-kanban-view.tsx          # Kanban board with DnD between columns
├── tasks-list-view.tsx            # Table view with DnD reordering
└── task-checklist-items.tsx       # Subtask/checklist item component

src/app/api/assets/
├── [id]/exit/route.ts             # NEW: POST to record asset exit
└── monitoring/route.ts            # NEW: GET aggregated alerts across all assets
```

### Pattern 1: Schema Migration for Asset Model

**What:** Add 6 new fields to the existing Asset model in schema.prisma.

**Fields to add:**
```prisma
// In model Asset {}
exitDate         DateTime?
exitProceeds     Float?
exitNotes        String?
ownershipPercent Float?    // % of underlying asset owned (e.g., 12%)
shareCount       Float?    // Shares/units held (e.g., 500000 shares)
reviewFrequency  String?   // "quarterly" | "semi_annual" | "annual"
```

**After schema change — MANDATORY reset:**
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate && npx prisma db seed
# Then restart dev server
```

**CRITICAL:** Never call `prisma db push` without the consent env var. Verify DATABASE_URL points to dev, not production.

### Pattern 2: Asset Exit Endpoint

**What:** New PATCH endpoint at `/api/assets/[id]/exit` — records exit and auto-creates closing tasks.

```typescript
// src/app/api/assets/[id]/exit/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const ExitAssetSchema = z.object({
  exitDate: z.string().min(1, "Exit date is required"),
  exitProceeds: z.number().positive("Exit proceeds must be positive"),
  exitNotes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, ExitAssetSchema);
  if (error) return error;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Calculate final MOIC from proceeds vs cost basis
  const finalMoic = data!.exitProceeds / asset.costBasis;

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      status: "EXITED",
      exitDate: new Date(data!.exitDate),
      exitProceeds: data!.exitProceeds,
      exitNotes: data!.exitNotes || null,
      moic: finalMoic,
    },
  });

  // Auto-create closing tasks (similar to deal stage engine pattern)
  const closingTasks = [
    "File exit paperwork",
    "Notify LPs of exit",
    "Record final distribution",
    "Archive asset documents",
  ];
  for (const title of closingTasks) {
    await prisma.task.create({
      data: {
        title,
        status: "TODO",
        priority: "HIGH",
        assetId: id,
        contextType: "asset",
        contextId: id,
      },
    });
  }

  return NextResponse.json(updated);
}
```

### Pattern 3: Live MOIC Preview in Exit Modal

**What:** Real-time calculated preview as GP types exit proceeds.

```typescript
// In exit-asset-modal.tsx
const [exitProceeds, setExitProceeds] = useState("");

// Computed on every render — no useEffect needed
const previewMoic = exitProceeds
  ? (parseFloat(exitProceeds) / asset.costBasis).toFixed(2)
  : null;

const previewGainLoss = exitProceeds
  ? parseFloat(exitProceeds) - asset.costBasis
  : null;

const holdPeriodDays = exitDate
  ? Math.floor((new Date(exitDate).getTime() - new Date(asset.entryDate).getTime()) / (1000 * 60 * 60 * 24))
  : null;
```

### Pattern 4: Client-Side Column Sorting

**What:** Sort state on assets page — click header to toggle asc/desc.

```typescript
// In assets page component
const [sortKey, setSortKey] = useState<string>("name");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

function handleSort(key: string) {
  if (sortKey === key) {
    setSortDir(d => d === "asc" ? "desc" : "asc");
  } else {
    setSortKey(key);
    setSortDir("asc");
  }
}

// Sort computed on allAssets — no API call
const sortedAssets = [...allAssets].sort((a, b) => {
  const valA = a[sortKey] ?? "";
  const valB = b[sortKey] ?? "";
  const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
  return sortDir === "asc" ? cmp : -cmp;
});

// Column header with indicator
<th
  className="... cursor-pointer select-none"
  onClick={() => handleSort("name")}
>
  Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
</th>
```

### Pattern 5: @dnd-kit Sortable List

**What:** Drag-and-drop task reordering in list view.

```typescript
// In tasks-list-view.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Per-task sortable row
function SortableTaskRow({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td {...listeners} className="cursor-grab px-2">⠿</td>
      {/* rest of row */}
    </tr>
  );
}

// Parent list
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (active.id !== over?.id) {
    setTasks(tasks => {
      const oldIdx = tasks.findIndex(t => t.id === active.id);
      const newIdx = tasks.findIndex(t => t.id === over!.id);
      const reordered = arrayMove(tasks, oldIdx, newIdx);
      // Persist order to API
      reordered.forEach((task, idx) => {
        fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, order: idx }),
        });
      });
      return reordered;
    });
  }
}
```

### Pattern 6: @dnd-kit Kanban Board

**What:** Drag tasks between To Do / In Progress / Done columns to change status.

```typescript
// In tasks-kanban-view.tsx
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";

const COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

// Droppable column
function KanbanColumn({ id, label, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`... ${isOver ? "bg-indigo-50" : ""}`}>
      <h4>{label}</h4>
      <SortableContext items={tasks.map(t => t.id)}>
        {tasks.map(task => <SortableKanbanCard key={task.id} task={task} />)}
      </SortableContext>
    </div>
  );
}

// On drag end — detect column change, PATCH status
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;
  const newStatus = COLUMNS.find(c => c.id === over.id)?.id;
  if (newStatus && active.data.current?.status !== newStatus) {
    fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, status: newStatus }),
    });
  }
}
```

### Pattern 7: Task Subtasks (TaskChecklistItem model)

**What:** New schema model for checklist items on a task. Task model needs no new fields — items are a child relation.

```prisma
// Add to schema.prisma
model TaskChecklistItem {
  id         String   @id @default(cuid())
  taskId     String
  title      String
  isChecked  Boolean  @default(false)
  position   Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

// Add relation to Task model:
checklistItems TaskChecklistItem[]
```

### Pattern 8: Monitoring Panel API

**What:** New endpoint that aggregates alerts across all assets for one firm.

```typescript
// src/app/api/assets/monitoring/route.ts
// GET /api/assets/monitoring?firmId=xxx
// Returns: {
//   covenantBreaches: [...],
//   leaseExpirations90: [...],
//   leaseExpirations180: [...],
//   loanMaturities90: [...],
//   overdueReviews: [...]
// }

const now = new Date();
const day90 = addDays(now, 90);
const day180 = addDays(now, 180);

const [covenantBreaches, leases, overdueReviews] = await Promise.all([
  prisma.covenant.findMany({
    where: {
      currentStatus: { in: ["BREACHED", "BREACH"] },
      agreement: { asset: { entityAllocations: { some: { entity: { firmId } } } } },
    },
    include: { agreement: { include: { asset: { select: { id: true, name: true } } } } },
  }),
  prisma.lease.findMany({
    where: {
      leaseEndDate: { gte: now, lte: day180 },
      asset: { entityAllocations: { some: { entity: { firmId } } }, status: "ACTIVE" },
    },
    include: { asset: { select: { id: true, name: true } } },
  }),
  prisma.asset.findMany({
    where: {
      nextReview: { lt: now },
      status: "ACTIVE",
      entityAllocations: { some: { entity: { firmId } } },
    },
    select: { id: true, name: true, nextReview: true },
  }),
]);
```

### Pattern 9: Recharts Valuation History Chart

**What:** LineChart of fair value over time using Recharts 3 (already in stack).

```typescript
// In valuation-history-chart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

// Data shape: valuations from /api/assets/[id] (already fetched, ordered by date)
const chartData = valuations
  .slice()
  .reverse() // oldest first
  .map(v => ({
    date: new Date(v.valuationDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    fairValue: v.fairValue,
  }));

// Render — match analytics/page.tsx pattern
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} width={60} />
    <Tooltip formatter={(v: number) => [fmt(v), "Fair Value"]} />
    <Line type="monotone" dataKey="fairValue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
  </LineChart>
</ResponsiveContainer>
```

**Guard:** Only render if `valuations.length >= 2` — single point makes no meaningful chart.

### Pattern 10: Task Auto-Creation in deal-stage-engine.ts

**What:** Hook into `closeDeal()` (CLOSING → CLOSED creates Asset, should also create tasks) and add a new `advanceToDueDiligence()` function for SCREENING → DUE_DILIGENCE auto-tasks.

```typescript
// Add inside closeDeal() after asset creation, following existing pattern:
const closingTasks = [
  "Complete fund legal review",
  "File closing documents",
  "Send IC approval notice to LPs",
  "Record final cost basis in accounting",
  "Create asset in portfolio system",
];
const assigneeId = deal.dealLeadId || null;
for (const title of closingTasks) {
  await prisma.task.create({
    data: {
      title,
      status: "TODO",
      priority: "HIGH",
      assigneeId,
      dealId,
      assetId: asset.id,
      contextType: "deal",
      contextId: dealId,
    },
  });
}

// New function for DD auto-tasks (called when SCREENING → DUE_DILIGENCE):
export async function createDDAutoTasks(dealId: string, assigneeId?: string) {
  const ddTasks = [
    "Review financial statements",
    "Legal document review",
    "Site visit / management meeting",
    "Reference checks",
    "Draft DD summary memo",
  ];
  for (const title of ddTasks) {
    await prisma.task.create({
      data: {
        title,
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: assigneeId || null,
        dealId,
        contextType: "deal",
        contextId: dealId,
      },
    });
  }
}
```

### Pattern 11: Task Email Notifications via Resend

**What:** Add task-specific email templates and send on assignment and due date approach.

```typescript
// Add to email-templates.ts
export function taskAssignedEmailHtml({
  assigneeName,
  taskTitle,
  dueDate,
  contextLabel,
  portalUrl,
}: { assigneeName: string; taskTitle: string; dueDate?: string; contextLabel?: string; portalUrl: string }): string {
  // Uses existing baseLayout() pattern
}

// Send in tasks PATCH handler when assigneeId changes:
if (body.assigneeId && body.assigneeId !== existingTask.assigneeId) {
  const assignee = await prisma.user.findUnique({ where: { id: body.assigneeId }, select: { email: true, name: true } });
  if (assignee?.email) {
    await sendEmail({
      to: assignee.email,
      subject: `Task assigned to you: ${task.title}`,
      html: taskAssignedEmailHtml({ ... }),
    });
  }
}
```

### Pattern 12: Inline Task Quick-Add on Detail Pages

**What:** Small inline form below the Tasks section on asset/deal/entity pages — not a modal, pre-linked to context.

```typescript
// State: controlled inline form
const [showInlineAdd, setShowInlineAdd] = useState(false);
const [inlineTitle, setInlineTitle] = useState("");

// Render in tasks section:
<button onClick={() => setShowInlineAdd(true)} className="text-xs text-indigo-600 hover:underline">
  + Add Task
</button>
{showInlineAdd && (
  <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
    <input
      value={inlineTitle}
      onChange={e => setInlineTitle(e.target.value)}
      placeholder="Task title..."
      className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
      autoFocus
      onKeyDown={e => {
        if (e.key === "Enter") handleInlineCreate();
        if (e.key === "Escape") setShowInlineAdd(false);
      }}
    />
    <Button size="sm" onClick={handleInlineCreate}>Add</Button>
    <button onClick={() => setShowInlineAdd(false)} className="text-xs text-gray-400">Cancel</button>
  </div>
)}

// handleInlineCreate POSTs to /api/tasks with assetId + contextType + contextId pre-set
```

### Anti-Patterns to Avoid

- **Sorting via new API call:** Client-side sort is instant and sufficient for current portfolio size. Do not add `sortBy` query params to `/api/assets`.
- **Opening monitoring panel data from the assets list query:** The monitoring panel needs its own `/api/assets/monitoring` endpoint that can query across Lease, Covenant, and Asset models efficiently. Don't try to embed this in the paginated assets list query.
- **Forgetting `assetId` in tasks created from asset detail page:** The existing `create-task-form.tsx` posts to `/api/assets/[id]/tasks` which only sets `assetId`. The context filter on the tasks page uses `assetId` directly — ensure both `assetId` AND `contextType: "asset"` AND `contextId: assetId` are set for proper two-way linking.
- **Using `window.location.href` for navigation:** The current assets page uses `window.location.href` for row clicks. This is acceptable for navigation but prefer `router.push()` inside event handlers for programmatic navigation in new components.
- **Restructuring asset detail page tabs without breaking existing tab names:** The current page uses tabs: `overview, loan, property, equity, fund, deal intel, performance, valuation, documents, meetings, tasks, governance`. The new structure is `overview, contracts, performance, documents, tasks, activity`. The "valuation" tab content moves into the "Performance" tab. The "governance" tab content moves into "Overview" sidebar. The "meetings" tab becomes the "Activity" tab. Map carefully.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mousedown/mousemove listeners | @dnd-kit/core + @dnd-kit/sortable | Accessibility (keyboard nav, screen readers), touch support, scroll handling, pointer capture — 100+ edge cases |
| Email HTML | String template in route handler | `email-templates.ts` + `sendEmail()` | Already built, mobile-responsive, consistent branding |
| Sortable arrays after DnD | Manual splice/insert | `arrayMove()` from @dnd-kit/sortable | Handles immutable array reorder correctly |
| Date math for 90/180 day windows | Manual millisecond math | Native Date arithmetic — `leaseEndDate >= now && leaseEndDate <= addDays(now, 90)` | Simple enough to inline, but be careful with timezone-naive dates |
| MOIC calculation | Complex formula | `exitProceeds / costBasis` — that's it for full exit | Simple division; IRR requires more (hold period + cash flows) |
| Prisma transaction for exit | Sequential awaits | `prisma.$transaction([...])` | Ensure asset status update + task creation are atomic |

---

## Common Pitfalls

### Pitfall 1: Task model missing `order` PATCH support

**What goes wrong:** The existing PATCH handler in `/api/tasks/route.ts` does NOT include `order` in the update data object (lines 116-126 — only title, description, status, priority, assigneeId, assigneeName, dueDate, notes).

**Why it happens:** `order` field was added to schema but never wired into the PATCH endpoint.

**How to avoid:** Add `if (body.order !== undefined) data.order = body.order;` to the PATCH handler before implementing DnD.

**Warning signs:** DnD appears to work visually but order isn't persisted on page refresh.

### Pitfall 2: Asset detail page tab naming collision

**What goes wrong:** The current page has 12 tabs. The new design has 6 tabs. Content from old "valuation" tab and old "governance" tab disappears if not deliberately moved.

**Why it happens:** The restructure conflates tabs with content areas.

**How to avoid:** Map the old tab content before starting: "performance" tab now houses both the attribution comparison AND the valuation history chart. "activity" tab replaces "meetings" tab but should include activityEvents too. "contracts" tab replaces "loan" + "property" (leases) + "fund" tabs with adaptive content inside.

### Pitfall 3: SWR cache not invalidated after exit

**What goes wrong:** After recording exit, the asset list and detail page show stale ACTIVE status.

**Why it happens:** SWR caches the previous response. The exit modal closes but the data doesn't refresh.

**How to avoid:** After exit success, call `mutate('/api/assets/${id}')` and `mutate(buildUrl(null))` (the assets list URL) to force revalidation of both.

### Pitfall 4: Prisma schema change breaks seed data

**What goes wrong:** After adding new Asset fields, `prisma db push --force-reset` clears all data and the seed script must be re-run.

**Why it happens:** `--force-reset` drops and recreates tables.

**How to avoid:** Always run `npx prisma db seed` immediately after `db push --force-reset`. Never run `db push` without `--force-reset` during development if schema has changed.

### Pitfall 5: Recharts "Generating NaN" on missing valuation data

**What goes wrong:** Chart renders with NaN values if valuation dates or fair values contain null/undefined.

**Why it happens:** Recharts doesn't handle null data points gracefully in all configurations.

**How to avoid:** Filter chartData: `const chartData = valuations.filter(v => v.valuationDate && v.fairValue).map(...)`. Wrap the chart in a guard: `if (chartData.length < 2) return <EmptyState />;`.

### Pitfall 6: @dnd-kit requires unique string IDs

**What goes wrong:** DnD crashes or behaves incorrectly when task IDs are not unique across columns in kanban view.

**Why it happens:** `SortableContext` and `useDroppable` use IDs for collision detection. Column IDs ("TODO", "IN_PROGRESS", "DONE") must not collide with task IDs (cuid strings).

**How to avoid:** Task IDs are cuids (unique strings). Column IDs are "TODO", "IN_PROGRESS", "DONE" — no collision possible. But confirm during implementation.

### Pitfall 7: Toast crash from Zod error object

**What goes wrong:** `toast.error(data.error)` crashes if `data.error` is a Zod field error object.

**Why it happens:** Existing pattern documented in coding-patterns.md — parseBody returns objects for validation errors.

**How to avoid (always):**
```typescript
const msg = typeof data.error === "string" ? data.error : "Failed to save";
toast.error(msg);
```

### Pitfall 8: Monitoring panel API missing firm scoping

**What goes wrong:** Covenant and Lease queries return data for all firms if firmId filter is not applied.

**Why it happens:** Covenant → CreditAgreement → Asset → AssetEntityAllocation → Entity → firmId — the chain is 4 joins deep. Easy to miss.

**How to avoid:** All monitoring queries must filter via: `asset: { entityAllocations: { some: { entity: { firmId } } } }`. Test with two-firm scenario in seed data.

---

## Code Examples

### Recharts LineChart (from existing analytics/page.tsx)

```typescript
// Source: src/app/(gp)/analytics/page.tsx lines 243-272
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

<ResponsiveContainer width="100%" height={260}>
  <LineChart data={velocityData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
    <YAxis tick={{ fontSize: 10 }} />
    <Tooltip />
    <Line type="monotone" dataKey="days" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
  </LineChart>
</ResponsiveContainer>
```

### SWR Mutation Pattern (from coding-patterns.md)

```typescript
// Pattern A: fetch + manual mutate
const res = await fetch(`/api/assets/${id}/exit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  const data = await res.json();
  const msg = typeof data.error === "string" ? data.error : "Failed to record exit";
  toast.error(msg);
  return;
}
toast.success("Asset marked as exited");
mutate(`/api/assets/${id}`);
mutate(buildUrl(null)); // refresh asset list
```

### Task with Asset Context (from existing tasks route)

```typescript
// Source: src/app/api/tasks/route.ts POST handler
await prisma.task.create({
  data: {
    title: body.title,
    status: "TODO",
    priority: "HIGH",
    assigneeId: body.assigneeId || null,
    assetId: assetId,          // FK relation
    contextType: "asset",      // polymorphic type label
    contextId: assetId,        // polymorphic ID
  },
});
```

### Dynamic Route Params (Next.js 16 required pattern)

```typescript
// Source: coding-patterns.md — MUST await params
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // MUST await in Next.js 16
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 14 |
|--------------|-----------------|---------------------|
| Custom DnD with mouse events | @dnd-kit (accessibility-first) | Must install; no legacy DnD library to remove |
| Per-type asset detail pages (separate tabs per type) | Unified tabs with adaptive content inside | Current code has type-specific tabs — restructure required |
| Valuation history as table-only | Line chart + table | Recharts already installed; chart is additive |
| Tasks without context | Tasks with assetId/dealId/entityId FK | Model already has these; UI linking is the gap |
| Hard-coded task creation | Auto-creation via stage engine hook | deal-stage-engine.ts has hook points; logic not yet added |

---

## Open Questions

1. **Task subtask persistence timing — when is TaskChecklistItem schema needed?**
   - What we know: Subtasks (checklist items) are in-scope for this phase (confirmed in CONTEXT.md). The Task model has no subtask relation today.
   - What's unclear: Whether subtasks need a separate schema model (TaskChecklistItem) or can be stored as JSON on Task.notes.
   - Recommendation: Use a proper TaskChecklistItem model (as shown in Pattern 7) — JSON would be fragile and hard to query. This means another schema migration alongside the Asset field additions.

2. **Due date reminder emails — scheduled job or on-demand?**
   - What we know: The project has no background job infrastructure (BullMQ/Inngest explicitly removed). Resend is installed and working.
   - What's unclear: "Reminder the day before due date" requires either a scheduled job (cron) or a different trigger mechanism.
   - Recommendation: Implement as a lazy-check approach — when a task is fetched/loaded, check if dueDate is tomorrow and notification hasn't been sent yet (add `reminderSentAt` field to Task). Or scope reminder emails out and deliver only assignment + overdue notifications (which can be triggered on mutation). Flag this for the planner to decide scope.

3. **Lease timeline view — horizontal calendar library needed?**
   - What we know: The timeline view is described as a "horizontal calendar with color coding." No calendar/timeline library is installed.
   - What's unclear: Whether this is a Gantt-style chart or a simple date-sorted table with visual bars.
   - Recommendation: Build the timeline as a simple CSS-based horizontal bar chart (each lease = a row with a colored bar spanning its expiry date relative to today). Avoid adding a heavy Gantt/calendar library. Recharts BarChart with horizontal layout could also work.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | none detected in root — uses `vitest` script in package.json |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-04 | Exit endpoint returns updated asset with EXITED status and correct MOIC | unit | `npm test -- exit` | ❌ Wave 0 |
| ASSET-04 | Exit auto-creates closing tasks | unit | `npm test -- exit` | ❌ Wave 0 |
| ASSET-06 | Client-side sort produces correct order for all column keys | unit | `npm test -- sort` | ❌ Wave 0 |
| ASSET-07 | Monitoring API returns covenant breaches filtered by firmId | unit | `npm test -- monitoring` | ❌ Wave 0 |
| ASSET-08 | Lease expirations within 90 days correctly identified | unit | `npm test -- monitoring` | ❌ Wave 0 |
| ASSET-09 | Valuation chart data is correctly shaped from valuations array | unit | `npm test -- chart` | ❌ Wave 0 |
| TASK-03 | arrayMove produces correct task order after DnD | unit | `npm test -- dnd` | ❌ Wave 0 |
| TASK-05 | DD auto-tasks created on stage transition | unit | `npm test -- stage` | ❌ Wave 0 |
| ASSET-05 | Holding type adaptive UI — visual/behavioral | manual | UI review | manual-only |
| TASK-01 | Task context links navigate correctly | manual | Click-through in browser | manual-only |
| TASK-02 | Inline task creation pre-links to context | manual | Create task from asset detail | manual-only |
| TASK-04 | Context filter on tasks page filters correctly | manual | Filter by asset/deal | manual-only |

### Sampling Rate
- **Per task commit:** `npm test` (< 5 seconds for the unit test suite)
- **Per wave merge:** `npm run build` (TypeScript check) + `npm test`
- **Phase gate:** Full suite green + `npm run build` zero errors before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/asset-exit.test.ts` — covers ASSET-04 exit calculation and task creation
- [ ] `src/lib/__tests__/asset-monitoring.test.ts` — covers ASSET-07/08 date window logic
- [ ] `src/lib/__tests__/task-sort.test.ts` — covers ASSET-06 client-side sort and TASK-03 arrayMove
- [ ] `src/lib/__tests__/deal-stage-tasks.test.ts` — covers TASK-05 auto-task creation

Note: Existing test file `src/lib/__tests__/email-templates.test.ts` already exists — add task notification template tests there.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified in actual source files
  - `prisma/schema.prisma` — Asset model (line 540), Task model (line 1461), Covenant (line 733), Lease (line 666)
  - `src/app/(gp)/assets/page.tsx` — current asset list implementation
  - `src/app/(gp)/assets/[id]/page.tsx` — current asset detail page (650 lines)
  - `src/app/(gp)/tasks/page.tsx` — current tasks page
  - `src/app/api/tasks/route.ts` — task CRUD with context filter support
  - `src/lib/deal-stage-engine.ts` — stage transition functions (567 lines)
  - `src/lib/email.ts` + `src/lib/email-templates.ts` — Resend integration
  - `package.json` — confirmed library versions
  - `src/app/(gp)/analytics/page.tsx` — Recharts 3 usage pattern

### Secondary (MEDIUM confidence)
- @dnd-kit documentation patterns — standard library for React 18+/19 drag-and-drop; no Context7 lookup performed but widely established as the successor to react-beautiful-dnd (which is deprecated)
- Recharts 3 API — confirmed from existing analytics page usage pattern; API is stable across v3.x

### Tertiary (LOW confidence)
- Due date reminder email approach (lazy-check vs cron) — no authoritative source; recommendation is pragmatic given no background job infrastructure

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from package.json and direct codebase inspection
- Architecture: HIGH — based on actual current implementation; gaps precisely identified
- Pitfalls: HIGH — all pitfalls derived from coding-patterns.md (project rules) and direct code gaps found during inspection
- New library (@dnd-kit): MEDIUM — established library, standard recommendation, version not confirmed via Context7

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack — 30 days)
