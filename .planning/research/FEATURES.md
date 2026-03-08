# Feature Research

**Domain:** Family office / fund administration platform — GP operating system covering deal pipeline, asset management, LP relations, accounting, capital activity, and entity management.
**Researched:** 2026-03-08
**Confidence:** HIGH — based on direct codebase audit of all 57 Prisma models, 73+ API routes, 33 pages, and prior phase verification reports. Industry patterns drawn from training data on Juniper Square, Allvue, Carta, and Cobalt (confidence: MEDIUM — training-data sourced, unverified against current product state).

---

## Module-by-Module Feature Analysis

Each module is treated as a separate domain with its own table stakes, differentiators, and anti-features. This reflects the downstream consumer's request for per-module coverage.

---

## MODULE 1: Deal Desk

### What's Built
Full pipeline kanban (Screening → DD → IC Review → Closing → Closed), 7-tab deal detail, AI-powered DD analysis, IC voting via Atlas UI + Slack stubs, deal-to-asset transition, create-deal wizard, activity timeline, notes, documents.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Deal list search + filter | GPs always have 20–100 pipeline deals; can't scan a raw list | LOW | Search bar + stage/class filters exist. Missing: filter by deal lead, instrument, date range. |
| Bulk status actions | "Kill 3 stale screening deals" is a weekly housekeeping task | MEDIUM | Not built. Single-deal kill only. |
| Deal age / days-in-stage indicator | "This deal has been in DD for 45 days" — critical for pipeline hygiene | LOW | Not present on kanban cards or list. Just needs a computed field. |
| Stage progression breadcrumb on detail page | Users need to know where in the process a deal sits without reading text | LOW | Stage badges exist but no horizontal stepper showing full journey. |
| Closing checklist with assignee + due date | Standard GP expectation before legal sign-off | LOW | Model exists (ClosingChecklist). UI exists in closing tab. Need to verify dates/assignees display correctly. |
| Deal edit — all fields editable | GPs update deal details constantly; missing fields cause workarounds | LOW | EditDealForm exists. Need to verify all key fields are editable (target amount, thesis, status notes, asset class, instrument). |
| Documents tab — version/replace existing doc | Uploading v2 of a CIM shouldn't create a duplicate; needs replace-in-place | MEDIUM | Currently creates a new document entry. No versioning or replace flow. |
| IC memo — PDF export | IC Review stage ends in a memo; GPs share this externally | MEDIUM | IC memo content is generated in DB (AIScreeningResult.memo). No export to PDF. Reports exist for assets/entities; deal-level IC memo PDF is missing. |
| Dead deals — reason required | Without a "why killed" field, pipeline analytics are useless | LOW | KillDealModal exists. Unclear if reason/notes are captured and surfaced. Needs verification. |
| Deal → Asset link visible on both sides | After close, GPs navigate asset ↔ deal constantly | LOW | AssetOriginatedFrom component exists on asset detail. Deal page needs reciprocal "View Asset" link after CLOSED. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI screening score visible on kanban card | Enables instant prioritization without opening each deal | LOW | AI score exists on Deal model. Currently only visible inside deal detail. Add score badge to kanban card. |
| Deal-level performance attribution post-close | "This deal that went through IC contributed X% of fund IRR" — closes the loop | HIGH | Attribution exists at entity level. Deal-level attribution requires wiring CapitalAccount + Valuation + IRR per deal. |
| Configurable IC decision structures (quorum, roles) | Family offices have bespoke IC processes | MEDIUM | ICProcess model exists. Decision types exist. Configurable quorum threshold not yet enforced in UI. |
| DD workstream completion % on kanban card | "Financial DD: 60%" — scannable from pipeline view | LOW | DDWorkstream status exists. Aggregate % computed in deal-dd-tab. Not surfaced to kanban cards. |
| Meeting-to-deal linking | Log a site visit or management call directly against the deal | LOW | Meeting model supports dealId. CreateMeetingForm exists. Unclear if deal detail page exposes meeting list and create. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-advance deal stage on all DD tasks complete | Feels like automation | Dangerous: LPs and GP team expect a human to decide stage advancement; auto-advance can trigger premature IC | Keep stage progression as an explicit GP action; add a nudge/prompt ("All DD tasks complete — ready to send to IC?") |
| Unlimited custom fields on deal | "We need to track X" | Schema sprawl, impossible to normalize for reporting, breaks AI screening input | Use the Notes tab for free-form context; expose metadata JSON field for structured customization |
| Real-time collaborative editing of IC memos | Feels modern | Clerk-based auth doesn't support per-keystroke sync; creates conflict merge complexity | Version-stamped inline editing with last-edit timestamp is sufficient for a 3-person IC |

### V1 Gaps Likely to Frustrate Real Users

1. **No days-in-stage metric.** GPs will immediately ask "why is this deal stuck?" — the answer requires knowing how long it's been in a stage.
2. **Dead deal reason not surfaced in pipeline analytics.** If you can't see why deals die, you can't improve sourcing.
3. **Deal kanban has no deal-count or value-per-stage summary.** "You have $45M of deals in DD" is a critical pipeline metric. Visible totals per stage are a standard expectation.
4. **IC memo not exportable.** After IC review, GPs share the memo with co-investors or document it. No PDF path.
5. **Documents tab creates duplicates.** Uploading an updated CIM creates a second file with no replacement flow.

---

## MODULE 2: Asset Management

### What's Built
Type-specific detail pages (RE/Credit/Equity/Fund LP), valuations, income events, source deal attribution, performance tab with IRR/MOIC/TVPI, asset list with class filters, edit form, tasks, documents, governance tab, meetings tab.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Asset list — sort by any column | Users expect sortable tables everywhere | LOW | Asset list exists with class filters. Column sorting (by name, NAV, IRR, cost basis) not present. |
| Valuation history chart | "Show me how this asset's value has changed over time" — core portfolio monitoring | LOW | ValuationHistory exists. AssetPerformanceTab exists. Verify Recharts line chart with valuation date + FV is rendered. |
| Income events list — sortable, filterable by type | Income tracking requires reviewing by income type (rent, interest, dividend) | LOW | Income model exists. Need to verify list UI is sortable and filterable. |
| Holding type–adaptive UI | Direct asset controls differ from LP position controls | MEDIUM | Architecture doc explicitly flags this as NOT fully implemented. Asset detail shows same controls regardless of holding type. |
| Asset status transitions — exit / write-off workflow | Assets exit; need an explicit close flow with exit date, exit proceeds, final MOIC | MEDIUM | AssetStatus enum has ACTIVE/EXITED/WRITTEN_OFF. No exit workflow modal or form found in codebase. |
| Real estate: lease expiry calendar / alerts | RE investors track lease rollovers; this is table stakes | MEDIUM | Lease model is rich (dates, escalations, renewal options). No expiry calendar or alert trigger. |
| Credit: payment schedule display | Credit investors expect to see a payment schedule against actual receipts | MEDIUM | CreditPayment model exists. UI unclear. Need a payment schedule view vs actuals. |
| Covenant monitoring dashboard | Covenant breach = immediate action; needs a flagging/alert system | MEDIUM | Covenant model is comprehensive. Covenant status (compliant/watch/cure_period/breach/waived) exists. Need a summary view surfacing non-compliant covenants across all assets. |
| Asset document viewer (in-page) | GPs don't want to leave the asset page to view a PDF | LOW | DocumentPreviewModal exists. Need to verify it's wired to the asset documents tab. |
| Bulk valuation update | Quarter-end requires marking valuations for all assets | HIGH | Individual valuation form exists. No bulk flow. Mark as deferred complexity for now. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Holding type–contextual controls | Direct: "Log income." LP position: "Request statement from GP." Co-invest: "Track lead GP comms." | MEDIUM | High leverage — single model change unlocks right-sized UX per asset type. Hiding irrelevant controls removes clutter. |
| Covenant breach → task auto-creation | When a covenant flips to BREACH, auto-create a task for the deal lead | MEDIUM | Depends on covenant status update hook. Would require server-side trigger. |
| Cross-asset exposure map | "How much of Fund I's NAV is in office RE?" — requires aggregation across all assets | MEDIUM | Dashboard has allocation chart. Asset-level exposure vs fund total isn't surfaced per asset. |
| AI-generated asset summary | "Summarize this asset's performance and current risks in 2 sentences" | LOW | AI service already exists (OpenAI/Anthropic). A per-asset summary endpoint would be low-effort given existing patterns. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Public market price feeds (Bloomberg/Yahoo) | "Track our REIT positions" | Out of scope per PROJECT.md; adds significant cost and complexity | Keep assets as private holdings; mark public securities as a separate asset type if needed |
| Automated rent collection / invoice generation | Natural RE workflow extension | Requires A/R workflow, payment processor, significant scope | Link to property management system or log manually via income events |
| Automated covenant testing from financial statements | Seems natural | Requires financial statement parsing, complex NLP, high error risk | Manual covenant status update with a "last tested" date is sufficient for a small portfolio |

### V1 Gaps Likely to Frustrate Real Users

1. **No asset exit workflow.** When an asset is sold, there's no guided flow to record exit date, exit proceeds, calculate final MOIC, and mark as EXITED. Users will improvise workarounds.
2. **Holding type UI is identical for all asset types.** LP positions in external funds show the same "Log Income" and "Create Valuation" controls as direct assets — confusing and incorrect.
3. **Covenant breaches are invisible at portfolio level.** A GP managing 10+ credit assets can't see at a glance which covenants are in breach across the portfolio.
4. **Lease expiry has no forward visibility.** Lease end dates live in the model but there's no "leases expiring in 90/180 days" view.

---

## MODULE 3: Entity Management

### What's Built
6 entity types, formation workflow, multi-entity deal participation, investor management, entity detail with 10 tabs (overview, nav, capital, investors, waterfall, meetings, documents, fundraising, regulatory, accounting), per-entity fee calculation, performance attribution, Plaid bank balance card.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Entity list — NAV + IRR at a glance | Top-level portfolio view; GPs need entity-level performance visible without clicking in | LOW | Entity cards exist on dashboard. Entity list page (/entities) should show NAV + computed IRR per row. Verify this. |
| Investor roster per entity — commitment + called + distributed | Per-LP capital account summary per entity is expected on the entity detail | LOW | Investors tab exists on entity detail. Need to verify commitment, called, distributed, and uncalled capital are all visible. |
| NAV history chart | "Show me Fund I's NAV over 8 quarters" — essential for LP reporting | LOW | navHistory SWR fetch exists. Need to verify Recharts chart is rendered on NAV tab. |
| Entity document vault | Operating agreements, formation docs, K-1s, per entity | LOW | Documents tab exists on entity detail. Verify upload + list + download works. |
| Entity-level capital call history | Which calls went out, for how much, and what's the funded status | LOW | Capital tab on entity detail. CreateCapitalCallForm is there. Verify capital calls are listed on the entity tab, not only on /transactions. |
| Entity status transitions | Winding down, dissolution — needs explicit workflow | MEDIUM | EntityStatus enum exists (ACTIVE/WINDING_DOWN/DISSOLVED). No transition workflow found. |
| Regulatory filings tracker | Entity.regulatoryFilings (JSON) exists but no UI to manage filings | MEDIUM | Regulatory tab exists on entity detail page. Verify it renders and allows adding filing entries. |
| Side letter management per LP per entity | Family offices always have per-LP deal modifications | MEDIUM | SideLetter model exists. SideLetterRulesPanel component exists. Verify it's wired in entity → investors flow. |
| Parent entity relationship visible | Fund I → Sidecar A relationship needs to be clear in UI | LOW | parentEntityId exists on Entity. Entity list should show parent/child hierarchy visually. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Two-layer NAV (cost-basis NAV + economic NAV) | Standard for fund admins; shows difference between book and mark-to-market | MEDIUM | Two-layer NAV is in the architecture. NAVComputation model has costBasisNAV and economicNAV. NAV tab needs to surface both clearly with explanatory labels. |
| Fundraising pipeline per entity | Track LP prospects per fund raise | MEDIUM | FundraisingRound and FundraisingProspect models exist. Fundraising tab exists on entity detail. Verify create/edit/track prospect flow works end-to-end. |
| Per-entity Plaid bank balance | Real-time cash visibility per entity without leaving Atlas | LOW | Plaid card already wired in Phase 9. Make sure it's visible when Plaid is connected. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated entity dissolution workflow (legal filings) | Seems like a natural next step | Requires jurisdiction-specific legal knowledge, out of scope | Track dissolution status manually; link to document storage for state filings |
| Cross-entity consolidated financials | "Give me a consolidated P&L across all entities" | Accounting consolidation requires entity-level eliminations, a complex accounting problem | Aggregate metrics on dashboard; single-entity trial balance via QBO/Xero per entity |

### V1 Gaps Likely to Frustrate Real Users

1. **Entity list is flat, no parent-child hierarchy visible.** When a GP has Fund I, Sidecar A, SPV-X — the relationships aren't clear from the list.
2. **Formation workflow ends at FORMED but no clear "what's next after formation" guidance.** The GP needs to connect accounting, add investors, create a capital call.
3. **Regulatory filings tab may render empty with no add flow.** The regulatoryFilings field is a JSON blob — needs a structured add/edit form.
4. **Entity status transitions (WINDING_DOWN, DISSOLVED) have no workflow.** No exit checklist, no confirmations, just a status change.

---

## MODULE 4: Capital Activity

### What's Built
Capital calls with line items, distributions with waterfall breakdown, waterfall templates with configurable tiers, waterfall calculation engine, per-investor pro-rata distribution breakdown, capital account ledger, fee calculation with side letter adjustments.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Capital call — advance status (DRAFT → ISSUED → FUNDED) | GPs need to track which calls have been sent and which are collected | LOW | Status enum and field exist. Does the UI have an explicit "Mark as Issued" and "Mark as Funded" button per capital call? Verify. |
| Per-investor capital call status tracking | "Which LPs have funded Call #3?" — essential for overdue follow-up | LOW | CapitalCallLineItem with status exists. Is per-investor status visible on the capital call detail? Verify expandedCall view. |
| Distribution approval workflow (DRAFT → APPROVED → PAID) | Distributions require sign-off before payment | LOW | Status enum exists. Does the UI have explicit approval + mark-paid buttons? Verify. |
| Capital account ledger per LP per entity | The running balance of contributions, distributions, and income for each LP | MEDIUM | CapitalAccount model exists. LP portal shows capital account statement. Does GP have a view per investor per entity? Verify /investors/[id] page. |
| Waterfall calculation results display | After running the waterfall, GPs need to see the full breakdown (by tier, by LP) | MEDIUM | calcResults state exists in transactions/page.tsx. Verify results render clearly with per-tier LP and GP allocations. |
| Fee calculation — management fee + carry | GPs bill fees quarterly; need a clear fee summary per entity | LOW | Fee calculation API exists, wired to entity detail. Verify management fee + carried interest display clearly. |
| Transaction ledger / history | All transactions for an entity in one place, sortable by date | LOW | Transaction model exists. Is there a full ledger view per entity? The entity Capital tab should show all transactions. Verify. |
| Capital call document attachment | Capital call notices go out as PDFs | MEDIUM | CapitalCall model exists. No document attachment to a capital call found. GPs need to attach the formal notice. |
| Overdue capital call alerts | "LP X's call is 15 days overdue" — needs surfacing | LOW | OVERDUE status exists in enum. No alert or notification trigger for overdue calls found. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Waterfall preview before distribution | "Before I distribute, show me what each LP would receive" — prevents errors | LOW | Waterfall calc exists. A "preview" mode (calculate without saving) would add trust. Currently saves calculation results to DB — a preview state is needed. |
| Side letter–adjusted fee display per LP | Shows exactly what each LP pays after their specific discounts | MEDIUM | Side letter fee adjustment is wired (Phase 9). Verify the per-investor adjustments are visible in the fee calculation UI. |
| Capital deployment tracker | "How much of Fund I's committed capital is deployed vs. undeployed?" | LOW | CapitalDeploymentTracker component exists on dashboard. Verify it updates based on real capital call data. |
| Distribution notice auto-generation | Generate a distribution notice PDF with per-LP amounts pre-filled | HIGH | Reports exist for quarterly/capital account/fund summary. Distribution notice as a separate report type is not present. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated wire initiation | "Send the call amount directly" | Explicitly out of scope per PROJECT.md; payment processor risk, regulatory complexity | Log wire confirmation manually after wire is sent externally |
| Real-time capital call status sync from bank | Appealing for automation | Requires bank API integration, complex reconciliation, high compliance surface area | Plaid for balance visibility; manual status update for call funding confirmation |

### V1 Gaps Likely to Frustrate Real Users

1. **Capital call status advancement may require manual DB edit.** If no "Mark as Issued" button exists, GPs will have no way to advance status without dev help.
2. **No overdue call alert or notification.** An overdue capital call is a serious workflow event — it needs to surface on the dashboard.
3. **Distribution approval step may be missing from UI.** DRAFT → APPROVED → PAID requires two explicit user actions; if these aren't buttons in the UI, distributions may be stuck at DRAFT.
4. **Capital call document attachment is missing.** GPs need to attach the formal capital call notice PDF to the call record — no mechanism found.

---

## MODULE 5: LP Portal

### What's Built
LP dashboard (NAV, IRR/TVPI/DPI/RVPI, commitments by entity), LP portfolio view (pro-rata asset exposure), LP documents (with download), LP activity (capital calls, distributions), LP capital account statement, LP notification preferences, performance charts (time series).

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Capital account statement — period selection | LPs need statements for specific periods (Q1, Q2, year-end) | LOW | LP account statement exists. Is there a period/date range picker? Verify lp-account/page.tsx. |
| Document center — category filter | "Show me only K-1s" — LPs manage tax docs separately | LOW | LP documents page exists with download. Category filter (K-1s, financial statements, notices) may be missing. |
| Distribution history — date + amount + breakdown | LPs need to see each distribution: return of capital, income, LT gain, ST gain, carry | LOW | LP activity page shows capital calls with status, distributions with breakdown. Verify all five distribution components are displayed. |
| Notifications — capital call notice display | When a capital call is issued, LP needs to see: entity, amount, due date, bank details | LOW | Capital call notification type exists. LP activity page shows calls. Verify due date and call purpose are visible. |
| Read-only — no ability to modify any data | LP portal must be strictly read-only; accidental edit would be a serious issue | LOW | RBAC middleware now covers LP routes. Verify no edit buttons appear in LP views. |
| LP contact info self-service | LPs expect to update their own email/phone in the portal | LOW | lp-settings/page.tsx exists. Verify it allows updating contact info (at minimum email, phone). |
| Performance benchmark toggle | "Show me my IRR vs. comparable periods" — LPs ask this constantly | HIGH | Not present. Time series charts exist. Benchmarks (S&P, private equity indices) are complex and likely out of scope, but the toggle skeleton would increase LP confidence. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| LP portfolio exposure map | "Show me what I'm exposed to: 60% RE, 30% credit, 10% equity" — asset-class breakdown of their portfolio | LOW | lp-portfolio page shows pro-rata asset exposure. Verify asset class breakdown chart is rendered. |
| K-1 delivery + acknowledgment | LPs need to receive, download, and acknowledge tax documents | MEDIUM | K-1 model and upload/delivery exist. LP document center shows K-1s. Missing: acknowledgment receipt workflow (LP clicks "I've downloaded this"). |
| Capital account statement PDF download | LPs print/email their capital account statements | LOW | PDF generation exists for capital account statements. Is there a "Download PDF" button on the LP account page? Verify. |
| Quarterly report in LP portal | LPs receive the same quarterly report the GP produces | LOW | Quarterly report PDF exists in /reports. Is it linked from the LP document center after GP distributes it? Verify. |
| LP performance page — fund-by-fund breakdown | LPs in multiple funds want to see performance per fund, not just rolled up | MEDIUM | LP dashboard shows commitments by entity. Performance metrics per entity are not broken out. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| LP-to-GP messaging / chat | "I have a question about this distribution" | Creates an unmanaged communication channel that bypasses email; creates compliance documentation issues | Direct LP to email the GP; link GP contact info clearly in portal |
| LP customizable dashboard | "I want to reorder these sections" | Highly complex for no material benefit; family office LPs with 1-10 investments don't need customization | Well-organized fixed layout is fine; focus on data accuracy over layout flexibility |
| LP access to portfolio company data | "Can I see the underlying assets?" | LP visibility into portfolio assets is a fund-by-fund legal question; default should be no | Provide asset class exposure (%) only, not individual asset names and financials |

### V1 Gaps Likely to Frustrate Real Users

1. **Capital account statement may not have a period picker.** Without date filtering, the statement is a dump of all time — useless for quarterly reporting.
2. **LP document center may not filter by category.** With 20+ documents, LPs can't find their K-1s without a filter.
3. **LP performance per entity is not broken out.** An LP committed to three funds needs per-entity IRR, not just a rolled-up number.
4. **No K-1 acknowledgment.** GPs need confirmation that LPs received their tax documents. A simple "acknowledged on [date]" checkbox closes this loop.
5. **LP notification center may only show in-app bells.** Email/SMS delivery is wired for IMMEDIATE preference but actual delivery depends on Resend/Twilio credentials being active in production.

---

## MODULE 6: GP Dashboard

### What's Built
Entity cards with NAV, portfolio aggregates, LP comparison view, top/bottom performers, capital deployment tracker, recent activity feed.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AUM + NAV + IRR at the top — always visible | The single most important metrics for a GP; should not require scrolling | LOW | PortfolioAggregates component exists. Verify total AUM, total NAV, and blended IRR are in the top section. |
| Entity cards — quick-action buttons | "Create capital call for Fund I" without navigating to the entity first | LOW | EntityCard component exists. Verify it has quick links (or buttons) to capital calls, distributions. |
| Recent activity feed — filterable | 50-item activity stream with no filter is noise | LOW | RecentActivityFeed component exists. Verify it has type/entity filter. |
| Deal pipeline summary | "3 in DD, 1 in IC, $120M in pipeline" — GP needs pipeline at a glance on the home screen | LOW | Not visible on dashboard currently. Deal counts by stage should appear on the dashboard. |
| Overdue items widget | Capital calls overdue, tasks overdue, covenants in breach — all surfaced in one place | MEDIUM | Not present. A "needs attention" section would prevent the GP from having to drill into each module to find problems. |
| Top performers widget — linked to asset pages | Click through from "top performer" directly to asset detail | LOW | TopBottomPerformers component exists. Verify asset names are linked to /assets/[id]. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Needs attention" alerts section | Capital calls overdue, covenants in breach, documents expiring — GP acts from one screen | MEDIUM | Would aggregate overdue capital calls, covenant breaches, lease expirations. High value, non-trivial to build. |
| Deal pipeline value by stage | "$45M in Due Diligence" — shows where capital is committed but not yet deployed | LOW | Deal list shows deals. Aggregate deal target amounts by stage is a computed view not currently on dashboard. |
| LP comparison view | Which LPs are performing best across commitments — useful for planning future raises | LOW | LPComparisonView component exists. Verify it renders meaningful data (LP name, total committed, IRR comparison). |
| Quarterly narrative prompt | "It's Q4 — time to draft your quarterly letter. Here's a summary to start with." | MEDIUM | AI service exists. A quarterly letter drafting assist would be a strong differentiator. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time refresh / auto-polling on all dashboard cards | Feels dynamic | Expensive; data doesn't change in real-time for a fund admin platform; burns API credits | SWR revalidation on focus (stale-while-revalidate) is sufficient; add a manual refresh button |
| Per-GP-user personalized dashboard | "I want my own view" | For a 3-person team, personalization adds complexity with no real benefit | Shared dashboard with well-organized sections for the whole team |

### V1 Gaps Likely to Frustrate Real Users

1. **Dashboard does not show deal pipeline summary.** The GP landing page should answer "what's in my pipeline?" without clicking to /deals.
2. **No "needs attention" section.** Overdue capital calls and covenant breaches live in separate modules. There is no aggregated alert surface.
3. **Activity feed may be all-entity with no filter.** For a GP managing 9 entities, all events in one stream is noise.
4. **Entity cards may lack quick links.** Navigating Fund I → Capital Calls requires 3 clicks; a "New Call" button on the entity card would save repeated navigation.

---

## MODULE 7: Accounting

### What's Built
QBO OAuth per entity (UI only — no real API), account mapping panel, trial balance view, two-layer NAV computation, entity-level accounting tab.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real QBO OAuth flow | Accounting is the stated core workflow; UI-only connection is a placeholder, not a feature | HIGH | Currently UI-only. QBO OAuth requires clientId/secret, redirect handler, token storage with encryption. This is the most critical accounting gap. |
| Account mapping — map Atlas account types to QBO accounts | Without mapping, trial balance pull has no meaning | MEDIUM | AccountMappingPanel component exists. Verify mapping UI works: list QBO chart of accounts, allow assigning Atlas account types. |
| Trial balance display — last synced date | GPs need to know when data was last pulled | LOW | TrialBalanceView component exists. Verify last sync timestamp is visible and accurate. |
| NAV reconciliation | Side-by-side: "Atlas NAV says $X, QBO says $Y — difference: $Z" | MEDIUM | Two-layer NAV exists. NAV reconciliation between Atlas-computed NAV and QBO-derived NAV is not surfaced explicitly as a comparison. |
| Sync error messaging | When QBO sync fails, GP needs actionable error info | LOW | SyncStatus field (CONNECTED/DISCONNECTED/ERROR) exists. Verify error state shows a human-readable message and a reconnect CTA. |
| Per-entity sync status at a glance | GP has 9 entities; needs to see which are connected, syncing, or erroring | LOW | Entity accounting tab exists per entity. A global accounting page (/accounting) should show all entities and their sync status. Verify. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Automatic journal entry creation from capital calls | When a capital call is issued, create the corresponding QBO journal entry | HIGH | Would require real QBO API integration + journal entry write access. High value but depends on real OAuth first. |
| Chart of accounts auto-mapping suggestions | AI-assisted "this QBO account looks like it maps to Atlas: accrued fees" | MEDIUM | AI service exists. Auto-map suggestion based on account name pattern matching would save significant manual work. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Consolidated multi-entity accounting view | "Give me a combined P&L" | Accounting consolidation requires elimination entries; a hard accounting problem requiring CPA guidance | Show entity-level trial balances; let the CPA consolidate externally |
| Replacing QBO/Xero entirely | "Why not keep books in Atlas?" | Full general ledger is a massive accounting product; well outside Atlas's mandate | Atlas is a fund admin layer on top of QBO/Xero, not a replacement |

### V1 Gaps Likely to Frustrate Real Users

1. **QBO OAuth is not real.** This is the single biggest accounting gap. Until it works, the accounting module is decorative.
2. **Account mapping may have no QBO account list to map from.** Without a live QBO connection, there's nothing to map to.
3. **NAV reconciliation gap is invisible.** When Atlas NAV and QBO NAV diverge, there's no flag alerting the GP.

---

## MODULE 8: Reports

### What's Built
Quarterly report PDF (4-page), capital account statement PDF, fund summary one-pager PDF, Excel export on all tables, K-1 upload and distribution.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Report date range / period selection | "Generate Q3 2025 quarterly report" requires explicit period selection | LOW | Entity and period pickers exist in reports/page.tsx. Verify period date range (start/end or quarter selector) is working. |
| Report preview before download | GPs want to see the output before sending to LPs | MEDIUM | Currently generates and immediately downloads. A preview modal (PDF inline) would prevent sending bad reports. |
| Report delivery to specific LPs | "Send this quarterly report to all LPs in Fund I" — not just download | MEDIUM | K-1 distribution exists per-LP. General report delivery (email quarterly report to LP list) is not found. |
| Report history — regenerate | "Regenerate Q2 2025 report" — GPs need to reproduce prior reports | LOW | Reports are generated on-demand. No history of generated reports per entity per period. |
| Excel export — all tables | Standard expectation for financial professionals | LOW | ExportButton component exists in the codebase. Verify it works on all major tables (deals, assets, capital calls, distributions, capital accounts). |
| K-1 upload per investor per entity | Tax prep workflow; each LP gets their own K-1 | LOW | K-1 model exists. K-1 upload/distribution per LP is built. Verify the upload flow works and LP can see/download theirs. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Report templates — customizable cover letter | GP branding on the quarterly report (logo, letter content) | MEDIUM | @react-pdf/renderer is available. Adding a cover page with GP-supplied text and logo would be a strong differentiator. |
| Bulk report generation — all entities at once | "Generate Q4 reports for all 9 entities in one click" | MEDIUM | Currently per-entity. Bulk generation loop with status tracking would save significant time at quarter end. |
| AI-generated quarterly narrative | "Summarize this quarter's fund performance in 3 paragraphs" to pre-fill the GP letter | MEDIUM | AI service exists. A GPT/Claude prompt against entity metrics + capital events + asset performance would produce a draft narrative. |
| Distribution notice PDF generation | Formal notice with per-LP amounts and bank wire instructions | MEDIUM | No distribution notice PDF found. This is a standard fund admin deliverable alongside capital account statements. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated K-1 generation from tax data | Natural extension of K-1 upload | Explicitly out of scope per PROJECT.md; requires CPA-certified tax logic | K-1 upload only — let the tax preparer generate it externally |
| SEC-formatted regulatory filings (Form D, etc.) | Seems like report generation | Regulatory filings require legal sign-off; not a safe area to automate | Track filing status manually; link to filed documents in entity regulatory tab |

### V1 Gaps Likely to Frustrate Real Users

1. **No report preview.** Generating a bad report and downloading it before seeing it wastes time and risks sending incorrect data to LPs.
2. **No report history per entity.** GPs need to reproduce prior-period reports; without a history, they have to re-generate from scratch.
3. **No bulk generation.** Quarter-end for a 9-entity GP means 9 separate report generations manually.
4. **No report delivery flow.** The GP generates a PDF but there's no in-product way to send it to the relevant LPs.

---

## MODULE 9: Settings & Integrations

### What's Built
AI config (provider/model/API key), DD category templates, prompt templates editor, DocuSign status UI, Asana task sync, Notion note export, Plaid bank connection, Google Calendar meeting sync, Slack IC voting, service provider user management, RBAC permissions tab.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Active/inactive state for all integrations | GPs need to see at a glance what's live vs. not configured | LOW | Integration status UI exists for some. A unified integrations page showing all 7 integrations with green/red status is expected. |
| Service provider access — scoped by entity | CPA should see Fund I and Fund II, not Fund III | LOW | User.entityAccess[] exists. ServiceProviderManager component exists. Verify entity scoping UI works in settings. |
| Service provider access — expiry date | Time-bound access for external parties is standard | LOW | ServiceProviderManager component. Does it support setting an expiry date on access? Verify. |
| AI config — test connection button | GPs need confidence their API key works before relying on AI features | LOW | AI config form exists. A "Test" button that pings the AI provider is standard. Not found. |
| User invite / remove workflow | Adding a new GP team member or removing a departed one | LOW | CreateUserForm exists. Verify the full invite + role-assign flow works without Clerk dashboard access. |
| Notification preferences — per GP user | GPs want capital call notifications too, not just LPs | LOW | InvestorNotificationPreference model is LP-centric. GP user notification preferences (which events trigger email to GP team) are not found. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Slack IC voting — actual live test | Slack integration code exists (245 lines). Getting this working end-to-end would be a genuine differentiator. | MEDIUM | Code is written, untested. Needs Slack app setup instructions in settings UI, plus end-to-end test. |
| DocuSign — live envelope tracking | See which signing packages are awaiting signatures, who has signed | MEDIUM | DocuSign status UI exists. Real OAuth and webhook processing would surface live envelope status. |
| Asana task sync — bi-directional | DD tasks created in Atlas show up in Asana; completed in Asana reflects in Atlas | HIGH | Asana sync code exists. Bi-directional sync requires webhook from Asana back to Atlas. Complex. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| White-labeling / custom branding | "Put my firm's logo everywhere" | Explicitly out of scope per PROJECT.md | Add firm name to report headers; this is sufficient for internal tools |
| SSO for LPs | "Use our corporate SSO" | Complex for 10 LPs; Clerk supports SSO but requires SAML setup per organization | Clerk email-based auth is sufficient at this LP count; revisit at 50+ LPs |

---

## Cross-Module Feature Analysis

### Universal Polish Gaps (Apply to Every Module)

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Empty state design | Every list page should have an illustrated/text empty state with a CTA when no data exists | LOW |
| Loading skeleton instead of "Loading..." text | Tables flashing from empty to populated is jarring; skeletons feel polished | LOW |
| Consistent table column sorting | Financial professionals sort tables constantly; all list tables should support column sorting | LOW |
| Mobile responsive layout | "Check a number while traveling" is a real GP use case | MEDIUM |
| Keyboard navigation in forms | Tab through form fields, Enter to submit | LOW |
| Confirm before delete on all destructive actions | ConfirmDialog exists; verify it's used everywhere data is deleted | LOW |
| Date formatting consistency | Mix of "Jan 5, 2025", "2025-01-05", "1/5/25" creates confusion | LOW |
| Number formatting consistency | "$1.5M" vs "$1,500,000" — use fmt() utility consistently everywhere | LOW |

---

## Feature Dependencies

```
Real QBO OAuth
    └──enables──> Account Mapping (can't map without live chart of accounts)
                    └──enables──> Trial Balance Sync
                                    └──enables──> NAV Reconciliation

Valuation history (per asset)
    └──enables──> NAV computation (entity-level)
                    └──enables──> LP performance metrics (accurate)
                                    └──enables──> LP portal credibility

Capital call status advancement (DRAFT→ISSUED→FUNDED)
    └──enables──> Overdue call detection
                    └──enables──> Overdue alerts on dashboard

Asset exit workflow
    └──enables──> Final MOIC / IRR computation
                    └──enables──> Accurate fund-level DPI computation

Side letter rules
    └──enhances──> Fee calculation (per-LP adjusted fees)
                └──enhances──> Distribution line items (per-LP net amounts)

Deal IC memo
    └──enhances──> Reports (IC memo content can appear in quarterly report)
```

### Dependency Notes

- **QBO OAuth requires real credentials:** Until QBO OAuth is live, account mapping, trial balance, and NAV reconciliation are decorative. This is the accounting module's critical path.
- **Asset valuation accuracy drives LP metrics:** LP portal IRR/TVPI/RVPI/DPI are only as accurate as the valuations entered. Valuation discipline (draft vs. approved states) matters.
- **Capital call status is prerequisite for overdue alerts:** The dashboard "needs attention" section depends on capital call status being actively maintained.

---

## MVP Definition (for v1.1 Polish Pass)

### Must Have — Fix Before Real User Adoption

- [ ] Capital call status advancement buttons (Mark as Issued / Mark as Funded) in UI
- [ ] Distribution approval + mark-paid buttons in UI
- [ ] Asset exit workflow (modal with exit date, exit proceeds, final MOIC calculation)
- [ ] Deal age / days-in-stage metric on kanban cards
- [ ] Deal → Asset link visible on closed deal page ("View Asset")
- [ ] Empty states on all list pages with actionable CTAs
- [ ] Loading skeletons replacing "Loading..." text on major tables
- [ ] Overdue capital call visual indicator in capital activity view
- [ ] LP document center — category filter
- [ ] LP capital account — period/date range picker

### Should Have — Polish Pass

- [ ] Deal kanban — stage totals (deal count + aggregate deal size per column)
- [ ] Deal IC memo PDF export
- [ ] Dead deal — reason capture and display in pipeline analytics
- [ ] Asset list column sorting
- [ ] Holding type–adaptive UI on asset detail (hide irrelevant controls for LP positions)
- [ ] Covenant breach surfacing at portfolio level (cross-asset covenant monitor)
- [ ] Lease expiry forward visibility (90/180 days)
- [ ] Entity parent-child hierarchy on entity list
- [ ] Report preview before download
- [ ] Unified integration status page (all 7 integrations with green/red status)
- [ ] GP notification preferences (GP team gets capital call / distribution alerts too)
- [ ] Dashboard — deal pipeline summary section
- [ ] Dashboard — "needs attention" alerts section (overdue calls, covenant breaches)

### Future Consideration (v2+)

- [ ] Real QBO OAuth — major engineering investment, architectural dependency
- [ ] Distribution notice PDF generation
- [ ] Bulk report generation at quarter-end
- [ ] Report delivery to LP email list
- [ ] Bi-directional Asana task sync
- [ ] AI quarterly narrative draft
- [ ] Meeting transcript → deal/asset note workflow (Fireflies model exists, no webhook)
- [ ] Fundraising pipeline end-to-end workflow (FundraisingProspect track + convert)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Capital call status buttons | HIGH | LOW | P1 |
| Distribution approval buttons | HIGH | LOW | P1 |
| Asset exit workflow | HIGH | MEDIUM | P1 |
| Deal days-in-stage metric | HIGH | LOW | P1 |
| Empty states + loading skeletons | HIGH | LOW | P1 |
| LP document category filter | HIGH | LOW | P1 |
| LP account period picker | HIGH | LOW | P1 |
| Deal kanban stage totals | MEDIUM | LOW | P1 |
| Deal → Asset navigation link | MEDIUM | LOW | P1 |
| Asset list column sorting | MEDIUM | LOW | P2 |
| Holding type–adaptive asset UI | MEDIUM | MEDIUM | P2 |
| Covenant portfolio-level monitor | HIGH | MEDIUM | P2 |
| Lease expiry forward view | MEDIUM | LOW | P2 |
| IC memo PDF export | MEDIUM | MEDIUM | P2 |
| Dashboard deal pipeline summary | HIGH | LOW | P2 |
| Dashboard needs-attention section | HIGH | MEDIUM | P2 |
| Entity hierarchy on entity list | MEDIUM | LOW | P2 |
| Report preview | MEDIUM | MEDIUM | P2 |
| Unified integrations status page | MEDIUM | LOW | P2 |
| GP notification preferences | MEDIUM | LOW | P2 |
| Real QBO OAuth | HIGH | HIGH | P3 |
| Distribution notice PDF | MEDIUM | HIGH | P3 |
| Bulk report generation | MEDIUM | MEDIUM | P3 |
| Report delivery to LPs | MEDIUM | HIGH | P3 |
| AI quarterly narrative | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for real-user adoption — fix in v1.1
- P2: Strong polish pass — do after P1
- P3: Deferred — future consideration

---

## Sources

- Direct codebase audit: all 57 Prisma models, 73 API routes, 33 pages, prior phase verification reports (phases 01-10)
- `.planning/AUDIT.md` — honest scorecard with known gaps
- `.planning/ARCHITECTURE.md` — entity structure, contract-level detail, RBAC
- `.planning/DATA-MODEL.md` — full model and API route reference
- `.planning/UI-GUIDE.md` — component inventory and step-by-step test workflows
- Industry baseline: Juniper Square, Allvue, Carta LP portal patterns (MEDIUM confidence — training data, not verified against current products)

---
*Feature research for: Atlas family office fund administration platform — v1.1 module deep pass*
*Researched: 2026-03-08*
