# Phase 2: Deal Desk End-to-End - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Perfect the full deal lifecycle from screening through closing and deal-to-asset transition. This is the GP team's primary daily workflow. Includes: deal creation with validation, AI-powered overview dashboard, interactive DD workstreams, decision-making structures (IC), closing checklist with attachments, multi-entity deal participation, entity formation at any stage, deal-to-asset transition with data carry-over, pipeline analytics, kill/revive deal flow.

</domain>

<decisions>
## Implementation Decisions

### Deal Creation Wizard
- Keep the 2-step wizard: Step 1 (identity), Step 2 (materials)
- Required fields: Name + Asset Class only (minimal friction)
- Step 2: At least 1 document required (enforces discipline)
- Keep existing two-path flow: "Create Deal" and "Create & Screen"
- Validation errors: Both inline under each field AND a toast summary listing all errors
- Add "Participation Structure" dropdown to Step 1 (GP/Direct, LP/Passive, Co-GP, Co-Invest, JV Partner)
- Add "Deal Source" as optional field (Referral, Direct, Broker, etc.)
- Counterparty: pick from existing companies + create inline (like entity creation in close modal)
- Deal lead defaults to current user (can be changed)
- AI auto-extracts structured deal metadata (size, target return, terms, structure) from uploaded docs during screening — populates overview fields automatically

### Deal Overview Dashboard
- Redesign overview tab as a deal dashboard with 4 sections:
  1. **Header card** — Name, size, asset class, participation structure, AI score, current stage, deal lead
  2. **Key metrics** — Target return, projected cash flow (when extractable from docs)
  3. **IC Memo summary** — Executive summary excerpt from latest memo version + "Read full memo" link
  4. **Deal terms** — AI-extracted structured terms, organized differently per asset class (RE: property type/location/cap rate, Credit: principal/rate/maturity/covenants, etc.)
- Fields are AI-populated where possible, user corrects/edits
- No status snapshot section (stage bar already shows this)

### DD Workstreams — Interactive Project Management Style
- Workstream categories: Fixed templates per combination of asset class + participation structure + equity/debt
- Each workstream item functions like a project management task (Asana/Notion/Monday style):
  - Assignee (defaults to deal lead)
  - Status: Open → In Progress → Resolved
  - Due date (optional)
  - Priority (High/Medium/Low)
  - Threaded comments (GP adds findings, notes, back-and-forth)
  - File attachments per item
- Display as list view (not board/kanban) within each workstream
- Re-analysis: On-demand per workstream — GP adds findings, clicks "Re-analyze" when ready
- Analysis persists in background regardless of where user navigates
- When a workstream is re-analyzed, IC Memo auto-updates (new version created)
- IC Memo keeps version history (v1, v2, v3...) — existing version selector stays connected

### IC Review — Decision-Making Structures
- Full implementation of configurable decision-making structures (called "IC" for shorthand)
- Settings page (repurpose existing GP Firm settings) defines structures:
  - Who votes (member list)
  - Quorum requirement (how many votes needed)
  - Approval threshold
- Each entity is linked to a decision-making structure
- Structures vary: single person (personal investment), client approval, trustee, foundation board, fund IC
- When deal goes to IC Review, Atlas enforces the structure linked to the investing entity
- Voting: Both Slack AND in-app Atlas IC Review tab — votes sync regardless of source
- Vote options: Approve, Reject, Send Back
- Votes can include conditions (text note, e.g., "contingent on side letter review")
- Conditions displayed on IC tab but do NOT auto-create closing checklist items (manual)
- Send Back: deal moves back to DUE_DILIGENCE with reason recorded

### Closing Checklist
- Warn only if incomplete items (allow override) — don't block closing
- Flat list, no dependencies or ordering — any item can be completed in any order
- GP can add custom items beyond the template
- Assignable to anyone with Atlas access (GP team + future service providers)
- Claude reviews and adjusts template items to focus on transactional closing mechanics (not DD items like title search)
- Silent updates — no notifications when items are completed
- Show closing checklist progress (%) on deal cards in the pipeline Closing column
- Per-item file attachments (using existing Vercel Blob upload pattern)

### Entity Formation & Multi-Entity Deals
- Entity creation available at any deal stage (not locked to closing) — DealEntitySection visible always
- A deal can be linked to multiple entities (junction table, not single FK)
- Multi-entity allocation with %: set preliminary allocation early (during DD/IC), finalize at close
- Close deal modal already has multi-entity allocation UI — extend deal detail to show multi-entity throughout
- Formation checklist stays on entity's own page (separate from deal closing checklist)
- Deal entity section shows formation status badge
- Capital allocation/readiness checks deferred to Phase 3

### Asset Detail After Close
- Auto-redirect to new asset after closing
- Asset detail shows "Originated from: [Deal Name]" link back to source deal
- Everything from the deal carries over to asset: cost basis, fair value, asset class, all AI-extracted metadata, linked documents, counterparty info, deal notes
- Asset type-specific tabs (RE, Credit, Equity, Fund LP) auto-populate from DD analysis data
- Focus on making the deal-to-asset transition seamless

### Kill Deal Flow
- Kill reason required (dropdown: Pricing, Risk, Timing, Sponsor, Other + free text)
- Killed deals hidden from pipeline board (separate "Dead Deals" view, not collapsed column)
- Revive deal: returns to the stage it was at when killed
- All deal data preserved on kill (documents, analysis, notes, activity)

### Pipeline Analytics
- Summary cards on deals page (above board) — richer than current
- Separate dedicated analytics page for deep-dive
- Metrics to include:
  - Pipeline value by stage (total $ in each column)
  - Time-in-stage tracking (average days per stage, bottleneck identification)
  - Deal velocity / throughput (deals closed per period, average time screening→close)
  - Conversion rates (already exist, keep them)
  - Active/Closed/Dead counts (already exist, keep them)

### Inline Edit Fields
- DEAL-05: Ensure InlineEditField saves reliably on blur/Enter
- Claude decides: inline editable vs edit-button approach based on field types

### Claude's Discretion
- Exact layout/spacing of deal dashboard sections
- Inline edit vs edit-button per field type
- Closing template items (review and adjust for transactional mechanics)
- Formation status badge design (summary vs label)
- Analytics chart types and layout
- Background analysis persistence implementation approach
- Participation structure dropdown options (exact list based on PE/family office conventions)
- Kill reason dropdown options

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CreateDealWizard** (`src/components/features/deals/create-deal-wizard.tsx`): 2-step modal wizard with file upload, entity linking, and "Create & Screen" path. Base for validation improvements.
- **CloseDealModal** (`src/components/features/deals/close-deal-modal.tsx`): Multi-entity allocation UI with % ↔ $ conversion, entity creation inline. Extend for multi-entity throughout deal lifecycle.
- **DealClosingTab** (`src/components/features/deals/deal-closing-tab.tsx`): Expandable checklist with status, assignee, date, notes. Add file attachments and custom items.
- **InlineEditField** (`src/components/features/deals/inline-edit-field.tsx`): Blur-save, Enter/Escape, SWR revalidation. Ensure reliability.
- **DealEntitySection** (`src/components/features/deals/deal-entity-section.tsx`): Entity link/unlink/create inline. Extend for multi-entity and always-visible.
- **deal-stage-engine.ts** (`src/lib/deal-stage-engine.ts`): Stage transitions, closeDeal (creates asset + allocations), killDeal, sendToICReview, advanceToClosing. Core state machine.
- **closing-templates.ts**: Template definitions. Review and adjust for transactional mechanics.
- **formation-templates.ts**: 9-step formation checklist. Used when entities created with startFormation=true.

### Established Patterns
- **SWR data fetching**: All deal data fetched via useSWR with firmId scoping
- **Zod validation**: API routes use parseBody(req, ZodSchema)
- **File upload**: FormData → Vercel Blob → document record pattern
- **Toast notifications**: useToast() (never destructure)
- **Modal pattern**: Multi-step modals with form state management
- **Activity logging**: DealActivity records on all stage transitions
- **Sliding window concurrency**: AI analysis uses 4-way parallel processing

### Integration Points
- **Deal → Asset**: closeDeal() creates Asset + AssetEntityAllocation + moves documents. Need to also carry over AI-extracted metadata.
- **Deal → Entity**: deal.targetEntityId (single FK) → needs junction table for multi-entity
- **Deal → IC**: ICProcess + ICVoteRecord models. Slack integration via src/lib/slack.ts. Need in-app voting UI.
- **Deal → AI**: screening creates workstreams, DD analysis per workstream, IC Memo generation. Workstream items need task-like properties.
- **Settings page**: Currently minimal. Repurpose for decision-making structures.

</code_context>

<specifics>
## Specific Ideas

- Deal overview should feel like a "deal dashboard" — not a form, not a wall of text
- DD workstreams should feel like Asana/Notion/Monday — task-based with assignees, statuses, comments, attachments
- AI extracts deal metadata from uploaded docs and populates overview fields — user corrects rather than enters
- "Participation structure" means level of control (GP/Direct, LP/Passive, Co-GP, Co-Invest, JV)
- Decision-making structures (IC) are configurable per entity — reflects real-world variety (personal decisions, client approvals, board votes, committee votes)
- Command bar (Cmd+K) is the AI chatbot — already site-wide, already contextual. Deeper chat/Q&A is a future enhancement, not Phase 2.

</specifics>

<deferred>
## Deferred Ideas

- **DocuSign integration for closing** — Signature requests from closing checklist items. INTEG-02, Phase 7.
- **Dropbox folder creation** — Auto-create a Dropbox folder for active assets at closing. New integration, not in roadmap yet.
- **Capital readiness checks** — Warn at close if entity doesn't have enough committed capital. Phase 3 (Capital Activity).
- **Fundraising workflow** — Tracking LP commitments, subscription docs, capital readiness per entity. Phase 3+.
- **AI chatbot on deal pages** — Conversational AI for deal Q&A beyond command bar. Future enhancement.
- **Deal search & filtering** — Advanced search by name, asset class, date range, stage. Not discussed, potential Phase 4+.
- **Bulk deal actions** — Multi-select deals from pipeline for bulk stage changes. Not discussed.

</deferred>

---

*Phase: 02-deal-desk-end-to-end*
*Context gathered: 2026-03-06*
