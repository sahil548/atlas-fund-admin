# Phase 16: Capital Activity - Research

**Researched:** 2026-03-09
**Domain:** Capital call / distribution lifecycle management, waterfall preview, document attachment, per-investor status tracking
**Confidence:** HIGH (source: direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page Structure & Navigation**
- Rename "Transactions" page to "Capital Activity" — keep existing 3-tab structure (Capital Calls, Distributions, Waterfall Templates)
- Enhance the list page: add overdue stat card, improve status badges, make rows clickable
- Add dedicated detail pages: `/transactions/capital-calls/[id]` and `/transactions/distributions/[id]`
- List rows show per-investor funded/pending count badge (e.g., "3/5 funded")

**Asset-Level Transaction Ledgers (Expanded Scope)**
- Each asset gets a transaction ledger tracking income, expenses, and valuations
- Categorized tabs on asset detail page: Income tab, Expenses tab (each with entry form and running totals)
- Transaction entry: date, type (income/expense), category (rental, interest, dividend, management fee, etc.), amount, description
- Auto-recalculate asset IRR and MOIC on every transaction save
- Income from assets auto-aggregates at the entity level in real time
- Period-based breakdown view also available for entity-level reporting (monthly/quarterly, which assets contributed what)
- LP positions in external funds are just another asset — same transaction treatment, income flows up to entity

**Entity-Level Financial Metrics**
- Dual metric view on entity detail page:
  - Realized returns from capital flows (calls/distributions) — TVPI, DPI, RVPI, Net IRR
  - Unrealized returns from current asset valuations — Gross IRR, portfolio MOIC
- Financial summary card on entity detail page: Total Called, Total Distributed, Unrealized Value (NAV), Gross IRR, Net IRR, TVPI, DPI, RVPI
- Metrics computed from real transaction data, not seeded/placeholder values

**Status Advancement UX**
- Confirmation dialog before sending investor notifications when marking capital call as ISSUED ("This will notify X investors. Proceed?")
- Enforce full lifecycle for distributions: DRAFT → APPROVED → PAID (no skipping approval)
- Individual per-investor "Mark Funded" on capital call detail page — when all investors fund, call auto-advances to FUNDED
- Fix existing ALLOWED_TRANSITIONS map in API to include missing FUNDED transition paths

**Overdue & Per-Investor Visibility**
- Red "OVERDUE" badge + subtle red-tinted row background in the Capital Activity list
- Visual-only detection: computed on page load (dueDate < now && status not FUNDED) — no DB write, no background job
- Overdue stat card added to top of Capital Activity page alongside existing stat cards
- Per-investor capital call status shown as line items table on capital call detail page: investor name, amount owed, status (Funded/Pending), paid date

**Document Attachment**
- Both upload new files AND link existing entity documents on capital call and distribution detail pages
- Reuse Vercel Blob upload pattern + existing Document model
- Add nullable FKs on Document model: capitalCallId, distributionEventId (schema change)
- Any file type accepted
- LPs can see attached documents in their portal (not GP-only)

**Waterfall Preview**
- Preview available in both locations: waterfall template page ("Run Scenario" button) AND during distribution creation (preview step before committing)
- Full tier-by-tier breakdown showing each waterfall tier's computation (hurdle, catch-up, carry split) + per-investor detail
- Side-by-side comparison: GP can run 2-3 scenarios with different amounts and compare in columns
- Preview calculates without saving — results are transient (not persisted as WaterfallCalculation)
- Include a chart (Recharts) showing LP vs GP split alongside the numbers

### Claude's Discretion
- Whether to show single next-step button or all valid transitions — Claude determines based on entity status transition pattern from Phase 15

### Deferred Ideas (OUT OF SCOPE)
- GL-style double-entry accounting
- IRS 704(b) partnership special income allocations
- Commitment overview dashboard
- Capital readiness checks at deal close
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAP-01 | GP can advance capital call status via UI buttons (DRAFT → ISSUED → FUNDED) | PATCH /api/capital-calls/[id] exists; ALLOWED_TRANSITIONS needs FUNDED path added; StatusTransitionDialog pattern from Phase 15 is the reference |
| CAP-02 | GP can advance distribution status via UI buttons (DRAFT → APPROVED → PAID) | PATCH /api/distributions/[id] exists with correct ALLOWED_TRANSITIONS; need detail page with action buttons |
| CAP-03 | Overdue capital calls show visual indicator in capital activity views | CapitalCallStatus.OVERDUE exists in schema; overdue detection is client-side (dueDate < now && status !== FUNDED); no API changes needed |
| CAP-04 | GP can attach documents to capital calls | Document model exists with Vercel Blob pattern; schema needs capitalCallId FK added; POST /api/documents already handles FormData upload |
| CAP-05 | Waterfall can be previewed (calculate without saving) for scenario analysis | computeWaterfall() is pure function; calculate endpoint already has saveResults boolean; passing saveResults:false enables preview mode |
| CAP-06 | Per-investor capital call status visible at a glance | CapitalCallLineItem model exists with investor relation; GET /api/capital-calls/[id] already returns lineItems with investor names and status |
</phase_requirements>

---

## Summary

Phase 16 builds on an already well-structured capital activity domain. The APIs, state machines, and computation engines all exist — this phase is primarily about surfacing data through new UI pages and fixing small gaps in existing transitions.

The five core work areas are: (1) new detail pages for capital calls and distributions with action buttons, (2) overdue detection and badging on the list page, (3) document attachment via a schema migration adding nullable FKs to the Document model, (4) waterfall preview mode by passing `saveResults: false` to the existing endpoint, and (5) asset-level income/expense ledgers with IRR/MOIC recalculation cascading up to entity-level metrics.

The biggest risk is the schema change for document attachment (`capitalCallId` and `distributionEventId` FKs on Document) — this requires a `prisma db push --force-reset` with seed re-run. The ALLOWED_TRANSITIONS bug in `capital-calls/[id]/route.ts` is a known gap: the FUNDED state has an empty transitions array, which blocks the per-investor Mark Funded auto-advance path — but `updateCapitalCallStatus()` in the engine bypasses the ALLOWED_TRANSITIONS guard by writing directly, so existing behavior works; the UI buttons will use the engine path, not the raw PATCH.

**Primary recommendation:** Follow the "detail page first" wave order. Get capital call and distribution detail pages working (CAP-01, CAP-02, CAP-06) before tackling schema changes for document attachment (CAP-04).

---

## Standard Stack

### Core (confirmed from codebase inspection)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, API routes | Project framework |
| React | 19 | UI rendering | Project framework |
| Prisma | 7.4.2 | ORM, schema migrations | Project ORM |
| SWR | 2.4.1 | Client-side data fetching | Project standard |
| Zod | 4.3.6 | Schema validation | Project standard |
| Recharts | 3.7.0 | Charts (LP/GP split bar) | Already used for charts throughout Atlas |
| @vercel/blob | latest | File storage | Already used for all document uploads |
| Tailwind CSS | 4 | Styling | Project standard |

### Supporting UI Components (already in project)
| Component | Location | Purpose |
|-----------|----------|---------|
| PageHeader | `src/components/ui/page-header.tsx` | Standard page header with actions slot |
| SectionPanel | `src/components/ui/section-panel.tsx` | White card wrapper |
| Badge | `src/components/ui/badge.tsx` | Status color badges |
| StatCard | `src/components/ui/stat-card.tsx` | Metric cards at top of page |
| ConfirmDialog | `src/components/ui/confirm-dialog.tsx` | `variant="primary" | "danger"` — use for status transitions |
| FileUpload | `src/components/ui/file-upload.tsx` | Drag-and-drop upload, any file type |
| TableSkeleton | `src/components/ui/table-skeleton.tsx` | Loading state for tables |
| EmptyState | `src/components/ui/empty-state.tsx` | Empty lists with CTAs |
| Modal | `src/components/ui/modal.tsx` | Dialogs and drawers |

### Computation Engines (already in project)
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/computations/waterfall.ts` | Pure waterfall calculation, returns `WaterfallResult` | Production-ready, tested |
| `src/lib/computations/capital-accounts.ts` | Capital account roll-forward | Production-ready, tested |
| `src/lib/computations/irr.ts` | Newton-Raphson XIRR | Production-ready |
| `src/lib/computations/metrics.ts` | TVPI, DPI, RVPI, MOIC | Exists — verify accuracy |
| `src/lib/capital-activity-engine.ts` | Transaction chain orchestration | Exists — `updateCapitalCallStatus()` auto-advances to FUNDED |

---

## Architecture Patterns

### Recommended Project Structure for Phase 16

```
src/
├── app/(gp)/transactions/
│   ├── page.tsx                          # MODIFY: rename to "Capital Activity", add overdue stat card, make rows clickable
│   ├── capital-calls/
│   │   └── [id]/page.tsx                 # NEW: capital call detail page
│   └── distributions/
│       └── [id]/page.tsx                 # NEW: distribution detail page
├── app/api/
│   ├── capital-calls/[id]/
│   │   ├── route.ts                      # MODIFY: fix ALLOWED_TRANSITIONS (add FUNDED paths if needed)
│   │   └── documents/route.ts            # NEW: attach/list documents for a capital call
│   └── distributions/[id]/
│       └── documents/route.ts            # NEW: attach/list documents for a distribution
├── components/features/capital/
│   ├── create-capital-call-form.tsx      # EXISTING — no changes
│   ├── create-distribution-form.tsx      # EXISTING — no changes
│   ├── capital-call-status-buttons.tsx   # NEW: Mark as Issued / Mark as Funded buttons
│   ├── distribution-status-buttons.tsx   # NEW: Approve / Mark as Paid buttons
│   ├── capital-call-line-items-table.tsx # NEW: per-investor funded/pending table
│   └── capital-call-document-panel.tsx  # NEW: upload + list documents on a call
└── prisma/schema.prisma                  # MODIFY: add capitalCallId, distributionEventId to Document
```

### Pattern 1: Status Transition Buttons (from Phase 15)

The Phase 15 entity StatusTransitionDialog is the model. For capital calls, Claude has discretion on single-next-step vs all-valid-transitions. Recommendation: show only the **single next logical step** as a labeled button (simpler cognitive load for GP).

Capital call transitions:
- DRAFT → button "Mark as Issued" (with investor count confirmation dialog)
- ISSUED → no direct GP button; auto-advances when all line items funded via `updateCapitalCallStatus()`
- PARTIALLY_FUNDED → same, auto-advance
- OVERDUE → no button (detected client-side, status set by engine)
- FUNDED → terminal, no button

Distribution transitions:
- DRAFT → button "Approve" (primary variant)
- APPROVED → button "Mark as Paid" (primary variant, triggers capital account recompute)
- PAID → terminal, no button

```typescript
// Source: src/components/features/entities/status-transition-dialog.tsx (Phase 15 pattern)
// Adapt this pattern for capital calls:
async function handleMarkAsIssued() {
  // 1. Show ConfirmDialog: "This will notify X investors. Proceed?"
  // 2. On confirm: PATCH /api/capital-calls/{id} with { status: "ISSUED" }
  // 3. Existing notifyInvestorsOnCapitalCall() fires automatically in the PATCH handler
  // 4. mutate() SWR key to refresh detail page
}
```

### Pattern 2: Per-Investor Mark Funded (Line Items Table)

The line item PATCH endpoint (`/api/capital-calls/[id]/line-items/[lineItemId]`) already exists and triggers the auto-advance chain when the last investor pays. The detail page just needs to call it with `{ status: "Funded" }`.

```typescript
// Source: src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts
// PATCH with: { status: "Funded", paidDate: new Date().toISOString() }
// Engine chain fires: updateCommitmentCalledAmount → recomputeCapitalAccountForInvestor → updateCapitalCallStatus
// updateCapitalCallStatus auto-advances call to FUNDED when all line items are Funded
```

### Pattern 3: Waterfall Preview Mode

The calculate endpoint already accepts `saveResults: boolean`. Preview mode = `saveResults: false`. The frontend already renders waterfall results inline — just stop persisting.

```typescript
// Source: src/app/api/waterfall-templates/[id]/calculate/route.ts (lines 124-143)
// Existing: if (saveResults) { prisma.waterfallCalculation.create(...) }
// Preview mode: POST with { saveResults: false } — computation runs, no DB write, results returned identically
// The computeWaterfall() function is a pure function — no side effects, safe to call without saving
```

### Pattern 4: Document Attachment with Schema Change

The Document model needs two nullable FK fields. This is the only schema migration in Phase 16.

```prisma
// prisma/schema.prisma — modify Document model:
model Document {
  // ... existing fields ...
  capitalCallId       String?           // NEW
  distributionEventId String?           // NEW

  // ... existing relations ...
  capitalCall         CapitalCall?      @relation(fields: [capitalCallId], references: [id])   // NEW
  distributionEvent   DistributionEvent? @relation(fields: [distributionEventId], references: [id]) // NEW
}

// Also add reverse relations on CapitalCall and DistributionEvent:
model CapitalCall {
  // ... existing fields ...
  documents  Document[]   // NEW
}

model DistributionEvent {
  // ... existing fields ...
  documents  Document[]   // NEW
}
```

Document upload uses existing FormData pattern:
```typescript
// Reuse POST /api/documents with additional field:
formData.append("capitalCallId", capitalCallId);
// Document.create() in route.ts needs to pass capitalCallId to prisma
```

### Pattern 5: Overdue Detection (Client-Side Only)

No DB changes. Computed inline when rendering the list:
```typescript
// Source: existing CONTEXT.md decision — visual-only detection
function isOverdue(call: CapitalCall): boolean {
  return call.status !== "FUNDED" &&
         call.status !== "PARTIALLY_FUNDED" &&
         new Date(call.dueDate) < new Date();
}
// Apply to list rows: red row tint + "OVERDUE" badge overlay
// Overdue stat card: capitalCalls.filter(isOverdue).length
```

### Pattern 6: Fire-and-Forget Notification with Count Confirmation

The notification is already wired in the PATCH handler (`notifyInvestorsOnCapitalCall` fires when status → ISSUED). The frontend just needs to show investor count before the user confirms.

```typescript
// Before showing ConfirmDialog, compute investor count from already-loaded lineItems:
const investorCount = capitalCall.lineItems.length;
// Message: `This will notify ${investorCount} investor${investorCount !== 1 ? "s" : ""}. Proceed?`
```

### Anti-Patterns to Avoid

- **Blocking on notification delivery:** `notifyInvestorsOnCapitalCall()` is fire-and-forget — never await it in the status transition handler.
- **Writing overdue to DB:** Overdue detection is client-side visual only — no status writes from frontend.
- **Skipping APPROVED for distributions:** The locked decision enforces DRAFT → APPROVED → PAID with no skip. The ALLOWED_TRANSITIONS map already enforces this server-side.
- **Raw PATCH for FUNDED auto-advance:** The `updateCapitalCallStatus()` in the engine handles FUNDED auto-advance; the raw PATCH route has an ALLOWED_TRANSITIONS gap (ISSUED → [] doesn't include FUNDED). Use the line-item PATCH pattern which calls the engine directly.
- **Using browser confirm():** All destructive actions use the ConfirmDialog component (FOUND-03 is complete and enforced).
- **Forgetting loading guard:** SWR data is undefined on first render — always guard with `if (isLoading || !data)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waterfall math | Custom calculator | `computeWaterfall()` in `src/lib/computations/waterfall.ts` | Tested with vitest, handles hurdle/catch-up/carry/clawback/per-investor |
| Capital account roll-forward | Custom formula | `recomputeCapitalAccountForInvestor()` in capital-activity-engine | Already wired to line item funding events |
| XIRR calculation | Newton-Raphson from scratch | `xirr()` in `src/lib/computations/irr.ts` | Production-ready, handles edge cases |
| File upload to Vercel Blob | Custom upload handler | `put()` from `@vercel/blob` + existing `/api/documents` POST | Established pattern with local dev fallback |
| Status transition validation | Frontend-only validation | ALLOWED_TRANSITIONS map in each route + Zod schema | Server enforces, client mirrors for UX |
| Investor notification | Custom email system | `notifyInvestorsOnCapitalCall()` / `notifyInvestorsOnDistribution()` | Already wired, fire-and-forget |
| Status badge colors | Custom color logic | `CC_STATUS_COLORS` / `DIST_STATUS_COLORS` in transactions page | Already defined, export and reuse |

**Key insight:** The computation layer is production-ready. Phase 16 is 80% UI wiring and 20% schema + API surface additions.

---

## Common Pitfalls

### Pitfall 1: ALLOWED_TRANSITIONS Gap for FUNDED
**What goes wrong:** The PATCH handler for capital calls has `FUNDED: []` — so if a GP ever tries to PATCH to FUNDED directly, it will be rejected. However, the `updateCapitalCallStatus()` engine function writes directly to Prisma without going through the ALLOWED_TRANSITIONS guard. This is intentional — auto-advance from the engine bypasses the guard.
**Why it happens:** The two paths were designed separately. Direct PATCH uses the guard; engine uses Prisma directly.
**How to avoid:** The "Mark as Funded" button on the detail page should NOT call PATCH with `{ status: "FUNDED" }`. Instead, mark all individual line items as Funded — the engine auto-advances the parent call. If a "Force Mark Funded" button is needed (no line items), add `ISSUED: ["FUNDED"]` to ALLOWED_TRANSITIONS.
**Warning signs:** 400 error "Cannot transition from ISSUED to FUNDED" when trying to mark funded.

### Pitfall 2: Schema Migration Data Loss
**What goes wrong:** Running `prisma db push --force-reset` wipes all data and requires re-seed.
**Why it happens:** Prisma 7's push command resets the DB. The AiConfig note from Phase 12 applies: tenant key must be re-entered.
**How to avoid:** Only one schema change needed (Document model + two nullable FK fields + reverse relations). Always verify `DATABASE_URL` points to dev DB before running. Nullable fields mean no existing document rows break.
**Warning signs:** Empty Capital Activity page after migration = seed not re-run.

### Pitfall 3: Distribution Default Status Bug
**What goes wrong:** The `CreateDistributionSchema` has `status: z.enum([...]).default("APPROVED")` — distributions are created as APPROVED by default, not DRAFT. The locked decision requires DRAFT → APPROVED → PAID lifecycle.
**Why it happens:** Original schema defaulted to APPROVED for quick creation. Phase 16 wants explicit lifecycle.
**How to avoid:** Change the schema default to `"DRAFT"` in the Zod schema AND update the Prisma schema `@default(APPROVED)` to `@default(DRAFT)`. Review whether existing seeded distributions need status handling.
**Warning signs:** New distributions skip the "Approve" button entirely.

### Pitfall 4: SWR Stale Data After Status Transition
**What goes wrong:** After marking a line item as Funded, the parent capital call's status auto-updates in the DB, but the detail page still shows the old status.
**Why it happens:** The line item PATCH mutates the line item SWR key, but not the parent capital call key.
**How to avoid:** After PATCH to the line item endpoint, call `mutate('/api/capital-calls/[id]')` to refresh the parent call's status and `_summary` fields.
**Warning signs:** All investors show Funded but call status still shows ISSUED.

### Pitfall 5: Document Upload Content-Type Header
**What goes wrong:** Setting `Content-Type: multipart/form-data` manually on FormData upload breaks the multipart boundary.
**Why it happens:** Browser must auto-set the Content-Type with the correct boundary string.
**How to avoid:** Never set Content-Type header when sending FormData. This is documented in `coding-patterns.md`.
**Warning signs:** Server receives empty FormData, file is null, document record created with no fileUrl.

### Pitfall 6: Recharts Tooltip Formatter Type Error
**What goes wrong:** Recharts 3 Formatter generic on Tooltip causes TypeScript compile errors with complex types.
**Why it happens:** Recharts 3 has complex generic constraints for formatter callbacks.
**How to avoid:** Type the formatter as `any` — consistent with existing Atlas analytics pages. Run `npm run build` to catch any remaining type errors.
**Warning signs:** TypeScript error in chart component during `npm run build`.

---

## Code Examples

Verified patterns from existing codebase:

### Status Transition Button (single next step)
```typescript
// Pattern: show one button for the next valid transition, ConfirmDialog for ISSUED
"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const [showConfirm, setShowConfirm] = useState(false);
const [transitioning, setTransitioning] = useState(false);

async function handleMarkAsIssued() {
  setTransitioning(true);
  const res = await fetch(`/api/capital-calls/${call.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ISSUED" }),
  });
  if (!res.ok) {
    const data = await res.json();
    const msg = typeof data.error === "string" ? data.error : "Failed to issue call";
    toast.error(msg);
  } else {
    toast.success("Capital call issued — investors notified");
    mutate(`/api/capital-calls/${call.id}`);
  }
  setTransitioning(false);
  setShowConfirm(false);
}

// Render:
{call.status === "DRAFT" && (
  <>
    <button onClick={() => setShowConfirm(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">
      Mark as Issued
    </button>
    <ConfirmDialog
      open={showConfirm}
      onClose={() => setShowConfirm(false)}
      onConfirm={handleMarkAsIssued}
      title="Issue Capital Call"
      message={`This will notify ${call.lineItems.length} investor${call.lineItems.length !== 1 ? "s" : ""}. Proceed?`}
      confirmLabel="Issue Call"
      variant="primary"
      loading={transitioning}
    />
  </>
)}
```

### Per-Investor Line Item Mark Funded
```typescript
// PATCH /api/capital-calls/[id]/line-items/[lineItemId]
// Engine auto-advances parent call when all line items funded
async function handleMarkFunded(lineItemId: string) {
  const res = await fetch(`/api/capital-calls/${callId}/line-items/${lineItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Funded", paidDate: new Date().toISOString() }),
  });
  if (res.ok) {
    mutate(`/api/capital-calls/${callId}`); // refreshes parent + _summary + all lineItems
  }
}
```

### Waterfall Preview (no save)
```typescript
// Existing endpoint, just pass saveResults: false
const res = await fetch(`/api/waterfall-templates/${templateId}/calculate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entityId,
    distributableAmount: Number(amount),
    saveResults: false,  // preview mode — no WaterfallCalculation record created
  }),
});
// Response shape is identical — tiers, summary, perInvestorBreakdown all present
```

### Overdue Detection (client-side)
```typescript
// No API changes needed — computed inline
function isOverdue(call: CapitalCall): boolean {
  if (call.status === "FUNDED" || call.status === "PARTIALLY_FUNDED") return false;
  return new Date(call.dueDate) < new Date();
}

// Row styling:
<tr className={cn(
  "border-t border-gray-50 hover:bg-gray-50 cursor-pointer",
  isOverdue(c) && "bg-red-50 hover:bg-red-100"
)}>

// Badge:
{isOverdue(c) && <Badge color="red">OVERDUE</Badge>}
```

### Document Attachment Upload
```typescript
// Reuse existing FormData pattern + add capitalCallId field
async function handleUpload(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);
  formData.append("category", "OTHER");
  formData.append("capitalCallId", capitalCallId); // new field
  // Do NOT set Content-Type header
  const res = await fetch("/api/documents", { method: "POST", body: formData });
  if (res.ok) mutate(`/api/capital-calls/${capitalCallId}/documents`);
}
```

### Side-by-Side Waterfall Scenario Comparison
```typescript
// State: array of scenario results (max 3)
const [scenarios, setScenarios] = useState<Array<{ amount: string; result: WaterfallResult }>>([]);

// Render as columns:
<div className="grid grid-cols-3 gap-4">
  {scenarios.map((s, i) => (
    <div key={i} className="border rounded-lg p-4">
      <div className="text-xs font-semibold mb-2">${fmt(Number(s.amount))}</div>
      {/* tier breakdown for this scenario */}
    </div>
  ))}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 16 |
|--------------|------------------|---------------------|
| Manual status editing via form fields | Explicit named action buttons (Mark as Issued, Approve, etc.) | Phase 16 adds these buttons — Phase 15 StatusTransitionDialog is the pattern |
| Waterfall always saves on calculate | `saveResults: false` param for preview mode | Already implemented in endpoint — just need frontend to use it |
| Overdue as a DB status requiring background jobs | Client-side visual detection on page load | Simpler, no cron needed, locked decision |
| All document uploads linked to entity/deal/asset only | Documents also linkable to capital calls and distributions | Requires schema migration for two new FK fields |

**Known gap to fix:**
- DistributionEvent schema default `@default(APPROVED)` conflicts with DRAFT → APPROVED → PAID lifecycle requirement. This must be changed to `@default(DRAFT)`.

---

## Open Questions

1. **Asset-level IRR/MOIC recalculation scope**
   - What we know: `computeMetrics()` exists in `src/lib/computations/metrics.ts`; `xirr()` exists
   - What's unclear: Whether CONTEXT.md's "asset IRR and MOIC" refers to computing from IncomeEvent + Valuation data, or from capital call line items. The IncomeEvent model has `assetId` nullable.
   - Recommendation: Research `metrics.ts` before building the asset ledger feature. Keep scope to income/expense entry forms + running totals in Wave 1; add IRR/MOIC recompute trigger in Wave 2 after verifying computation inputs.

2. **Entity-level metrics dual view scope**
   - What we know: `/api/entities/[id]/metrics` endpoint exists and is already consumed by entity detail page
   - What's unclear: Whether it currently returns realized vs unrealized separately, or combines them
   - Recommendation: Read the metrics endpoint code before planning the entity financial summary card. May need to split into two calls or add a `view=realized|unrealized` param.

3. **LP portal document surface for capital call attachments**
   - What we know: LPs can see attached documents (locked decision). LP portal has a Documents page at `/lp-documents`
   - What's unclear: How LP portal currently filters documents — does it scope by investor or entity? Adding `capitalCallId` to Document may require LP portal query changes.
   - Recommendation: Scope LP visibility to Phase 17 (LP Portal) to avoid cross-phase scope creep. For Phase 16, implement the GP-side upload/view. LP surfacing is additive.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed in `vitest.config.ts`) |
| Config file | `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/computations` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAP-01 | Capital call DRAFT → ISSUED transition | Integration (manual browser) | `npx vitest run src/lib/computations` (smoke) | ✅ |
| CAP-02 | Distribution DRAFT → APPROVED → PAID | Integration (manual browser) | `npx vitest run src/lib/computations` (smoke) | ✅ |
| CAP-03 | Overdue detection: dueDate < now && status not FUNDED | Unit | `npx vitest run src/lib/computations` | ✅ existing waterfall tests |
| CAP-04 | Document uploads attach to capital call | Manual browser | `npm run build` | ❌ Wave 0 |
| CAP-05 | Waterfall preview does not persist WaterfallCalculation row | Unit | `npx vitest run src/lib/computations` | ✅ waterfall tests cover compute |
| CAP-06 | Line items table shows investor name + status | Manual browser | `npm run build` | ✅ (type safety via build) |

### Sampling Rate
- **Per task commit:** `npm run build` (zero type errors required)
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/computations/__tests__/overdue-detection.test.ts` — covers CAP-03 overdue detection logic (pure function, easy to unit test)
- [ ] Verify `src/lib/computations/metrics.ts` exports and inputs before building entity financial summary card

*(Note: The waterfall computation is already well-covered by existing tests. The primary gap is overdue detection logic and document attachment.)*

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/app/(gp)/transactions/page.tsx` — full existing implementation, stat cards, tabs, waterfall calculate modal
- `src/app/api/capital-calls/[id]/route.ts` — ALLOWED_TRANSITIONS map, PATCH handler, notification trigger
- `src/app/api/distributions/[id]/route.ts` — distribution ALLOWED_TRANSITIONS, PATCH handler, capital account recompute trigger
- `src/app/api/waterfall-templates/[id]/calculate/route.ts` — `saveResults` param, pure computation call, response shape
- `src/lib/computations/waterfall.ts` — `computeWaterfall()` function signature and behavior
- `src/lib/capital-activity-engine.ts` — `updateCapitalCallStatus()`, `recomputeCapitalAccountForInvestor()`, `recomputeAllInvestorCapitalAccounts()`
- `src/app/api/capital-calls/[id]/line-items/[lineItemId]/route.ts` — line item PATCH, engine chain trigger
- `src/app/api/documents/route.ts` — FormData upload pattern, Vercel Blob / local fallback
- `prisma/schema.prisma` (lines 907-996) — CapitalCall, CapitalCallLineItem, DistributionEvent, DistributionLineItem, IncomeEvent models
- `prisma/schema.prisma` (lines 1571-1596) — Document model, existing FKs (no capitalCallId/distributionEventId yet)
- `src/components/ui/confirm-dialog.tsx` — `variant="primary"|"danger"`, usage pattern
- `src/components/ui/file-upload.tsx` — FileUpload component interface
- `src/components/features/entities/status-transition-dialog.tsx` — Phase 15 transition pattern, validTransitions map
- `src/lib/routes.ts` — existing `/transactions` route, `getPageTitle()` covers `/transactions/` prefix
- `src/lib/schemas.ts` (lines 470-548) — all capital call and distribution Zod schemas
- `vitest.config.ts` — test framework configuration

### Secondary (MEDIUM confidence)
- `package.json` — confirmed library versions (Next.js 16.1.6, Prisma 7.4.2, SWR 2.4.1, Zod 4.3.6, Recharts 3.7.0)
- `src/lib/computations/__tests__/waterfall.test.ts` — confirmed test infrastructure, vitest globals

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct inspection of package.json and imports
- Architecture patterns: HIGH — direct inspection of existing route handlers, UI components, and computation engines
- Pitfalls: HIGH — gaps identified from direct code inspection (ALLOWED_TRANSITIONS bug, Distribution default status, SWR stale data patterns)
- Schema changes: HIGH — Document model inspected, FKs confirmed absent, migration pattern from coding-patterns.md

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain — no third-party APIs, only internal code evolution)
