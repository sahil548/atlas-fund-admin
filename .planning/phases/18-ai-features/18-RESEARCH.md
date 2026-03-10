# Phase 18: AI Features - Research

**Researched:** 2026-03-09
**Domain:** AI-enhanced command bar, NL query + action execution, deal lifecycle AI, covenant monitoring, LP communications, task suggestions
**Confidence:** HIGH — all findings based on direct codebase inspection and verified infrastructure

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Command bar NL experience (AI-01, AI-02)**
- Command bar (Cmd+K) remains the universal entry point — not a separate interface
- Existing fuzzy search + DB search behavior preserved. AI layer activates when query is clearly natural language
- AI responses appear inline in the expanded command bar dropdown by default
- Pop-out button allows GP to move the conversation into a persistent side panel for continued interaction while navigating the app
- Always page-aware — AI knows the current page context (which deal, asset, entity the GP is viewing)
- Conversational with follow-up support — maintains conversation state within a session
- Query/action split UX: read-only queries return results instantly; mutations show a confirmation step with pre-filled editable fields before executing
- Full CRUD scope — not limited to 4 actions. Supports creating/updating any major model (deals, assets, entities, tasks, contacts, capital calls, distributions, notes, meetings)
- Existing command bar voice input stays — works with NL queries too

**Automated covenant breach alerts (AI-06)**
- In-app notifications + command bar proactive mentions — no email digest
- Monitoring checks run on page load (dashboard load, monitoring view) — no Vercel Cron or background job infrastructure
- Flag-only alerts — "Covenant X on Asset Y is breached" with link to asset. No AI analysis of why/remediation
- Command bar proactively surfaces alerts: "Heads up: 2 new covenant breaches detected since your last visit"
- Alert types: covenant breaches, lease expirations (90/180 day), loan maturities, overdue asset reviews

**AI task suggestions (AI-08)**
- Suggestions surface in the AI panel only (command bar dropdown or popped-out side panel), not on detail pages
- On-demand only — GP asks "what should I do next on this deal?" and AI responds
- One-click task creation — each suggestion has an "Add" button that creates the task immediately, linked to relevant context

**LP communication drafting (AI-07)**
- Accessible through the AI command bar / side panel — GP asks "draft an LP update for Fund III"
- Specific format and data sources at Claude's discretion

**Deal lifecycle AI (AI-03, AI-04, AI-05)**
- CIM extraction: Phase 12 pipeline already exists. This phase wires it into the AI panel ("extract terms from this CIM and fill the deal")
- DD summary: `dd-analyze` endpoint already exists. Wire into command bar ("generate DD summary for this deal")
- IC memo: Already exists in `dd-analyze`. Make accessible via command bar ("draft IC memo for Deal X")

### Claude's Discretion
- NL intent detection algorithm (how to distinguish fuzzy search from AI query)
- Side panel layout, sizing, and animation
- Conversation state persistence approach (session-scoped vs persisted)
- AI prompt engineering for portfolio-aware responses
- Context depth for task suggestions (deal stage only vs full context analysis)
- LP update communication format and data aggregation approach
- How "pop-out" transition works between dropdown and side panel
- Alert freshness tracking ("since last visit" detection mechanism)

### Deferred Ideas (OUT OF SCOPE)
- Email digest for alerts — skip for now, add when cron infrastructure exists
- AI remediation suggestions for breaches — flag-only for now
- Proactive task suggestions — on-demand only; proactive ("I noticed Deal X has been idle...") deferred
- LP communication email delivery — drafting available via AI panel; actual sending/formatting as PDF deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Command bar supports natural language queries ("show me all deals over $10M", "what's our total NAV") | `ai-service.ts` + `searchAndAnalyze()` already handle this; needs NL intent detection + page-context injection |
| AI-02 | Command bar supports action execution (create deal, log note, assign task, trigger report) without navigation | Needs new `/api/ai/execute` endpoint with intent classification + confirmation UX layer in command bar |
| AI-03 | AI can auto-extract deal terms from uploaded CIMs/documents | `document-extraction.ts` pipeline complete; needs command bar wiring to trigger extraction + apply fields |
| AI-04 | AI can generate DD summary reports from workstream data | `dd-analyze` endpoint complete; needs command bar trigger for current deal context |
| AI-05 | AI can draft IC memos from deal data and DD findings | `dd-analyze` with IC_MEMO type complete; needs command bar trigger |
| AI-06 | AI monitors portfolio for covenant breaches and generates alerts | `/api/assets/monitoring` complete; needs freshness tracking + proactive alert surfacing in command bar |
| AI-07 | AI drafts LP update communications from fund performance data | New: query fund/entity data, build LP update prompt, return draft text in AI panel |
| AI-08 | AI suggests next tasks based on deal stage and asset type context | New: context-aware prompt with deal stage + asset type, return actionable task list with one-click creation |
</phase_requirements>

---

## Summary

Phase 18 is an integration and UX-wiring phase, not a greenfield AI build. The core AI infrastructure is already in place from Phase 12: a working `ai-service.ts` with portfolio context gathering, an OpenAI/Anthropic compatibility layer in `ai-config.ts`, a `dd-analysis-service.ts` with 15+ workstream types + IC memo generation, and a `document-extraction.ts` pipeline. The command bar (`command-bar.tsx`) already has a conversation thread UI, DB search, fuzzy command discovery, voice input, and calls `/api/ai/search`. The monitoring API (`/api/assets/monitoring`) already tracks covenant breaches, lease expirations, loan maturities, and overdue reviews.

What this phase builds: (1) an NL intent layer that distinguishes "fuzzy search" from "AI query" and adds page-context injection to the system prompt, (2) an action-execution endpoint + confirmation UX for mutations via natural language, (3) a "pop-out" side panel mode for persistent AI conversation, (4) proactive breach alerting with "last-seen" freshness tracking, and (5) new AI capabilities: LP update drafting and on-demand task suggestions with one-click creation. The deal lifecycle AI (AI-03, AI-04, AI-05) is largely wiring existing endpoints into command bar triggers.

**Primary recommendation:** Treat this phase as six distinct deliverables sharing the command bar as the UX foundation. Build in order: (1) NL intent + page context, (2) side panel infrastructure, (3) action execution + confirmation UX, (4) breach alert freshness, (5) LP update drafting, (6) task suggestions. Each deliverable is independently testable.

---

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| openai | installed | LLM API calls (also wraps Anthropic via AnthropicCompat) | In use — `ai-config.ts` |
| @anthropic-ai/sdk | installed | Native Anthropic API | In use — `ai-config.ts` |
| SWR 2 | installed | Client-side data fetching + cache invalidation | In use across all pages |
| Next.js 16 | installed | API routes, server components | All API endpoints |
| Prisma 7 | installed | DB queries for context gathering | All AI context queries |
| Zod 4 | installed | Schema validation for AI action payloads | `schemas.ts` |
| jsonrepair | installed | Repair malformed LLM JSON responses | `dd-analysis-service.ts` |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | installed | Icons for side panel, alert badges | All new UI components |
| Tailwind CSS 4 | installed | Styling for panel, confirmation dialogs | All new UI |

### Nothing New to Install
All required libraries are already in the project. This phase adds no new dependencies.

## Architecture Patterns

### Recommended Project Structure (New Files Only)

```
src/
├── app/api/ai/
│   ├── search/route.ts          # EXISTS — portfolio NL query handler
│   └── execute/route.ts         # NEW — NL action execution endpoint
├── components/features/command-bar/
│   ├── command-bar.tsx          # MODIFY — add NL intent layer, pop-out button, page-context, alert proactive mention
│   ├── command-bar-provider.tsx # MODIFY — add side panel state, page context, conversation persistence, last-seen tracking
│   ├── command-bar-side-panel.tsx  # NEW — persistent side panel component
│   ├── action-confirmation.tsx  # NEW — confirmation dialog for AI mutations
│   └── alert-badge.tsx          # NEW — breach count badge for command bar entry point
└── lib/
    ├── ai-service.ts            # MODIFY — add page context injection, task suggestion, LP update, action planning
    └── ai-nl-intent.ts          # NEW — NL intent classification (query vs action vs fuzzy)
```

### Pattern 1: NL Intent Detection

**What:** Classify whether a command bar input is (a) fuzzy search/navigation, (b) a read-only NL query to AI, or (c) a mutation action that needs confirmation.

**When to use:** On every command bar query submission.

**Recommended approach (Claude's Discretion — recommend heuristics over a second LLM call):**

```typescript
// src/lib/ai-nl-intent.ts

export type IntentType = "fuzzy_search" | "nl_query" | "nl_action";

const ACTION_VERBS = [
  "create", "add", "make", "new",
  "update", "change", "edit", "set",
  "delete", "remove", "archive", "kill",
  "assign", "log", "note", "draft", "generate", "extract",
  "trigger", "send", "move", "advance",
];

const QUERY_PHRASES = [
  "show", "what", "how", "which", "list", "find",
  "where", "who", "when", "total", "how many", "summarize",
  "what's", "whats", "give me", "tell me",
];

/**
 * Classify user intent for command bar routing.
 * Heuristics-only — no LLM call needed. Fast and deterministic.
 *
 * Logic:
 * - Short queries (<3 words, no verb phrase) → fuzzy_search
 * - Starts with action verb → nl_action
 * - Contains question word or query phrase → nl_query
 * - Default for ambiguous long queries → nl_query (let AI handle it)
 */
export function classifyIntent(input: string): IntentType {
  const normalized = input.trim().toLowerCase();
  const words = normalized.split(/\s+/);

  // Short query → likely fuzzy search
  if (words.length <= 2 && !QUERY_PHRASES.some(p => normalized.startsWith(p))) {
    return "fuzzy_search";
  }

  // Starts with action verb → mutation action
  if (ACTION_VERBS.some(v => normalized.startsWith(v + " ") || normalized === v)) {
    return "nl_action";
  }

  // Question/list phrase → read query
  if (QUERY_PHRASES.some(p => normalized.startsWith(p))) {
    return "nl_query";
  }

  // Fallback: treat as nl_query (AI can interpret)
  return "nl_query";
}
```

**Confidence:** HIGH — this pattern is simple, fast, and has no LLM dependency. Fuzzy search continues for short inputs; AI activates for natural language patterns.

### Pattern 2: Page Context Injection

**What:** Inject the GP's current page context into the AI system prompt so "summarize this deal" resolves to the deal they're viewing.

**When to use:** Every AI query/action call from command bar.

**Implementation:**

The `CommandBarProvider` needs to track current page context. Use `usePathname()` in the provider and a `setContext()` method that page-level components can call via the provider.

```typescript
// command-bar-provider.tsx — add to context type
interface CommandBarContextType {
  // ... existing fields ...
  pageContext: PageContext | null;
  setPageContext: (ctx: PageContext | null) => void;
  isSidePanelOpen: boolean;
  openSidePanel: () => void;
  closeSidePanel: () => void;
  lastSeenAlertTimestamp: string | null;
  setLastSeenAlertTimestamp: (ts: string) => void;
}

export interface PageContext {
  pageType: "deal" | "asset" | "entity" | "contact" | "dashboard" | "other";
  entityId?: string;      // current deal/asset/entity ID
  entityName?: string;    // human-readable name for prompt
}
```

Page components (deal detail, asset detail) call `setPageContext()` on mount:
```typescript
// In deal-detail page:
const { setPageContext } = useCommandBar();
useEffect(() => {
  setPageContext({ pageType: "deal", entityId: deal.id, entityName: deal.name });
  return () => setPageContext(null);
}, [deal.id, deal.name]);
```

The `buildSystemPrompt()` in `ai-service.ts` then receives the page context and includes it:
```
CURRENT PAGE CONTEXT:
The GP is currently viewing Deal: "Acme Industrial Portfolio" (id: deal-abc123).
When the GP says "this deal", they mean this deal.
```

### Pattern 3: AI Action Execution (AI-02)

**What:** New endpoint `/api/ai/execute` that receives a natural language action, uses AI to parse it into a structured mutation, returns a confirmation payload with pre-filled fields, and optionally executes.

**Endpoint shape:**
```typescript
// POST /api/ai/execute
// Request:
{
  action: string;        // "assign deal X to Sarah"
  firmId: string;
  pageContext?: { pageType: string; entityId?: string; entityName?: string };
  confirmed?: boolean;   // false = return plan for confirmation, true = execute
  confirmedPayload?: unknown; // pre-filled fields (possibly edited by user)
}

// Response (unconfirmed):
{
  actionType: "CREATE_TASK" | "UPDATE_DEAL" | "CREATE_DEAL" | "LOG_NOTE" | ...;
  description: string;   // "Create task 'Schedule site visit' assigned to Sarah Mitchell, linked to deal X"
  payload: { ... };      // fields to show in confirmation UI (editable)
  requiresConfirmation: true;
}

// Response (confirmed):
{
  success: true;
  message: string;       // "Task created successfully"
  result: { id: string; url?: string };
}
```

**System prompt for action parsing:**
```
You are Atlas AI executing an action. Parse the user's request and return a JSON action plan.

Available action types: CREATE_TASK, CREATE_DEAL, UPDATE_DEAL, LOG_NOTE, ASSIGN_TASK, CREATE_CAPITAL_CALL, CREATE_DISTRIBUTION, CREATE_MEETING, TRIGGER_DD_ANALYSIS, TRIGGER_IC_MEMO, EXTRACT_CIM_TERMS, DRAFT_LP_UPDATE

For each action return:
{
  "actionType": "...",
  "description": "Human-readable description of what will happen",
  "payload": { /* field name: value */ }
}

Only return actions you are confident about. If ambiguous, return { "actionType": "AMBIGUOUS", "clarification": "..." }.
```

**Confidence:** HIGH (pattern) — MEDIUM (exact prompt engineering needs iteration).

### Pattern 4: Confirmation Dialog UX

**What:** Before executing any mutation, show an editable pre-filled form so the GP can review and adjust.

```typescript
// src/components/features/command-bar/action-confirmation.tsx
interface ActionConfirmationProps {
  plan: ActionPlan;           // from /api/ai/execute (unconfirmed)
  onConfirm: (payload: unknown) => void;
  onCancel: () => void;
}
```

UI: Shows within the command bar dropdown (not a separate modal). Renders editable fields based on `actionType`. "Confirm" button calls `/api/ai/execute` with `confirmed: true` + edited payload.

### Pattern 5: Side Panel (Pop-Out)

**What:** When the GP clicks "pop-out", the command bar conversation moves to a fixed right-side panel that persists while they navigate.

**Pattern reference:** Phase 12 `DocumentExtractionPanel` (right-side drawer) — reuse the same fixed panel container pattern.

```typescript
// command-bar-side-panel.tsx
// Fixed right panel, 380px wide, with close button + full conversation thread
// Uses same conversation state from CommandBarProvider (shared state)
```

**Provider changes:**
```typescript
// isSidePanelOpen: boolean — when true, side panel renders in AppShell
// Conversation state (conversation[], isSearching) stays in provider (not in command-bar.tsx)
// Both the inline dropdown and side panel read/write the same conversation state
```

**AppShell change:**
```tsx
// app-shell.tsx — add side panel alongside main content
<div className="flex h-screen bg-gray-50 font-sans text-gray-900">
  <Sidebar ... />
  <div className="flex-1 overflow-y-auto">
    <TopBar ... />
    <div className="p-6"><PageErrorBoundary>{children}</PageErrorBoundary></div>
  </div>
  {isSidePanelOpen && <CommandBarSidePanel />}
  <OnboardingModal />
</div>
```

### Pattern 6: Breach Alert Freshness (AI-06)

**What:** Track when the GP last saw alerts so the command bar can say "2 new covenant breaches since your last visit."

**Implementation (no schema change needed):**
- Store `lastAlertSeenAt` timestamp in `CommandBarProvider` state, persisted to `localStorage`
- On dashboard/monitoring load, fetch alerts from `/api/assets/monitoring`
- Compare alert `createdAt` timestamps to `lastAlertSeenAt`
- Provider exposes `unseenAlertCount` derived value
- Command bar footer shows: "Heads up: {N} new alert(s) since your last visit" when `unseenAlertCount > 0`
- Update `lastAlertSeenAt` when GP opens monitoring view or acknowledges alerts

```typescript
// In CommandBarProvider:
const [lastAlertSeenAt, setLastAlertSeenAt] = useState<string | null>(() =>
  typeof window !== "undefined" ? localStorage.getItem("atlas_last_alert_seen") : null
);

const updateLastAlertSeen = useCallback(() => {
  const ts = new Date().toISOString();
  setLastAlertSeenAt(ts);
  localStorage.setItem("atlas_last_alert_seen", ts);
}, []);
```

**Why localStorage (not DB):** Alert freshness is per-browser-session, not cross-device. No schema change needed, no migration risk. Matches "no cron/background job" constraint.

### Pattern 7: Task Suggestions (AI-08)

**What:** On-demand AI task suggestions for a specific deal/asset/entity, with one-click creation.

**API:** Reuse `/api/ai/search` or add a `taskSuggestions` mode. Recommend adding a dedicated `/api/ai/suggest-tasks` endpoint for clean separation.

**Prompt:**
```
Given this deal context, suggest 3-5 specific next tasks the GP should do.
Return as JSON: { "tasks": [{ "title": "...", "priority": "HIGH|MEDIUM|LOW", "rationale": "..." }] }

Deal: {name}, Stage: {stage}, Asset Class: {assetClass}
Recent activity: {last 3 activities}
Missing fields: {null/empty required fields}
Upcoming deadlines: {dueDate tasks}
```

**UI in command bar/panel:**
```
Each suggestion renders as:
[Task title]  [MEDIUM]  [Add]
[rationale in small text]
```

"Add" button → `POST /api/tasks` with `contextType=DEAL`, `contextId=dealId`. Already supported by existing task endpoint.

### Pattern 8: LP Update Drafting (AI-07)

**What:** On command "draft LP update for Fund III", AI gathers fund performance data and generates a draft.

**New endpoint:** `/api/ai/draft-lp-update?firmId=X&entityId=Y`

**Data to gather:**
```typescript
// From existing APIs — no new DB queries needed:
// - Entity details (name, type, vintage)
// - Total commitments, NAV (from entity.totalCommitments, fairValue sum)
// - Active assets with returns
// - Recent capital calls + distributions
// - Portfolio performance (IRR/TVPI if computed)
```

**Prompt structure:**
```
You are drafting a quarterly LP update for {fund name}.

Fund Data:
- Total Commitments: {X}
- Current NAV: {Y}
- Assets: {list with fair value, cost basis, MOIC}
- Recent Capital Calls: {amounts, dates}
- Recent Distributions: {amounts, dates}

Write a professional LP quarterly update. Format:
1. Executive Summary (2-3 sentences)
2. Portfolio Highlights
3. Capital Activity
4. Outlook

Be factual, use the data provided, professional tone.
```

**Response rendered:** As a markdown block in the AI panel with a "Copy" button. No DB persistence needed — this is a draft for the GP to copy/edit elsewhere.

### Anti-Patterns to Avoid

- **Making a second LLM call for intent classification:** Heuristic classification is fast and deterministic. A second LLM call adds 1-3s latency for every keystroke. Use `classifyIntent()` from `ai-nl-intent.ts`.
- **Storing side panel conversation in component state:** Conversation state must live in `CommandBarProvider` so it survives when the user switches between dropdown and side panel modes.
- **Blocking primary operations on AI calls:** All AI operations that enhance but don't gate workflows (monitoring checks, task suggestions) must use `.catch()` fire-and-forget pattern established in Phase 12.
- **Inventing URLs in AI responses:** The `generateAIRouteList()` function already provides the valid route list to the system prompt. Never let AI generate navigation links outside this set.
- **Schema changes for alert freshness:** Use `localStorage` for `lastAlertSeenAt` — no `schema.prisma` changes needed.
- **Calling `dd-analyze` directly from command bar:** The command bar sends a user-facing trigger to `/api/ai/execute`, which internally calls the existing DD/IC endpoints. Don't expose raw DD endpoint to command bar.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON repair for LLM responses | Custom JSON parser | `jsonrepair` (already in project, used in dd-analysis-service) | Handles all common LLM JSON malformations |
| API key fallback chain | New auth logic | `getUserAIConfig()` from `ai-config.ts` | Already implements user → tenant → none with encryption |
| Context gathering | New DB queries | `gatherContext()` in `ai-service.ts` | Already fetches deals, assets, entities, investors, tasks |
| Portfolio system prompt | New prompt builder | `buildSystemPrompt()` in `ai-service.ts` | Already formats portfolio state + route list |
| Fuzzy command discovery | Custom search | `discoverCommands()` in `command-discovery.ts` | 100-point fuzzy engine already works |
| Task creation | New endpoint | `POST /api/tasks` with `contextType/contextId` | Already supports all context links |
| Covenant monitoring | New query | `GET /api/assets/monitoring` | Already queries all 4 alert types |
| Document text extraction | Custom parser | `extractTextFromBuffer()` in `document-extraction.ts` | PDF/Excel/CSV/text supported |
| Rate limiting on AI endpoints | Custom middleware | `rateLimit()` in `lib/rate-limit.ts` | Already used in `/api/ai/search` |

**Key insight:** The Phase 12 AI infrastructure means Phase 18 is almost entirely a UX integration problem, not an AI infrastructure problem.

---

## Common Pitfalls

### Pitfall 1: Conversation State Split Between Dropdown and Side Panel
**What goes wrong:** If `conversation[]` state lives in `command-bar.tsx` (currently it does), when the GP pops out to the side panel, the conversation resets because the component is different.
**Why it happens:** Component-local state doesn't survive when switching render modes.
**How to avoid:** Move `conversation`, `isSearching` state into `CommandBarProvider` during this phase. Both `CommandBar` (dropdown) and `CommandBarSidePanel` read from the same context.
**Warning signs:** Pop-out button causes conversation to disappear.

### Pitfall 2: Page Context Not Injected Into AI Calls
**What goes wrong:** GP asks "summarize this deal" on a deal page, but AI doesn't know which deal.
**Why it happens:** Current `ai-service.ts` receives only `query` and `firmId` — no page context.
**How to avoid:** Add `pageContext` parameter to `searchAndAnalyze()` and thread it through the system prompt. Command bar passes `pageContext` from provider. Add to `AISearchSchema` Zod schema.
**Warning signs:** AI gives generic portfolio answers to specific-page questions.

### Pitfall 3: AI Action Ambiguity Causing Silent Failures
**What goes wrong:** GP types "assign deal to Sarah" — there are 5 active Sarahs. AI picks wrong one, task creates incorrectly.
**Why it happens:** LLM resolves ambiguous names to first match or hallucinates IDs.
**How to avoid:** Action parsing prompt must return `AMBIGUOUS` type when confidence is low. Confirmation UI shows selected entity name (not just ID) so GP can verify. Never auto-execute without showing confirmation.
**Warning signs:** Tasks/assignments created with wrong linked entities.

### Pitfall 4: `NotificationType` Enum Missing COVENANT_BREACH
**What goes wrong:** Trying to create a `Notification` record for a covenant breach fails at runtime because `COVENANT_BREACH` is not in the enum.
**Why it happens:** The current `NotificationType` enum in `schema.prisma` has: `STAGE_CHANGE`, `IC_VOTE`, `DOCUMENT_UPLOAD`, `CAPITAL_CALL`, `TASK_ASSIGNED`, `CLOSING_UPDATE`, `GENERAL`, `DISTRIBUTION`, `REPORT`. No breach type.
**How to avoid:** For Phase 18, don't create `Notification` model records for breach alerts. Use the `localStorage` freshness approach for proactive command bar mentions. Avoid schema changes. If a DB record is needed in future, use `GENERAL` type with a subject prefix.
**Warning signs:** Prisma validation errors on `NotificationType`.

### Pitfall 5: LP Update Prompt Hitting Token Limits
**What goes wrong:** Gathering all assets, capital calls, and distributions for a large fund can produce a prompt that exceeds model context limits.
**Why it happens:** Unrestricted data gathering for large portfolios.
**How to avoid:** Cap data sent to LLM: max 10 assets (by fair value), max 5 recent capital calls, max 5 recent distributions. Use `fmt()` for numbers to keep them short. Apply the same `MAX_EXTRACTED_CHARS` pattern from `document-extraction.ts`.
**Warning signs:** LLM errors about context length, or very slow responses.

### Pitfall 6: DD/IC Memo Trigger Timeout in Command Bar
**What goes wrong:** Command bar submits "generate DD summary for this deal" and the `/api/deals/[id]/dd-analyze` endpoint takes 30-60 seconds. User sees perpetual spinner.
**Why it happens:** DD analysis is a long-running AI call. The `dd-analyze` endpoint has `maxDuration = 60` (Vercel Hobby cap).
**How to avoid:** Show a specific "Generating analysis — this may take up to 60 seconds" message in the command bar. Don't treat this like a normal 2-second AI query. Optionally redirect to the deal DD tab after triggering.
**Warning signs:** 30+ second spinner with no feedback, or Vercel 504 timeout.

### Pitfall 7: `classifyIntent` Over-Triggering AI on Short Queries
**What goes wrong:** User types "deals" or "tasks" and expects fuzzy navigation, but AI activates and makes an LLM call.
**Why it happens:** Intent detection threshold too aggressive.
**How to avoid:** Short queries (≤2 words) without clear question words → always `fuzzy_search`. The existing fuzzy search + DB search already handles navigation well; only activate AI for clear NL queries.
**Warning signs:** Every 2-word search triggers an LLM call with 1-2s latency.

---

## Code Examples

Verified patterns from direct codebase inspection:

### Calling Existing AI Search (Current Pattern)
```typescript
// src/app/api/ai/search/route.ts — already exists
// Called from command-bar.tsx:
const aiRes = await fetch("/api/ai/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: text, firmId }),
}).then(r => r.json());
```

### getUserAIConfig Pattern (Phase 12 — Authoritative)
```typescript
// src/lib/ai-config.ts
// Always use this — handles user key → tenant key → none fallback
const aiClient = await createUserAIClient(userId, firmId);
if (!aiClient) {
  return { message: "No API key configured. Add one in Settings → AI Configuration." };
}
const { client, model } = aiClient;
```

### Task Creation (POST /api/tasks)
```typescript
// POST /api/tasks — existing endpoint, supports full context linking
const task = await fetch("/api/tasks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Schedule site visit",
    priority: "HIGH",
    contextType: "DEAL",
    contextId: dealId,
    dealId: dealId,
    assigneeId: userId,
  }),
}).then(r => r.json());
```

### Monitoring API (Existing)
```typescript
// GET /api/assets/monitoring?firmId=X
// Returns:
{
  covenantBreaches: [...],   // covenant with asset name + link
  leaseExpirations: [...],   // lease with days until expiry
  loanMaturities: [...],     // credit agreements maturing
  overdueReviews: [...],     // assets with past nextReview date
  totalAlerts: number,
}
```

### DD Analyze Trigger (Existing Endpoint)
```typescript
// POST /api/deals/[id]/dd-analyze
// Body:
{
  type: "DD_FINANCIAL" | "DD_LEGAL" | ... | "IC_MEMO",
  categoryName?: string,
  rerun?: boolean,
}
// maxDuration = 60 (Vercel Hobby cap)
```

### JSON Repair (For New AI Endpoints)
```typescript
import { jsonrepair } from "jsonrepair";
// Use when parsing LLM JSON responses that may be malformed:
const raw = response.choices[0]?.message?.content || "{}";
const parsed = JSON.parse(jsonrepair(raw));
```

### Fire-and-Forget AI Pattern (Phase 12 Established)
```typescript
// For non-blocking AI operations:
triggerMonitoringCheck(firmId)
  .catch(err => console.error("[monitoring] Background check failed:", err));
// DO NOT await — never block primary operation
```

### Page Context in AppShell Side Panel
```tsx
// app-shell.tsx — where to add the side panel
<div className="flex h-screen bg-gray-50 font-sans text-gray-900">
  <Sidebar portal={portal} onPortalChange={handlePortalChange} />
  <div className="flex-1 overflow-y-auto">
    <TopBar title={title} />
    <div className="p-6">
      <PageErrorBoundary>{children}</PageErrorBoundary>
    </div>
  </div>
  {isSidePanelOpen && <CommandBarSidePanel />}  {/* NEW */}
  <OnboardingModal />
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Phase 18 Change | Impact |
|--------------|------------------|-----------------|--------|
| All queries → LLM | Intent classification first | Add `classifyIntent()` before AI call | Fuzzy search stays fast, AI activates only when needed |
| Component-local conversation | Provider-level conversation state | Move state to `CommandBarProvider` | Side panel and dropdown share conversation |
| No page context | Page-aware AI | `pageContext` injected into system prompt | "This deal" resolves to actual current deal |
| AI = query-only | AI = query + action | New `/api/ai/execute` endpoint | Full CRUD from natural language |
| No alert freshness | localStorage timestamp | `lastAlertSeenAt` in provider | "Since last visit" proactive mention |

**Current state of `ai-service.ts` `searchAndAnalyze()`:**
- Takes `query: string` and `firmId: string` — no page context
- Returns `{ message, searchResults, suggestions }` — no action capability
- Single LLM call with portfolio aggregate context
- Rate-limited via `rateLimit()` in the search endpoint

**Phase 18 extends this without breaking backward compatibility.**

---

## Open Questions

1. **How to pass `userId` to `/api/ai/execute` for `getUserAIConfig`?**
   - What we know: `/api/ai/search` uses `getAuthUser()` for rate limiting but calls `createAIClient(firmId)` (firm key only, not user key)
   - What's unclear: Whether the execute endpoint should use user-level or firm-level AI key
   - Recommendation: Use `createUserAIClient(userId, firmId)` in the execute endpoint — consistent with Phase 12 decision that user key takes precedence. `getAuthUser()` provides userId.

2. **Conversation state persistence: session-scoped vs localStorage?**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: How important cross-refresh persistence is for the GP workflow
   - Recommendation: Session-scoped (React state in provider) — conversations naturally end when the page refreshes. The side panel persists within a session, which is the primary value. Adding localStorage persistence complicates state sync without clear user value.

3. **Side panel width and interaction with page content**
   - What we know: Phase 12 DocumentExtractionPanel is a right drawer. AppShell uses `flex h-screen`.
   - Recommendation: Side panel should be 380px fixed-width, overlaying content (not pushing it). Use `position: fixed; right: 0; top: 0; height: 100vh; z-index: 40` to sit above page content but below modals. This avoids layout shifts when panel opens/closes.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts in root, globals: true, environment: node) |
| Config file | `/Users/sahilnandwani/Desktop/Investor Portal Claude App/atlas/vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/ai-features.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | `classifyIntent("show me deals over $10M")` returns `"nl_query"` | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ Wave 0 |
| AI-01 | `classifyIntent("deals")` returns `"fuzzy_search"` | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ Wave 0 |
| AI-02 | `classifyIntent("create a deal called Acme")` returns `"nl_action"` | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ Wave 0 |
| AI-06 | Alert freshness logic: alerts after `lastSeenAt` are "new" | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ Wave 0 |
| AI-03, AI-04, AI-05 | Manual — verify DD summary, IC memo, CIM extraction trigger via command bar | manual-only | N/A — LLM output not deterministic | N/A |
| AI-07 | Manual — verify LP update draft renders in AI panel | manual-only | N/A — LLM output not deterministic | N/A |
| AI-08 | Manual — verify task suggestions appear + "Add" creates task | manual-only | N/A — LLM output not deterministic | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/ai-features.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual browser verification of all 8 AI requirements before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/ai-features.test.ts` — covers AI-01 (intent classification), AI-02 (action intent), AI-06 (alert freshness logic)
- [ ] `src/lib/ai-nl-intent.ts` — the intent classification module itself (new file, needed by tests)

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/components/features/command-bar/command-bar.tsx` (548 lines) — full component read
- `src/components/features/command-bar/command-bar-provider.tsx` — full read
- `src/lib/ai-config.ts` (354 lines) — full read, confirms getUserAIConfig + AnthropicCompat
- `src/lib/ai-service.ts` — full read, confirms searchAndAnalyze + gatherContext + buildSystemPrompt
- `src/lib/command-bar-types.ts` — full read, confirms type definitions
- `src/lib/command-discovery.ts` — full read, confirms fuzzy engine
- `src/app/api/ai/search/route.ts` — full read, confirms rate limiting + parseBody pattern
- `src/app/api/assets/monitoring/route.ts` — full read, confirms 4 alert types + query structure
- `src/app/api/tasks/route.ts` — full read, confirms contextType/contextId support
- `src/lib/asset-monitoring-utils.ts` — full read, confirms categorizeLeaseExpiry + isOverdueReview
- `src/app/api/deals/[id]/dd-analyze/route.ts` (partial) — confirms maxDuration=60, IC_MEMO type
- `src/lib/dd-analysis-service.ts` (partial) — confirms 15+ workstream types, DDAnalysisResult shape
- `src/components/layout/app-shell.tsx` — full read, confirms layout structure for side panel placement
- `prisma/schema.prisma` (grep) — confirms Notification model, NotificationType enum (no COVENANT_BREACH)
- `src/lib/routes.ts` — confirmed APP_ROUTES structure
- `.planning/config.json` — confirmed nyquist_validation: true
- `vitest.config.ts` — confirmed test framework configuration

### Secondary (MEDIUM confidence)
- `src/lib/__tests__/asset-monitoring.test.ts` — confirms vitest test patterns used in this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct codebase inspection, nothing new needed
- Architecture: HIGH for patterns 1-6 (based on existing code structure); MEDIUM for exact prompt engineering (needs iteration)
- Pitfalls: HIGH — all pitfalls derived from direct schema inspection and existing code patterns
- Test infrastructure: HIGH — vitest config + existing test files confirmed

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable project, no external dependency changes expected)
