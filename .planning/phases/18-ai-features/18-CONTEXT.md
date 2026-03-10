# Phase 18: AI Features - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The command bar understands natural language queries and can execute actions across all major models, AI assists with deal analysis and document extraction across the deal lifecycle, and the portfolio is monitored for covenant breaches with automated in-app alerts. Requirements: AI-01 through AI-08.

Note: AI-03 (CIM extraction), AI-04 (DD summary), and AI-05 (IC memo) are partially built from Phase 12 document extraction and the existing `dd-analyze` endpoint. This phase wires them into the AI command bar experience and fills any gaps.

</domain>

<decisions>
## Implementation Decisions

### Command bar NL experience (AI-01, AI-02)
- Command bar (Cmd+K) remains the **universal entry point** for search, navigation, and AI — not a separate interface
- Existing fuzzy search + DB search behavior preserved. AI layer activates when query is clearly natural language
- AI responses appear **inline in the expanded command bar dropdown** by default
- **Pop-out button** allows GP to move the conversation into a **persistent side panel** for continued interaction while navigating the app
- **Always page-aware** — AI knows the current page context (which deal, asset, entity the GP is viewing). "Summarize this deal" on a deal detail page means that deal
- **Conversational with follow-up support** — maintains conversation state within a session. GP can chain queries: "show deals over $10M" → "which are in DD?" → "assign top one to Sarah"
- **Query/action split UX**: read-only queries (show me, what's, how many) return results instantly; mutations (create, assign, log, update, delete) show a confirmation step with pre-filled editable fields before executing
- **Full CRUD scope** — not limited to the 4 actions in requirements. The command bar should support creating/updating any major model (deals, assets, entities, tasks, contacts, capital calls, distributions, notes, meetings). This is the **AI-first UX foundation**
- Existing command bar voice input stays — works with NL queries too

### Automated covenant breach alerts (AI-06)
- **In-app notifications + command bar proactive mentions** — no email digest for now
- Monitoring checks run **on page load** (dashboard load, monitoring view) — no Vercel Cron or background job infrastructure
- **Flag-only alerts** — "Covenant X on Asset Y is breached" with link to asset. No AI analysis of why or remediation suggestions
- Command bar proactively surfaces alerts: "Heads up: 2 new covenant breaches detected since your last visit"
- Alert types from existing monitoring: covenant breaches, lease expirations (90/180 day), loan maturities, overdue asset reviews

### AI task suggestions (AI-08)
- Suggestions surface **in the AI panel only** (command bar dropdown or popped-out side panel), not on detail pages
- **On-demand only** — GP asks "what should I do next on this deal?" and AI responds. No unsolicited suggestions
- **One-click task creation** — each suggestion has an "Add" button that creates the task immediately, linked to the relevant deal/asset/entity context
- Context depth at Claude's discretion — may include deal stage, asset type, recent activity, time gaps, missing fields, upcoming deadlines

### LP communication drafting (AI-07)
- Accessible through the AI command bar / side panel — GP asks "draft an LP update for Fund III" and AI generates it
- Specific format and data sources at Claude's discretion

### Deal lifecycle AI (AI-03, AI-04, AI-05)
- CIM extraction (AI-03): Document extraction pipeline from Phase 12 already handles this. This phase ensures extracted deal terms can pre-fill deal fields via the AI panel ("extract terms from this CIM and fill the deal")
- DD summary (AI-04): `dd-analyze` endpoint with workstream analysis already exists. This phase wires it into the command bar ("generate DD summary for this deal")
- IC memo (AI-05): IC memo generation already exists in `dd-analyze` with auto-scoring. This phase makes it accessible via command bar ("draft IC memo for Deal X")

### Claude's Discretion
- NL intent detection algorithm (how to distinguish fuzzy search from AI query)
- Side panel layout, sizing, and animation
- Conversation state persistence approach (session-scoped vs persisted)
- AI prompt engineering for portfolio-aware responses
- Context depth for task suggestions (deal stage only vs full context analysis)
- LP update communication format and data aggregation approach
- How "pop-out" transition works between dropdown and side panel
- Alert freshness tracking ("since last visit" detection mechanism)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Command bar** (`src/components/features/command-bar/command-bar.tsx`, 548 lines): Fuzzy search, voice input, DB search across 9 models, conversation state scaffolding, Cmd+K shortcut. Foundation for NL layer
- **Command bar provider** (`src/components/features/command-bar/command-bar-provider.tsx`): Context provider with open/close state management
- **Command discovery** (`src/lib/command-discovery.ts`): 100-point fuzzy matching engine for search results
- **AI config** (`src/lib/ai-config.ts`, 354 lines): Unified OpenAI/Anthropic client, key encryption, user→tenant fallback chain, connection testing
- **DD analysis service** (`src/lib/dd-analysis-service.ts`, 628 lines): 15+ workstream types, prompt building, JSON repair, retry logic. Already generates DD summaries and IC memos
- **DD analyze endpoint** (`src/app/api/deals/[id]/dd-analyze/route.ts`, 500+ lines): Workstream + IC memo analysis, auto-task creation, deal stage advancement
- **Document extraction** (`src/lib/document-extraction.ts`): PDF/Excel/CSV text extraction + AI summarization pipeline
- **Asset monitoring** (`src/app/api/assets/monitoring/route.ts`): Covenant breach, lease expiry, loan maturity, overdue review tracking
- **Monitoring utils** (`src/lib/asset-monitoring-utils.ts`): `categorizeLeaseExpiry()`, `isOverdueReview()` helpers
- **Command search API** (`src/app/api/commands/search/route.ts`): Parallel DB search across deals, entities, assets, investors, contacts, companies, documents, tasks, meetings
- **Routes registry** (`src/lib/routes.ts`): APP_ROUTES — single source of truth for all navigation targets
- **Command bar types** (`src/lib/command-bar-types.ts`): CommandAction, SearchResult, AIResponse type definitions

### Established Patterns
- **AI client creation**: `getUserAIConfig()` → `createAIClient()` with OpenAI compatibility wrapper for Anthropic
- **Fire-and-forget**: AI operations use `.catch()` pattern — never block primary operations
- **SWR data fetching**: All client-side data via SWR hooks with revalidation
- **Side panel pattern**: Document extraction preview uses right-side drawer (Phase 12) — reusable for AI panel pop-out
- **Notification infrastructure**: Email (Resend) + SMS (Twilio) + in-app notification model already exists

### Integration Points
- **Command bar component**: Needs NL intent detection layer + AI response rendering + action confirmation UI
- **Command bar provider**: Needs expanded state for side panel mode + conversation persistence
- **Dashboard page**: Needs monitoring alert check on load + alert badge/notification display
- **Asset monitoring API**: Needs alert generation and freshness tracking (last-seen timestamp)
- **Task creation API** (`POST /api/tasks`): Already supports contextType/contextId linking — one-click task creation can use existing endpoint

</code_context>

<specifics>
## Specific Ideas

- "I really want the command bar to be the foundation for an AI-first UX" — the command bar isn't just a feature, it's the primary way the GP should be able to interact with Atlas over time
- Command bar should feel natural — "almost anything" should be executable from it
- The pop-out to side panel pattern lets the GP keep a conversation going while navigating the main app — like having an assistant sitting beside you

</specifics>

<deferred>
## Deferred Ideas

- **Email digest for alerts** — skip for now, add when cron infrastructure exists (Vercel Cron or similar)
- **AI remediation suggestions for breaches** — flag-only for now, AI analysis of why/how-to-fix deferred
- **Proactive task suggestions** — on-demand only for now; proactive ("I noticed Deal X has been idle...") deferred
- **LP communication email delivery** — drafting available via AI panel; actual sending/formatting as PDF deferred

</deferred>

---

*Phase: 18-ai-features*
*Context gathered: 2026-03-09*
