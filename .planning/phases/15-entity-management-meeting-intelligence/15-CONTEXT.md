# Phase 15: Entity Management & Meeting Intelligence - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The entity list shows parent-child fund structure clearly with multiple view modes, formation workflows guide GPs to next steps with deal-linked lifecycle awareness, the regulatory tab provides CSC-style structured compliance tracking, and each GP team member can connect their own Fireflies account so meeting transcripts flow into Atlas with AI-generated summaries and auto-created tasks. Also includes renaming "Entities" to "Vehicles" across all user-facing UI.

</domain>

<decisions>
## Implementation Decisions

### Entity/Vehicle Naming Rename
- Rename all user-facing labels from "Entities" to "Vehicles" throughout Atlas — nav, page titles, button labels, breadcrumbs, empty states, search results
- Prisma model stays as `Entity` (no DB migration) — only UI-facing text changes
- API routes stay as `/api/entities` — no URL changes needed
- This is a full sweep across all ~30 GP pages plus LP portal references

### Entity Hierarchy & View Modes
- Four view modes on the Vehicles list page, toggled via buttons: **Flat | Tree | Org Chart | Cards**
- **Flat view** — current table layout (default)
- **Tree view** — parent funds as top-level rows, SPVs/sidecars/co-invests indented underneath. Expand/collapse per fund family, collapsed by default
- **Org chart view** — top-down box diagram showing fund family hierarchy. Each box is clickable (navigates to vehicle detail) and shows key metrics: name, type badge, NAV, status
- **Cards view** — the rich entity cards currently on the GP dashboard (NAV, IRR, TVPI, capital deployed vs committed, asset count) move here as a fourth view. Dashboard gets a condensed vehicle summary widget instead
- Parent entity selector optional for all entity types during creation (not required for child types)

### Post-Formation Guidance
- Context-aware "what's next" checklist after formation completes — items based on what the vehicle is currently missing
- **Deal-linked vehicles** (SPV/sidecar created for a deal) show deal lifecycle steps: File SEC exemptions, Add investors & commitments, Issue capital call, Verify funding received, Close on deal
- **Standalone vehicles** (main funds with no deal link) show operational setup steps: Add investors, Configure waterfall, Upload governing docs, Connect QuickBooks, Add regulatory filings
- Items already completed are pre-checked; each item links to the relevant tab/form
- Checklist appears as a banner/card on the entity overview tab, not a separate page

### Entity Status Transitions
- Status transitions (ACTIVE -> WINDING_DOWN -> DISSOLVED) require confirmation dialog with optional reason field
- Reason stored for audit trail
- Dissolving a vehicle with outstanding obligations (unfunded capital calls, active assets) shows warnings listing the obligations but still allows the GP to proceed
- Status transition buttons visible on entity overview header area

### Regulatory Filings — CSC-Style Tracking
- Full structured regulatory/compliance tracking inspired by CSC Navigator:
  - **Per-jurisdiction tracking** — formation jurisdiction + foreign qualifications. Each jurisdiction record: jurisdiction name, registered-with agency, authorization date, jurisdiction ID/filing number, jurisdiction status (active/inactive/withdrawn), status date
  - **Filing types** — SEC Form D (initial + amendments), state blue sky notices, annual report filings, entity filings (change of agent, amendments, etc.), BOI/FinCEN filings
  - **Per filing record** — filing type, jurisdiction (federal/state), filed date, due date/renewal date, status (pending/filed/overdue/not due), filing number/confirmation, document attachment, notes
  - **Good standing tracking** — auto-flag from overdue filing due dates (overdue annual filing = potential standing issue). GP can override standing status manually. AI-verified standing check deferred to Phase 18
  - **Registered agent** — linked to a CRM contact (not text fields). Contact tagged as "Registered Agent" and linked to the entity. Shows agent across all their vehicles
  - **CTA Classification + FinCEN ID** — compliance fields on entity summary
- Filing due date alerts surfaced on entity detail AND on GP dashboard "needs attention" section (30/60/90 day windows)
- Regulatory tab replaces current raw JSON display with structured form for add/edit

### Side Letter Verification (ENTITY-05)
- Verify existing side letter management wiring works end-to-end — no new features, just confirmation the Phase 4 implementation is functional

### Fireflies OAuth Integration
- OAuth connection lives in **user profile settings** (not integrations page). Each GP team member connects their own Fireflies account
- Shows connection status: connected (email, last sync time) or disconnected with "Connect Fireflies" button
- Meetings auto-sync from connected Fireflies accounts into the aggregated meetings view

### Meeting Intelligence — AI Features
- **AI auto-linking** — when meetings sync from Fireflies, AI analyzes title and transcript to suggest which deal/entity/asset it relates to. GP sees suggestion and confirms or changes. Falls back to manual linking if no AI key configured
- **Inline presentation** — meeting card shows: title, date, source badge, type badge, summary paragraph, action items list with checkboxes, decisions list, context links (deal/entity/asset)
- **Auto-created draft tasks** — AI-extracted action items auto-create as DRAFT tasks in the task system (Phase 14), linked to the relevant deal/entity. GP reviews and activates them
- **Activity feed surfacing** — meetings appear in the activity feed for their linked deal/entity/asset context

### Claude's Discretion
- Exact tree view expand/collapse UX details and indentation styling
- Org chart rendering library choice and layout algorithm
- Condensed vehicle summary widget design for the dashboard (replacing full entity cards)
- Filing form layout and field grouping
- Meeting sync polling interval or webhook approach for Fireflies
- How to handle meetings when no AI key is configured (manual summary entry vs skip)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Entity model** (`prisma/schema.prisma:379`): Has `parentEntityId`, `parentEntity`/`childEntities` self-relation, `status` (ACTIVE/WINDING_DOWN/DISSOLVED), `formationStatus`, `regulatoryFilings` (Json). Hierarchy data model already exists
- **Entity list page** (`src/app/(gp)/entities/page.tsx`): Flat table with SearchFilterBar, pagination, create form. Base for adding view mode toggles
- **Entity detail page** (`src/app/(gp)/entities/[id]/page.tsx`): 10-tab layout (Overview, NAV, Capital, Investors, Waterfall, Meetings, Documents, Fundraising, Regulatory, Accounting). ~1200 LOC. Regulatory tab currently shows raw JSON
- **Meeting model** (`prisma/schema.prisma:1491`): Has `source` (MeetingSource enum: FIREFLIES/MANUAL/ZOOM/TEAMS), `transcript`, `summary`, `actionItems`, `decisions`, links to deal/entity/asset
- **Meetings page** (`src/app/(gp)/meetings/page.tsx`): Card layout with stat cards, search/filter, source badges. Already supports Fireflies as a source type
- **CreateMeetingForm**: Manual meeting creation form. Reusable for Fireflies-synced meeting editing
- **Badge component**: Color-coded badges used throughout — reuse for filing status badges
- **SearchFilterBar + LoadMoreButton**: Standardized list controls — reuse on filing lists
- **GP dashboard entity cards**: Currently on `/dashboard` — will be migrated to Vehicles page card view
- **StatCard component**: Used on meetings page — reuse for regulatory compliance summary stats

### Established Patterns
- **SWR data fetching**: `useSWR(/api/endpoint?firmId=${firmId})` with cursor-based pagination
- **Zod validation**: All API routes use `parseBody(req, ZodSchema)` pattern
- **Tab-based detail pages**: Entity detail uses tab state with conditional rendering — add/modify tabs as needed
- **Toast notifications**: `useToast()` for success/error feedback
- **Modal forms**: CreateEntityForm pattern for slide-over create/edit forms

### Integration Points
- **CRM contacts (Phase 13)**: Registered agent links to contact directory — depends on CRM being built
- **Task system (Phase 14)**: Meeting action items auto-create as draft tasks — depends on task model
- **AI infrastructure (Phase 12)**: Meeting AI summary/action item extraction and auto-linking use AI keys from Phase 12's AICONF setup
- **Dashboard (Phase 19)**: Entity cards move from dashboard to Vehicles page; dashboard gets condensed widget. Dashboard redesign in Phase 19 must account for this
- **Activity feed**: Meetings surface in entity/deal activity feeds — extends existing DealActivity pattern

</code_context>

<specifics>
## Specific Ideas

- "I'm thinking in terms of the deal's life — I have a deal, I need to create a fund/SPV for it, do SEC filings, raise the money, close on the deal." The post-formation checklist should reflect this deal-centric lifecycle, not just operational setup
- CSC Navigator as the reference for regulatory compliance tracking — per-jurisdiction tracking, filing types with due dates, good standing calendar, document cabinet per entity
- CSC has tons of contacts (agent contacts, filing contacts) that are hard to keep track of — registered agent should link to CRM contact for centralized management
- The rich entity cards on the current Atlas dashboard are great but belong on the Vehicles page as a card view mode, not dominating the dashboard
- "Vehicles" is the right label because all companies in the directory are legal entities, but vehicles are the specific category being tracked here (funds, SPVs, sidecars)

</specifics>

<deferred>
## Deferred Ideas

- **AI-verified good standing check** — AI checks secretary of state websites for actual entity standing status. Deferred to Phase 18 (AI Features)
- **Dashboard entity card migration** — Move rich entity cards from dashboard to Vehicles page card view; dashboard gets condensed vehicle summary widget. Dashboard redesign in Phase 19
- **DBA name tracking** — CSC tracks DBA/trade names per entity. Not in current requirements but noted for future
- **Ownership & capital structure tracking** — CSC has detailed ownership percentage and capital structure sections. Atlas tracks investors separately via the Investors tab, but a formal ownership structure view could be valuable later
- **Minute book management** — CSC has minute book storage with location tracking. Could be part of document management enhancement
- **Name history tracking** — CSC tracks entity name changes over time. Low priority for current fund operations

</deferred>

---

*Phase: 15-entity-management-meeting-intelligence*
*Context gathered: 2026-03-09*
