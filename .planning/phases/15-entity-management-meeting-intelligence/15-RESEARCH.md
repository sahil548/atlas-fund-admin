# Phase 15: Entity Management & Meeting Intelligence - Research

**Researched:** 2026-03-09
**Domain:** Entity hierarchy UI, regulatory compliance tracking, Fireflies GraphQL API, AI meeting intelligence
**Confidence:** HIGH (entity/schema work), MEDIUM (Fireflies integration)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rename all user-facing labels from "Entities" to "Vehicles" throughout Atlas — nav, page titles, button labels, breadcrumbs, empty states, search results. Prisma model stays `Entity` (no DB migration). API routes stay `/api/entities`.
- Four view modes on Vehicles list page: **Flat | Tree | Org Chart | Cards**. Flat is default.
- Tree view: parent funds as top-level rows, SPVs/sidecars indented underneath. Expand/collapse per fund family, collapsed by default.
- Org chart view: top-down box diagram, each box clickable (navigates to vehicle detail), shows name, type badge, NAV, status.
- Cards view: rich entity cards currently on GP dashboard move here as a fourth view mode. Dashboard gets condensed vehicle summary widget instead.
- Parent entity selector optional for all entity types during creation (not required for child types).
- Post-formation "what's next" checklist appears as a banner/card on the entity overview tab (not a separate page). Context-aware: deal-linked vehicles get deal lifecycle steps; standalone vehicles get operational setup steps. Items already completed are pre-checked; each links to the relevant tab/form.
- Status transitions (ACTIVE → WINDING_DOWN → DISSOLVED) require confirmation dialog with optional reason field. Reason stored for audit trail. Dissolving with outstanding obligations shows warnings but still allows proceeding.
- Full CSC-style regulatory/compliance tracking: per-jurisdiction records, filing types (SEC Form D, state blue sky, annual reports, BOI/FinCEN), per-filing records with due dates, good standing tracking, registered agent linked to CRM contact, CTA classification + FinCEN ID.
- Filing due date alerts on entity detail AND on GP dashboard "needs attention" section (30/60/90 day windows).
- Regulatory tab replaces current raw JSON display with structured form for add/edit.
- ENTITY-05: Verify existing side letter management wiring works end-to-end — no new features, just confirmation the Phase 4 implementation is functional.
- OAuth connection lives in **user profile settings** (not integrations page). Each GP team member connects their own Fireflies account.
- Meetings auto-sync from connected Fireflies accounts into the aggregated meetings view.
- AI auto-linking: when meetings sync, AI analyzes title and transcript to suggest which deal/entity/asset it relates to. GP sees suggestion and confirms or changes. Falls back to manual linking if no AI key configured.
- Meeting card shows: title, date, source badge, type badge, summary paragraph, action items list with checkboxes, decisions list, context links (deal/entity/asset).
- AI-extracted action items auto-create as DRAFT tasks in the task system (Phase 14), linked to the relevant deal/entity. GP reviews and activates them.
- Meetings appear in the activity feed for their linked deal/entity/asset context.

### Claude's Discretion
- Exact tree view expand/collapse UX details and indentation styling.
- Org chart rendering library choice and layout algorithm.
- Condensed vehicle summary widget design for the dashboard (replacing full entity cards).
- Filing form layout and field grouping.
- Meeting sync polling interval or webhook approach for Fireflies.
- How to handle meetings when no AI key is configured (manual summary entry vs skip).

### Deferred Ideas (OUT OF SCOPE)
- AI-verified good standing check — deferred to Phase 18.
- Dashboard entity card migration — dashboard redesign in Phase 19.
- DBA name tracking.
- Ownership & capital structure tracking.
- Minute book management.
- Name history tracking.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENTITY-01 | Entity list shows parent-child hierarchy (fund → SPV → sidecar relationships) | `parentEntityId`/`childEntities` self-relation already in schema; list page needs Tree and Org Chart view modes |
| ENTITY-02 | Formation workflow provides "what's next" guidance after completion | Formation tab already exists with task list; need post-formation checklist banner on Overview tab |
| ENTITY-03 | Regulatory filings tab has structured add/edit form (not empty shell) | Current tab shows raw JSON; need new structured form UI backed by `regulatoryFilings` JSON field (no schema migration needed) |
| ENTITY-04 | GP can transition entity status (ACTIVE → WINDING_DOWN → DISSOLVED) via UI controls | `status` field and `EntityStatus` enum already exist; PATCH endpoint needs to support status transitions |
| ENTITY-05 | Side letter management wiring verified end-to-end | `SideLetter` model, `/api/side-letters` routes, and `CreateSideLetterForm` all exist; need end-to-end smoke test |
| MTG-01 | Fireflies integration via per-user OAuth — each GP team member connects their own account | Fireflies uses bearer token per user (API key from their account), stored encrypted per User record |
| MTG-02 | Meeting summaries auto-generated from transcripts via AI | Fireflies provides `summary.overview` field in GraphQL; Atlas AI service (Phase 12) can supplement or replace |
| MTG-03 | Action items auto-extracted from meetings and created as linked tasks | Fireflies provides `summary.action_items`; auto-create as Task with status=DRAFT linked to deal/entity |
| MTG-04 | Meetings linked to deal/entity context and surfaced in activity feeds | `Meeting` model has `dealId`/`entityId`/`assetId`; need DealActivity/entity feed integration |
| MTG-05 | Aggregated meeting view across all connected team members' Fireflies accounts | `/api/meetings` already exists; sync API route pulls from all users with connected Fireflies keys |
</phase_requirements>

---

## Summary

Phase 15 has two large areas: (1) enhancing the entity/vehicle list and detail pages with hierarchy views, post-formation guidance, status transitions, and structured regulatory tracking; and (2) integrating Fireflies.ai per-user to bring meeting transcripts, AI summaries, and auto-created tasks into Atlas.

The good news is the underlying data model is already correct for almost everything. The `Entity` model has `parentEntityId`/`childEntities` self-relation (hierarchy is in the DB). `EntityStatus` enum has `ACTIVE/WINDING_DOWN/DISSOLVED`. `regulatoryFilings` is a JSON field that can hold the CSC-style structured data without a schema migration. The `Meeting` model has `source`, `transcript`, `summary`, `actionItems`, and links to deal/entity/asset. The task model supports DRAFT status for AI-created tasks.

The Fireflies API is GraphQL-only, authenticated per user via bearer token (their own API key from Fireflies account settings — not OAuth2). Each GP team member stores their Fireflies API key in their user profile settings (encrypted the same way AI keys are stored). A sync route calls the Fireflies GraphQL API on behalf of each connected user and upserts Meeting records. Polling via a sync-on-demand button or page-load refresh is appropriate given Vercel's serverless constraints (no persistent background jobs).

The most significant new schema work is: (a) adding `firefliesApiKey`/`firefliesEmail`/`firefliesLastSync` fields to the User model, and (b) adding a `taskStatus` field to Task or using the existing `status` field with a new `DRAFT` value. The regulatory filing data can live in the existing `regulatoryFilings` JSON field with a well-defined structure, avoiding schema changes.

**Primary recommendation:** Build entity hierarchy views using pure React state (no library for tree; use `react-organizational-chart` for org chart). Store Fireflies tokens encrypted on the User model. Use a sync-on-demand API route for meeting import, not a polling scheduler.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / Next.js | 19 / 16 | Existing app framework | Already in use |
| Prisma | 7 | ORM and schema | Already in use; User model needs 3 new fields |
| SWR | 2 | Data fetching + polling | Already in use; `refreshInterval` for sync status |
| Zod | 4 | Schema validation | Already in use; new schemas needed for filing forms |
| `react-organizational-chart` | latest | Lightweight org chart tree rendering | CSS-only, no D3 dependency, 41 dependents, simple API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | already in project | Filing due date calculations (30/60/90 day windows) | Due date alert logic |
| Existing `encryptApiKey`/`decryptApiKey` | — | Encrypt Fireflies tokens per user | Same pattern as AI config |
| Existing `ai-config.ts` `createAIClient` | — | AI summary generation from transcript text | Fallback when Fireflies summary is insufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-organizational-chart` | `d3-org-chart` | D3 is much heavier; overkill for 9 entities |
| `react-organizational-chart` | Custom SVG | More control but more code; not worth it for small entity count |
| Per-user sync-on-demand | Cron/background job | Vercel has no persistent workers; Inngest would be needed — out of scope |

**Installation:**
```bash
npm install react-organizational-chart
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 15:

```
src/
├── app/(gp)/entities/page.tsx              # Add view mode toggle (Flat|Tree|Org Chart|Cards)
├── app/(gp)/entities/[id]/page.tsx         # Add status transition UI, post-formation checklist banner, regulatory structured form
├── app/api/entities/[id]/route.ts          # PATCH: add status transition action
├── app/api/meetings/sync/route.ts          # NEW: POST — pull from Fireflies for all connected users
├── app/api/users/[id]/fireflies/route.ts   # NEW: GET/PUT — connect/disconnect Fireflies per user
├── components/features/entities/
│   ├── vehicle-tree-view.tsx               # NEW: recursive tree with expand/collapse
│   ├── vehicle-org-chart.tsx               # NEW: react-organizational-chart wrapper
│   ├── vehicle-cards-view.tsx              # NEW: card grid from dashboard entity cards
│   ├── post-formation-checklist.tsx        # NEW: what's-next banner on overview tab
│   ├── status-transition-dialog.tsx        # NEW: confirm dialog for ACTIVE→WINDING_DOWN→DISSOLVED
│   └── regulatory-filings-tab.tsx          # NEW: structured form replacing raw JSON display
└── components/features/meetings/
    └── fireflies-connect-card.tsx          # NEW: per-user connect/disconnect card in profile settings
```

### Pattern 1: Per-User Fireflies API Key Storage

**What:** Store each user's Fireflies API key encrypted on the User model (same encryption pattern as AI config keys).
**When to use:** Fireflies doesn't have OAuth for third-party apps — users provide their own API key from their Fireflies account integrations page.

Schema addition needed (1 migration):
```prisma
model User {
  // ... existing fields ...
  firefliesApiKey     String?   // encrypted
  firefliesApiKeyIV   String?
  firefliesApiKeyTag  String?
  firefliesEmail      String?   // confirmed from /user query after connect
  firefliesLastSync   DateTime?
}
```

API key storage follows the existing `encryptApiKey`/`decryptApiKey` pattern from `src/lib/ai-config.ts`.

### Pattern 2: Fireflies GraphQL Sync

**What:** An API route that queries Fireflies GraphQL on behalf of each connected user and upserts Meeting records.
**When to use:** Called on-demand when GP clicks "Sync Now" or when viewing the meetings page.

```typescript
// Source: https://docs.fireflies.ai/graphql-api/query/transcripts
const TRANSCRIPTS_QUERY = `
  query Transcripts {
    transcripts {
      id
      title
      date
      duration
      summary {
        overview
        action_items
        keywords
        outline
      }
      sentences {
        text
        speaker_name
      }
      organizer_email
      participants
    }
  }
`;

async function syncFirefliesUser(userId: string, apiKey: string) {
  const response = await fetch("https://api.fireflies.ai/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: TRANSCRIPTS_QUERY }),
  });
  const { data } = await response.json();
  // Upsert each transcript as a Meeting record
  // Use transcript.id as external key to prevent duplicates
}
```

Sync deduplication: store Fireflies transcript ID in Meeting model (new field `externalId String?`) to prevent duplicate imports.

### Pattern 3: Entity Hierarchy Tree View (Pure React)

**What:** Recursive React component that renders the parent-child entity tree using existing `childEntities` data.
**When to use:** "Tree" view mode on the Vehicles list page.

```typescript
// The /api/entities list endpoint needs to include childEntities in its response
// for tree mode. For flat mode, the existing paginated query is unchanged.

function VehicleTreeView({ entities }: { entities: Entity[] }) {
  // Filter to root entities (no parentEntityId)
  const roots = entities.filter(e => !e.parentEntityId);
  return (
    <div className="space-y-1">
      {roots.map(root => (
        <VehicleTreeNode key={root.id} entity={root} depth={0} />
      ))}
    </div>
  );
}

function VehicleTreeNode({ entity, depth }: { entity: Entity; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = entity.childEntities?.length > 0;
  return (
    <div>
      <div style={{ paddingLeft: depth * 24 }} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded">
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? "▼" : "▶"}
          </button>
        )}
        <Link href={`/entities/${entity.id}`}>{entity.name}</Link>
        <Badge>{entity.entityType}</Badge>
      </div>
      {expanded && entity.childEntities?.map(child => (
        <VehicleTreeNode key={child.id} entity={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

Note: for tree view, the API needs to include `childEntities` in the list response. This requires either a separate tree endpoint or including children in the flat list response (preferred — no extra fetch needed).

### Pattern 4: Post-Formation Checklist Banner

**What:** A banner/card on the entity overview tab that appears after formation is complete. Context-aware items based on what's missing.
**When to use:** When `entity.formationStatus === "FORMED"` or `"REGISTERED"`.

```typescript
// Context-aware checklist generation
function getPostFormationChecklist(entity: Entity) {
  const isDealLinked = !!entity.dealEntities?.length;

  if (isDealLinked) {
    return [
      { label: "File SEC exemptions", href: `/entities/${entity.id}?tab=regulatory`, done: hasRegFilings(entity) },
      { label: "Add investors & commitments", href: `/entities/${entity.id}?tab=investors`, done: entity.commitments?.length > 0 },
      { label: "Issue capital call", href: `/entities/${entity.id}?tab=capital`, done: entity.capitalCalls?.length > 0 },
      { label: "Verify funding received", href: `/transactions`, done: hasFundedCalls(entity) },
      { label: "Close on deal", href: `/deals`, done: false },
    ];
  } else {
    return [
      { label: "Add investors", href: `/entities/${entity.id}?tab=investors`, done: entity.commitments?.length > 0 },
      { label: "Configure waterfall", href: `/entities/${entity.id}?tab=waterfall`, done: !!entity.waterfallTemplate },
      { label: "Upload governing docs", href: `/entities/${entity.id}?tab=documents`, done: entity.documents?.length > 0 },
      { label: "Connect QuickBooks", href: `/entities/${entity.id}?tab=accounting`, done: entity.accountingConnection?.syncStatus === "CONNECTED" },
      { label: "Add regulatory filings", href: `/entities/${entity.id}?tab=regulatory`, done: hasRegFilings(entity) },
    ];
  }
}
```

### Pattern 5: Status Transition with ConfirmDialog

**What:** Status transition buttons on the entity overview header. Use existing `ConfirmDialog` component (FOUND-03). Show warnings for outstanding obligations.
**When to use:** ACTIVE → WINDING_DOWN → DISSOLVED transitions.

```typescript
// PATCH /api/entities/[id] — extend existing handler:
if (body.action === "TRANSITION_STATUS") {
  const { newStatus, reason } = body;
  // Check for outstanding obligations
  const outstandingCalls = await prisma.capitalCall.count({
    where: { entityId: id, status: { in: ["DRAFT", "ISSUED", "PARTIALLY_FUNDED"] } }
  });
  // Return warnings but allow proceed
  await prisma.entity.update({
    where: { id },
    data: {
      status: newStatus,
      // Store reason in a metadata/notes field — see pitfall below
    }
  });
  logAudit(firmId, userId, "ENTITY_STATUS_TRANSITION", "Entity", id, { from: oldStatus, to: newStatus, reason });
}
```

Note: The `Entity` model has no `statusReason` field. Options: (1) add a new field via migration, (2) store in `regulatoryFilings` JSON, or (3) log it only in the audit trail. Recommend option 3 (audit log) to avoid schema migration — the requirement says "stored for audit trail", not "displayed anywhere".

### Pattern 6: Regulatory Filings as Structured JSON

**What:** Replace the raw JSON display in the regulatory tab with a structured form that writes to the `regulatoryFilings` JSON field.
**When to use:** No Prisma migration needed — `regulatoryFilings Json?` already exists on Entity.

The JSON structure to enforce via Zod at the API layer:

```typescript
const RegulatoryFilingSchema = z.object({
  id: z.string(),               // client-generated UUID
  filingType: z.enum(["FORM_D", "FORM_D_AMENDMENT", "STATE_BLUE_SKY", "ANNUAL_REPORT", "BOI_FINCEN", "OTHER"]),
  jurisdiction: z.string(),     // "federal" or state abbreviation
  filedDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["PENDING", "FILED", "OVERDUE", "NOT_DUE"]),
  filingNumber: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
});

const JurisdictionRecordSchema = z.object({
  id: z.string(),
  jurisdiction: z.string(),
  registeredWithAgency: z.string().optional(),
  authorizationDate: z.string().optional(),
  jurisdictionId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "WITHDRAWN"]),
  statusDate: z.string().optional(),
});

const EntityRegulatoryDataSchema = z.object({
  ctaClassification: z.string().optional(),
  fincenId: z.string().optional(),
  registeredAgentContactId: z.string().optional(),  // links to CRM Contact
  goodStanding: z.enum(["GOOD", "AT_RISK", "NOT_IN_GOOD_STANDING"]).optional(),
  goodStandingOverride: z.boolean().optional(),
  jurisdictions: z.array(JurisdictionRecordSchema).optional(),
  filings: z.array(RegulatoryFilingSchema).optional(),
});
```

### Anti-Patterns to Avoid

- **Fetching tree data with N+1 queries:** Do not call `/api/entities/${id}` for each entity to get children. Include `childEntities` in the list response using Prisma `include`.
- **Full schema migration for regulatory filings:** The `regulatoryFilings Json?` field already exists. Structured validation via Zod at the API layer is sufficient — no new models needed.
- **Calling Fireflies API from the client:** Always proxy through an Atlas API route to keep API keys server-side.
- **Sync on every page load:** Do not auto-sync on every meetings page render. Sync on-demand (button or configurable interval via `refreshInterval`) to avoid rate limiting.
- **Treating Fireflies action_items as a count:** The Fireflies API returns `action_items` as a string (list of items) in `summary.action_items`. Parse this string into individual items to create separate Task records.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Org chart rendering | Custom SVG/Canvas | `react-organizational-chart` | CSS-only, no dependencies, handles connectors |
| API key encryption | Custom cipher | `encryptApiKey`/`decryptApiKey` from `ai-config.ts` | Already vetted AES-256-GCM implementation |
| Meeting deduplication | Custom hash | Store Fireflies `transcript.id` as `externalId` on Meeting model | Idempotent upsert by externalId |
| Status transition warnings | Custom warning UI | Existing `ConfirmDialog` + warning message | FOUND-03 compliance |

**Key insight:** Almost all plumbing (data model, encryption, dialog components, meeting model) already exists. This phase is primarily UI work on top of existing infrastructure.

---

## Common Pitfalls

### Pitfall 1: Tree View on Flat List API Response
**What goes wrong:** The existing `/api/entities` list endpoint does not include `childEntities` in its response. The tree view would render all entities at root level.
**Why it happens:** `include: { childEntities: true }` was never added because the original flat table doesn't need it.
**How to avoid:** Either (a) add a `?includeChildren=true` query param to the list endpoint that adds `childEntities: { select: { id, name, entityType, status } }` to the Prisma include, or (b) create a separate `/api/entities/tree` endpoint. Option (a) is simpler.
**Warning signs:** Tree view shows all 9 entities at root level with no nesting.

### Pitfall 2: Fireflies API Key Scope
**What goes wrong:** Fireflies API keys are scoped to the individual user's account and only return meetings they recorded or were in. If a GP team member has no meetings in their Fireflies account, the sync returns zero results.
**Why it happens:** Per-user API key is intentional (CONTEXT.md decision) but the API only returns that user's data.
**How to avoid:** The aggregate view works correctly because Atlas collects meetings from ALL connected users' keys. Sync must loop over all users with a configured key. Make this transparent in the UI: show "Syncing 3 connected accounts" not "Syncing all meetings".
**Warning signs:** Only one team member's meetings appear in the aggregate view.

### Pitfall 3: Fireflies action_items is a String
**What goes wrong:** `summary.action_items` in the Fireflies GraphQL response is a freeform string (e.g. "1. Follow up with lawyer\n2. Schedule next call"), not a typed array. Attempting to `.map()` over it crashes.
**Why it happens:** Fireflies returns AI-generated text in string format for action items.
**How to avoid:** Parse the string by splitting on newlines and stripping numbering. Each non-empty line becomes one Task title. Wrap in try/catch.
**Warning signs:** Server error during sync, or all action items stored as one giant task title.

### Pitfall 4: Regulatory Filing Due Date Alerts
**What goes wrong:** Filing due date alerts are expected both on the entity detail page AND the GP dashboard "needs attention" section. The dashboard section is built in Phase 19, not Phase 15.
**Why it happens:** The CONTEXT.md decision mentions both surfaces.
**How to avoid:** Phase 15 builds the alert logic and the entity detail view. The dashboard widget consuming this data is Phase 19. Build a reusable function `getOverdueFilings(entityId)` that both phases can call.
**Warning signs:** Attempting to modify dashboard code in Phase 15 — that's Phase 19 territory.

### Pitfall 5: Entity Cards on Dashboard vs Vehicles Page
**What goes wrong:** CONTEXT.md says cards move from dashboard to Vehicles page. But dashboard redesign is Phase 19.
**Why it happens:** The decision was staged across phases.
**How to avoid:** In Phase 15, add the Cards view mode to the Vehicles page (copy from dashboard entity cards). Do NOT remove the cards from the dashboard — leave that to Phase 19. The two will coexist temporarily.
**Warning signs:** Removing dashboard entity cards in Phase 15 — premature.

### Pitfall 6: Schema Discipline — User Model Change
**What goes wrong:** Adding `firefliesApiKey`/`firefliesApiKeyIV`/`firefliesApiKeyTag`/`firefliesEmail`/`firefliesLastSync` to User requires a Prisma migration and `db push --force-reset`. This wipes the dev DB.
**Why it happens:** Schema changes carry production risk per STATE.md.
**How to avoid:** Run `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset && npx prisma generate && npx prisma db seed` then restart dev server. Confirm DATABASE_URL points to dev first. The Meeting model also needs `externalId String?` for Fireflies deduplication.

### Pitfall 7: "Vehicles" Rename Scope
**What goes wrong:** The rename touches ~30 GP pages plus sidebar, routes.ts, and possibly LP portal references. Missing even one reference is a user-facing bug.
**Why it happens:** "Entities" appears in dozens of string literals.
**How to avoid:** Use a systematic grep sweep: `grep -r "Entities\|entity\|entities" src/app/(gp)/ --include="*.tsx" -l` to find every file. Update `routes.ts` label field first (sidebar auto-updates). Then sweep page titles, button labels, empty state text, breadcrumbs. Do NOT change Prisma model names, API routes, or variable names.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Fireflies GraphQL Query (Transcripts)
```typescript
// Source: https://docs.fireflies.ai/graphql-api/query/transcripts
const response = await fetch("https://api.fireflies.ai/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userFirefliesApiKey}`,
  },
  body: JSON.stringify({
    query: `
      query {
        transcripts {
          id
          title
          date
          duration
          summary {
            overview
            action_items
            keywords
          }
          sentences {
            text
            speaker_name
          }
          organizer_email
          participants
        }
      }
    `,
  }),
});
const { data, errors } = await response.json();
if (errors) throw new Error(errors[0].message);
const transcripts = data.transcripts;
```

### Existing Pattern: Encrypt API Key (re-use for Fireflies)
```typescript
// Source: src/lib/ai-config.ts — same pattern applies
import { encryptApiKey, decryptApiKey } from "@/lib/ai-config";

// Store:
const { encrypted, iv, tag } = encryptApiKey(firefliesApiKey);
await prisma.user.update({
  where: { id: userId },
  data: { firefliesApiKey: encrypted, firefliesApiKeyIV: iv, firefliesApiKeyTag: tag },
});

// Retrieve:
const rawKey = decryptApiKey(user.firefliesApiKey, user.firefliesApiKeyIV, user.firefliesApiKeyTag);
```

### Existing Pattern: Status Transition via PATCH
```typescript
// Extend existing PATCH /api/entities/[id]/route.ts
if (body.action === "TRANSITION_STATUS") {
  const { newStatus, reason } = body;
  const validTransitions: Record<string, string[]> = {
    ACTIVE: ["WINDING_DOWN"],
    WINDING_DOWN: ["DISSOLVED", "ACTIVE"],  // allow revert
    DISSOLVED: [],
  };
  const entity = await prisma.entity.findUnique({ where: { id }, select: { status: true } });
  if (!validTransitions[entity!.status]?.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  }
  await prisma.entity.update({ where: { id }, data: { status: newStatus } });
  logAudit(firmId, userId, "STATUS_TRANSITION", "Entity", id, { from: entity!.status, to: newStatus, reason });
  return NextResponse.json({ status: newStatus });
}
```

### react-organizational-chart Usage
```typescript
// Source: https://www.npmjs.com/package/react-organizational-chart
import { Tree, TreeNode } from "react-organizational-chart";

function VehicleOrgChart({ rootEntities }: { rootEntities: Entity[] }) {
  return (
    <div className="overflow-x-auto p-4">
      {rootEntities.map(root => (
        <Tree
          key={root.id}
          label={<VehicleOrgNode entity={root} />}
        >
          {root.childEntities?.map(child => (
            <TreeNode key={child.id} label={<VehicleOrgNode entity={child} />}>
              {child.childEntities?.map(grandchild => (
                <TreeNode key={grandchild.id} label={<VehicleOrgNode entity={grandchild} />} />
              ))}
            </TreeNode>
          ))}
        </Tree>
      ))}
    </div>
  );
}
```

### Meeting Sync: Parse Fireflies Action Items to Tasks
```typescript
// Parse freeform action_items string into individual task strings
function parseActionItems(actionItemsText: string | null): string[] {
  if (!actionItemsText) return [];
  return actionItemsText
    .split("\n")
    .map(line => line.replace(/^\d+[\.\)]\s*/, "").trim())  // strip "1. " or "1) "
    .filter(line => line.length > 3);  // discard empty/short lines
}

// Create DRAFT tasks from parsed action items
async function createDraftTasksFromMeeting(
  meetingId: string,
  actionItems: string[],
  entityId?: string,
  dealId?: string,
) {
  await prisma.task.createMany({
    data: actionItems.map(title => ({
      title,
      status: "TODO",  // DRAFT concept maps to TODO until Phase 14 confirms DRAFT enum value
      contextType: entityId ? "ENTITY" : dealId ? "DEAL" : "GENERAL",
      contextId: entityId ?? dealId ?? meetingId,
      entityId: entityId ?? null,
      dealId: dealId ?? null,
      priority: "MEDIUM",
    })),
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat entity list (table only) | 4 view modes: Flat, Tree, Org Chart, Cards | Phase 15 | GPs can see fund family hierarchy at a glance |
| Raw JSON display for regulatory | Structured CSC-style form | Phase 15 | Actionable compliance tracking |
| Dead-end after formation | Post-formation what's-next checklist | Phase 15 | GPs guided to next operational steps |
| Firm-wide Fireflies (if any) | Per-user Fireflies API key | Phase 15 | Each GP sees their own meetings in aggregate |
| Manual meeting entry | Fireflies sync + AI enrichment | Phase 15 | Automatic transcript import with AI summary |

**Deprecated/outdated in this phase:**
- The raw JSON pre element in the regulatory tab: replaced by structured form.
- The "Entities" label everywhere: replaced by "Vehicles" in all user-facing text.

---

## Open Questions

1. **Task DRAFT status**
   - What we know: Phase 14 added task management. The requirement says AI-extracted action items auto-create as "DRAFT tasks". The current `TaskStatus` enum is `TODO/IN_PROGRESS/DONE` — no DRAFT value.
   - What's unclear: Did Phase 14 add a DRAFT enum value, or should Phase 15 add it? If Phase 14 is not done yet (STATE.md says 0 plans complete), this needs to be handled.
   - Recommendation: Create tasks with `status: "TODO"` and use a boolean `isDraft: Boolean @default(false)` field OR add `DRAFT` to TaskStatus enum in this phase. Check Phase 14 plan before deciding.

2. **Fireflies `externalId` on Meeting model**
   - What we know: The Meeting model has no `externalId` field. Without it, every sync re-imports all meetings.
   - What's unclear: Should this be a separate `firefliesId String?` or a generic `externalId String?` + `externalSource String?` pair.
   - Recommendation: Add `firefliesId String? @unique` to Meeting model. Simple, clear, prevents duplicates.

3. **Side letter smoke test scope (ENTITY-05)**
   - What we know: SideLetter model, `/api/side-letters` routes, `CreateSideLetterForm`, and `SideLetterRulesPanel` all exist from Phase 4. The requirement says "verify end-to-end — no new features."
   - What's unclear: What specifically is broken or unverified? The route code looks complete.
   - Recommendation: In planning, include 1 task to manually trace the full flow: create side letter on entity investors tab → add rule → verify in `/api/side-letters` response → confirm GP can see it in entity detail. If anything is broken, fix it. If it works, mark ENTITY-05 done.

4. **Fireflies polling vs manual sync**
   - What we know: CONTEXT.md marks polling interval as Claude's discretion. Vercel has no persistent background jobs. SWR `refreshInterval` only runs while the page is open.
   - What's unclear: Whether the GP expects automatic background sync or just manual "sync now."
   - Recommendation: Start with a "Sync Now" button in the meetings page header (manual, no polling). This is the safest approach on Vercel serverless. Can add polling later.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (existing — test files in `src/lib/__tests__/`) |
| Config file | `jest.config.ts` (if exists) or `package.json jest` field |
| Quick run command | `npx jest --testPathPattern="phase15" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENTITY-01 | Tree view renders nested children correctly | unit | `npx jest --testPathPattern="vehicle-tree" -x` | ❌ Wave 0 |
| ENTITY-02 | Post-formation checklist generates correct items for deal-linked vs standalone | unit | `npx jest --testPathPattern="post-formation" -x` | ❌ Wave 0 |
| ENTITY-03 | Regulatory filing Zod schema validates correctly | unit | `npx jest --testPathPattern="regulatory" -x` | ❌ Wave 0 |
| ENTITY-04 | Status transition API rejects invalid transitions | unit | `npx jest --testPathPattern="status-transition" -x` | ❌ Wave 0 |
| ENTITY-05 | Side letter create/read/update round-trip | manual smoke | n/a — manual verification | existing code |
| MTG-01 | Fireflies API key save/retrieve round-trip | unit | `npx jest --testPathPattern="fireflies" -x` | ❌ Wave 0 |
| MTG-02 | AI summary generation from transcript text | manual | n/a — requires AI key | existing infra |
| MTG-03 | parseActionItems splits action_items string correctly | unit | `npx jest --testPathPattern="fireflies-sync" -x` | ❌ Wave 0 |
| MTG-04 | Meeting sync creates Meeting with correct entityId | unit | included in MTG-03 test | ❌ Wave 0 |
| MTG-05 | Sync loop iterates all users with Fireflies key | unit | included in MTG-01 test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="phase15" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green + manual smoke test of end-to-end Fireflies connect → sync → meeting appears in meetings page

### Wave 0 Gaps
- [ ] `src/lib/__tests__/phase15-entity-hierarchy.test.ts` — covers ENTITY-01, ENTITY-02, ENTITY-03, ENTITY-04
- [ ] `src/lib/__tests__/phase15-fireflies-sync.test.ts` — covers MTG-01, MTG-03, MTG-04, MTG-05

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `prisma/schema.prisma` — Entity model fields verified directly
- Existing codebase: `src/app/(gp)/entities/page.tsx` — current flat list implementation
- Existing codebase: `src/app/(gp)/entities/[id]/page.tsx` — current 10-tab entity detail
- Existing codebase: `src/app/api/entities/[id]/route.ts` — PATCH handler patterns
- Existing codebase: `src/lib/ai-config.ts` — `encryptApiKey`/`decryptApiKey` pattern
- Existing codebase: `src/app/api/meetings/route.ts` — meeting model and sync base
- [Fireflies Authorization Docs](https://docs.fireflies.ai/fundamentals/authorization) — bearer token auth confirmed

### Secondary (MEDIUM confidence)
- [Fireflies Transcripts Query Docs](https://docs.fireflies.ai/graphql-api/query/transcripts) — query shape and fields
- [Fireflies Summary Schema](https://docs.fireflies.ai/schema/summary.md) — summary.overview, summary.action_items structure
- [react-organizational-chart npm](https://www.npmjs.com/package/react-organizational-chart) — lightweight org chart library
- [SWR refreshInterval docs](https://swr.vercel.app/docs/with-nextjs) — polling pattern

### Tertiary (LOW confidence)
- Fireflies OAuth flow via third-party sources (rollout.com) — suggests OAuth 2.0 exists but official Fireflies docs only document bearer tokens. Treat Fireflies as API-key-only unless official OAuth docs surface.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries either already in use or verified via official docs
- Architecture: HIGH — schema and existing code reviewed directly; patterns established from working code
- Pitfalls: HIGH — identified from direct code inspection and Fireflies API docs
- Fireflies integration: MEDIUM — API shape confirmed, but action_items string format inferred from docs language not direct test

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable domain; Fireflies API may change but core bearer token auth is long-standing)
