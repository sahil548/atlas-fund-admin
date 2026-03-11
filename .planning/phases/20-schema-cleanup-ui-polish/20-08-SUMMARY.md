---
phase: 20-schema-cleanup-ui-polish
plan: 08
subsystem: ui
tags: [react, tailwind, typescript, custom-dropdown, animation, focus-trap, dark-mode, keyboard-nav]

# Dependency graph
requires:
  - phase: 20-07
    provides: "Any-removal and type safety cleanup; these UI upgrades assume clean TypeScript baseline"
provides:
  - "Animated modal with focus management and Escape key close"
  - "Custom keyboard-navigable Select dropdown replacing native HTML select"
  - "Tabs component with dark mode active and container styling"
  - "Button ghost variant for icon/toolbar actions"
affects: ["20-09", "any future UI work building on these primitives"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requestAnimationFrame visible state for CSS transition animations"
    - "Synthetic React.ChangeEvent<HTMLSelectElement> for backward-compatible custom inputs"
    - "Hidden native select for form submission + event emulation"
    - "mousedown outside-click dismissal pattern (same as CRM tag dropdown)"

key-files:
  created: []
  modified:
    - src/components/ui/modal.tsx
    - src/components/ui/select.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/button.tsx
    - src/components/features/dashboard/asset-allocation-chart.tsx

key-decisions:
  - "Select onChange emits synthetic React.ChangeEvent<HTMLSelectElement> — all 28+ existing consumers (e) => e.target.value work without changes"
  - "Hidden native select element retained in custom Select for form submission compatibility"
  - "Modal auto-focus uses 50ms setTimeout to let portal mount complete before querying DOM"
  - "asset-allocation-chart PieLabel cast via (props: unknown) => React.ReactNode to fix pre-existing Plan 07 type regression"

patterns-established:
  - "Animation pattern: useEffect + requestAnimationFrame + visible state + CSS transition classes"
  - "Custom input backward compat: emit synthetic event matching native element API"

requirements-completed: [UIPOL-01, UIPOL-02]

# Metrics
duration: 25min
completed: 2026-03-11
---

# Phase 20 Plan 08: UI Polish — Modal/Select/Tabs/Button Summary

**Animated modal with focus trap, custom keyboard-navigable Select dropdown (backward-compatible via synthetic events), Tabs dark mode, and Button ghost variant — all 40+ Modal and 28+ Select consumers work without changes**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-11T15:50:34Z
- **Completed:** 2026-03-11T16:15:00Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Modal upgraded: backdrop fade-in (opacity-0 to opacity-100 via requestAnimationFrame), panel slide-up + scale (translate-y-4 scale-95 to translate-y-0 scale-100), auto-focus first focusable element, Escape key close, improved close button with hover background
- Select upgraded: native HTML select replaced with custom combobox dropdown — ChevronDown indicator, ArrowUp/Down keyboard nav, Enter/Space to select, Escape to close, click-outside dismiss, selected option highlighted indigo, dark mode bg-gray-800; 28+ existing consumers unchanged via synthetic event emission
- Tabs upgraded: container gets dark:bg-gray-800 dark:border-gray-700; active tab gets dark:bg-indigo-500; inactive tabs get dark:hover:text-gray-200 dark:hover:bg-gray-700
- Button upgraded: ghost variant added (transparent bg, text-gray-600 hover:bg-gray-100, dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white)
- 822 tests passing, build zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade modal with animation + focus management** — `7c22e2e` (feat)
2. **Task 2: Upgrade select/tabs/button + fix chart type** — `5abfb96` (feat)

**Plan metadata commit:** TBD (docs: complete plan)

## Files Created/Modified

- `src/components/ui/modal.tsx` — Added visible state + requestAnimationFrame animation, auto-focus first focusable element (50ms delay), improved close button hover styles
- `src/components/ui/select.tsx` — Full rewrite from native `<select>` to custom combobox with keyboard nav, dark mode, focus management, backward-compatible synthetic event emission
- `src/components/ui/tabs.tsx` — Added dark:bg-gray-800/dark:border-gray-700 to container, dark:bg-indigo-500 to active tab, dark mode inactive tab states
- `src/components/ui/button.tsx` — Added ghost variant to variants map and ButtonProps type union
- `src/components/features/dashboard/asset-allocation-chart.tsx` — Fixed PieLabel type compatibility regression introduced by Plan 07 any-removal

## Decisions Made

- **Select onChange backward compat:** The new custom Select must emit `React.ChangeEvent<HTMLSelectElement>` (not a plain string value) because all 28+ consumers use `(e) => set(e.target.value)` pattern. Fixed by keeping a hidden `<select ref={hiddenSelectRef}>` and setting its value before emitting a synthetic event object.
- **Modal auto-focus delay:** Used 50ms `setTimeout` inside `useEffect` to allow React portal to finish mounting before querying the DOM for focusable elements.
- **asset-allocation-chart PieLabel:** This file was modified in Plan 07 (any-removal) which introduced a type regression — `renderLabel` returns `string` but Recharts `PieLabel` expects `ReactNode`. Fixed via `label={renderLabel as (props: unknown) => React.ReactNode}` cast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing PieLabel type error in asset-allocation-chart.tsx**
- **Found during:** Task 2 verification (build check)
- **Issue:** `renderLabel` function returns `string` but Recharts `PieLabel` type expects `ReactNode | ReactElement`. This regression was introduced by Plan 07's any-removal when it added typed interfaces but the function signature didn't match. The base build (at Task 1 commit) passed because this file's uncommitted changes weren't present in the clean baseline.
- **Fix:** Added `as (props: unknown) => React.ReactNode` cast on the `label` prop of the `<Pie>` component. The function already handled optional `name?` and `percent?` props correctly.
- **Files modified:** `src/components/features/dashboard/asset-allocation-chart.tsx`
- **Verification:** `npm run build` passes with zero type errors after fix
- **Committed in:** `5abfb96` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing type regression from Plan 07)
**Impact on plan:** Fix was required to unblock build verification. Out-of-scope discovery but directly blocking task completion.

## Issues Encountered

- Git stash during baseline verification (to confirm pre-existing errors vs. our changes) temporarily reverted Task 2 file changes. Stash pop restored them. No data loss.
- Build lock collision from parallel build process — resolved by removing `.next/lock` before retrying.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 UI primitives upgraded and backward-compatible with zero consumer changes needed
- Modal, Select, Tabs, Button can all be used as-is by Phase 20 Plan 09 (LP dark mode) and any future phases
- ghost Button variant is available for use in any future icon-button / toolbar pattern

---
*Phase: 20-schema-cleanup-ui-polish*
*Completed: 2026-03-11*
