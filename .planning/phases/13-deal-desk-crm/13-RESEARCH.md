# Phase 13: Deal Desk & CRM - Research

**Researched:** 2026-03-09
**Domain:** Deal pipeline enhancements, CRM contact intelligence, PDF export, bulk actions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Contact Detail Page**
- Header + tabbed sections layout (like deal detail page pattern)
- Header card shows: name, title, company (linked), email, phone, contact type badge, relationship tags as badges, quick stats (deal count, entity count, last interaction date), initials avatar
- Separate pages for contacts (/contacts/[id]) and companies (/companies/[id]) — company page already exists, keep it separate
- Row click anywhere in directory table navigates to contact detail page
- Tabs for content sections (Activity, Deals, Entities, etc.) — exact tab structure at Claude's discretion

**Interaction & Activity Tracking**
- Manual logging + auto-linked deal events — both sources feed the timeline
- Manual interaction types: Calls, Emails, Meetings, Notes
- Auto-linked events on timeline: deal stage changes, deal creation/close, meeting records (for deals/entities this contact is linked to)
- Single unified chronological timeline, filterable by type
- Inline quick form at top of timeline for logging (type selector, notes, optional deal/entity link) — same pattern as deal activity "Log Meeting/Call"
- Deal/entity linking is optional when logging an interaction
- Every interaction shows who logged it (GP team member initials avatar + timestamp)
- Interactions are editable and deletable after logging

**Deal Sourcing Attribution**
- Structured contact-linked sourcing: add `sourcedByContactId` field on Deal linking to a Contact
- Keep existing free-text `source` field alongside for gradual migration
- Source type remains (Referral, Broker, Direct, Network, etc.)
- Source contact dropdown on deal creation shows all contacts (no tag filtering)
- Contact detail page has a "Deals Sourced" section showing all deals this contact referred

**Co-Investor Network**
- Co-investors tracked per deal via a junction model (DealCoInvestor or similar)
- Each co-investor record captures: contact or company link, role (Lead, Participant, Syndicate Member), allocation amount, status (Interested, Committed, Funded, Passed)
- Deal detail page gets a "Co-Investors" section
- Contact detail page has a separate "Co-Investments" section (distinct from "Deals Sourced")
- No network visualization — simple table/list of deals with participant info

**Relationship Tags**
- Predefined core tags: Broker, Co-Investor, LP (current), LP Prospect, Advisor, Board Member, Service Provider
- GP can create custom tags beyond the predefined list
- Tags displayed as badges on the contact header card
- Deal-specific roles (Sponsor, Counterparty, Lender, Legal Counsel) are separate from relationship tags — they live on the deal-contact link, not on the contact itself

**Pipeline Enhancements — Kanban**
- DEAL-11: Each kanban card shows days-in-stage counter (computed from DealActivity stage change records or createdAt fallback)
- DEAL-12: Column headers show deal count AND aggregate deal value per stage
- DEAL-13: Closed deal detail page shows "View Asset" link in the closed-deal banner (requires including sourceAssets relation in deal detail API)

**IC Memo PDF Export**
- DEAL-14: Clean professional document format — deal name header, recommendation badge, executive summary, then each memo section
- Styled for printing/sharing with external parties — similar to existing quarterly report PDF template style
- Uses existing @react-pdf/renderer infrastructure

**Dead Deal Analytics**
- DEAL-15: Kill reason breakdown chart added to existing /analytics page
- Mini summary (top 3 kill reasons) also shown in pipeline stats area on /deals page
- Groups dead deals by killReason field — shows count per reason

**Bulk Deal Actions**
- DEAL-16: Three bulk actions available: bulk kill, bulk assign deal lead, bulk stage advance
- Checkbox per kanban card — floating action bar appears at bottom when 1+ cards selected
- Bulk kill prompts for shared kill reason
- Bulk assign shows GP team member picker
- Bulk stage advance moves all selected to next stage (validates all are in same stage)

**Team Connections on Contact Page**
- Contact detail page shows which GP team members have interacted with this contact
- Based on logged interactions (ContactInteraction) and deal involvement
- Inspired by Affinity's Connections tab — shows relationship strength per team member
- Data foundation built in Phase 13 (interaction logging provides the data); AI summary layer in Phase 18

### Claude's Discretion
- Contact detail page tab names and exact tab structure
- Exact layout/spacing of contact header card
- Timeline item visual design and grouping (by day? continuous?)
- IC memo PDF typography, margins, header/footer design
- Dead deal analytics chart type (bar, pie, donut)
- Floating action bar visual design and positioning
- Empty state designs for contact pages with no interactions/deals
- How to handle days-in-stage when no DealActivity record exists (fallback logic)
- Team connections display format (strength bars, simple list, or badges)

### Deferred Ideas (OUT OF SCOPE)
- Network graph visualization for co-investor relationships
- Fireflies auto-import of meetings to contact timeline (Phase 15)
- AI CRM Intelligence (Phase 18): AI-powered contact search, AI relationship summary, AI web enrichment
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEAL-11 | Kanban cards show days-in-stage metric | Pipeline API already computes time-in-stage per deal via DealActivity; same logic surfaced on each card |
| DEAL-12 | Kanban columns show stage totals (deal count + aggregate deal value) | Deal list API response already includes pipelineAnalytics.valueByStage and stageDistribution; column headers consume this |
| DEAL-13 | Closed deal page shows "View Asset" navigation link to the created asset | Deal.sourceAssets relation exists in schema but NOT included in /api/deals/[id] GET; one-line include addition required |
| DEAL-14 | IC memo exported as PDF | @react-pdf/renderer installed; AIScreeningResult.memo JSON already included in deal fetch; new PDF template required |
| DEAL-15 | Dead deal reasons surfaced in pipeline analytics | Deal.killReason field exists; analytics API needs GROUP BY killReason for DEAD deals; chart added to /analytics page and mini-summary on /deals page |
| DEAL-16 | GP can perform bulk deal status actions | New checkbox UI on kanban cards + floating action bar + bulk API endpoint required |
| CRM-01 | Contact detail page shows activity timeline | New /contacts/[id] page with unified timeline (ContactInteraction + DealActivity auto-linked) |
| CRM-02 | Contacts have interaction history log (calls, emails, meetings) | New ContactInteraction Prisma model + API endpoints for CRUD |
| CRM-03 | Contacts can be tagged with relationship types | New ContactTag model (or JSON field on Contact); predefined + custom tags |
| CRM-04 | Contact pages show all linked deals, entities, and assets | Contact detail page aggregates DealCoInvestor, Deal.sourcedByContactId, and related entities |
| CRM-05 | Deal sourcing tracked — who referred what deal, broker relationships | New Deal.sourcedByContactId field; "Deals Sourced" section on contact detail |
| CRM-06 | Co-investor network tracked with deal participation history | New DealCoInvestor junction model; "Co-Investors" on deal page, "Co-Investments" on contact page |
</phase_requirements>

---

## Summary

Phase 13 has two distinct work streams: (1) deal pipeline completeness — enhancements to the existing kanban board and analytics — and (2) building a lightweight CRM layer on top of the existing Contact/Company directory. Both work streams require schema additions, new API routes, and new UI components, but they build almost entirely on existing patterns already in the codebase.

The pipeline enhancements (DEAL-11 through DEAL-16) are mostly UI-only changes that read already-available data. The days-in-stage computation already exists in `/api/analytics/pipeline/route.ts` and must be replicated per card in the list API. The biggest risk is the bulk actions feature (DEAL-16), which requires a new API endpoint and careful state management in the kanban view. The IC memo PDF (DEAL-14) is straightforward given the `@react-pdf/renderer` infrastructure already in place.

The CRM work (CRM-01 through CRM-06) is the heavier lift: four new Prisma models are needed (`ContactInteraction`, `ContactTag`, `DealCoInvestor`, and a schema migration for `Deal.sourcedByContactId`). The contact detail page at `/contacts/[id]` must be built from scratch following the company detail page pattern. Every schema addition must be treated as high-risk per project discipline — requiring `prisma db push --force-reset`, `prisma generate`, and full re-seed after each migration.

**Primary recommendation:** Execute in two waves — Wave 1: all pipeline enhancements (DEAL-11 to DEAL-16, no schema changes); Wave 2: all CRM work (CRM-01 to CRM-06, with schema migrations batched into a single migration step).

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | already installed | IC memo PDF generation | Same package used for quarterly report, capital account, fund summary PDFs |
| Recharts | 3.x | Dead deal analytics chart | Already used on /analytics page |
| Prisma | 7.x | Schema migrations for new models | Project ORM |
| SWR | 2.x | Client-side data fetching for new pages | Project standard |
| Zod | 4.x | API route body validation | Project standard |
| Tailwind CSS | 4.x | All new UI | Project standard |

### No new packages required

All functionality in Phase 13 uses existing installed libraries. Do NOT add new dependencies.

### Installation

```bash
# No new packages. All required libraries are already installed.
```

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
src/
├── app/(gp)/contacts/[id]/
│   └── page.tsx                        # New: Contact detail page
├── app/api/contacts/
│   ├── route.ts                        # Existing: add tags to GET response
│   └── [id]/
│       ├── route.ts                    # New: GET contact detail with all relations
│       └── interactions/
│           └── route.ts               # New: GET/POST/PUT/DELETE ContactInteraction
├── app/api/deals/
│   ├── route.ts                        # Existing: add sourcedByContactId, days-in-stage, value-per-stage
│   ├── bulk/
│   │   └── route.ts                   # New: POST bulk actions (kill, assign, advance)
│   └── [id]/
│       ├── route.ts                    # Existing: add sourceAssets include
│       └── co-investors/
│           └── route.ts               # New: GET/POST/DELETE DealCoInvestor
├── app/api/analytics/
│   └── pipeline/
│       └── route.ts                   # Existing: add killReason breakdown to response
├── components/features/contacts/
│   ├── contact-header-card.tsx        # New: header with avatar, tags, quick stats
│   ├── contact-interaction-tab.tsx    # New: unified timeline + inline log form
│   ├── contact-deals-tab.tsx          # New: deals sourced + co-investments
│   └── contact-tags-form.tsx          # New: add/remove relationship tags
├── components/features/deals/
│   ├── kill-deal-modal.tsx             # Existing: reuse for bulk kill
│   └── deal-co-investors-section.tsx  # New: co-investor table on deal detail
└── lib/pdf/
    └── ic-memo.tsx                    # New: IC memo PDF template
```

### Pattern 1: Days-in-Stage on Kanban Cards (DEAL-11)

**What:** Each kanban card displays "X days in stage" computed from DealActivity records.
**When to use:** For any active deal in the 4-column kanban (SCREENING, DUE_DILIGENCE, IC_REVIEW, CLOSING).

The computation logic already exists in `/api/analytics/pipeline/route.ts`. The key pattern is:

```typescript
// Already in /api/analytics/pipeline/route.ts — replicate in /api/deals list response
const stageEntry = deal.activities.find(
  (a) => a.activityType.includes("STAGE") && (a.metadata as any)?.newStage === deal.stage
);
const enteredAt = stageEntry ? new Date(stageEntry.createdAt) : new Date(deal.createdAt);
const daysInStage = Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)));
```

**Fallback (Claude's discretion):** If no STAGE_CHANGE activity exists for the current stage, fall back to `deal.createdAt`. This covers deals that were created directly in a non-SCREENING stage or pre-Phase 13 deals.

The `/api/deals` list route must include `activities` in its Prisma query to expose this data. The calculated `daysInStage` should be returned as a computed field on each deal object in the list response.

### Pattern 2: Column Value Totals (DEAL-12)

**What:** Each kanban column header shows `N deals | $XM total`.
**What already exists:** The `/api/deals` list response already returns `pipelineAnalytics.valueByStage` and `pipelineAnalytics.stageDistribution`. These are computed in the route from the full deal set.

```typescript
// In deals/page.tsx — read from existing pipelineAnalytics
const stageValue = analytics?.valueByStage?.[s.k] ?? 0;
const stageCount = items.length; // already computed from filtered deals
// Column header: `${s.l} (${stageCount}) | $${formatValue(stageValue)}`
```

The `valueByStage` already exists in the API response. The only change is rendering it on column headers.

### Pattern 3: View Asset Link on Closed Deal (DEAL-13)

**What:** The closed-deal banner shows a clickable "View Asset" link to the asset created from this deal.
**Current state:** The banner says "This deal has been closed — the asset has been created and booked." but has no link.
**Fix:** Add `sourceAssets: true` to the include block in `/api/deals/[id]/route.ts`:

```typescript
// In /api/deals/[id]/route.ts — add to include block:
sourceAssets: {
  select: { id: true, name: true }
},
```

Then in the closed deal banner:

```typescript
{isClosed && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 font-medium flex items-center justify-between">
    <span>This deal has been closed — the asset has been created and booked.</span>
    {deal.sourceAssets?.[0] && (
      <Link href={`/assets/${deal.sourceAssets[0].id}`} className="text-emerald-800 font-semibold hover:underline">
        View Asset &rarr;
      </Link>
    )}
  </div>
)}
```

### Pattern 4: IC Memo PDF Export (DEAL-14)

**What:** A PDF version of the IC memo that can be downloaded from the deal detail page.
**Infrastructure:** `@react-pdf/renderer` is installed. `src/lib/pdf/shared-styles.ts` and `quarterly-report.tsx` are the reference templates.

The IC memo data comes from `deal.screeningResult.memo` (JSON blob from `AIScreeningResult`). The PDF template follows the quarterly report pattern:

```typescript
// src/lib/pdf/ic-memo.tsx
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles as s, formatDate } from "./shared-styles";

export interface ICMemoData {
  dealName: string;
  recommendation: string; // "APPROVE" | "REJECT" | "DEFER"
  executiveSummary: string;
  sections: Array<{ title: string; content: string }>;
  generatedAt: string;
}

export function ICMemoPDF({ data }: { data: ICMemoData }) {
  return (
    <Document title={`IC Memo — ${data.dealName}`} author="Fund Administration Platform">
      <Page size="A4" style={s.page}>
        {/* Header: deal name + recommendation badge + date */}
        {/* Executive summary */}
        {/* Each memo section */}
      </Page>
    </Document>
  );
}
```

The download button on the deal detail page uses `@react-pdf/renderer`'s `pdf()` function + `saveAs` (same pattern used in quarterly report download):

```typescript
// Client-side PDF download pattern (existing in the codebase)
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver"; // or use URL.createObjectURL

async function downloadICMemo() {
  const blob = await pdf(<ICMemoPDF data={memoData} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IC_Memo_${deal.name}.pdf`;
  a.click();
}
```

Note: PDF generation runs client-side in `@react-pdf/renderer`. No server-side route needed.

### Pattern 5: Dead Deal Analytics (DEAL-15)

**What:** Kill reason breakdown chart on `/analytics` page + mini-summary (top 3) on `/deals` page.
**Data source:** `Deal.killReason` field already exists in the schema.
**API change:** Add kill reason breakdown to `/api/analytics/pipeline/route.ts` response:

```typescript
// Add to pipeline analytics API response
const deadDeals = deals.filter(d => d.stage === "DEAD");
const killReasonBreakdown: Record<string, number> = {};
for (const deal of deadDeals) {
  const reason = deal.killReason || "Unknown";
  killReasonBreakdown[reason] = (killReasonBreakdown[reason] || 0) + 1;
}
// Sort by count desc for top 3
const sortedKillReasons = Object.entries(killReasonBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([reason, count]) => ({ reason, count }));
```

Chart type (Claude's discretion): Use a horizontal bar chart (BarChart from Recharts) — most readable for category comparisons with 5 kill reason categories. Existing Recharts patterns in `/analytics/page.tsx` can be directly reused.

### Pattern 6: Bulk Deal Actions (DEAL-16)

**What:** Checkbox selection on kanban cards + floating action bar with bulk kill/assign/advance.
**Pattern reference:** Gmail's floating action bar on email selection; Notion's multi-select toolbar.

**State management in deals/page.tsx:**
```typescript
const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
const [showBulkBar, setShowBulkBar] = useState(false);

// Toggle selection
function toggleDeal(id: string) {
  setSelectedDealIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

**New API endpoint:** `POST /api/deals/bulk` with body:
```typescript
// Zod schema
const BulkDealActionSchema = z.object({
  dealIds: z.array(z.string()).min(1),
  action: z.enum(["kill", "assign", "advance"]),
  killReason: z.string().optional(),      // for action: "kill"
  assignLeadId: z.string().optional(),    // for action: "assign"
});
```

**Floating action bar:** Fixed positioned at bottom center, appears when `selectedDealIds.size > 0`:
```typescript
{selectedDealIds.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 z-50">
    <span className="text-xs">{selectedDealIds.size} selected</span>
    <Button size="sm" variant="danger" onClick={() => setBulkKillOpen(true)}>Kill All</Button>
    <Button size="sm" onClick={() => setBulkAssignOpen(true)}>Assign Lead</Button>
    <Button size="sm" variant="secondary" onClick={handleBulkAdvance}>Advance Stage</Button>
    <button onClick={() => setSelectedDealIds(new Set())} className="text-gray-400 hover:text-white text-xs ml-2">Clear</button>
  </div>
)}
```

**Stage validation for bulk advance:** All selected deals must be in the same stage. Validate client-side before sending request; show toast error if mixed stages.

### Pattern 7: Contact Detail Page (CRM-01, CRM-04)

**What:** New page at `/contacts/[id]` following the deal detail page header + tabs pattern.
**Reference in codebase:** `src/app/(gp)/companies/[id]/page.tsx` for layout, `src/app/(gp)/deals/[id]/page.tsx` for tabbed structure.

**Tab structure (Claude's discretion):**
- **Overview** — contact details, linked company, notes
- **Activity** — unified timeline (interactions + auto-linked deal events), inline log form
- **Deals** — two sub-sections: "Deals Sourced" (via sourcedByContactId) + "Co-Investments" (via DealCoInvestor)
- **Team Connections** — GP team members who have interacted with this contact

**Route registration:** Add to `src/lib/routes.ts`:
```typescript
{ path: "/contacts/:id", label: "Contact Detail", description: "Contact relationship intelligence", keywords: ["contact", "crm", "interactions"], icon: "User", portal: "gp", priority: 0 }
```

Note: Dynamic routes with `:id` are handled via the `getPageTitle` function in routes.ts, not as sidebar items.

### Pattern 8: ContactInteraction Model (CRM-02)

**New Prisma model:**
```prisma
model ContactInteraction {
  id          String   @id @default(cuid())
  firmId      String
  contactId   String
  authorId    String                        // GP team member who logged it
  type        String                        // CALL, EMAIL, MEETING, NOTE
  notes       String
  date        DateTime @default(now())
  dealId      String?                       // optional link to a deal
  entityId    String?                       // optional link to an entity
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  firm        Firm     @relation(fields: [firmId], references: [id])
  contact     Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  author      User     @relation(fields: [authorId], references: [id])
  deal        Deal?    @relation(fields: [dealId], references: [id])
  entity      Entity?  @relation(fields: [entityId], references: [id])

  @@index([contactId])
  @@index([firmId])
  @@index([authorId])
}
```

**API pattern** (reuses existing DealActivity pattern):
```
GET  /api/contacts/[id]/interactions          # list, ordered by date desc
POST /api/contacts/[id]/interactions          # create
PUT  /api/contacts/[id]/interactions/[intId]  # edit
DELETE /api/contacts/[id]/interactions/[intId] # delete
```

### Pattern 9: ContactTag Model (CRM-03)

**Options considered:**

Option A — Separate `ContactTag` join table (flexible, allows custom tags):
```prisma
model ContactTag {
  id        String  @id @default(cuid())
  firmId    String
  contactId String
  tag       String  // "Broker", "Co-Investor", "LP (current)", etc.
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  firm      Firm    @relation(fields: [firmId], references: [id])
  @@unique([contactId, tag])
  @@index([firmId])
}
```

Option B — JSON array field on Contact model (`tags String[] @default([])`).

**Recommendation:** Use Option A (separate table). Allows querying "all contacts with tag Broker" efficiently for future Phase 18 AI search. JSON arrays are hard to filter in Prisma without raw SQL.

**Predefined tags** (stored as constants in `src/lib/constants.ts`):
```typescript
export const RELATIONSHIP_TAGS = [
  "Broker", "Co-Investor", "LP (current)", "LP Prospect",
  "Advisor", "Board Member", "Service Provider"
] as const;
```

### Pattern 10: DealCoInvestor Model (CRM-06)

**New junction model:**
```prisma
model DealCoInvestor {
  id            String   @id @default(cuid())
  dealId        String
  contactId     String?  // link to Contact OR...
  companyId     String?  // ...link to Company (one must be set)
  role          String   // "Lead", "Participant", "Syndicate Member"
  allocation    Float?   // dollar amount
  status        String   // "Interested", "Committed", "Funded", "Passed"
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  deal          Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  contact       Contact? @relation(fields: [contactId], references: [id])
  company       Company? @relation(fields: [companyId], references: [id])

  @@index([dealId])
  @@index([contactId])
  @@index([companyId])
}
```

**Validation rule:** Either `contactId` OR `companyId` must be set, not both, not neither. Enforce via Zod in the API route.

### Pattern 11: Deal Sourcing (CRM-05)

**Schema addition on Deal model:**
```prisma
// Add to Deal model in schema.prisma:
sourcedByContactId  String?
sourcedByContact    Contact? @relation("DealSourceContact", fields: [sourcedByContactId], references: [id])
```

**Also add back-relation to Contact:**
```prisma
// Add to Contact model in schema.prisma:
sourcedDeals  Deal[]  @relation("DealSourceContact")
coinvestments DealCoInvestor[]
interactions  ContactInteraction[]
tags          ContactTag[]
```

**Migration note:** Adding `sourcedByContactId` as an optional field does NOT require force-reset — it can be added as a nullable column. However, per project discipline, still run `prisma db push` and verify.

### Anti-Patterns to Avoid

- **Do not skip `firmId` scoping** in any new API route. Every new endpoint for ContactInteraction, ContactTag, DealCoInvestor must filter by firmId.
- **Do not use `const { toast } = useToast()`** — always `const toast = useToast()`. Crashes the page.
- **Do not hardcode `firm-1`** — always `const { firmId } = useFirm()`.
- **Do not forget `"use client"`** on all new page and component files that use SWR or state.
- **Do not batch too many schema changes into one migration run.** If multiple models fail, it is hard to diagnose which model caused the Prisma error.
- **Do not try to generate PDF server-side** with `@react-pdf/renderer` in a route handler — it must run client-side or in a Node environment with the renderer. The existing PDF export buttons in the codebase are all client-side.
- **Do not use browser `confirm()` for bulk kill confirmation** — use `ConfirmDialog` component or `KillDealModal`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF pipeline | `@react-pdf/renderer` — already installed | Custom HTML+CSS print rendering is brittle across browsers; react-pdf gives consistent output |
| Activity timeline UI | Custom date grouping + render logic | Copy deal-activity-tab.tsx pattern exactly | Already handles all edge cases (empty states, sorting, badge colors) |
| Relationship tags | Freeform text input | Predefined list + custom string, stored in ContactTag model | Freeform tags lead to duplicates ("broker" vs "Broker" vs "brokerage") |
| Toast notifications | Custom toast library | `useToast()` from `@/components/ui/toast` | Existing toast system; destructuring crashes the app |
| Form validation | Manual null checks | Zod schema + `parseBody()` in every API route | Consistent 400 error format across all routes |
| Confirmation dialogs | `window.confirm()` | `ConfirmDialog` from `@/components/ui/confirm-dialog` | Project standard (FOUND-03 requirement) |
| Days-in-stage computation | Custom date math | Copy the exact `daysInStage` formula from `analytics/pipeline/route.ts` | Already tested; consistent with analytics page display |
| Chart components | Custom canvas/SVG charts | Recharts `BarChart` or `PieChart` — already installed | Dead deal chart must match existing analytics page style |

**Key insight:** This phase is 80% "connect existing parts" and 20% net-new. Every building block — PDF renderer, timeline pattern, analytics chart, kill modal, SWR fetching — already exists. The work is wiring them to new models and new pages, not reinventing patterns.

---

## Common Pitfalls

### Pitfall 1: Schema Migration Without Force-Reset Causes Type Errors

**What goes wrong:** After adding new Prisma models or fields, `prisma generate` is run but `prisma db push` is not, leaving the generated client out of sync with the database. TypeScript build passes but runtime crashes with "table does not exist" errors.

**Why it happens:** Developers run `prisma generate` thinking it updates the DB. It only regenerates the TypeScript client from the schema file — it does not push schema changes to the database.

**How to avoid:** After ANY `schema.prisma` change:
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate
npx prisma db seed
# Then restart dev server
```

**Warning signs:** Runtime error "Invalid `prisma.contactInteraction.create()` invocation — table `ContactInteraction` does not exist."

### Pitfall 2: Missing Back-Relations on Existing Models Break Prisma Generation

**What goes wrong:** Adding `ContactInteraction`, `ContactTag`, and `DealCoInvestor` models with foreign keys to `Contact`, `Deal`, `User`, and `Entity` requires matching back-relations on those existing models. Forgetting any one back-relation causes `prisma generate` to fail with a relation validation error.

**How to avoid:** For each new model that references an existing model:
1. Add the relation field to the new model
2. Add the inverse (back) relation to the existing model

Example — adding `interactions` to Contact:
```prisma
model Contact {
  // ...existing fields...
  interactions  ContactInteraction[]   // ADD THIS
  tags          ContactTag[]           // ADD THIS
  sourcedDeals  Deal[]                 @relation("DealSourceContact")  // ADD THIS
  coinvestments DealCoInvestor[]       // ADD THIS
}
```

**Warning signs:** `Error: Prisma schema validation error: No back-relation found for field 'contact' on model 'ContactInteraction'`

### Pitfall 3: Bulk Action Race Condition on Kanban Revalidation

**What goes wrong:** After a bulk action (e.g., kill 5 deals), calling `mutate()` on the deals SWR key triggers a re-fetch. If the user still has selected deals in state, the now-killed deals disappear from the kanban but the selectedDealIds Set still contains their IDs. Subsequent bulk actions fail silently.

**How to avoid:** Always clear `selectedDealIds` after any bulk action completes:
```typescript
async function handleBulkKill(reason: string) {
  await fetch("/api/deals/bulk", { method: "POST", body: JSON.stringify({ dealIds: [...selectedDealIds], action: "kill", killReason: reason }) });
  setSelectedDealIds(new Set());  // Clear BEFORE mutate
  mutate(buildUrl(null));
}
```

**Warning signs:** Ghost checkboxes appear checked on deals that no longer exist in the current filter.

### Pitfall 4: `@react-pdf/renderer` Cannot Access Tailwind Classes

**What goes wrong:** Developers try to use Tailwind class strings in react-pdf `Text`/`View` components. react-pdf uses its own StyleSheet system, not CSS classes.

**How to avoid:** Use only `StyleSheet.create()` and inline style objects — exactly as done in `quarterly-report.tsx` and `shared-styles.ts`. Copy the `styles as s` import pattern from existing PDF templates.

**Warning signs:** PDF renders with no styling, or TypeScript error "style does not accept string type."

### Pitfall 5: Contact Directory Table Needs Row-Click AND Keep Existing Edit Button

**What goes wrong:** Making the entire contact row a `Link` wrapping the `<tr>` is invalid HTML (anchor cannot be a direct child of `tbody`). Using `onClick` on `<tr>` navigates but breaks the "Edit" button click (event bubbles up and causes double navigation).

**How to avoid:** Use `onClick` on the `<tr>` with `stopPropagation` on action buttons:
```typescript
<tr onClick={() => router.push(`/contacts/${c.id}`)} className="cursor-pointer ...">
  {/* cells */}
  <td>
    <Button onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</Button>
  </td>
</tr>
```

**Warning signs:** Clicking "Edit" navigates to contact detail page instead of opening edit modal.

### Pitfall 6: Unified Timeline Ordering with Mixed Sources

**What goes wrong:** The contact timeline merges manual `ContactInteraction` records with auto-linked `DealActivity` events. If they are sorted client-side, the sort key differs (`interaction.date` vs `dealActivity.createdAt`), causing chronological chaos.

**How to avoid:** Sort on a single normalized key. When building the merged timeline on the server (or client), normalize all events to a `timestamp` field before sorting:
```typescript
const allEvents = [
  ...interactions.map(i => ({ ...i, timestamp: new Date(i.date), source: "MANUAL" })),
  ...dealActivities.map(a => ({ ...a, timestamp: new Date(a.createdAt), source: "AUTO" })),
].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
```

**Warning signs:** Timeline shows events in random order, mixing old deal events with recent manual interactions.

---

## Code Examples

Verified patterns from existing codebase:

### DealActivity Stage Change Record (days-in-stage computation source)

```typescript
// Source: src/app/api/analytics/pipeline/route.ts (verified in codebase)
const stageEntry = deal.activities.find(
  (a) =>
    a.activityType.includes("STAGE") &&
    (a.metadata as any)?.newStage === deal.stage
);
const enteredAt = stageEntry
  ? new Date(stageEntry.createdAt)
  : new Date(deal.createdAt);
const daysInStage = Math.max(
  0,
  Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))
);
```

### Existing PDF Template Pattern (quarterly-report.tsx — verified in codebase)

```typescript
// Source: src/lib/pdf/quarterly-report.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { styles as s, formatDate } from "./shared-styles";

export function QuarterlyReport({ data }: { data: QuarterlyReportData }) {
  return (
    <Document title={`${data.entityName} — Quarterly Report`} author={data.entityName}>
      <CoverPage data={data} />
      <CapitalAccountPage data={data} />
    </Document>
  );
}
```

### SWR Mutation with Revalidation (established pattern)

```typescript
// Source: src/app/(gp)/companies/[id]/page.tsx (verified in codebase)
const { trigger, isLoading } = useMutation(`/api/companies/${company.id}`, {
  method: "PUT",
  revalidateKeys: [`/api/companies/${company.id}`],
});
// Or direct fetch + mutate pattern:
await fetch(`/api/contacts/${id}`, { method: "PUT", ... });
mutate(`/api/contacts/${id}`);
```

### parseBody + Zod API Route Pattern

```typescript
// Source: src/lib/api-helpers.ts + src/lib/schemas.ts (established project pattern)
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";

const CreateInteractionSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  notes: z.string().min(1),
  date: z.string().optional(),
  dealId: z.string().optional(),
  entityId: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;  // MUST await in Next.js 16
  const { data, error } = await parseBody(req, CreateInteractionSchema);
  if (error) return error;
  const interaction = await prisma.contactInteraction.create({ data: { ...data!, contactId, firmId, authorId } });
  return NextResponse.json(interaction, { status: 201 });
}
```

### Toast Usage (correct non-destructured pattern)

```typescript
// Source: src/components/features/deals/deal-activity-tab.tsx (verified)
const toast = useToast();         // CORRECT: no destructuring
toast.success("Meeting logged");
toast.error("Failed to log meeting");
// NEVER: const { toast } = useToast() — crashes the app
```

### Recharts Bar Chart (existing analytics pattern)

```typescript
// Source: src/app/(gp)/analytics/page.tsx (verified in codebase)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={killReasonData} layout="vertical">
    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
    <XAxis type="number" />
    <YAxis type="category" dataKey="reason" width={100} tick={{ fontSize: 11 }} />
    <Tooltip />
    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
  </BarChart>
</ResponsiveContainer>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Directory contacts table — no clickable detail page | Contact row click navigates to `/contacts/[id]` | This phase (new) | CRM-01/02/03/04 require a detail page |
| Deal.source as free text only | Deal.source (free text) + Deal.sourcedByContactId (structured) | This phase (new) | Backward-compatible migration; existing deals keep free-text source |
| Pipeline analytics page — no dead deal breakdown | Kill reason chart added to /analytics + mini-summary on /deals | This phase (new) | DEAL-15 |
| Kanban cards show only deal name + badges | Cards additionally show days-in-stage + column headers show value totals | This phase (new) | DEAL-11 + DEAL-12 |
| Closed deal banner has no asset link | Banner includes "View Asset" link | This phase (new) | DEAL-13 |

**Deprecated/outdated:**
- No items are being removed or deprecated in this phase. All changes are additive.

---

## Open Questions

1. **Does the existing `/api/deals` list route include `activities`?**
   - What we know: The list route returns `pipelineAnalytics` with `valueByStage` and `stageDistribution`. The per-deal `activities` array is NOT currently included (would be expensive for large deal sets).
   - What's unclear: Whether to compute `daysInStage` in the API route (and include only the scalar) vs. returning full `activities` array to the client.
   - Recommendation: Compute `daysInStage` server-side in the list route — add a `daysInStage` scalar field to each deal object rather than sending the full `activities` array. This avoids the N+1 problem by using a subquery or computed field approach.

2. **How does the IC memo PDF know which content to include?**
   - What we know: `deal.screeningResult.memo` is a JSON blob from AIScreeningResult. The structure of this JSON needs to be understood (it is populated by AI analysis in `dd-analyze/route.ts`).
   - What's unclear: Exact JSON structure of `screeningResult.memo`. Is it an array of `{title, content}` sections? Or flat key-value?
   - Recommendation: Read `src/app/api/deals/[id]/dd-analyze/route.ts` and `src/components/features/deals/deal-overview-tab.tsx` before building the PDF template to understand the memo JSON structure.

3. **Bulk stage advance: what is "next stage" for a deal in IC_REVIEW?**
   - What we know: Stage order is SCREENING → DUE_DILIGENCE → IC_REVIEW → CLOSING → CLOSED.
   - What's unclear: For IC_REVIEW → CLOSING advance, does it require an IC decision? The existing deal-stage-engine may enforce this.
   - Recommendation: Check `src/lib/deal-stage-engine.ts` before implementing bulk advance. If IC decision is required, bulk advance should only work for SCREENING → DUE_DILIGENCE and DUE_DILIGENCE → IC_REVIEW, not IC_REVIEW → CLOSING.

4. **ContactInteraction authorId: how to get current user in API routes?**
   - What we know: `getAuthUser()` is available from `@/lib/auth` (seen in analytics pipeline route). In mock dev mode, a user object is available.
   - What's unclear: Whether `getAuthUser()` works consistently in all API routes and dev environment.
   - Recommendation: Use `getAuthUser()` and fall back to firmId-based user lookup if null (same pattern as other routes). Check the auth helper before assuming it always returns a user.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files (jest.config, vitest.config, pytest.ini) found in project |
| Config file | None — Wave 0 gap |
| Quick run command | `npm run build` (type-check + build validation is the current quality gate) |
| Full suite command | `npm run build` |

**Note:** This project has no automated test suite. The quality gate for all phases is `npm run build` with zero errors. The planner should treat `npm run build` as the test gate for all tasks.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEAL-11 | Kanban cards show days-in-stage | manual-only (visual) | `npm run build` | N/A |
| DEAL-12 | Column headers show deal count + value | manual-only (visual) | `npm run build` | N/A |
| DEAL-13 | Closed deal page has View Asset link | manual-only (click test) | `npm run build` | N/A |
| DEAL-14 | IC memo downloads as PDF | manual-only (download + inspect) | `npm run build` | N/A |
| DEAL-15 | Dead deal chart on /analytics + mini-summary on /deals | manual-only (visual) | `npm run build` | N/A |
| DEAL-16 | Bulk kill/assign/advance work from pipeline | manual-only (workflow test) | `npm run build` | N/A |
| CRM-01 | Contact detail page shows activity timeline | manual-only (visual + click) | `npm run build` | N/A |
| CRM-02 | Interaction log CRUD (call, email, meeting, note) | manual-only (form workflow) | `npm run build` | N/A |
| CRM-03 | Relationship tags add/remove on contact | manual-only (badge UI) | `npm run build` | N/A |
| CRM-04 | Contact page shows linked deals, entities, assets | manual-only (data display) | `npm run build` | N/A |
| CRM-05 | Deal sourcing shows sourced-by contact | manual-only (deal creation flow) | `npm run build` | N/A |
| CRM-06 | Co-investor section on deal + contact pages | manual-only (data entry + display) | `npm run build` | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` — zero TypeScript/Next.js build errors
- **Per wave merge:** `npm run build` + manual smoke test in browser at localhost:3000
- **Phase gate:** Full manual workflow test per success criteria before `/gsd:verify-work`

### Wave 0 Gaps
- No automated test framework exists. This is a pre-existing project condition, not a Phase 13 gap.
- "Testing" for this phase means: manual browser click-through + zero build errors.

*(No Wave 0 test infrastructure to create — project relies on TypeScript compilation as its primary quality gate.)*

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/app/api/analytics/pipeline/route.ts` — days-in-stage computation logic, confirmed exact code
- Codebase direct inspection — `src/lib/pdf/quarterly-report.tsx` + `shared-styles.ts` — @react-pdf/renderer pattern, confirmed architecture
- Codebase direct inspection — `prisma/schema.prisma` — Deal, Contact, Company, DealActivity models, confirmed field names
- Codebase direct inspection — `src/app/(gp)/deals/page.tsx` — kanban board implementation, confirmed pipelineAnalytics shape
- Codebase direct inspection — `src/app/(gp)/deals/[id]/page.tsx` — closed deal banner, confirmed sourceAssets missing from include
- Codebase direct inspection — `src/app/api/deals/[id]/route.ts` — confirmed sourceAssets NOT in include block
- Codebase direct inspection — `src/components/features/deals/deal-activity-tab.tsx` — activity timeline pattern, confirmed inline form
- Codebase direct inspection — `src/components/features/deals/kill-deal-modal.tsx` — kill reason enum (Pricing, Risk, Timing, Sponsor, Other)
- Codebase direct inspection — `.planning/ARCHITECTURE.md`, `DATA-MODEL.md` — confirmed 57 models, tech stack versions
- Codebase direct inspection — `CLAUDE.md` + `.claude/rules/coding-patterns.md` — confirmed toast anti-pattern, params await requirement

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — all implementation decisions locked by user discussion on 2026-03-08
- DATA-MODEL.md — Contact and Company model documented (last updated 2026-03-05); confirmed against live schema

### Tertiary (LOW confidence)
- None — all findings verified directly against codebase or project documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries directly verified in codebase (package.json not read but usage confirmed in multiple files)
- Architecture: HIGH — all patterns verified against existing production code
- Schema additions: HIGH — existing models read from schema.prisma directly; new model designs follow established patterns
- Pitfalls: HIGH — every pitfall is based on documented project rules (coding-patterns.md) or directly observed in codebase state

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable codebase; no rapidly-changing external dependencies in scope)
