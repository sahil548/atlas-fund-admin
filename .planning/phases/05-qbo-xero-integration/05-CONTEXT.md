# Phase 5: QBO/Xero Integration - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect real accounting software (QuickBooks Online, Xero) so Atlas can pull from actual books. Each entity connects to its own QBO/Xero company via real OAuth. Account mapping lets users assign GL accounts to Atlas categories. Trial balance data flows into Atlas with historical snapshots. Two-layer NAV switches from proxy-based to GL-based cost basis when a connection exists, with fair value overlay from Atlas valuations.

</domain>

<decisions>
## Implementation Decisions

### Provider Strategy
- QBO is the primary accounting software — build QBO integration first
- Provider-agnostic abstraction layer: design interfaces so Xero slots in later without rework
- QBO implementation is the first (and only) concrete provider for this phase
- Xero support deferred to a future phase when needed

### OAuth & Connection Setup
- 1:1 mapping: each entity connects to its own separate QBO company
- GP admin performs the OAuth connection (not CPA/bookkeeper)
- Intuit Developer account and QBO app registration needed as part of this phase
- Connect entities one at a time from entity detail or accounting page — no batch wizard
- Auto-refresh OAuth tokens silently — GP never has to manually reconnect for token expiry (~100 day cycle)
- Middleware already whitelists `/api/integrations/*/callback` for OAuth callbacks

### Account Mapping
- 5 Atlas categories (buckets): Cash, Investments at Cost, Other Assets, Liabilities, Equity/Partners' Capital
- Auto-detect which QBO accounts map to each category based on QBO account type/name — GP reviews and confirms
- Suggest mappings from the most recently mapped entity (pre-fill for new connections — GP adjusts)
- Flag unmapped QBO accounts with a warning badge ("X unmapped accounts")
- Show reconciliation warnings if trial balance doesn't balance (debits != credits)
- Mapping UI lives in both places:
  - Accounting page (/accounting) — click entity to drill into its mapping
  - Entity detail page — new "Accounting" tab with mapping, sync info, trial balance

### Trial Balance
- Detailed drill-down view: show full trial balance with individual account balances, organized by the 5 mapped buckets
- Historical snapshots: store each pull with as-of date (period date, e.g., month-end)
- GP can view and compare trial balances across periods
- Trial balance visible in both:
  - Entity detail "Accounting" tab
  - /accounting page entity drill-in

### NAV Integration
- Auto-switch: once an entity has a mapped QBO connection, NAV automatically uses real GL data for cost basis layer
- Proxy-based NAV (5%/0.5%/2%) remains as fallback for unconnected entities only
- No manual toggle — connection + mapping = automatic GL-based NAV
- Existing NAV snapshot pattern (auto-save on every GET) continues

### Sync & Freshness
- "Last synced: X hours ago" timestamp always visible on entity pages that use GL data
- On sync failure: show last good data with warning badge (error message + last successful sync timestamp)
- Track as-of date: each trial balance snapshot has a period date (e.g., "Trial balance as of Feb 28, 2026")

### Claude's Discretion
- Sync trigger mechanism: Vercel cron + manual "Sync Now" button, or auto-pull on page load — pick the pragmatic approach given serverless constraints
- Disconnect behavior: keep previously pulled GL data on disconnect (sensible default)
- Account mapping editability: editable anytime (new QBO accounts show as unmapped)
- Auto-detect algorithm: how to infer QBO account -> Atlas bucket mapping from account type/name
- Trial balance period selection UX (date picker, dropdown of available periods, etc.)
- Error handling for partial syncs (some accounts succeed, others fail)
- Token storage encryption approach within oauthCredentials JSON field

</decisions>

<specifics>
## Specific Ideas

- GP said "not everybody uses QBO" — Xero abstraction is forward-thinking for the product, not for current use
- Bookkeeper update cadence varies by entity — some monthly, some weekly. Sync freshness should accommodate both.
- Account mapping should minimize GP effort: auto-detect + confirm is the workflow, not manual drag-and-drop
- Include equity bucket for balance sheet reconciliation (Assets - Liabilities = Equity sanity check)
- Historical snapshots match how accountants think — "trial balance as of month-end"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AccountingConnection model** (`prisma/schema.prisma`): Full model with provider, oauthCredentials (Json), syncStatus, lastSyncAt, syncFrequency, chartOfAccountsMapped, unreconciledItems. Ready to use.
- **AccountMapping model** (`prisma/schema.prisma`): Junction model with atlasAccountType, providerAccountId, providerAccountName. Needs expansion for 5-bucket types.
- **Accounting page** (`src/app/(gp)/accounting/page.tsx`): Dashboard with connection status cards, sync status indicators, reconnect/sync buttons. Base for enhanced accounting management.
- **ReconnectForm + TriggerSyncForm** (`src/components/features/accounting/`): Existing UI-only modals. Replace internals with real OAuth/sync logic.
- **NAV endpoint** (`src/app/api/nav/[entityId]/route.ts`): Two-layer NAV with proxy percentages. Already includes accountingConnection in entity fetch. Modify cost basis layer to use GL data when available.
- **NAVComputation model** (`prisma/schema.prisma`): Stores snapshots per entity per periodDate. Reuse for GL-based NAV snapshots.
- **UpdateAccountingConnectionSchema** (`src/lib/schemas.ts`): Zod schema for connection updates. Extend for new fields.
- **Auth middleware** (`src/middleware.ts`): Already whitelists `/api/integrations/(.*)/callback` for OAuth callback routes.

### Established Patterns
- **SWR data fetching**: All pages use `useSWR` with firmId scoping — accounting pages will follow same pattern
- **Zod validation**: API routes use `parseBody(req, ZodSchema)` — new endpoints follow same pattern
- **Toast notifications**: `useToast()` (never destructure) for sync status feedback
- **Entity detail tabs**: Existing tab pattern (Overview, Investors, Assets, Documents, Formation) — add "Accounting" tab

### Integration Points
- **NAV endpoint** -> Replace proxy cost basis with GL trial balance data when connection + mapping exists
- **Entity detail** -> New "Accounting" tab for mapping, sync, trial balance
- **Accounting page** -> Enhanced with drill-in per entity for mapping and trial balance
- **GP dashboard** -> NAV aggregation already pulls from NAV endpoint; improved accuracy flows through automatically
- **AccountingConnection.oauthCredentials** -> Store OAuth tokens (access, refresh, realm ID, expiry)

</code_context>

<deferred>
## Deferred Ideas

- **Xero implementation** — Provider abstraction built, but only QBO implemented. Xero is a future phase when other Atlas users need it.
- **Automated reconciliation** — Beyond warnings, automatically reconcile QBO entries against Atlas transactions. Complex, separate phase.
- **P&L / Income Statement** — Only trial balance (balance sheet accounts) pulled for now. Revenue/expense analysis is a future capability.
- **Multi-company consolidation** — Cross-entity consolidated financial statements from GL data. Beyond current scope.
- **QBO write-back** — Atlas could push capital call/distribution entries back to QBO. Not in scope for Phase 5 (read-only integration).

</deferred>

---

*Phase: 05-qbo-xero-integration*
*Context gathered: 2026-03-07*
