# Phase 17: LP Portal - Research

**Researched:** 2026-03-09
**Domain:** LP Portal — date-filtered capital accounts, document center tabs, metrics verification, per-entity performance, K-1 acknowledgment, LP profile page
**Confidence:** HIGH — all findings sourced from live codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Capital Account Date Range Picker (LP-04)**
- Custom date picker (start + end) always available — transactions happen on any day, not just quarter boundaries
- Quick-preset buttons for common periods (quarters, FY, YTD) alongside the custom date inputs for convenience
- When a date range is selected: EVERYTHING filters — ledger entries, period summaries, AND metrics (IRR/TVPI/DPI/RVPI) all recalculate for the selected period (full point-in-time view)
- Default view: All Time (current behavior preserved)
- Note: full transaction ledger not in scope for this phase — focus is capital account statement date filtering

**Document Center Filtering (LP-05)**
- Horizontal tabs above the document list: All | K-1s | Financial | Legal | Reports | Other
- Category badges already exist per document — tabs filter to matching categories
- When K-1s tab is active: show additional entity dropdown and tax year dropdown filters above the list

**K-1 Acknowledgment Workflow (LP-08)**
- Batch acknowledge pattern: LP sees a "Review & Acknowledge" page with all unacknowledged K-1s, checks them off in bulk, then submits
- After acknowledgment: shows "Acknowledged [date]" badge on the document
- GP-side tracking: K-1 management page shows per-investor acknowledgment status (acknowledged / pending) with dates
- GP has a "Send Reminder" button for LPs who haven't acknowledged — sends email nudge

**Per-Entity Performance (LP-07)**
- Dashboard: expand existing "Commitments by Entity" section to show IRR + TVPI per entity (headline metrics only)
- Portfolio page: new section at top showing full metrics per entity (IRR, TVPI, DPI, RVPI, NAV) before the asset look-through cards
- Sparkline per entity showing trend direction next to metrics — adds visual context
- Entity cards are clickable — navigate to entity-filtered views (capital account, activity filtered to that entity)
- Per-entity IRR computed using same xirr() approach, scoped to entity-specific cash flows

**LP Contact Information & Profile (LP-09)**
- New separate "Profile" page in the LP nav (not merged into settings) — separates identity info from notification preferences
- Full profile: legal name (read-only, GP sets it), mailing address (editable), tax ID (masked display, editable by LP via Edit button), entity affiliation list, email, phone
- View + edit is sufficient — no explicit "Verify" action needed; if the LP visits and doesn't change, it's implicitly verified
- Tax ID is editable by the LP (masked ***-**-1234 display, Edit button reveals full field)

**Metrics Verification (LP-06)**
- Dashboard API already computes IRR/TVPI/DPI/RVPI from real capital call/distribution data via xirr() + computeMetrics()
- Verification task: confirm all LP-facing metrics are computed (not seeded), add test coverage asserting computation from real transaction data
- Badge "Computed from ledger" already exists on capital account page — extend pattern to dashboard metrics

### Claude's Discretion
- Date range picker placement on the capital account page
- Date picker component choice and calendar popup implementation
- Exact tab styling for document center (active state, counts per tab)
- Per-entity metric computation trigger (fire-and-forget on dashboard load vs separate)
- Per-entity section layout on portfolio page (cards vs table)
- Entity-filtered navigation wiring (URL params vs state)
- K-1 batch acknowledge page layout
- Loading states and error handling
- Mailing address field structure (single textarea vs structured fields)
- LP profile page layout and nav placement

### Deferred Ideas (OUT OF SCOPE)
- Full transaction ledger across all transaction types — potential future phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LP-04 | Capital account statement has period/date range picker | Capital account page uses `computePeriodSummaries()` client-side from ledger data; API at `/api/investors/[investorId]/capital-account` (route doesn't exist yet — see gap below); date params `?startDate=&endDate=` need API + frontend |
| LP-05 | Document center has category filter (K-1s, financial statements, notices) | LP documents page already loads all docs with category field; tab filtering is pure client-side state on top of existing data load |
| LP-06 | LP portal metrics verified as computed from real data (not seeded values) | Dashboard API confirmed computing IRR via xirr() + TVPI/DPI/RVPI via computeMetrics() from capital call/distribution line items — test coverage needed |
| LP-07 | LP can view per-entity performance breakdown (fund-by-fund IRR/TVPI) | Dashboard API needs per-entity computation loop; MetricSnapshot model already supports per-entity snapshots (entityId field); xirr/computeMetrics already exists |
| LP-08 | K-1 acknowledgment receipt workflow | Document model has no acknowledgment fields — schema change needed; K-1 documents fetched via `/api/lp/[investorId]/documents` with category=TAX; new acknowledge API endpoint + batch UI page needed |
| LP-09 | LP can view and verify their contact information | Investor model has no mailing address / tax ID fields — schema change needed; new `/lp-profile` route + API endpoint; settings page remains for notifications |
</phase_requirements>

---

## Summary

Phase 17 is a feature-completion phase for the LP portal. All six requirements are incremental improvements to existing pages and APIs — no greenfield infrastructure is needed. The dashboard API (`/api/lp/[investorId]/dashboard`) already computes IRR/TVPI/DPI/RVPI from real data using proven `xirr()` and `computeMetrics()` functions. The capital account page has a `computePeriodSummaries()` function that groups ledger entries by quarter; the only missing piece is date range filtering passed via query params. The document center page already loads all LP documents with category badges — tab filtering is pure frontend state.

The two features that require schema changes are K-1 acknowledgment (new fields on `Document`) and LP profile (new fields on `Investor`). Both are additive-only changes (adding nullable fields), which are safe without a `--force-reset`. The `MetricSnapshot` model already has an `entityId` field designed for per-entity snapshots (`entityId="__AGGREGATE__"` is the aggregate sentinel), so per-entity metrics are a matter of extending the dashboard API's computation loop.

The test infrastructure is vitest with node environment. Two test files already exist for LP dashboard and metrics-history. Phase 17 should add tests for per-entity computation, K-1 acknowledgment API, and metrics verification coverage.

**Primary recommendation:** Execute in this order — (1) LP-06 metrics verification test coverage (zero code change, adds confidence), (2) LP-05 document tabs (frontend only, no API change), (3) LP-04 date range picker (API query param + frontend), (4) LP-07 per-entity metrics (extend dashboard API), (5) LP-08 K-1 acknowledgment (schema change + new API + batch UI), (6) LP-09 LP profile (schema change + new page + API).

---

## Standard Stack

### Core (confirmed in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App router, API routes, SSR | Project standard |
| React | 19 | UI components | Project standard |
| TypeScript | current | Type safety | Project standard |
| Tailwind CSS | 4 | Styling | Project standard |
| SWR | 2 | Data fetching + caching | All LP pages use SWR |
| Prisma | 7 | ORM + DB access | Project standard |
| Zod | 4 | Schema validation in API routes | Project standard |
| Recharts | 3 | Charts (sparklines) | Already used in PerformanceCharts component |

### Already Available (no new installs)
| Asset | Location | Used For |
|-------|----------|---------|
| `xirr()` | `src/lib/computations/irr.ts` | Per-entity IRR computation |
| `computeMetrics()` | `src/lib/computations/metrics.ts` | Per-entity TVPI/DPI/RVPI |
| `MetricSnapshot` model | `prisma/schema.prisma` | Per-entity snapshots (entityId field ready) |
| `Badge` component | `src/components/ui/badge` | Status badges (acknowledged, pending) |
| `useInvestor()` hook | `src/components/providers/investor-provider` | investorId scoping |
| `PerformanceCharts` | `src/components/features/lp/performance-charts.tsx` | Sparkline pattern (Recharts Line) |
| `ExportButton` | `src/components/ui/export-button` | CSV export |
| `useToast()` | `src/components/ui/toast` | Notifications (never destructure) |
| `parseBody()` | `src/lib/api-helpers` | API body parsing |
| `fmt()`, `cn()` | `src/lib/utils` | Formatting and conditional classes |

**Installation:** No new packages needed — all required libraries are already installed.

---

## Architecture Patterns

### Recommended LP Page Structure
```
src/app/(lp)/
├── lp-dashboard/page.tsx      # extend entity section with IRR/TVPI + sparklines
├── lp-account/page.tsx        # add date range picker + date-filtered API call
├── lp-documents/page.tsx      # add horizontal tabs + K-1 sub-filters
├── lp-portfolio/page.tsx      # add per-entity metrics section at top
├── lp-profile/page.tsx        # NEW page: contact info + tax ID edit
└── lp-settings/page.tsx       # unchanged (notifications only)

src/app/api/lp/[investorId]/
├── dashboard/route.ts         # extend with entityMetrics[] array
├── documents/route.ts         # unchanged (tabs are client-side)
└── capital-account/route.ts   # VERIFY EXISTS or check investors/[id]/capital-account

src/app/api/investors/[investorId]/
├── capital-account/route.ts   # add ?startDate&endDate query params
├── profile/route.ts           # NEW: GET/PUT for profile fields
└── notification-preferences/  # unchanged

src/app/api/k1/
├── route.ts                   # extend to return acknowledgedAt status per document
├── upload/route.ts            # unchanged
└── [id]/acknowledge/route.ts  # NEW: POST to acknowledge K-1

src/app/api/reports/k1-status/ # NEW GP-side: acknowledge status per investor
```

### Pattern 1: SWR with investorId scoping (all LP pages)
**What:** Fetch only when investorId is available; show loading guard.
**When to use:** Every LP API call.
**Example:**
```typescript
// Source: existing LP pages (lp-dashboard, lp-account, etc.)
const { investorId } = useInvestor();
const { data, isLoading } = useSWR(
  investorId ? `/api/lp/${investorId}/dashboard` : null,
  fetcher
);
if (!investorId || isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;
```

### Pattern 2: Date range picker with query params
**What:** Local state for startDate/endDate drives SWR key; API filters ledger entries.
**When to use:** LP-04 capital account date filtering.
**Example:**
```typescript
// Controlled date inputs driving SWR cache key
const [startDate, setStartDate] = useState<string>("");
const [endDate, setEndDate] = useState<string>("");

const apiUrl = investorId
  ? `/api/investors/${investorId}/capital-account${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ""}`
  : null;
const { data } = useSWR(apiUrl, fetcher);

// Preset buttons
function setPreset(preset: "ytd" | "q1" | "q2" | "q3" | "q4" | "fy") {
  const now = new Date();
  // ... compute start/end and call setStartDate/setEndDate
}
```

### Pattern 3: Fire-and-forget metric snapshots
**What:** `prisma.metricSnapshot.upsert(...).catch(err => console.error(...))` — never awaited.
**When to use:** Per-entity metric saving in dashboard API.
**Example:**
```typescript
// Source: src/app/api/lp/[investorId]/dashboard/route.ts (lines 98-130)
prisma.metricSnapshot.upsert({
  where: { investorId_entityId_periodDate: { investorId, entityId, periodDate: today } },
  create: { investorId, entityId, periodDate: today, irr, tvpi, dpi, rvpi, nav, totalCalled, totalDistributed },
  update: { irr, tvpi, dpi, rvpi, nav, totalCalled, totalDistributed },
}).catch((err) => console.error("[metric-snapshot] save failed:", err));
```

### Pattern 4: Tab filtering as pure client-side state
**What:** Active tab stored in useState; documents filtered by category in render.
**When to use:** LP-05 document center tabs.
**Example:**
```typescript
const [activeTab, setActiveTab] = useState<"all" | "k1" | "financial" | "legal" | "reports" | "other">("all");

const CATEGORY_MAP: Record<string, string[]> = {
  k1: ["TAX"],
  financial: ["FINANCIAL", "STATEMENT", "VALUATION"],
  legal: ["LEGAL", "GOVERNANCE"],
  reports: ["REPORT"],
  other: ["OTHER", "BOARD", "CORRESPONDENCE", "NOTICE"],
};

const filteredDocs = activeTab === "all"
  ? docs
  : docs.filter(doc => (CATEGORY_MAP[activeTab] ?? []).includes(doc.category));
```

### Pattern 5: Masked sensitive data with edit toggle
**What:** Display masked value; "Edit" button reveals full input field.
**When to use:** LP-09 Tax ID display.
**Example:**
```typescript
const [editingTaxId, setEditingTaxId] = useState(false);

{editingTaxId ? (
  <input type="text" value={form.taxId ?? ""} onChange={...} className="..." />
) : (
  <span className="font-mono text-sm">{maskTaxId(profile.taxId)}</span>
)}
<button onClick={() => setEditingTaxId(!editingTaxId)}>
  {editingTaxId ? "Cancel" : "Edit"}
</button>

function maskTaxId(taxId: string | null): string {
  if (!taxId) return "—";
  return taxId.replace(/^(\d{3})-?(\d{2})-?(\d{4})$/, "***-**-$3");
}
```

### Pattern 6: Batch acknowledge UI with checkbox list
**What:** Checkbox list of unacknowledged K-1s; single "Confirm Acknowledgment" button submits all.
**When to use:** LP-08 K-1 batch acknowledgment.
**Example:**
```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());

const unacknowledgedK1s = docs.filter(
  d => d.category === "TAX" && !d.acknowledgedAt
);

async function handleAcknowledge() {
  const res = await fetch(`/api/k1/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentIds: [...selected], investorId }),
  });
  if (!res.ok) { toast.error("Failed to acknowledge"); return; }
  toast.success("K-1s acknowledged");
  mutate(docsKey);
}
```

### Anti-Patterns to Avoid
- **Hardcoding firm-1 or investor-1:** Always use `useInvestor()` and `useFirm()` hooks.
- **Destructuring useToast:** `const { toast } = useToast()` crashes. Use `const toast = useToast()`.
- **Date math without UTC:** `new Date()` in filter comparisons can shift dates. Use ISO string comparison or UTC methods.
- **Awaiting fire-and-forget snapshots:** Per-entity snapshots must use `.catch()` pattern — never block the response.
- **Missing "use client" directive:** Any component using hooks needs `"use client"` at top.
- **Schema changes without generate+seed:** Any `prisma/schema.prisma` change requires `db push && generate && seed`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IRR computation | Custom NPV solver | `xirr()` in `src/lib/computations/irr.ts` | Proven Newton-Raphson with convergence guards and edge case handling |
| TVPI/DPI/RVPI formulas | Inline arithmetic | `computeMetrics()` in `src/lib/computations/metrics.ts` | Standard definitions with paid-in guard (no divide-by-zero) |
| Currency formatting | String manipulation | `fmt()` from `src/lib/utils` | Handles B/M/K suffixes consistently |
| Conditional CSS | String concatenation | `cn()` from `src/lib/utils` | Handles undefined/false safely |
| Date formatting | `new Date().toLocaleString()` | Existing `Intl.DateTimeFormat` pattern (per Phase 11 decision: native Intl, not date-fns) | Zero bundle cost, consistent across pages |
| Sparkline charts | SVG by hand | Recharts `Line` with small dimensions | Already imported in `performance-charts.tsx`, same pattern |
| Status badges | Inline colored div | `Badge` component from `src/components/ui/badge` | Consistent color mapping via `color` prop |
| Toast notifications | Custom alert UI | `useToast()` from `src/components/ui/toast` | Integrated with existing stack; destructuring crashes |
| API body parsing | `JSON.parse(await req.text())` | `parseBody(req, ZodSchema)` from `src/lib/api-helpers` | Auto-400 with field errors |

**Key insight:** Every computation, formatting, and UI primitive already exists in this codebase. Phase 17 is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Capital Account API Route Does Not Exist
**What goes wrong:** The capital account page (`lp-account/page.tsx`) fetches from `/api/investors/${investorId}/capital-account` — but searching the API routes found NO file at `src/app/api/investors/[investorId]/capital-account/route.ts`. The route may be served by a different path or may be missing entirely.
**Why it happens:** The page file directly references the path but the API directory was not found during filesystem inspection.
**How to avoid:** Before implementing date range filtering, verify the capital account API route exists. Run: `find src/app/api/investors -name "route.ts"`. If missing, the route must be created as part of this phase.
**Warning signs:** 404 errors on the capital account page in the browser.

### Pitfall 2: Schema Changes Require Full Reset
**What goes wrong:** Adding new fields to `Investor` (taxId, mailingAddress) or `Document` (acknowledgedAt, acknowledgedByInvestorId) requires `prisma db push`. On the dev environment this is safe with `--force-reset` but will wipe seeded data.
**Why it happens:** Prisma 7 strict migration enforcement. The team uses `--force-reset` in dev (per CLAUDE.md).
**How to avoid:** Batch all schema changes into one migration step. New fields should be nullable (`String?`, `DateTime?`) so existing rows are unaffected. Run full sequence: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset && npx prisma generate && npx prisma db seed`.
**Warning signs:** TypeScript errors referencing non-existent fields; Prisma client not recognizing new fields.

### Pitfall 3: Date Filtering Recalculates Metrics — Not Just Filters Display
**What goes wrong:** Per the locked decision, when a date range is selected, IRR/TVPI/DPI/RVPI must ALSO recalculate for that period — not just filter the ledger table rows. This means the API must accept `startDate`/`endDate` and filter the cash flow arrays before computing metrics.
**Why it happens:** Easy to filter the display only and forget metric recalculation.
**How to avoid:** Dashboard API `GET` or a separate metrics endpoint must receive date params and filter `capitalCallLineItem` and `distributionLineItem` by their parent call/distribution date. The `computeMetrics()` and `xirr()` calls happen AFTER date filtering.
**Warning signs:** IRR/TVPI shows all-time value even when a date range is selected.

### Pitfall 4: K-1 Acknowledgment Needs Both LP and GP Views
**What goes wrong:** Implementing only the LP-facing "batch acknowledge" without the GP-side status view (acknowledgment tracking table + Send Reminder button).
**Why it happens:** LP-08 spans two portals; the GP view is easy to overlook.
**How to avoid:** LP-08 requires: (a) LP batch acknowledge UI, (b) Document schema field `acknowledgedAt`/`acknowledgedByInvestorId`, (c) acknowledge API endpoint, (d) "Acknowledged [date]" badge on LP documents page, (e) GP reports/K-1 page extended with ack status columns and Send Reminder button.
**Warning signs:** LP can acknowledge but GP has no visibility; Send Reminder button doesn't exist.

### Pitfall 5: Per-Entity Metrics Need Entity-Scoped Cash Flows
**What goes wrong:** Per-entity IRR uses all of an investor's cash flows instead of filtering to a specific entityId.
**Why it happens:** The aggregate dashboard API fetches all `capitalCallLineItem` records for `investorId` without filtering by entity. Per-entity computation requires joining through `capitalCall.entityId`.
**How to avoid:** Per-entity cash flow query: `prisma.capitalCallLineItem.findMany({ where: { investorId, capitalCall: { entityId } } })`. Same for distribution line items. This requires the `include` chain in Prisma to reach `capitalCall.entityId`.
**Warning signs:** All entities show identical IRR (same as aggregate); entity-specific performance looks wrong.

### Pitfall 6: LP Profile Fields Don't Exist on Investor Model
**What goes wrong:** The current `Investor` model has: `name`, `investorType`, `kycStatus`, `contactPreference`, `totalCommitted` — no `mailingAddress`, `taxId`, or similar. The settings page captures `emailAddress` and `phoneNumber` on `InvestorNotificationPreference`, not on `Investor` itself.
**Why it happens:** Profile identity data was not implemented in v1.
**How to avoid:** Add nullable fields to `Investor` model: `mailingAddress String?`, `taxId String?`, `phone String?`. Email is already on `InvestorNotificationPreference`. The new profile page pulls from both. Alternatively, keep taxId/address on `Investor` and read email/phone from `InvestorNotificationPreference` via include.
**Warning signs:** Profile page has nowhere to save mailing address or tax ID.

### Pitfall 7: Document Category Enum vs Document Center Tab Mapping
**What goes wrong:** The document center tab labels (K-1s, Financial, Legal, Reports, Other) don't map 1:1 to `DocumentCategory` enum values.
**Why it happens:** The enum has: `BOARD`, `FINANCIAL`, `LEGAL`, `GOVERNANCE`, `VALUATION`, `STATEMENT`, `TAX`, `REPORT`, `NOTICE`, `OTHER`. "K-1s" maps to `TAX`. "Financial" should map to `FINANCIAL + STATEMENT + VALUATION`. "Reports" maps to `REPORT`.
**How to avoid:** Define an explicit mapping in code (see Pattern 4 above). The "Other" catch-all tab should include `BOARD`, `GOVERNANCE`, `NOTICE`, `CORRESPONDENCE`, `OTHER`.
**Warning signs:** Documents appear in wrong tabs or not at all.

---

## Code Examples

Verified patterns from existing codebase:

### Per-Entity Cash Flow Query (for LP-07)
```typescript
// Source: dashboard/route.ts pattern — extend with entityId filter
const entityCallLineItems = await prisma.capitalCallLineItem.findMany({
  where: {
    investorId,
    capitalCall: { entityId },  // filter to this entity's capital calls
  },
  include: { capitalCall: { select: { callDate: true } } },
});

const entityDistLineItems = await prisma.distributionLineItem.findMany({
  where: {
    investorId,
    distribution: { entityId },  // filter to this entity's distributions
  },
  include: { distribution: { select: { distributionDate: true } } },
});

// Then build cashFlows[], call xirr() + computeMetrics() same as aggregate
```

### Date-Filtered Capital Account API (for LP-04)
```typescript
// Source: adapted from capital-account/route.ts pattern
export async function GET(req: Request, { params }: ...) {
  const { investorId } = await params;
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  // Filter ledger entries by date
  const dateFilter = startDate && endDate
    ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
    : {};

  // Apply dateFilter to capital call and distribution queries
  // Then pass filtered cash flows to xirr() and computeMetrics()
}
```

### Acknowledgment Fields on Document (for LP-08 schema change)
```prisma
// In prisma/schema.prisma — Document model additions (additive, all nullable)
model Document {
  // ... existing fields ...
  acknowledgedAt          DateTime?
  acknowledgedByInvestorId String?
}
```

### LP Profile Fields on Investor (for LP-09 schema change)
```prisma
// In prisma/schema.prisma — Investor model additions (additive, all nullable)
model Investor {
  // ... existing fields ...
  mailingAddress  String?   // Full address as text or structured JSON
  taxId           String?   // SSN/EIN — stored plaintext (no PII encryption in v2.0)
}
```

### Routes.ts Entry for LP Profile Page (for LP-09)
```typescript
// Source: src/lib/routes.ts — add after lp-settings entry
{
  path: "/lp-profile",
  label: "Profile",
  description: "LP investor profile and contact information",
  keywords: ["profile", "contact", "tax id", "address", "identity"],
  icon: "User",
  sidebarIcon: "\u25CB",
  portal: "lp",
  priority: 56
},
```

### Sparkline Using Recharts (for LP-07)
```typescript
// Source: performance-charts.tsx — scaled down to mini sparkline
import { LineChart, Line, ResponsiveContainer } from "recharts";

function Sparkline({ data }: { data: { v: number | null }[] }) {
  return (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#4f46e5"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Seeded placeholder metrics | Computed from real capital call/distribution line items via xirr() + computeMetrics() | Present in codebase | LP-06 verification is confirming this is already true |
| Aggregate-only MetricSnapshot | Per-entity MetricSnapshot via entityId field (design ready, not yet populated per-entity) | Schema already supports it | LP-07 just needs the computation loop |
| All documents in flat list | Tab-filtered by category | Phase 17 (new) | LP-05 is pure frontend |
| Settings page has contact info | Separate Profile page | Phase 17 (new) | LP-09 cleans up UX separation |

**Deprecated/outdated:**
- `computePeriodSummaries()` in `lp-account/page.tsx` runs client-side: for date filtering, either move to API (preferred — avoid sending full ledger to client) or keep client-side and filter the array before passing to `computePeriodSummaries()`. Client-side filtering is simpler given the LP has a small ledger.

---

## Critical Gap Found: Capital Account API Route Missing

The LP account page (`src/app/(lp)/lp-account/page.tsx`) calls:
- `GET /api/investors/${investorId}/capital-account` — for ledger + entities
- `POST /api/investors/${investorId}/capital-account/compute` — for recomputation

A filesystem search found **no** route file at `src/app/api/investors/[investorId]/capital-account/route.ts`. Either:
1. The routes exist at a different path (e.g., `/api/lp/[investorId]/capital-account`)
2. The routes were built in v1.0 and may exist but weren't findable with the `find` command due to permission or gitignore

**Action for planner:** Wave 0 of Phase 17 should verify these routes exist. If they don't, the date-filtering task (LP-04) must include creating the capital-account API route. The recompute endpoint (`POST .../compute`) is also referenced.

---

## Open Questions

1. **Capital Account API route location**
   - What we know: `lp-account/page.tsx` fetches from `/api/investors/${investorId}/capital-account`
   - What's unclear: File not found at `src/app/api/investors/[investorId]/capital-account/route.ts` via find command
   - Recommendation: Planner should add a verification task in Wave 0 to check `find src/app/api/investors -name "route.ts"` and confirm the route exists before implementing date filtering

2. **K-1 acknowledgment email delivery for "Send Reminder"**
   - What we know: GP clicks "Send Reminder" button; email infrastructure not built (CLAUDE.md: "Email/SMS notifications not built")
   - What's unclear: Whether to implement actual email sending or stub it
   - Recommendation: Stub it as a fire-and-forget API call that logs the action (similar to notification pattern). The button exists and calls the API; actual delivery is deferred. LP-08 success criteria is met by the acknowledgment workflow, not email delivery.

3. **Tax ID security/PII**
   - What we know: Tax ID (SSN/EIN) is sensitive PII; Fireflies API keys use encryption (firefliesApiKey + IV + Tag pattern in User model)
   - What's unclear: Whether to encrypt tax ID at rest
   - Recommendation: For v2.0 scope, store as plaintext `String?` (consistent with contactPreference, kycStatus fields). A note in code comments flags for future encryption. Full encryption would require the same IV/Tag pattern used for Fireflies keys — out of scope for this phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/app/api/lp/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LP-06 | Dashboard metrics come from computeMetrics() + xirr(), not seeded values | unit | `npx vitest run src/app/api/lp/__tests__/dashboard.test.ts` | YES (partial — tests exist but don't cover "not seeded" assertion explicitly) |
| LP-04 | Capital account date range filter returns date-scoped ledger + recalculated metrics | unit | `npx vitest run src/app/api/lp/__tests__/capital-account.test.ts` | NO — Wave 0 gap |
| LP-07 | Per-entity metrics computed from entity-scoped cash flows | unit | `npx vitest run src/app/api/lp/__tests__/entity-metrics.test.ts` | NO — Wave 0 gap |
| LP-08 | K-1 acknowledge POST marks document as acknowledged | unit | `npx vitest run src/app/api/k1/__tests__/acknowledge.test.ts` | NO — Wave 0 gap |
| LP-05 | Document tab filtering (client-side) | manual | Browser test only | N/A |
| LP-09 | LP profile GET/PUT saves mailingAddress + taxId | unit | `npx vitest run src/app/api/investors/__tests__/profile.test.ts` | NO — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/api/lp/__tests__/dashboard.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/lp/__tests__/capital-account.test.ts` — covers LP-04 date-filter + metric recalculation
- [ ] `src/app/api/lp/__tests__/entity-metrics.test.ts` — covers LP-07 per-entity computation
- [ ] `src/app/api/k1/__tests__/acknowledge.test.ts` — covers LP-08 acknowledge endpoint
- [ ] `src/app/api/investors/__tests__/profile.test.ts` — covers LP-09 GET/PUT profile

*(Existing `dashboard.test.ts` and `metrics-history.test.ts` continue to pass — no regression risk)*

---

## Sources

### Primary (HIGH confidence)
- Live codebase inspection — all source files read directly
  - `src/app/(lp)/lp-dashboard/page.tsx`
  - `src/app/(lp)/lp-account/page.tsx`
  - `src/app/(lp)/lp-documents/page.tsx`
  - `src/app/(lp)/lp-portfolio/page.tsx`
  - `src/app/(lp)/lp-settings/page.tsx`
  - `src/app/api/lp/[investorId]/dashboard/route.ts`
  - `src/app/api/lp/[investorId]/documents/route.ts`
  - `src/app/api/k1/route.ts`
  - `src/app/api/lp/__tests__/dashboard.test.ts`
  - `src/app/api/lp/__tests__/metrics-history.test.ts`
  - `src/lib/computations/irr.ts`
  - `src/lib/computations/metrics.ts`
  - `src/components/features/lp/performance-charts.tsx`
  - `src/components/providers/investor-provider.tsx`
  - `src/lib/routes.ts`
  - `prisma/schema.prisma` (full)
  - `vitest.config.ts`
  - `.planning/phases/17-lp-portal/17-CONTEXT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/STATE.md`
  - `CLAUDE.md`, `.claude/rules/coding-patterns.md`, `.claude/rules/project-structure.md`

### Secondary (MEDIUM confidence)
- None — all research from primary codebase source

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries confirmed in package.json and imports
- Architecture: HIGH — all patterns derived from existing working code in the same codebase
- Pitfalls: HIGH — discovered from direct code reading (missing API route, schema gaps, metric scoping requirements)
- Test infrastructure: HIGH — vitest.config.ts and two existing test files read directly

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable codebase; valid until Phase 17 execution)
