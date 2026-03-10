---
phase: 20
slug: schema-cleanup-ui-polish
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 20-01-01 | 01 | 0 | INTEG-04, SCHEMA-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 0 | INTEG-03, INTEG-06 | unit | `npm run test` | ❌ W0 (fix mock) | ⬜ pending |
| 20-02-01 | 02 | 1 | INTEG-03 | unit + build | `npm run test && npm run build` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 1 | INTEG-01, INTEG-02 | unit + build | `npm run test && npm run build` | ✅ | ⬜ pending |
| 20-03-01 | 03 | 1 | INTEG-04 | grep count | `grep -rn "console\.\(log\|warn\|error\)" src/lib/ --include="*.ts" \| grep -v "__tests__" \| grep -v "logger.ts" \| wc -l` | n/a | ⬜ pending |
| 20-03-02 | 03 | 1 | INTEG-04 | grep count | `grep -rn "console\.\(log\|warn\|error\)" src/app/api/ --include="*.ts" \| grep -v "__tests__" \| wc -l` | n/a | ⬜ pending |
| 20-04-01 | 04 | 2 | SCHEMA-03 | build | `npx prisma validate && npm run build` | n/a | ⬜ pending |
| 20-04-02 | 04 | 2 | SCHEMA-04 | build + test | `npm run build && npm run test` | n/a | ⬜ pending |
| 20-05-01 | 05 | 2 | SCHEMA-02 | grep + build | `grep -rn "await req\.json()" src/app/api/ --include="*.ts" \| grep -v "parseBody" \| grep -v "__tests__" \| grep -v "formData" \| wc -l` | n/a | ⬜ pending |
| 20-05-02 | 05 | 2 | SCHEMA-02 | build + test | `npm run build && npm run test` | n/a | ⬜ pending |
| 20-06-01 | 06 | 2 | INTEG-09 | grep count | `grep -rn "console\.\(log\|warn\|error\)" src/ --include="*.ts" --include="*.tsx" \| grep -v "__tests__" \| grep -v "logger.ts" \| wc -l` | n/a | ⬜ pending |
| 20-06-02 | 06 | 2 | INTEG-09 | build + test | `npm run build && npm run test` | n/a | ⬜ pending |
| 20-07-01 | 07 | 3 | UIPOL-05, UIPOL-06 | grep + build | `grep -rn "as any" src/ --include="*.ts" --include="*.tsx" \| grep -v "__tests__" \| wc -l` | n/a | ⬜ pending |
| 20-07-02 | 07 | 3 | INTEG-05, INTEG-06, INTEG-07, INTEG-08 | build + test | `npm run build && npm run test` | n/a | ⬜ pending |
| 20-08-01 | 08 | 3 | UIPOL-01 | build | `npm run build` | n/a | ⬜ pending |
| 20-08-02 | 08 | 3 | UIPOL-02 | build | `npm run build` | n/a | ⬜ pending |
| 20-09-01 | 09 | 3 | UIPOL-03 | grep count | `grep -rn "bg-white\b" src/app/\(lp\)/ --include="*.tsx" \| grep -v "dark:" \| wc -l` | n/a | ⬜ pending |
| 20-09-02 | 09 | 3 | UIPOL-04 | build | `npm run build` | n/a | ⬜ pending |
| 20-10-01 | 10 | 4 | ALL | manual | Full human verification checklist | n/a | ⬜ pending |

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
| GP pages dark mode | UIPOL-03 | Full-page visual audit | Navigate GP pages in dark mode, spot-check backgrounds |
| Deal to asset transition | INTEG-05 | End-to-end workflow | Close a deal, verify asset created with correct data |
| Capital call to LP metrics | INTEG-06 | End-to-end workflow | Fund a capital call, verify LP dashboard metrics update |
| AI command bar queries | INTEG-07 | End-to-end workflow | Ask AI about deals/assets, verify relevant results |
| Dashboard aggregation | INTEG-08 | End-to-end workflow | Check dashboard stats match actual data |
| Database indexes | SCHEMA-03 | Infrastructure verification | Run `npx prisma studio` or query pg_indexes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
