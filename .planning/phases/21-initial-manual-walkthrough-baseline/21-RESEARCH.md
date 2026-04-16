# Phase 21: Initial Manual Walkthrough (Baseline) — Research

**Researched:** 2026-04-16
**Domain:** User-experience walkthrough scaffolding — scripts, capture templates, seed-data notes, triage framework
**Confidence:** HIGH (all findings sourced directly from project codebase, seed data, and planning docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Script structure:** Domain-clustered tour. GP order: Dashboard → Deal Desk → Assets → Entities → Capital Activity → Waterfall → Transactions → Cap Table → Directory/CRM → Tasks → Documents → Meetings → AI command bar → Settings. LP order: Dashboard → Positions/holdings → Capital activity history → Documents/K-1s → Notifications → Profile.
- **Coverage:** Prioritized (v2.1 new surface area + P22–P27 scope areas deepest; AI/Fireflies/notifications sampled).
- **Seed data:** Fresh `npx prisma db seed` before each session.
- **Cadence:** Solo-then-return, split into 2 sessions (GP then LP).
- **LP scope:** Two LP passes — one multi-vehicle LP + one single-vehicle LP, portal-only.
- **Triage rubric (ALL 3 must be TRUE for "urgent → v3.0"):** (1) materially blocks a real workflow, (2) fixable inside existing P22–27 scope or small P28 follow-up, (3) does NOT introduce new feature surface.
- **Bugs to re-verify in-flow:** DD tab 0%/NOT_STARTED on post-DD deals, pipeline pass rate 300%, IC memo spinner stuck.

### Claude's Discretion

- Exact checklist markdown format and per-domain question wording
- Whether to pre-populate the baseline files with empty section scaffolds or let them fill in during triage
- How to handle LP-user selection if Karen Miller isn't the best multi-vehicle candidate in the current seed
- Whether to include a small "screenshot expected/actual for each domain" checkbox

### Deferred Ideas (OUT OF SCOPE)

- Full screenshot capture / visual regression baseline
- SERVICE_PROVIDER role walkthrough
- Notification / K-1 acknowledgment flow exploration
- AI command bar deep-dive
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAN-01 | GP-side baseline walkthrough — output = `.planning/walkthroughs/v3.0-gp-baseline.md` + triaged feedback | GP route inventory, bug reproduction details, UI-GUIDE format, capture template, baseline skeleton |
| MAN-02 | LP-side baseline walkthrough — output = `.planning/walkthroughs/v3.0-lp-baseline.md` + triaged feedback | LP seed-data inventory, LP route inventory, capture template, baseline skeleton |
</phase_requirements>

---

## Overview

Phase 21 is a scaffolding phase, not a coding phase. Claude's job is to produce structured walkthrough scripts so Sahil (non-developer GP) can click through the app and a selected LP user can tour the portal. Feedback gets captured into two baseline markdown files consumed by Phases 22–27 planners.

Three key design decisions shape how the scaffolding must work: (1) the scripts use domain-clustered ordering matching how the GP already thinks about the app, not alphabetical or technical ordering; (2) coverage is explicitly prioritized — v2.1 CRUD and waterfall surfaces get the deepest probing, while AI/Fireflies/notifications are only sampled; (3) the triage happens in a follow-up paired session with Claude after the user finishes clicking, not inline during the walkthrough.

The downstream consumers are the Phase 22–27 planners. Every "urgent" item coming out of this phase must carry a concrete phase destination and a triage reason matching all three rubric tests. Non-urgent items get a one-line defer reason and land in the v3.1+ backlog.

**Primary recommendation:** Build two files — a GP walkthrough script and an LP walkthrough script — each pre-populated with empty capture blocks. User fills in the script during their solo session. Claude reviews during the return session and triages every comment into the two baseline output files.

---

## LP Seed-Data Inventory

### The 5 LP Users (from `prisma/seed.ts` lines 3033–3037)

All LP users are seeded via `UserProvider` (mock auth for local dev). None use Clerk in dev mode.

| User ID | Name | Email | Role | Investor Profile | Vehicles | Type |
|---------|------|-------|------|-----------------|----------|------|
| `user-lp-calpers` | Michael Chen | michael.chen@calpers.ca.gov | LP_INVESTOR | CalPERS (primary) | entity1, entity2, entity4, entity5, entity9 | **5-vehicle** |
| `user-lp-calpers2` | Sarah Wang | sarah.wang@calpers.ca.gov | LP_INVESTOR | CalPERS (viewer) | entity1, entity2, entity4, entity5, entity9 | **5-vehicle (viewer)** |
| `user-lp-harvard` | David Morrison | d.morrison@hmc.harvard.edu | LP_INVESTOR | Harvard Endowment (primary) | entity1, entity2, entity6 | **3-vehicle** |
| `user-lp-wellington` | Tom Wellington | tom@wellingtonfamily.com | LP_INVESTOR | Wellington Family Office (primary) | entity2, entity3, entity7 | **3-vehicle** |
| `user-lp-consultant` | Rachel Adams | rachel@meridianpartners.com | LP_INVESTOR | Meridian Partners FoF (primary) + CalPERS (viewer) | 4+5 vehicles across 2 investor profiles | **multi-investor** |

### Investor-Entity Commitment Map (from `prisma/seed.ts` lines 517–550)

| Investor (ID) | Name | Entities committed | Vehicle count |
|--------------|------|-------------------|--------------|
| investor-1 | CalPERS | entity1, entity2, entity4, entity5, entity9 | 5 |
| investor-2 | Harvard Endowment | entity1, entity2, entity6 | 3 |
| investor-3 | Wellington Family Office | entity2, entity3, entity7 | 3 |
| investor-4 | Meridian Partners FoF | entity1, entity2, entity4, entity8 | 4 |
| investor-5 | Pacific Rim Sovereign | entity2, entity3, entity7 | 3 |
| investor-6 | Greenfield Insurance | entity1, entity8 | 2 |

### Capital Call and Distribution Presence

From `prisma/seed.ts` lines 2516–2605:
- **CalPERS (investor1):** Active capital call line items (funded and pending) across multiple calls. Good test subject for capital activity history.
- **Wellington Family Office (investor3):** Has pending capital call line items; distributions present. Good for single-fund-focused view.
- **Greenfield Insurance (investor6):** Only 2 entities; only 2-vehicle. Closest to a "simple" LP but still technically multi-vehicle (no true single-vehicle LP seeded).

### Karen Miller Does NOT Exist in the Seed

"Karen Miller" does not appear anywhere in `prisma/seed.ts`. The CONTEXT.md correctly anticipates this with "pick whichever seeded LP has commitments in ≥2 vehicles."

### Recommendation: LP User Selection

**Multi-vehicle primary pass:** Use `user-lp-calpers` (Michael Chen, CalPERS). Rationale: 5 vehicles, active capital calls (both funded and pending), distributions, broadest data exposure, `primary` role (not viewer). This stresses the portal aggregation and multi-vehicle metric rollup most aggressively.

**"Single-vehicle" pass:** No true single-vehicle LP exists in the seed. **Use `user-lp-wellington` (Tom Wellington, Wellington Family Office) for the secondary pass.** Wellington has 3 vehicles but is a simpler family office with fewer data points than CalPERS, making the experience feel more like a "normal" LP without overwhelming data. Flag this limitation in the walkthrough metadata: the secondary pass is a "simpler LP" sanity check, not a true single-vehicle test.

**Alternative if Wellington feels too similar:** Use `user-lp-harvard` (David Morrison) — also 3-vehicle but Harvard Endowment data is distinct from Wellington's.

**Do not use `user-lp-consultant` (Rachel Adams):** She has access to 2 investor profiles (Meridian + CalPERS), which makes the portal behavior harder to interpret — save this edge case for Phase 28 final walkthrough.

---

## GP Route Inventory (Domain-Clustered)

Routes confirmed from `src/lib/routes.ts` (lines 23–49) and `src/app/(gp)/` directory listing.

Note on redirect routes (from CLAUDE.md): `/capital` → `/transactions`, `/waterfall` → `/transactions`, `/funds` → `/entities`. Do not navigate to these directly in the walkthrough script.

### 1. Dashboard
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/dashboard` | Yes | No | — | No (v2.0 core) |

Notes: Main entry point. Stat cards, pipeline overview, charts. No tabs. Confirm: stat cards render, charts load, KPI numbers look plausible.

### 2. Deal Desk
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/deals` (list) | Yes | No (filter pills only) | — | No (v2.0 core) |
| `/deals/[id]` (detail) | Yes | Yes — stage-dependent | Overview, Due Diligence, Documents, Notes, Activity, IC Review, Closing, Tasks, Co-Investors | CRUD-17 (DELETE_DEAL), BUG re-verify area |

Stage-dependent tabs (from `src/app/(gp)/deals/[id]/page.tsx` lines 70–122):
- SCREENING: Overview, Documents, Notes, Activity
- DUE_DILIGENCE: + Due Diligence, Tasks
- IC_REVIEW: + IC Review
- CLOSING: + Closing
- CLOSED / DEAD: Overview, Due Diligence, Documents, Notes, Activity, (IC Review if applicable), Co-Investors, Tasks

**v2.1 re-verify items here:** DD tab 0%/NOT_STARTED (BUG-01), IC Memo stuck spinner (BUG-03), pipeline pass rate 300% (BUG-02 — on deals list page).

**FIN-01 risk:** No meeting detail route exists yet (`/meetings/[id]` does not exist — `src/app/(gp)/meetings/` contains only `page.tsx`, no `[id]` sub-directory). Meeting links in the activity feed will 404. This is a known v3.0 gap — flag it explicitly when the user clicks any meeting link from the deal activity tab.

### 3. Assets
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/assets` (list) | Yes | No (filter pills only) | — | No |
| `/assets/[id]` (detail) | Yes | Yes | overview, contracts, performance, income, expenses, documents, tasks, activity | CRUD-01 (income), CRUD-02 (expenses), CRUD-03 (valuations) |

Tab IDs from `src/app/(gp)/assets/[id]/page.tsx` line 45:
`["overview", "contracts", "performance", "income", "expenses", "documents", "tasks", "activity"]`

**v2.1 high-risk tabs:** `income` (CRUD-01 inline edit + delete), `expenses` (CRUD-02 edit + delete), `performance` (CRUD-03 valuations).

### 4. Entities (Vehicles)
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/entities` (list) | Yes | No | — | CRUD-04 (create/edit/delete vehicles) |
| `/entities/[id]` (detail) | Yes | Yes | overview, capital, cap-table, waterfall, fundraising, compliance, operations, [formation — conditional] | CRUD-04–08, WF-01..26, UX-01..10 |

Tab IDs from `src/app/(gp)/entities/[id]/page.tsx` lines 26–52:
- Base tabs: `overview`, `capital`, `cap-table`, `waterfall`, `fundraising`, `compliance`, `operations`
- Conditional: `formation` (appears first if entity is in formation state)

**v2.1 highest-risk surface:** The `cap-table` and `waterfall` tabs on entity detail. Cap table: CRUD-08 (editable commitments, unit class assignment, UX-01..04). Waterfall: CRUD-05 through CRUD-07 (edit/delete templates, multiple templates per vehicle), CRUD-05/06/07 (tier editing), WF-01..26 (all waterfall math). This is the most critical area to probe.

### 5. Capital Activity (Transactions)
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/transactions` (main hub) | Yes | Yes | calls, distributions, waterfall | CRUD-09–12, UX-10, WF-20–26 |
| `/transactions/capital-calls/[id]` | Yes | No | — | CRUD-09 |
| `/transactions/distributions/[id]` | Yes | No | — | CRUD-11 |

Tab IDs from `src/app/(gp)/transactions/page.tsx` line 62:
`"calls" | "distributions" | "waterfall"`

**Waterfall tab** (within `/transactions`): This is the waterfall templates list + inline calculator. Distinct from the `waterfall` tab on the entity detail page. The calculator here is the one used to preview a distribution — WF-20 (debug panel), WF-21 (preview button), WF-23 (per-investor allocation table).

### 6. Directory / CRM
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/directory` | Yes | Yes | investors, companies, contacts, team, sideLetters | CRUD-13 (side letters), CRUD-14 (multiple investor profiles), CRUD-15 (duplicate handling), CRUD-16 (new investor types) |
| `/investors/[id]` | Yes | (detail page — tabs unknown, confirm at runtime) | — | CRUD-14, CRUD-16 |
| `/companies/[id]` | Yes | (detail page — tabs unknown) | — | — |
| `/contacts/:id` | Yes (route registered, hiddenFromSidebar=true) | — | — | CRUD-14 |

**v2.1 high-risk:** Directory > Investors tab: new investor types (CRUD-16), multiple investor profiles on a contact (CRUD-14). Directory > Side Letters tab (CRUD-13 edit form for side letters).

### 7. Tasks
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/tasks` | Yes | No | — | No |

### 8. Documents
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/documents` | Yes | No | — | No |

### 9. Meetings
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/meetings` (list) | Yes | No | — | FIN-01 gap (no detail page) |
| `/meetings/[id]` | **DOES NOT EXIST** | — | — | FIN-01 is the fix for this |

**Critical note:** Clicking any meeting card in the meetings list or any meeting link in an activity feed will 404. This is a documented v3.0 gap (FIN-01). The walkthrough must instruct the user to try clicking a meeting and report whether they get a 404 — this is the intended re-verification moment for FIN-01.

### 10. Analytics
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/analytics` | Yes | No | — | No |

### 11. Reports
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/reports` | Yes | No | — | No |

### 12. Accounting
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/accounting` | Yes | No | — | No (UI-only, no real OAuth) |

Note: Accounting is UI-only (no real QBO/Xero integration). The walkthrough should note this and not attempt to trigger a real sync.

### 13. Settings
| Route | Exists | Has Tabs | Tab IDs | v2.1 New Surface |
|-------|--------|----------|---------|-----------------|
| `/settings` | Yes | Yes | firm, users, integrations, gp, ai, dealdesk, decisions, notifications, permissions, service-providers | No |

Tab IDs from `src/app/(gp)/settings/page.tsx` line 61:
`"firm" | "users" | "integrations" | "gp" | "ai" | "dealdesk" | "decisions" | "notifications" | "permissions" | "service-providers"`

**RBAC-01..05 relevance:** The `permissions` and `users` tabs are relevant for Phase 24 scoping. The walkthrough should note what the current role enforcement UI looks like (even though enforcement is not yet implemented).

### 14. AI Command Bar
Accessed via keyboard shortcut or top bar — not a route. Sampled only per CONTEXT.md.

### Routes in CONTEXT.md Order vs Actual Routes
The CONTEXT.md domain order partially remaps to routes as follows:

| CONTEXT.md Domain | Actual Route(s) |
|------------------|-----------------|
| Dashboard | `/dashboard` |
| Deal Desk | `/deals`, `/deals/[id]` |
| Assets | `/assets`, `/assets/[id]` |
| Entities | `/entities`, `/entities/[id]` |
| Capital Activity (calls/distributions) | `/transactions` (calls + distributions tabs) |
| Waterfall | `/transactions` (waterfall tab) + `/entities/[id]` (waterfall tab) |
| Transactions | `/transactions` (same page, different tabs — planner should collapse "Capital Activity" and "Waterfall" and "Transactions" into one domain section covering all three tabs of `/transactions`) |
| Cap Table | `/entities/[id]` > cap-table tab |
| Directory/CRM | `/directory`, `/investors/[id]`, `/companies/[id]` |
| Tasks | `/tasks` |
| Documents | `/documents` |
| Meetings | `/meetings` (list only — no detail) |
| AI command bar | Keyboard / top bar |
| Settings | `/settings` |

---

## LP Route Inventory (Domain-Clustered)

Routes confirmed from `src/lib/routes.ts` (lines 42–48) and `src/app/(lp)/` directory listing.

| CONTEXT.md LP Domain | Route | Exists | Notes |
|---------------------|-------|--------|-------|
| LP Dashboard | `/lp-dashboard` | Yes | Stat cards, commitments table. No tabs. |
| Positions/Holdings | `/lp-portfolio` | Yes | Pro-rata asset exposure with class badges. No tabs. |
| Capital Activity History | `/lp-activity` | Yes | Capital calls with status, distributions with breakdown. No tabs. |
| Documents/K-1s | `/lp-documents` | Yes | GP-shared documents with entity and category. No tabs. |
| Notifications | `/lp-settings` | Yes | Settings page includes notification preferences. No standalone notifications route in LP. |
| Profile | `/lp-profile` | Yes | LP investor profile and contact information. |

**Additional LP route in sidebar:** `/lp-account` (Capital Account statement — period statement with color-coded line items). This is registered in routes.ts but not in the CONTEXT.md LP domain order. The planner should decide where to insert it — recommend inserting between "Positions/Holdings" and "Capital Activity History" since it shows the capital account statement.

**Note:** There is no standalone "Notifications" page for LPs. Notification preferences live in `/lp-settings`. The walkthrough should visit `/lp-settings` when the CONTEXT.md says "Notifications."

### LP Sidebar Navigation (from routes.ts, priority order)
1. `/lp-dashboard` — My Overview (priority 70)
2. `/lp-account` — Capital Account (priority 68)
3. `/lp-portfolio` — LP Portfolio (priority 66)
4. `/lp-activity` — Notices & Activity (priority 64)
5. `/lp-documents` — Documents (priority 62)
6. `/lp-settings` — Settings (priority 58)
7. `/lp-profile` — Profile (priority 56, sidebar icon visible)

---

## v2.1 High-Risk Surface Map

The walkthrough must stress-test these surfaces most deeply. All are from `v2.1-REQUIREMENTS.md`.

### CRUD — Edit/Delete (highest risk: zero E2E coverage, shipped off-GSD)

| Req | Behavior | Where to test | Interaction |
|-----|----------|---------------|-------------|
| CRUD-01 | Income entries: inline edit + delete | `/assets/[id]` > income tab | Click pencil on an income entry, change amount, save. Then delete one entry. |
| CRUD-02 | Expense entries: edit + delete | `/assets/[id]` > expenses tab | Same pattern as CRUD-01. |
| CRUD-03 | Valuations: edit + delete | `/assets/[id]` > performance tab | Click a valuation, edit fair value, save. Delete a valuation. |
| CRUD-04 | Vehicles: create, edit, delete | `/entities` list page | Create a test entity, edit its name, delete it. |
| CRUD-05 | Waterfall templates: edit + delete | `/entities/[id]` > waterfall tab | Edit a template name, delete a template. Verify list updates. |
| CRUD-06 | Waterfall tiers: edit + delete | `/entities/[id]` > waterfall tab > open a template | Edit a tier split %, delete a tier, confirm immediate display. |
| CRUD-07 | Multiple waterfall templates per vehicle | `/entities/[id]` > waterfall tab | Create a second template, confirm both appear. |
| CRUD-08 | Editable commitments + unit class assignment | `/entities/[id]` > cap-table tab | Edit a commitment amount, assign a unit class. |
| CRUD-09 | Capital call line items: edit + funded dates | `/transactions` > calls tab > open a call | Edit a line item amount, set a funded date. |
| CRUD-10 | $0 capital call line items allowed | `/transactions` > calls tab | Create a capital call with a $0 line item for one investor. |
| CRUD-11 | Distribution: edit, delete, revert-to-draft | `/transactions` > distributions tab | Edit a distribution, revert to draft, then delete. |
| CRUD-12 | Edit/delete from transactions list | `/transactions` > calls or distributions list | Use the row-level edit/delete actions. |
| CRUD-13 | Side letter edit form | `/directory` > sideLetters tab | Click edit on a side letter, change terms, save. |
| CRUD-14 | Multiple investor profiles per contact | `/directory` > investors tab > investor detail | Confirm a contact linked to multiple investor profiles shows both. |
| CRUD-15 | Duplicate contact handling | `/directory` > investors > "+ Add Investor" | Try to create an investor with an email that already exists. |
| CRUD-16 | New investor types | `/directory` > investors > "+ Add Investor" | Check the type dropdown for Individual, LLC, Trust, etc. |
| CRUD-17 | DELETE_DEAL audit action | `/deals/[id]` | Delete a deal, confirm it disappears; activity log should show DELETE_DEAL. |

### Waterfall Surface (high risk: math correctness only tested for PCF II)

| Req range | Surface | Where to test |
|-----------|---------|---------------|
| WF-01..13 (main branch) | Waterfall calculation correctness for landed fixes | `/transactions` > waterfall tab > run a calculation |
| WF-14..19 (on branch, pending merge) | PIC-weighted pref, inclusive day count, ROC exclusion, segment-based | Same — but only if branch is merged before walkthrough |
| WF-20 | Debug panel on distribution form | `/transactions` > distributions > "+ Distribution" > run waterfall preview |
| WF-21 | Preview button works with amount input | Same as WF-20 |
| WF-22 | Pro-rata option on tiers | `/entities/[id]` > waterfall tab > edit a tier |
| WF-23 | Per-investor allocation table | `/transactions` > distributions > "+ Distribution" > see allocation table |
| WF-24–26 | Distribution creation correctness | Create a test distribution, verify amounts look correct |

### UX Surface (cap table + investor activity)

| Req | Surface | Where to test |
|-----|---------|---------------|
| UX-01 | Issued units editable on cap table | `/entities/[id]` > cap-table tab > click issued units |
| UX-02 | Total row on commitments section | `/entities/[id]` > cap-table tab > scroll to commitments section |
| UX-03 | Commitment button on vehicle cap table tab | `/entities/[id]` > cap-table tab > "+ Add Commitment" button |
| UX-04 | Show all firm investors (including those without commitments) | `/entities/[id]` > cap-table tab > verify investors without commitments appear |
| UX-05 | Investor activity sorted by date | `/investors/[id]` > activity or capital tab |
| UX-06 | Filter $0 capital calls from investor activity | Same — verify $0 calls not shown |
| UX-07 | GP distributions in investor activity | Same — check GP distribution rows display |
| UX-08 | Full dollar amounts (2 decimals) | Any financial number in the UI |
| UX-09 | Dropdown portal rendering + larger max height | Any long dropdown (entity selector, investor type) |
| UX-10 | Fund All button for capital calls | `/transactions` > calls tab > open a draft call > "Fund All" button |

---

## March-5 Bug Reproduction Details

Three bugs from `.claude/rules/coding-patterns.md` (lines at "Likely Failure Points" table). Status is "needs re-verification."

### BUG-01: DD Tab Shows 0%/NOT_STARTED on Post-DD Deals

- **File:** `src/components/features/deals/deal-dd-tab.tsx`
- **Root cause:** Workstream status not synced when deal stage advances past DD stage.
- **How to reproduce:**
  1. Go to `/deals` — find a deal that is in IC_REVIEW or CLOSING stage (i.e., past Due Diligence).
  2. Open that deal, click the "Due Diligence" tab.
  3. **Bug present if:** All workstreams show "NOT_STARTED" or 0% completion even though the deal has passed DD stage.
  4. **Bug absent if:** Workstreams show their actual completion state.
- **Note in walkthrough:** If the seeded deals don't have any post-DD deals, the walkthrough script should instruct the user to advance one deal to IC_REVIEW using the "Send to IC Review" button and then check the DD tab.
- **Phase 22 destination (FIN-08)** if still present.

### BUG-02: Pipeline Pass Rate 300%

- **File:** `src/app/(gp)/deals/page.tsx`
- **Root cause:** Calculation error — divides by wrong denominator (e.g., closed deals only instead of total screened).
- **How to reproduce:**
  1. Go to `/deals`.
  2. Look at the pipeline stats cards at the top of the page — there should be a "Pass Rate" or "IC Pass Rate" stat.
  3. **Bug present if:** The displayed pass rate exceeds 100% (e.g., "300%").
  4. **Bug absent if:** Pass rate is ≤ 100% and looks plausible given the number of deals in the pipeline.
- **Phase 22 destination (FIN-08)** if still present.

### BUG-03: IC Memo Spinner Stuck on "Generating..."

- **File:** `src/components/features/deals/deal-overview-tab.tsx`
- **Root cause:** No timeout or error fallback for the AI generation call.
- **How to reproduce:**
  1. Go to a deal in DUE_DILIGENCE or IC_REVIEW stage.
  2. On the Overview tab, find the IC Memo section.
  3. If there is no memo yet, click "Generate IC Memo" (or equivalent button).
  4. **Bug present if:** The button/spinner stays in "Generating..." state indefinitely without producing output or showing an error.
  5. **Bug absent if:** The memo generates (shows content) OR shows a clear error message that the user can retry from.
- **Note:** This bug may require an AI API key to be configured. If no API key is set, the spinner behavior might differ. Walkthrough script should note: "Only test this if you've previously configured an AI provider in Settings > AI Config."
- **Phase 22 destination (FIN-08)** if still present.

---

## Existing UI-GUIDE.md Workflow Format (to Emulate)

Source: `.planning/UI-GUIDE.md`, "Workflows — Step-by-Step Testing Reference" section (lines 143–232).

### The Existing Pattern

The UI-GUIDE uses this exact structure for each workflow:

```
**WORKFLOW-ID: Plain English title**
1. [Route] → "[Button/Link]" → [action]
2. [What to do]
3. Verify: [what should be true]

**Known issue:** [brief note if applicable]
```

Key observations from examining the existing workflows:
- Each step uses format: `[page] → "[clickable element]" → [result]`
- "Verify:" prefix introduces the expected observable outcome
- "Known issue:" is used inline when a bug is documented (see DEAL-SEND-IC workflow at UI-GUIDE.md line 165)
- Workflows are 3–5 steps, tightly scoped to one action
- No bullet points inside steps — each step is a complete sentence
- Action → result pattern throughout: clicking something, then verifying the outcome

### Adaptation for the Walkthrough Script

The walkthrough script should feel like an extended version of the UI-GUIDE workflows, adapted from "testing steps" to "tour + observe." Key differences:
- Add a free-text "What feels off?" prompt after each domain section (per CONTEXT.md)
- Add a "Capture block" placeholder after each domain (empty field the user fills in)
- Replace "Verify:" with "Look for:" (less technical, non-developer user)
- Keep the arrow-chain navigation format: `[page] → "[element]" → [what happens]`
- Add a "v2.1 stress-test" subsection within high-risk domains listing the specific CRUD/WF/UX items to probe

### Tone Guidelines (from CLAUDE.md)

Sahil is not a developer. Plain English throughout:
- "Go to the Deals page" not "Navigate to `/deals`"
- "Click the blue button that says New Deal" not "Invoke the CreateDealModal"
- "You should see a card appear in the list" not "Verify SWR revalidation updates the DOM"
- "It might break if..." not "Edge cases include..."

---

## Capture Template Design (Per-Comment Schema)

### Per-Comment Template (to be used inside each domain's capture block)

```markdown
### Observation [N]

**Page / Action:** [Which page, what you clicked or tried to do]
**What I saw:** [Plain description of what happened — good or bad]
**Severity (your gut call):**
  - [ ] Blocker — I can't complete the task at all
  - [ ] Annoying — I can complete it but it's confusing or wrong-looking
  - [ ] Nitpick — minor cosmetic or wording issue

---
<!-- Claude fills in below during the follow-up triage session -->
**Claude Triage:**
  - [ ] Urgent → v3.0 — fix before shipping
  - [ ] Already scoped → Phase [N] — walkthrough confirms the known issue
  - [ ] Defer → v3.1+ — real problem but not blocking v3.0

**Triage Reason:** [Which of the 3 rubric tests this passed or failed, and why]
**Proposed Destination:** [Phase 22 / Phase 23 / Phase 24 / Phase 25 / Phase 26 / Phase 27 / Phase 28 / v3.1-backlog]
```

### Triage Rubric Reference (ALL 3 must be TRUE for "urgent → v3.0")

1. It blocks or materially degrades a user completing a real workflow (not an aesthetic nitpick)
2. It can be fixed inside the existing Phase 22–27 scope (or is a small enough Phase 28 follow-up) without requiring a new phase
3. It does not introduce a new feature surface (new feature surface → new phase → deferred)

**Rubric application tips for Claude during triage:**
- A cosmetic issue (wrong color, slightly mis-labeled button) automatically fails test 1 → "defer to v3.1+"
- A workflow blocker that requires building a new module fails test 3 → "defer to new phase → v3.1+"
- FIN-01 (meeting detail 404) passes all 3: blocks a real workflow, fits within Phase 22 scope, is not a new feature surface — it's a missing page for an already-linked entity
- The March-5 bugs (if still present) pass all 3 → Phase 22 / FIN-08

### Triage Summary Section (at end of each baseline file)

```markdown
## Triage Summary

### Urgent → v3.0 (fix before shipping)

| # | Page/Action | Observation | Severity | Destination | Reason |
|---|-------------|-------------|----------|-------------|--------|
| 1 | ... | ... | Blocker | Phase 22 | ... |

### Already Scoped (walkthrough confirms)

| # | Page/Action | Observation | Phase | Requirement |
|---|-------------|-------------|-------|-------------|
| 1 | ... | ... | P22 | FIN-01 |

### Defer → v3.1+ (real but not blocking v3.0)

| # | Page/Action | Observation | Severity | Reason |
|---|-------------|-------------|----------|--------|
| 1 | ... | ... | Nitpick | Aesthetic only — fails rubric test 1 |
```

---

## Baseline File Skeleton (GP + LP)

### Skeleton: `.planning/walkthroughs/v3.0-gp-baseline.md`

```markdown
# v3.0 GP Baseline Walkthrough

**Session type:** GP-side (signed in as James Kim, GP_ADMIN)
**User ID for mock auth:** `user-jk`
**Status:** [ ] Script in progress  [ ] User walk-through complete  [ ] Triage done

---

## Pre-Walkthrough Setup

Before you start, complete these steps:

1. Run `npx prisma db seed` in the project folder — this resets all demo data to a known state
2. Run `npm run dev` — the app will open on http://localhost:3000
3. Open the app in your browser
4. Make sure you are signed in as James Kim (GP_ADMIN) — you should see "JK" in the top right corner
5. Note the current date/time and commit hash below

**Session date:** ___________________
**Commit hash:** Run `git rev-parse --short HEAD` in the project folder and paste here: ___________________
**Browser:** ___________________
**Seed version:** fresh (run immediately before this session)

---

## Domain 1: Dashboard

**Go to:** http://localhost:3000/dashboard

**What to look at:**
1. Do the stat cards at the top load and show numbers? (AUM, active deals, etc.)
2. Do the charts load without errors or blank spaces?
3. Does the recent activity feed show items?
4. Does anything look wrong, confusing, or surprising?

**What feels off?** (free text — write anything that caught your attention)

[capture block — user fills in here]

---

## Domain 2: Deal Desk

**Go to:** http://localhost:3000/deals

### Deals List
**What to look at:**
1. Look at the stat cards at the top of the page — is there a "Pass Rate" or "IC Pass Rate" shown? If so, what does it say? (Checking for BUG-02: pass rate 300%)
2. Can you see deals grouped by stage?

[capture block]

### Deal Detail — Pick one deal in "Due Diligence" stage
**Go to:** Click on a deal that is in Due Diligence stage

**What to look at — Overview tab:**
1. Is there an IC Memo section? If yes, does it show content, or is it showing "Generating..." with a spinner? (Checking for BUG-03)

**What to look at — Due Diligence tab:**
1. Do the workstreams show completion percentages?
2. Is anything stuck at 0% / NOT_STARTED? (Checking for BUG-01)

### Deal Detail — Pick one deal in "IC Review" or "Closing" stage (past Due Diligence)
**Go to:** Click on a deal that is in IC Review or Closing stage

**What to look at:**
1. Click the Due Diligence tab — do the workstreams show their real completion state, or are they showing 0% / NOT_STARTED? (BUG-01 re-verify)
2. Click on any meeting link in the Activity tab — does it load a page, or do you get an error? (Checking for FIN-01)

**v2.1 stress-test:**
- Try deleting a deal: three-dot menu or delete button → confirm dialog → should disappear from list

[capture block]

---

## Domain 3: Assets

**Go to:** http://localhost:3000/assets

**What to look at:**
1. Do the asset class filter buttons work?

### Asset Detail — Pick any asset
**Go to:** Click on any asset

**What to look at — Income tab:**
1. Click the Income tab
2. Can you edit an income entry? (Click the pencil/edit icon next to an income row) — does it let you change the amount?
3. Can you delete an income entry? Does it ask you to confirm?

**What to look at — Expenses tab:**
- Same as income tab — try editing and deleting an expense entry

**What to look at — Performance tab:**
- Can you see valuation history? Try adding a new valuation — does it save?

[capture block]

---

## Domain 4: Vehicles (Entities)

**Go to:** http://localhost:3000/entities

**What to look at:**
1. Can you see the list of fund vehicles?
2. Try creating a test vehicle: "+ Create Entity" → fill in a name → create → does it appear?

### Vehicle Detail — Pick a real vehicle (not the test one you just created)
**Go to:** Click on one of the main fund entities

**What to look at — Cap Table tab:**
1. Click "Cap Table" tab
2. Can you see the commitments table? Is there a totals row at the bottom?
3. Are all investors listed, including those with $0 commitments?
4. Try clicking on a commitment amount — can you edit it inline?
5. Is there a "+ Add Commitment" button? Does it work?

**What to look at — Waterfall tab:**
1. Click "Waterfall" tab
2. Can you see the waterfall templates listed?
3. Try creating a new template: "+ New Template" → add a name → save → does it appear in the list alongside the existing one?
4. Click on an existing template to expand/edit it — can you see and edit the tiers?

[capture block]

---

## Domain 5: Capital Activity (Calls + Distributions + Waterfall)

**Go to:** http://localhost:3000/transactions

### Capital Calls tab
**What to look at:**
1. Do you see the list of capital calls?
2. Click on a capital call to open it — can you see the line items (one row per investor)?
3. Try editing a line item amount inline — does it save?
4. Is there a "Fund All" button on a draft capital call? Does it work?

### Distributions tab
**What to look at:**
1. Do you see the list of distributions?
2. Try creating a new distribution: "+ Distribution" → fill in the entity and amount → see if you can preview the waterfall allocation → do the per-investor allocation amounts look correct?
3. Is there a debug panel showing waterfall math? (This helps verify WF-20)

### Waterfall Templates tab
**What to look at:**
1. Do you see the templates listed?
2. Try running the waterfall calculator: select an entity, enter a distributable amount, click Calculate — do you get a result?

[capture block]

---

## Domain 6: Directory / CRM

**Go to:** http://localhost:3000/directory

### Investors tab
**What to look at:**
1. Can you see all the fund investors?
2. Click on an investor — in the detail view, does it show all their vehicles/commitments?
3. Check the investor type dropdown when creating or editing an investor — do you see types like Individual, LLC, Trust? (Checking CRUD-16)

### Side Letters tab
**What to look at:**
1. Can you see the side letters?
2. Try clicking edit on a side letter — can you change the terms and save?

### Companies / Contacts tabs
**What to look at:**
1. Quick scan — do the lists load? Do Add buttons work?

[capture block]

---

## Domain 7: Tasks

**Go to:** http://localhost:3000/tasks

**What to look at:**
1. Do the tasks load?
2. Try creating a task: "+ New Task" → fill in details → save → does it appear?

[capture block]

---

## Domain 8: Documents

**Go to:** http://localhost:3000/documents

**What to look at:**
1. Do the documents load?
2. Try uploading a small file — does it succeed?

[capture block]

---

## Domain 9: Meetings

**Go to:** http://localhost:3000/meetings

**What to look at:**
1. Do the meeting cards load?
2. Try clicking on a meeting card — what happens? Do you get an error page? (Checking FIN-01)
3. Try clicking "+ Log Meeting" — does the form open and save?

[capture block]

---

## Domain 10: AI Command Bar (sample only)

**How to access:** Click the search/command bar at the top of the app, or press Cmd+K

**What to look at:**
1. Does it open?
2. Type "show me deals in due diligence" — does it return results?

[capture block]

---

## Domain 11: Settings

**Go to:** http://localhost:3000/settings

**What to look at:**
1. Does the Firm Profile tab load?
2. Does the Users & Access tab show the team members?
3. Do NOT make changes to AI Config keys unless you intend to

[capture block]

---

## Overall Impressions

**After completing the tour, answer these in plain language:**

1. What was the most broken thing you saw?
2. What felt good / worked well?
3. If you had to fix one thing before using this for real, what would it be?
4. Any areas we skipped that you think need attention?

[capture block]

---

## Triage Summary (Claude fills in during follow-up session)

### Urgent → v3.0

| # | Page/Action | Observation | Severity | Destination | Triage Reason |
|---|-------------|-------------|----------|-------------|---------------|
| | | | | | |

### Already Scoped (walkthrough confirms)

| # | Page/Action | Observation | Phase | Requirement |
|---|-------------|-------------|-------|-------------|
| | | | | |

### Defer → v3.1+

| # | Page/Action | Observation | Severity | Reason |
|---|-------------|-------------|----------|--------|
| | | | | |
```

---

### Skeleton: `.planning/walkthroughs/v3.0-lp-baseline.md`

```markdown
# v3.0 LP Baseline Walkthrough

**Session type:** LP-side (two passes)
**Status:** [ ] Pass 1 (multi-vehicle) complete  [ ] Pass 2 (simpler LP) complete  [ ] Triage done

---

## Pre-Walkthrough Setup

1. Run `npx prisma db seed` if not already done from the GP session
2. Make sure `npm run dev` is still running on http://localhost:3000
3. Switch to the LP portal — look for the portal toggle in the sidebar (GP / LP switcher)
4. Note your user below

**Session date:** ___________________
**Commit hash:** ___________________
**Browser:** ___________________

---

## Pass 1: Multi-Vehicle LP (CalPERS — Michael Chen)

**Sign in as:** `user-lp-calpers` (Michael Chen, CalPERS)
**How:** In local dev, use the user switcher. Select "Michael Chen" from the user dropdown.
**What this tests:** An LP with 5 fund vehicles — stresses portal aggregation and multi-vehicle metric rollup

---

### LP Domain 1: Dashboard (My Overview)

**Go to:** http://localhost:3000/lp-dashboard

**What to look at:**
1. Do the stat cards show numbers? (Total committed, total called, distributions, etc.)
2. Do the numbers look plausible for a large investor (CalPERS has $165M committed)?
3. Is there a commitments table showing all 5 vehicles?
4. Does anything look wrong, missing, or confusing?

[capture block]

---

### LP Domain 2: Capital Account

**Go to:** http://localhost:3000/lp-account

**What to look at:**
1. Does the period statement load?
2. Do the line items make sense (contributions, distributions, fees)?
3. Are the numbers color-coded (positive/negative)?

[capture block]

---

### LP Domain 3: Portfolio (Positions/Holdings)

**Go to:** http://localhost:3000/lp-portfolio

**What to look at:**
1. Do you see asset exposure across multiple vehicles?
2. Are the asset class badges correct?
3. Does the pro-rata breakdown look right for 5 vehicles?

[capture block]

---

### LP Domain 4: Notices & Activity (Capital Activity History)

**Go to:** http://localhost:3000/lp-activity

**What to look at:**
1. Do you see capital calls listed with statuses (Funded / Pending)?
2. Do you see distributions with breakdowns?
3. Is the list sorted newest-first?

[capture block]

---

### LP Domain 5: Documents / K-1s

**Go to:** http://localhost:3000/lp-documents

**What to look at:**
1. Do you see documents shared by the GP?
2. Are entity names and categories shown correctly?

[capture block]

---

### LP Domain 6: Settings / Notifications

**Go to:** http://localhost:3000/lp-settings

**What to look at:**
1. Can you see notification preferences?
2. Is anything confusing about the options?

[capture block]

---

### LP Domain 7: Profile

**Go to:** http://localhost:3000/lp-profile

**What to look at:**
1. Does the profile information look correct for Michael Chen / CalPERS?
2. Can you see contact info and tax ID fields?

[capture block]

---

### Pass 1 — Overall Impressions

1. As an LP with multiple fund investments, does this portal give you a clear picture of your total exposure?
2. What information is hardest to find?
3. What is missing that a real LP would expect?

[capture block]

---

## Pass 2: Simpler LP (Wellington Family Office — Tom Wellington)

**Sign in as:** `user-lp-wellington` (Tom Wellington, Wellington Family Office)
**Note:** Wellington has 3 vehicles. This is the closest to a "simpler" LP in the current seed — not a true single-vehicle test, but a lighter data footprint than CalPERS.
**What this tests:** Confirms the portal looks correct for a smaller, family office LP

Repeat the same domain tour as Pass 1, but quickly — focus on:
1. Do the numbers change to reflect Wellington's 3-vehicle exposure (not CalPERS's 5)?
2. Does anything that worked for CalPERS break for Wellington?
3. Does the portal feel appropriate for a family office (vs. a large institutional investor)?

[capture blocks — one per domain, briefer than Pass 1]

---

### Pass 2 — Overall Impressions

1. Did the portal correctly switch to Wellington's data when you switched users?
2. Any differences from the CalPERS experience that felt wrong?

[capture block]

---

## Triage Summary (Claude fills in during follow-up session)

### Urgent → v3.0

| # | Page/Action | Observation | Severity | Destination | Triage Reason |
|---|-------------|-------------|----------|-------------|---------------|
| | | | | | |

### Already Scoped (walkthrough confirms)

| # | Page/Action | Observation | Phase | Requirement |
|---|-------------|-------------|-------|-------------|
| | | | | |

### Defer → v3.1+

| # | Page/Action | Observation | Severity | Reason |
|---|-------------|-------------|----------|--------|
| | | | | |
```

---

## Validation Architecture

Config note: `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Why Standard Tests Don't Apply

Phase 21 produces no code. The two output files (`.planning/walkthroughs/v3.0-gp-baseline.md` and `.planning/walkthroughs/v3.0-lp-baseline.md`) are human-written markdown documents. Automated unit tests or E2E tests cannot verify that Sahil's subjective observations are "correct." However, the phase has three automatable validation layers and one manual audit layer.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Shell scripts + markdown grep checks (no test framework needed for this phase) |
| Config file | None — ad-hoc verification commands |
| Quick run command | `ls .planning/walkthroughs/v3.0-gp-baseline.md .planning/walkthroughs/v3.0-lp-baseline.md` |
| Full verification | See schema checks below |

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Type | Command / Method |
|--------|----------|-------------------|-----------------|
| MAN-01 | GP baseline file exists with user comments | File existence + schema check | `ls .planning/walkthroughs/v3.0-gp-baseline.md` |
| MAN-02 | LP baseline file exists with user comments | File existence + schema check | `ls .planning/walkthroughs/v3.0-lp-baseline.md` |
| MAN-01/02 | Every comment triaged with reasoning | Schema check (grep for required fields) | See schema validation below |
| MAN-01/02 | Urgent items have concrete phase destinations | Cross-reference check (manual audit) | See triage sanity audit below |

### Layer 1: File Existence Checks

```bash
# Run from project root
ls .planning/walkthroughs/v3.0-gp-baseline.md && echo "GP baseline: OK"
ls .planning/walkthroughs/v3.0-lp-baseline.md && echo "LP baseline: OK"
```

Both files must exist and be non-empty.

### Layer 2: Schema Checks (Markdown Structure Validation)

The per-comment template has required fields. Claude can grep for these to confirm the triage session populated all mandatory fields:

```bash
# Check that Claude Triage section is present in GP baseline
grep -c "Claude Triage:" .planning/walkthroughs/v3.0-gp-baseline.md

# Check that Triage Reason field is present for each comment
grep -c "Triage Reason:" .planning/walkthroughs/v3.0-gp-baseline.md

# Check that Proposed Destination is populated (no blank fields)
grep "Proposed Destination:" .planning/walkthroughs/v3.0-gp-baseline.md | grep -v "Proposed Destination: $"
```

**Minimum schema requirements for each comment block:**
- `Page / Action:` — not blank
- `What I saw:` — not blank
- One severity checkbox is checked (`[x]`)
- One triage checkbox is checked (`[x]`)
- `Triage Reason:` — not blank
- `Proposed Destination:` — contains a phase number or "v3.1-backlog"

### Layer 3: Triage Sanity Audit

After the triage session, Claude performs this manual audit before declaring the phase complete:

**For every item marked "Urgent → v3.0":**
1. Does the Triage Reason explicitly state which of the 3 rubric tests it passes? If not, re-evaluate.
2. Does the Proposed Destination map to an existing Phase (22–28) that plausibly covers this type of fix? If the destination is "Phase 22" but the fix is clearly a documentation task, it belongs in Phase 23.
3. Is the item truly workflow-blocking (rubric test 1), or is it a cosmetic issue that the user rated as "Blocker" out of frustration? If cosmetic → override to Annoying or Nitpick and re-triage.

**For every item marked "Defer → v3.1+":**
1. Is the deferral reason concrete (e.g., "fails rubric test 3 — requires new feature surface") or vague ("not important")? Vague reasons must be tightened.
2. Is there any item that the user rated as "Blocker" but was deferred? If so, the Triage Reason must explicitly explain which rubric test it failed and why that justifies deferral despite user-reported severity.

**Flags that trigger re-review:**
- Any urgent item without a specific phase destination
- Any urgent item whose destination phase doesn't have a matching requirement in REQUIREMENTS.md
- Any defer item rated "Blocker" without an explicit rubric failure explanation
- Triage Summary section showing 0 urgent items (possible but suspicious — flag for human review before declaring done)

### Layer 4: Cross-Reference Check

After the triage summary tables are populated, verify:

```bash
# Count urgent items
grep -c "Urgent → v3.0" .planning/walkthroughs/v3.0-gp-baseline.md
grep -c "Urgent → v3.0" .planning/walkthroughs/v3.0-lp-baseline.md

# For each urgent item with a Phase N destination, confirm that phase exists in ROADMAP.md
grep "Phase 2[2-8]" .planning/walkthroughs/v3.0-gp-baseline.md
```

Manual cross-reference: every Phase N destination in the triage summary must correspond to a phase listed in `.planning/ROADMAP.md`. If an urgent item doesn't fit any existing phase, it goes into the Phase 28 follow-up backlog (not a new phase).

### Sampling Rate

- **Per-session (after user completes each walkthrough):** Run layer 1 check (file existence)
- **Post-triage:** Run layers 2 and 3 before declaring phase complete
- **Phase gate:** All 4 layers green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/walkthroughs/` directory — must be created before the walkthrough scripts are written
  - Command: `mkdir -p .planning/walkthroughs`
- [ ] `v3.0-gp-baseline.md` — does not exist yet; created during this phase
- [ ] `v3.0-lp-baseline.md` — does not exist yet; created during this phase
- No test framework installation needed — verification is shell-based

---

## Sources

### Primary (HIGH confidence — sourced directly from codebase)

- `prisma/seed.ts` (lines 440–510, 517–550, 3011–3055) — LP user definitions, investor entities, commitment mapping, investor-user access
- `src/lib/routes.ts` (lines 23–49) — complete route registry for GP and LP portals
- `src/app/(gp)/deals/[id]/page.tsx` (lines 70–122, 419) — deal detail tabs and stage-dependent visibility
- `src/app/(gp)/entities/[id]/page.tsx` (lines 14–52, 283–290) — entity detail tabs including cap-table and waterfall
- `src/app/(gp)/assets/[id]/page.tsx` (line 45) — asset detail tab list
- `src/app/(gp)/transactions/page.tsx` (line 62) — capital activity tab types
- `src/app/(gp)/directory/page.tsx` (line 48) — directory tab types
- `src/app/(gp)/settings/page.tsx` (line 61) — settings tab types
- `.planning/milestones/v2.1-REQUIREMENTS.md` — complete CRUD/WF/UX requirement list with commit references
- `.planning/milestones/v2.1-ROADMAP.md` — theme breakdown and known debt entering v3.0
- `.claude/rules/coding-patterns.md` — March-5 bug details (BUG-01, BUG-02, BUG-03) with file locations
- `.planning/UI-GUIDE.md` (lines 143–232) — existing workflow format to emulate
- `.planning/config.json` — confirms `nyquist_validation: true`
- `CLAUDE.md` — plain-English requirement for non-developer user, dev commands
- `.planning/REQUIREMENTS.md` — MAN-01/02 definitions, traceability to phases
- `.planning/ROADMAP.md` — Phase 21 success criteria, downstream phase descriptions

### Secondary (MEDIUM confidence)

- `.planning/codebase/STRUCTURE.md` — directory layout for GP/LP pages (dated 2026-03-08; directory existence confirmed via shell)
- `.planning/STATE.md` — current position, phase overview, known blockers

### Tertiary (LOW confidence)

- None — all findings sourced from PRIMARY level

---

## Metadata

**Confidence breakdown:**
- LP seed-data inventory: HIGH — sourced directly from `prisma/seed.ts`
- GP route inventory: HIGH — sourced from `src/lib/routes.ts` and page files
- LP route inventory: HIGH — sourced from `src/lib/routes.ts` and directory listing
- v2.1 surface map: HIGH — sourced from `v2.1-REQUIREMENTS.md` (reconstructed from git log)
- Bug reproduction: MEDIUM — file locations confirmed, but bug presence on current main is unverified (that's the point of the walkthrough)
- Capture template design: HIGH — derived from existing UI-GUIDE.md conventions + CONTEXT.md requirements
- Karen Miller absence: HIGH — confirmed by exhaustive grep of `prisma/seed.ts`
- Single-vehicle LP gap: HIGH — confirmed by counting commitment records per investor

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable — seed file and routes rarely change; re-verify if schema changes before walkthrough executes)
