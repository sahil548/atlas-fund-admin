---
phase: 12
slug: ai-configuration-document-intake
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-09
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project uses TypeScript build + manual browser testing |
| **Config file** | None — no test framework configured |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual smoke test
- **Before `/gsd:verify-work`:** Full build must pass + all manual checks green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | AICONF-02, AICONF-05 | build + manual | `npm run build` | N/A | ⬜ pending |
| 12-01-02 | 01 | 1 | AICONF-03, AICONF-04 | build + manual | `npm run build` | N/A | ⬜ pending |
| 12-02-01 | 02 | 1 | DOC-01 | build + manual | `npm run build` | N/A | ⬜ pending |
| 12-02-02 | 02 | 1 | DOC-02 | build + manual | `npm run build` | N/A | ⬜ pending |
| 12-02-03 | 02 | 1 | DOC-03 | build + manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install — project relies on TypeScript build verification + manual browser testing per CLAUDE.md workflow.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GP_ADMIN saves tenant AI config | AICONF-01 | Existing UI — verify preserved | Navigate to /settings → AI Configuration tab, save key |
| GP_ADMIN toggles AI per user | AICONF-02 | UI interaction + DB state | Navigate to /settings → Users & Access, toggle AI column |
| User sets personal AI config in profile | AICONF-03 | New page, form interaction | Navigate to /profile → AI Settings section, save key |
| Key fallback chain works | AICONF-04 | Multi-state browser check | Test with/without personal key, with/without tenant key |
| SERVICE_PROVIDER default off | AICONF-05 | DB default + UI display | Create SERVICE_PROVIDER user, verify aiEnabled = false |
| Upload triggers AI extraction | DOC-01 | Async processing, file upload | Upload PDF to deal documents, verify status badge changes |
| Extracted fields linked to parent | DOC-02 | Data relationship verification | Apply extracted fields, verify parent record updated |
| Status badge + preview panel | DOC-03 | Visual UI + interaction | Upload doc, verify badge; click to see side panel |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
