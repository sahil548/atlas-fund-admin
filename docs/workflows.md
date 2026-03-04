# Workflows Reference

Labeled step-by-step workflows for every user-facing flow in Atlas. Used by `/test-workflow` to systematically verify each flow.

---

## Deal Workflows

### DEAL-CREATE: Create a new deal (no screening)
1. Go to `/deals` → click "New Deal" button
2. Fill in: name, asset class, capital instrument, participation structure, entity, deal lead
3. Optionally fill: sector, target size, target return, counterparty, description, thesis
4. Upload at least one document
5. Click "Create Deal"
6. **Verify:** Lands on `/deals/[id]` in SCREENING stage
7. **Verify:** DD tab shows empty workstreams matching the asset class template
8. **Verify:** Overview tab shows "Run AI Screening" CTA

### DEAL-CREATE-SCREEN: Create and screen a deal (one-click)
1. Go to `/deals` → click "New Deal" button
2. Fill in deal details + upload documents
3. Click "Create & Screen"
4. **Verify:** Lands on `/deals/[id]` in DUE_DILIGENCE stage
5. **Verify:** AI auto-triggers — progress bar appears with workstream pills
6. **Verify:** Each workstream pill turns green as analysis completes
7. **Verify:** IC Memo section populates after all workstreams finish
8. **Verify:** "Generating..." badge clears when memo is fully rendered

### DEAL-SCREEN: Run AI screening on existing deal
1. Go to a deal in SCREENING stage (e.g., `/deals/[id]`)
2. Overview tab → click "Run AI Screening"
3. **Verify:** Stage advances to DUE_DILIGENCE
4. **Verify:** Progress bar appears with workstream pills
5. **Verify:** Workstream analyses complete one by one
6. **Verify:** IC Memo generates after all analyses finish
7. **Verify:** Switch to DD tab and back — progress persists (no reset)

### DEAL-SEND-IC: Send deal to IC Review
1. Go to a deal in DUE_DILIGENCE stage
2. Click "Send to IC Review" button
3. If DD is incomplete → warning appears, can force with "Send Anyway"
4. **Verify:** Stage advances to IC_REVIEW
5. **Verify:** IC Review tab appears in tab bar
6. **Verify:** Activity log shows stage transition entry

### DEAL-IC-DECISION: Record IC decision
1. Go to a deal in IC_REVIEW stage → IC Review tab
2. View IC memo and workstream findings
3. Post IC questions (optional) → replies thread
4. Record decision: APPROVED, REJECTED, or SEND_BACK
5. **Verify (APPROVED):** "Advance to Closing" button appears
6. **Verify (REJECTED):** Deal stays in IC_REVIEW with rejection recorded
7. **Verify (SEND_BACK):** Deal returns to DUE_DILIGENCE

### DEAL-CLOSE: Close a deal
1. Go to a deal in CLOSING stage → Closing tab
2. Complete all closing checklist items (toggle each NOT_STARTED → COMPLETE)
3. Click "Close Deal"
4. **Verify:** Stage advances to CLOSED
5. **Verify:** Deal moves from pipeline kanban to "Closed Deals" section
6. **Verify:** Asset is created from the deal

### DEAL-KILL: Kill a deal
1. Go to any deal at any stage
2. Click "Kill Deal" button
3. Confirm in dialog
4. **Verify:** Stage changes to DEAD
5. **Verify:** Deal moves to "Dead Deals" section on `/deals`
6. **Verify:** Activity log shows kill entry

### DEAL-EDIT: Edit deal details
1. Go to `/deals/[id]` → click "Edit" button
2. Modal opens with all deal fields
3. Change fields → click Save
4. **Verify:** Changes reflected on deal page immediately
5. **Verify:** Activity log shows update entry

### DEAL-UPLOAD-DOC: Upload document to deal
1. Go to `/deals/[id]` → Documents tab
2. Click "+ Upload Document"
3. Select file, enter name, choose category
4. Click Upload
5. **Verify:** Document appears in list with correct category badge
6. **Verify:** File can be previewed by clicking the name

### DEAL-ADD-NOTE: Add note to deal
1. Go to `/deals/[id]` → Notes tab
2. Type note content
3. Click Add Note
4. **Verify:** Note appears with author name and timestamp

### DEAL-REGENERATE: Regenerate IC Memo
1. Go to a deal in DUE_DILIGENCE or later with existing analyses
2. Overview tab → click "Regenerate" button
3. **Verify:** Progress bar reappears, analyses re-run
4. **Verify:** IC Memo updates with new content
5. **Verify:** Previous version is preserved in version history

---

## Asset Workflows

### ASSET-BROWSE: Browse and filter assets
1. Go to `/assets`
2. See table of all assets with key metrics (FV, MOIC, IRR)
3. Click asset class filter pills to narrow view
4. **Verify:** Table filters to selected asset class
5. **Verify:** Clicking "All" shows all assets again

### ASSET-EDIT: Edit asset details
1. Go to `/assets/[id]` → click "Edit Asset"
2. Modal opens with asset fields
3. Change fields → Save
4. **Verify:** Changes reflected on asset detail page

### ASSET-VALUATION: Log a valuation
1. Go to `/assets/[id]` → Valuation tab
2. Click "+ Valuation"
3. Fill: date, method (DCF, Comparable, etc.), fair value
4. Save
5. **Verify:** Valuation appears in history table
6. **Verify:** Asset's Fair Value metric updates on overview

### ASSET-INCOME: Log income
1. Go to `/assets/[id]` → Overview tab → Cash Flows section
2. Click "+ Income"
3. Fill: date, amount, type (interest/dividend/rental/etc.)
4. Save
5. **Verify:** Income event appears in cash flows

### ASSET-TASK: Create asset task
1. Go to `/assets/[id]` → Tasks tab
2. Click "+ Task"
3. Fill: title, priority, assignee, due date
4. Save
5. **Verify:** Task appears on asset's Tasks tab
6. **Verify:** Task also appears on global `/tasks` page

### ASSET-UPLOAD-DOC: Upload document to asset
1. Go to `/assets/[id]` → Documents tab
2. Click "+ Document"
3. Select file, enter name, choose category
4. Save
5. **Verify:** Document appears in list

---

## Entity Workflows

### ENTITY-CREATE: Create a new entity
1. Go to `/entities` → click "+ Create Entity"
2. Fill: name, entity type, vintage year, jurisdiction
3. Optionally enable "Start Formation" checkbox
4. Save
5. **Verify:** Entity appears in table with FORMING status (if formation started)
6. **Verify:** Entity detail page shows Formation tab with task list

### ENTITY-FORMATION: Complete entity formation
1. Go to `/entities/[id]` → Formation tab
2. Check off each formation task (incorporation, legal docs, bank account, etc.)
3. When all complete → click "Mark as Formed"
4. **Verify:** Status changes to FORMED
5. **Verify:** Formation tab shows all items checked

### ENTITY-EDIT: Edit entity details
1. Go to `/entities/[id]` → click edit
2. Change fields → Save
3. **Verify:** Changes reflected on entity page

---

## Capital Workflows

### CAPITAL-CALL: Issue a capital call
1. Go to `/transactions` → Capital Calls tab → click "+ Capital Call"
2. Fill: entity, amount, call date, due date, purpose
3. Save as DRAFT
4. **Verify:** Capital call appears in table with DRAFT status
5. Mark as ISSUED when ready to notify LPs
6. **Verify:** Status updates, funded % starts at 0
7. As LPs fund → update status to FUNDED
8. **Verify:** Funded % progress bar fills

### CAPITAL-DISTRIBUTION: Record a distribution
1. Go to `/transactions` → Distributions tab → click "+ Distribution"
2. Fill: entity, date, gross amount, source, allocation breakdown (ROC, income, LT gain, carry)
3. Save as DRAFT
4. **Verify:** Distribution appears in table
5. Approve → mark PAID
6. **Verify:** Status updates to PAID

### CAPITAL-WATERFALL: Set up waterfall template
1. Go to `/transactions` → Waterfall Templates tab
2. Click "+ New Template" → enter name, description → Save
3. Click "+ Add Tier" → enter tier name, LP/GP splits, hurdle rate
4. Repeat for additional tiers
5. **Verify:** Template shows all tiers in correct order with split bars

---

## Investor / LP Workflows

### INVESTOR-CREATE: Register a new LP investor
1. Go to `/directory` → Investors tab → click "+ Add Investor"
2. Fill: name, investor type (Individual/Institutional), total committed, KYC status
3. Save
4. **Verify:** Investor appears in Investors table
5. **Verify:** Investor can be linked to entity commitments

### INVESTOR-EDIT: Edit investor profile
1. Go to `/directory` → Investors tab → click "Edit" on investor row
2. Change fields → Save
3. **Verify:** Changes reflected in table

### INVESTOR-LINK: Link contact/company to investor profile
1. Go to `/directory` → Contacts or Companies tab
2. Find a contact/company without an investor profile
3. Click "+ Add Investor Profile"
4. **Verify:** Contact/company now shows linked investor profile

---

## LP Portal Workflows

### LP-DASHBOARD: View LP dashboard
1. Go to `/lp-dashboard`
2. **Verify:** Shows welcome header with investor name
3. **Verify:** 4 stat cards: Total Committed, Called, Distributions, NAV
4. **Verify:** 4 performance metrics: Net IRR, TVPI, DPI, RVPI
5. **Verify:** Commitments by Entity table shows all commitments

### LP-PORTFOLIO: View portfolio look-through
1. Go to `/lp-portfolio`
2. **Verify:** Shows pro-rata exposure to underlying assets
3. **Verify:** Each asset shows class badge, value, ownership %, MOIC

### LP-DOCUMENTS: View LP documents
1. Go to `/lp-documents`
2. **Verify:** Shows documents shared by GP (reports, statements, etc.)
3. **Verify:** Documents show entity association and category

### LP-ACTIVITY: View capital activity
1. Go to `/lp-activity`
2. **Verify:** Capital Calls section shows notices with amount, due date, status
3. **Verify:** Distributions section shows proceeds with breakdown (income, ROC, gain)

### LP-ACCOUNT: View capital account
1. Go to `/lp-account`
2. **Verify:** Shows period-ending statement
3. **Verify:** Line items: beginning balance, contributions, income, capital allocations, distributions, fees, ending balance
4. **Verify:** Color-coded by type (green=income, indigo=capital, gray=distributions)

---

## Document Workflows

### DOC-UPLOAD: Upload a document (global)
1. Go to `/documents` → click "+ Upload Document"
2. Select file, enter name, choose category
3. Optionally associate with entity, asset, or deal
4. Save
5. **Verify:** Document appears in list with category badge
6. **Verify:** Document appears on associated entity/asset/deal's Documents tab

### DOC-SEARCH: Find a document
1. Go to `/documents`
2. Use search box to search by name
3. Use date range filters to narrow by upload date
4. Click category pills to filter by type
5. **Verify:** Results update as filters are applied

### DOC-PREVIEW: Preview a document
1. Go to `/documents` or any Documents tab
2. Click document name
3. **Verify:** Preview modal opens
4. **Verify:** PDFs and images render inline
5. **Verify:** Other types show "Preview not available" with Download button

---

## Task Workflows

### TASK-CREATE: Create a task
1. Go to `/tasks` → click "+ New Task"
2. Fill: title, description, priority, assignee, due date
3. Save
4. **Verify:** Task appears in "All Tasks" and "My Tasks" (if assigned to current user)

### TASK-PROGRESS: Track task progress
1. Go to `/tasks` → "My Tasks" tab
2. Click status badge on a task to cycle: TODO → IN_PROGRESS → DONE
3. **Verify:** Badge color and label update
4. **Verify:** Task count updates in tab headers

### TASK-OVERDUE: Monitor overdue tasks
1. Go to `/tasks` → "Overdue" tab
2. **Verify:** Only shows tasks past due date that are not DONE
3. **Verify:** Count in tab header matches

---

## Meeting Workflows

### MEETING-LOG: Log a meeting
1. Go to `/meetings` → click "+ Log Meeting"
2. Fill: title, type, date, source (Manual/Fireflies/Zoom/Teams)
3. Optionally link to asset, deal, or entity
4. Add decisions and action items
5. Save
6. **Verify:** Meeting card appears in list with correct badges
7. **Verify:** Meeting appears on linked asset/deal/entity's Meetings tab

### MEETING-FILTER: Find meetings
1. Go to `/meetings`
2. Filter by meeting type dropdown
3. Filter by source dropdown
4. Search by title
5. **Verify:** Results update with applied filters

---

## Accounting Workflows

### ACCOUNTING-CONNECT: Connect entity to accounting provider
1. Go to `/accounting`
2. Find entity with no connection → click "Reconnect"
3. Complete OAuth flow with QBO or Xero
4. **Verify:** Entity shows CONNECTED status with green dot
5. **Verify:** Last sync timestamp appears

### ACCOUNTING-SYNC: Manually sync
1. Go to `/accounting`
2. Click "Sync" on a connected entity
3. **Verify:** Sync triggers, last sync time updates
4. **Verify:** Unreconciled items count refreshes

### ACCOUNTING-RECONNECT: Fix broken connection
1. Go to `/accounting`
2. Entity shows ERROR status with red dot
3. Click "Reconnect" → re-authenticate
4. **Verify:** Status returns to CONNECTED

---

## Settings Workflows

### SETTINGS-AI: Configure AI settings
1. Go to `/settings` → AI Configuration tab
2. Enter API key, select provider and model
3. Save
4. **Verify:** Key is saved (masked in UI)
5. **Verify:** AI features (screening, analysis) use new config

### SETTINGS-PIPELINE: Configure deal pipeline
1. Go to `/settings` → Deal Desk tab
2. Edit DD category templates — add/remove/reorder
3. Save
4. **Verify:** New deals get updated workstream templates

### SETTINGS-FIRM: Edit firm profile
1. Go to `/settings` → Firm Profile tab
2. Click Edit → change name or legal name
3. Save
4. **Verify:** Updated name appears in sidebar and firm selector

---

## Directory Workflows

### DIRECTORY-ADD-COMPANY: Add a company
1. Go to `/directory` → Companies tab → click "+ Add Company"
2. Fill: name, type (GP/LP/Counterparty/Service Provider), industry, website
3. Save
4. **Verify:** Company appears in table with correct type badge

### DIRECTORY-ADD-CONTACT: Add a contact
1. Go to `/directory` → Contacts tab → click "+ Add Contact"
2. Fill: first name, last name, email, phone, title, company (select), type
3. Save
4. **Verify:** Contact appears in table linked to company
