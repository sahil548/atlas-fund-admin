---
phase: 18
slug: ai-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts in root, globals: true, environment: node) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/__tests__/ai-features.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/ai-features.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | AI-01 | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | AI-02 | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 1 | AI-06 | unit | `npx vitest run src/lib/__tests__/ai-features.test.ts` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 2 | AI-03 | manual | N/A — LLM output not deterministic | N/A | ⬜ pending |
| 18-03-02 | 03 | 2 | AI-04 | manual | N/A — LLM output not deterministic | N/A | ⬜ pending |
| 18-03-03 | 03 | 2 | AI-05 | manual | N/A — LLM output not deterministic | N/A | ⬜ pending |
| 18-04-01 | 04 | 2 | AI-07 | manual | N/A — LLM output not deterministic | N/A | ⬜ pending |
| 18-04-02 | 04 | 2 | AI-08 | manual | N/A — LLM output not deterministic | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/ai-features.test.ts` — stubs for AI-01 (intent classification), AI-02 (action intent), AI-06 (alert freshness)
- [ ] `src/lib/ai-nl-intent.ts` — intent classification module (new file, needed by tests)

*Existing infrastructure covers remaining requirements (AI-03, AI-04, AI-05 are LLM-dependent; AI-07, AI-08 are manual browser verification).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CIM extraction via command bar pre-fills deal fields | AI-03 | LLM output not deterministic | Upload CIM → command bar "extract terms from this CIM" → verify fields pre-fill |
| DD summary via command bar | AI-04 | LLM output not deterministic | Navigate to deal in DD → command bar "generate DD summary" → verify summary renders |
| IC memo draft via command bar | AI-05 | LLM output not deterministic | Navigate to deal → command bar "draft IC memo" → verify memo content |
| LP update draft in AI panel | AI-07 | LLM output not deterministic | Command bar "draft LP update for Fund III" → verify draft renders |
| Task suggestions with one-click create | AI-08 | LLM output not deterministic | Command bar "what should I do next on this deal?" → verify suggestions + Add button creates task |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
