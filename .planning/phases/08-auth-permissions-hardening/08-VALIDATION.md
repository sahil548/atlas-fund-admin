---
phase: 8
slug: auth-permissions-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (established in Phase 1, zero-config TS/ESM) |
| **Config file** | none — runs as `vitest` directly |
| **Quick run command** | `npx vitest run src/lib` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | CORE-02 | unit | `npx vitest run src/lib/permissions` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | CORE-02 | unit | `npx vitest run src/lib/permissions` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | CORE-03 | unit | `npx vitest run src/lib/permissions` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | CORE-02 | manual | Browser/curl verification | N/A | ⬜ pending |
| 08-01-05 | 01 | 1 | CORE-03 | manual | Browser/curl verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/permissions.test.ts` — unit tests for `checkPermission()`, `getEffectivePermissions()`, entity-scope filter logic
- [ ] Framework install: already present (Vitest from Phase 1)

*Existing infrastructure covers framework needs. Only test file stubs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/api/notifications` ignores userId query param, uses session | CORE-02 | Requires real Clerk session to verify session-based lookup | Pass `?userId=other-user-id` in browser DevTools, verify own notifications returned |
| `/api/k1` returns 401 without session | CORE-02 | Requires curl without auth header | `curl localhost:3000/api/k1` → expect 401 JSON response |
| GP_TEAM user sees 403 on restricted areas | CORE-02 | Requires Clerk user with GP_TEAM role + specific permission config | Login as GP_TEAM user, attempt accessing restricted API endpoints |
| SERVICE_PROVIDER sees only allowed entities | CORE-03 | Requires Clerk user with SERVICE_PROVIDER role | Login as SERVICE_PROVIDER, verify entity list is filtered to entityAccess array |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
