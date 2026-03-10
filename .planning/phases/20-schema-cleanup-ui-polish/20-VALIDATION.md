---
phase: 20
slug: schema-cleanup-ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | package.json `"test": "vitest run"` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~1.45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + build zero errors
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | INTEG-06 | unit | `npm run test` | ✅ (fix mock) | ⬜ pending |
| 20-01-02 | 01 | 0 | INTEG-03 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 0 | INTEG-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 20-01-04 | 01 | 0 | SCHEMA-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | INTEG-01 | unit | `npm run test` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 1 | INTEG-02 | unit | `npm run test` | ✅ | ⬜ pending |
| 20-02-03 | 02 | 1 | INTEG-03 | manual smoke | Open deal, generate IC memo, verify no infinite spinner | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 1 | SCHEMA-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 20-03-02 | 03 | 1 | SCHEMA-02 | integration | `npm run test` | ❌ W0 | ⬜ pending |
| 20-03-03 | 03 | 1 | SCHEMA-03 | manual | `npx prisma studio` | n/a | ⬜ pending |
| 20-04-01 | 04 | 2 | UIPOL-01 | manual smoke | Open modal in dark mode | n/a | ⬜ pending |
| 20-04-02 | 04 | 2 | UIPOL-02 | manual smoke | Open select in dark mode | n/a | ⬜ pending |
| 20-04-03 | 04 | 2 | UIPOL-03 | manual smoke | Toggle dark mode on each LP page | n/a | ⬜ pending |
| 20-05-01 | 05 | 2 | UIPOL-05 | build | `npm run build` | n/a | ⬜ pending |
| 20-05-02 | 05 | 2 | UIPOL-06 | build + grep | `npm run build` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fix `src/app/api/lp/__tests__/dashboard.test.ts` — add `findMany: vi.fn().mockResolvedValue([])` to metricSnapshot mock (INTEG-06)
- [ ] `src/lib/__tests__/bug03-timeout.test.ts` — covers INTEG-03: API returns 504 on timeout, not hanging promise
- [ ] `src/lib/__tests__/logger.test.ts` — covers INTEG-04: logger.error always logs, logger.info/debug only in dev
- [ ] `src/lib/__tests__/json-schemas.test.ts` — covers SCHEMA-01: each JSON blob Zod schema parses valid and rejects invalid shapes

*Existing infrastructure covers framework setup (vitest already installed).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Modal animation in dark mode | UIPOL-01 | Visual polish — CSS-only | Open any modal, toggle dark mode, verify backdrop + animation |
| Custom select in dark mode | UIPOL-02 | Visual polish — DOM interaction | Open any select dropdown in dark mode, verify contrast |
| LP pages dark mode | UIPOL-03 | Full-page visual audit | Navigate each LP page in dark mode, verify no hardcoded bg-white |
| Deal → asset transition | INTEG-05 | End-to-end workflow | Close a deal, verify asset created with correct data |
| Database indexes | SCHEMA-03 | Infrastructure verification | Run `npx prisma studio` or query pg_indexes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
