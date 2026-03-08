# Pitfalls Research

**Domain:** Module-by-module polish and feature gap closure on a live Next.js 16 / React 19 / Tailwind CSS 4 / SWR 2 production system (Atlas — family office operating system)
**Researched:** 2026-03-08
**Confidence:** HIGH — derived directly from codebase audit, known bug catalogue, and established patterns in the Atlas codebase

---

## Critical Pitfalls

### Pitfall 1: SWR Cache Key Mismatch After Adding New Mutations

**What goes wrong:**
A new mutation (POST/PUT/DELETE) is added to a module during the polish pass. The `revalidateKeys` array in `useMutation()` or the manual `mutate()` call uses a slightly different URL than the SWR key used to fetch data elsewhere. The UI shows stale data after the action, or silently fails to refresh. This is invisible to the developer if they only test the happy path.

**Why it happens:**
Atlas has two mutation patterns (Pattern A: raw `fetch` + `mutate()`, Pattern B: `useMutation` hook). When a new action is added, the developer writes the `revalidateKeys` from memory instead of checking the exact SWR `useSWR(key)` call elsewhere. Keys must be byte-identical including query strings. Example: a new capital call action revalidates `/api/capital-calls` but the list page fetches `/api/capital-calls?firmId=${firmId}` — these are different keys, so the list never refreshes.

**How to avoid:**
Before writing any mutation during a polish pass, grep for the SWR key used on the list/detail page and copy it exactly. For keys that include `firmId`, the revalidation must also include `firmId`. Prefer Pattern B (`useMutation` with explicit `revalidateKeys`) over Pattern A (bare `mutate`) because it makes the key visible at the call site. Use the `mutate` function from `useSWR` scoped to the hook instead of the global `mutate` import when the key is dynamic.

**Warning signs:**
After a create/edit/delete, the action succeeds (toast fires) but the list or detail does not visually update until a hard refresh. Pay particular attention to pages that use multiple SWR calls (e.g., `investors/[id]/page.tsx` has five concurrent SWR fetches — invalidating only one leaves the others stale).

**Phase to address:**
Every module polish phase. Check before declaring any mutation complete.

---

### Pitfall 2: "use client" Missing on New or Split Components

**What goes wrong:**
A new component file is created as part of a polish pass (e.g., a new tab panel, a new inline editing widget, a new empty state with interactive elements). The `"use client"` directive is missing at the top. In Next.js App Router (Next.js 16), components default to Server Components. Hooks (`useState`, `useEffect`, `useSWR`, `useToast`, `useFirm`) silently fail — the component renders but state never updates, SWR never fires, and event handlers do nothing. TypeScript does not catch this.

**Why it happens:**
When doing a polish pass, developers often create new component files quickly and copy a skeleton from a non-hook component. Server Component is the default; omitting the directive is an easy mistake when context-switching across 25+ files.

**How to avoid:**
Every component file that uses any hook (`useState`, `useEffect`, `useSWR`, `useToast`, `useFirm`, `useUser`, `useInvestor`, `useRouter`, `useParams`, `useSearchParams`) must start with `"use client"`. Make it the first line, before imports. Add this to the mental checklist for every new file created during the polish pass.

**Warning signs:**
Component renders correctly on first load but does not respond to user interaction. Console shows "You're importing a component that needs `useState`. It only works in a Client Component" or similar. Build passes; the bug is runtime-only.

**Phase to address:**
All phases. Highest risk when adding new tab panels to existing detail pages (Deals, Assets, Investors) or new section components to the dashboard.

---

### Pitfall 3: Toast Crash from Object Errors

**What goes wrong:**
A new form or action passes an API error directly to `toast.error()` without checking if it is a string. When the API returns a Zod validation error, the `error` field is an object (`{ formErrors: [], fieldErrors: {} }`), not a string. React crashes with "Objects are not valid as a React child" — the entire page white-screens, not just the toast.

**Why it happens:**
The existing codebase documents this pattern in `coding-patterns.md` and several existing components handle it correctly, but during a fast polish pass it's easy to write `toast.error(data.error || "Failed")` without checking the type first. This is especially likely when adapting error handling from a component that only calls non-Zod endpoints.

**How to avoid:**
```typescript
// Every error handler must follow this pattern:
const data = await res.json().catch(() => ({}));
const msg = typeof data.error === "string" ? data.error : "Operation failed";
toast.error(msg);
```
Never pass `data.error`, `err.message`, or any untrusted value to `toast.error()` without first confirming it is a string.

**Warning signs:**
White screen (full page crash) after a form submission that returns a 400 error. The error only surfaces when validation fails, not on success — so it will pass casual happy-path testing but crash on invalid input.

**Phase to address:**
All phases. Most dangerous when adding new forms during the Capital Activity, LP Portal, and Settings polish passes.

---

### Pitfall 4: Shared Component Changes That Break Other Modules

**What goes wrong:**
During module polish, a shared UI primitive (`Button`, `Modal`, `Badge`, `FormField`, `StatCard`, `Tabs`) is modified to support a new prop or appearance needed by the current module. The change breaks or visually degrades all other modules that use the same component. Since Atlas has no tests, the regression is only caught by visual inspection — which, during a module-by-module pass, means it may not be caught until much later.

**Why it happens:**
There are ~25 GP pages and 5 LP pages using the same handful of primitives. A developer polishing the Deal Desk might make `Badge` slightly taller for better visual breathing room. This changes badge height everywhere: in the header stat cards, in the LP portal, in the Entities table, in the Capital Activity status column.

**How to avoid:**
When modifying any file in `src/components/ui/`, treat it as a breaking change. Before committing, visually spot-check every page listed in `APP_ROUTES` (`routes.ts`) that uses that component. When adding props, make them optional with a default that preserves existing behavior. Avoid changing default padding, margin, font-size, or color on any primitive — add a new variant instead.

**Warning signs:**
A polish change to a shared component that "looks great" on the current module. Before moving to the next module, scan for visual regressions by visiting at least: `/dashboard`, `/deals`, `/assets`, `/entities`, `/transactions`, `/lp-dashboard`.

**Phase to address:**
All phases. Highest risk during Dashboard and LP Portal polish because those modules depend on the most shared components (`StatCard`, `Badge`, `Tabs`).

---

### Pitfall 5: Pagination Breaking When Modifying List Pages

**What goes wrong:**
Atlas uses cursor-based pagination with SWR accumulation on several list pages. When a polish pass modifies the data fetching logic, table layout, or filter parameters on a list page, it breaks the accumulation. Symptoms: the list only shows the first page and "Load more" never appears, or clicking "Load more" resets the list to the first page instead of appending.

**Why it happens:**
Cursor-based SWR accumulation requires the fetch key to stay stable across page loads (except for the cursor parameter). If a developer adds a new filter parameter (`?firmId=...&status=...`) to the SWR key, the accumulation logic no longer recognizes the pages as belonging to the same list. The `PROJECT.md` explicitly calls out "Cursor-based with SWR accumulation" as a pattern that needs direct control.

**How to avoid:**
When adding filters or sort parameters to a paginated list, include them in the base key from the start and update the accumulation reducer to carry them forward. Test pagination explicitly after any change to a list page's fetch key: load the page, scroll/click to load a second page, change a filter — verify the list resets correctly, then verify load-more resumes from the correct position.

**Warning signs:**
After a filter change, the list shows records that don't match the filter. Or after clicking "Load more," the list jumps back to the top. Or the total record count in the list header doesn't match the actual count when paginating through.

**Phase to address:**
Deals list, Assets list, Transactions list, Directory contacts/companies lists. Highest risk in the Deals module polish (the most data-heavy list) and the Capital Activity module (transactions table has the most filters).

---

### Pitfall 6: Dark Mode Regression from Hardcoded Colors

**What goes wrong:**
Polish improvements add new UI elements with hardcoded `bg-white`, `text-gray-900`, `border-gray-200` without their dark mode equivalents (`dark:bg-gray-900`, `dark:text-gray-100`, `dark:border-gray-700`). On the surface, this looks fine. When users switch to dark mode (`ThemeProvider` persists preference in `localStorage`), new elements become unreadable: white boxes on dark backgrounds, black text on near-black backgrounds.

**Why it happens:**
Atlas already has a working dark mode. The existing components in `src/components/ui/` consistently use `dark:` variants. New elements written during a polish pass (empty states, new stat sections, new detail cards) often start from a "light mode first" approach and the dark variants get omitted.

**How to avoid:**
For every new Tailwind `bg-`, `text-`, or `border-` class added, immediately write the `dark:` counterpart. Use existing components as templates — `Modal`, `StatCard`, and `Badge` all correctly implement dark mode. Before declaring a module complete, toggle dark mode and do a full visual pass.

**Warning signs:**
Bright white cards or boxes that stand out visually when the app is in dark mode. Any element that uses `bg-white` without `dark:bg-gray-900` or similar.

**Phase to address:**
All modules. Dashboard and LP Portal are the most visible to real users (GP team and LPs check these daily), so dark mode regressions there are highest priority to prevent.

---

### Pitfall 7: Tailwind CSS 4 Class Conflicts with Existing Styles

**What goes wrong:**
Atlas uses Tailwind CSS 4. During a polish pass, a developer applies a more specific utility class that conflicts with an existing class on the same element. The more recently-applied class in the stylesheet wins, but this order is determined by Tailwind's generated CSS, not by the order in the `className` string. Result: the intended style silently does not apply, and the developer is confused why `text-sm` doesn't override the heading style.

**Why it happens:**
Tailwind CSS 4 changed how specificity works in some edge cases compared to v3. The `cn()` utility (`clsx` + `tailwind-merge`) is used consistently in Atlas and handles most conflicts correctly — but only if developers use `cn()` when combining conditional classes. If a developer writes `className={\`base-class ${conditional}\`}` using template literals instead of `cn("base-class", conditional)`, `tailwind-merge` is bypassed and the conflict is unresolved.

**How to avoid:**
Always use `cn()` from `@/lib/utils` when combining multiple Tailwind classes, especially when one set is conditional. Never use template literal string concatenation for Tailwind classes. The pattern `cn("base", isActive && "text-white")` is correct; `\`base ${isActive ? "text-white" : ""}\`` is wrong.

**Warning signs:**
A style change that visually "has no effect" even though the class appears in the HTML. This is the most common symptom of a merge conflict. Inspect the element in DevTools — if two conflicting classes are both present, `cn()` was not used.

**Phase to address:**
All phases. Highest risk when polishing components with many conditional states: deal stage badges, status indicators in the Capital Activity module, and portfolio metric color-coding.

---

### Pitfall 8: Scope Creep During "Polish" — Undocumented Data Model Changes

**What goes wrong:**
While polishing a module, a developer identifies that a feature gap requires a schema change (new field, new relation, new enum value). The schema change is made and `prisma db push` is run. On production, the schema is now out of sync until a manual migration runs. On dev, the change may silently break seeded data if the seed script does not account for the new field. More critically: a `--force-reset` in development wipes all existing seeded data, and if this accidentally runs against the production connection string, it destroys real data.

**Why it happens:**
The temptation during a polish pass is to "just add this one field" without formally planning the migration. Atlas has no automated CI migration step and no read replicas. The dev workflow (`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset`) uses an environment variable that signals data destruction is intentional — but that signal can be applied accidentally.

**How to avoid:**
During v1.1 polish, treat schema changes as out-of-scope unless the gap is unfixable without one. For any unavoidable schema change: (1) check `DATABASE_URL` in the `.env` file confirms it points to the dev database, not production; (2) add the new field to the seed script before running the reset; (3) document the change in `DATA-MODEL.md`; (4) deploy to Vercel before announcing the change is complete (Vercel deployment runs `prisma generate` but NOT `db push` — verify the migration strategy).

**Warning signs:**
A Prisma error like `Unknown field` or `The column ... does not exist` appearing on Vercel after a deployment. This means the schema was changed in `schema.prisma` and pushed to the codebase but the database was not migrated.

**Phase to address:**
All phases, but especially the gap-closure work in Deals (IC process fields), Capital Activity (fee calculation fields), and Settings (additional configuration fields). The v1.1 milestone should prefer filling gaps through UI/query logic rather than schema additions wherever possible.

---

### Pitfall 9: Loading Guards Missing on New Async Sections

**What goes wrong:**
A new section is added to an existing page that has its own SWR fetch. The developer adds the SWR call and renders the section directly below, forgetting that `data` is `undefined` on first render. The page crashes with `Cannot read properties of undefined (reading 'map')` or similar. This is a production crash for real users.

**Why it happens:**
The `coding-patterns.md` file documents this as the most common bug pattern (`// ❌ Forgetting loading guard`). When polishing existing pages, it's easy to add a new sub-section without realizing it has its own SWR call. The page was already rendering, so the developer may not check whether the new section's data needs a loading guard.

**How to avoid:**
Every SWR call must be paired with a loading guard before any data access:
```typescript
const { data, isLoading } = useSWR(key, fetcher);
if (isLoading || !data) return <div className="text-sm text-gray-400">Loading...</div>;
```
For sub-sections within a page (not the full page), use a local loading state within the section component rather than crashing the entire page. When adding a new `useSWR` call to an existing page, immediately add the guard — don't defer it to "after I see if it works."

**Warning signs:**
A section that renders fine when data is present but crashes on first page load or after a hard refresh when the SWR cache is cold. The crash disappears after a cache warm period, making it appear intermittent.

**Phase to address:**
All phases. Highest risk when adding new data sections to detail pages (deal detail, asset detail, investor detail) which already have multiple concurrent SWR calls.

---

### Pitfall 10: LP Portal Breakage When Polishing GP-Side Data

**What goes wrong:**
A GP-side polish change modifies how data is structured in an API response (e.g., adding pagination, changing a field name, restructuring a nested object). The LP portal pages (`/lp-dashboard`, `/lp-portfolio`, `/lp-activity`, `/lp-account`, `/lp-documents`) consume data from some of the same API routes or from routes that share models. The LP portal breaks silently because LP users are not typically online during development testing.

**Why it happens:**
The LP portal uses `InvestorProvider` and LP-specific routes (`/api/lp/[investorId]/...`), but the underlying data comes from the same Prisma models as the GP portal. When the GP-side polish modifies how assets, distributions, capital calls, or entities are queried, the LP-facing computed values (pro-rata exposure, capital account statement) can be affected. With only ~10 LPs and no automated tests, regressions go undetected until an LP logs in.

**How to avoid:**
After every GP-side polish change that touches `Asset`, `Distribution`, `CapitalCall`, `Commitment`, or `Investor` models or their API routes, do a targeted LP portal smoke test. Log in as one of the LP dev users (`user-jk` is GP_ADMIN; use one of the 5 LP users instead). Visit `/lp-dashboard`, `/lp-portfolio`, `/lp-account`, and `/lp-activity` and verify no crashes and that numbers are plausible.

**Warning signs:**
Numbers that change unexpectedly in the LP portal after a GP-side change. A crash on any LP page that worked before. The LP dashboard stat cards showing `$0` or `NaN` after a data structure change.

**Phase to address:**
Any phase touching Capital Activity, Assets, or Entity/Investor data models. LP Portal polish phase itself. Treat LP portal verification as a mandatory step after any phase that modifies financial data flows.

---

## Technical Debt Patterns

Shortcuts that seem reasonable during polish but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `any` type on prop interfaces (e.g., `deal: any`) | Avoids writing full TypeScript interfaces for complex deal/asset shapes | TypeScript stops catching prop errors; IDE loses autocomplete; bugs become harder to find | Acceptable in existing components where refactoring the type would be a large scope change; never for new code |
| Hardcoding empty state text inline | Fast to add during polish | Inconsistent tone/copy across modules; harder to update later | Acceptable for v1.1 if a separate copy-editing pass is planned |
| Adding `// eslint-disable @typescript-eslint/no-explicit-any` at file level | Suppresses all type warnings in the file | The entire file gets excluded from type safety; bugs accumulate silently | Never — disable at the specific line only, not at file level |
| Using `mutate()` global import instead of scoped `mutate` | Easier to write | Global mutate revalidates all SWR keys matching the pattern; can cause unnecessary re-fetches across unrelated components | Only for one-off revalidations where scope is clear |
| Skipping `"use client"` verification on split components | Faster to create component files | Silent runtime failures (hooks don't fire, no error shown) | Never acceptable |
| Inline styles for one-off spacing fixes | Fast polish fix | Breaks dark mode, bypasses design system, hard to audit | Never — use Tailwind utilities |
| Copying Zod schema inline in a new route file instead of importing from `schemas.ts` | Faster to implement | Schema drift: the same shape validated differently in different routes | Never — always import from `@/lib/schemas` |

---

## Integration Gotchas

Common mistakes when touching integrations during the polish pass.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SWR + `useMutation` hook | Passing `firmId`-scoped URL as base URL in `useMutation` but not including `firmId` in `revalidateKeys` | `revalidateKeys` must exactly match the SWR fetch keys including all query parameters |
| `Modal` (uses `createPortal`) | Nesting a `Modal` inside another `Modal` or inside a component that has `overflow: hidden` on a parent | Portals render into `document.body`; the z-index stack (`z-50`) may conflict if a parent has a competing `z-index`; keep modals flat and check z-index hierarchy |
| `FileUpload` + `FormData` | Setting `Content-Type: "multipart/form-data"` manually in the fetch call | Never set `Content-Type` on `FormData` requests — the browser must set the multipart boundary automatically |
| Recharts (`ResponsiveContainer`) | Placing `ResponsiveContainer` inside a flex container without a fixed height parent | `ResponsiveContainer` with `width="100%"` requires a parent with a defined pixel or percentage height; otherwise it collapses to zero height |
| Clerk auth (`useUser`) | Accessing `user.id` before checking `isLoaded` | Clerk user is `null` until loaded; guard with `if (!isLoaded || !user) return null` |
| `useParams` vs `use(params)` | Using the old `useParams()` hook pattern on new dynamic pages when the parent passes params as a Promise | Next.js 16 App Router: dynamic route `params` are Promises; use `use(params)` at the top of the component (or `await params` in async components) |
| TopBar QBO sync indicator | Adding a new module that triggers accounting events but does not update `lastSyncAt` | The TopBar polls `/api/accounting/connections` to show sync time; if a new accounting action does not update `lastSyncAt`, the indicator will mislead users |

---

## Performance Traps

Patterns that already exist in Atlas and become worse under polish additions.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Multiple concurrent SWR calls on a single page with no deduplication | Every tab switch or state change triggers a batch of API requests; noticeable network waterfall | Use a single consolidated API endpoint for detail pages (e.g., `GET /api/deals/:id` that includes all relations) rather than separate calls per tab | Noticeable now on `investors/[id]` which has 5 concurrent SWR calls; will worsen as polish adds more sub-sections |
| No pagination on list pages | Page load time grows linearly with record count | All list pages must implement cursor-based pagination; enforce page size (e.g., 50 records) | Already a known weakness per AUDIT.md; adding more list columns or sort options during polish makes it worse |
| `ResponsiveContainer` + Recharts on every dashboard card | Multiple pie/line charts each with their own resize observer cause layout thrash | Only render charts when the containing element is in the viewport (IntersectionObserver or lazy load) | Not a problem at current data scale; will become noticeable if dashboard gains 5+ charts |
| Tailwind animation classes (`animate-in`, `slide-in-from-right`) on high-frequency renders | Animation runs on every toast, every modal open; on lower-end hardware causes jank | Test on a throttled CPU in Chrome DevTools; use `prefers-reduced-motion` media query | Not a problem today; becomes a UX issue if polish adds animations to list item mounts or tab transitions |
| `body.style.overflow = "hidden"` in `Modal` not always cleaned up | If a modal unmounts without closing (e.g., page navigation), `overflow: hidden` stays on body, freezing scroll on the next page | The current Modal implementation correctly cleans up in the `useEffect` return; any new modal-like component must replicate this pattern | Can happen if developers create custom modal-like overlays without using the shared `Modal` component |

---

## Security Mistakes

Security issues specific to polishing a multi-tenant system with LP and GP users.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding a new API route during gap closure without `firmId` scoping | LP or GP from a different firm sees another firm's data; data isolation breach | Every `GET` route must filter by `firmId` extracted from the query string; every `POST`/`PUT` must verify the resource belongs to the requesting firm before modifying it |
| Exposing LP data in a GP-facing API route without role check | Service providers or GP_TEAM users see LP personal/financial data they should not | Atlas currently has no enforced RBAC middleware (documented gap in AUDIT.md); during polish, do not add new LP-sensitive fields to existing GP routes without noting this in the gap register |
| Storing the user-supplied AI API key in plaintext in a response | The key appears in browser network traffic or localStorage | `AIConfiguration.apiKey` should be masked in API responses (return `"sk-...masked"` not the full key); the Settings AI config page already masks this — do not add a new route that returns the unmasked key |
| Using `useParams()` to get an entity ID without verifying the entity belongs to the firm | A user who guesses another firm's entity UUID can access or modify it | All detail page API routes must verify `entity.firmId === firmId` from the request, not just match the ID |

---

## UX Pitfalls

Common UX mistakes specific to polishing a financial operations tool used by a small, expert team.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty states that say "No data yet" with no actionable CTA | GP team lands on a new module section and doesn't know what action to take; feels incomplete | Every empty state must include a primary CTA (e.g., "Create your first capital call") and, if the section is read-only (e.g., computed metrics with no data), explain what will populate it ("This will update once capital calls are funded") |
| Confirmation dialogs for non-destructive actions | Users feel friction for routine actions like editing a field or adding a note | Reserve `ConfirmDialog` for destructive actions only (delete, kill deal, reset). Use `variant="danger"` and describe what cannot be undone. Do not add confirm dialogs to save/update actions. |
| Polish changes that reorder tab panels on deal/asset detail pages | GP team has muscle memory for where things are; reordering tabs mid-production breaks workflows | Treat tab order as a permanent contract. Add new tabs at the end of the existing list. Never reorder or rename existing tabs. |
| Numbers that change without explanation | CFO sees NAV drop $500K after a polish pass that changed computation logic; panic ensues | Any polish change that modifies computed financial values (TVPI, DPI, MOIC, NAV) must be accompanied by a plain-English explanation of what changed and why the new number is correct |
| Inline edit fields (`inline-edit-field.tsx`) saving on blur | User accidentally saves a half-typed value when they click away | For financial fields (amounts, percentages, dates), consider requiring an explicit Save button rather than save-on-blur; for name/text fields, blur-save is acceptable |
| Loading states that look identical to empty states | GP team cannot tell if data is still loading or if there genuinely is nothing | Use skeleton loaders for initial loads, not just "Loading..." text. The current `isLoading` pattern returns plain text — this is acceptable for the polish milestone but should show a subtle animated placeholder on content-heavy pages. |

---

## "Looks Done But Isn't" Checklist

Things that appear complete after a module polish pass but are missing critical pieces.

- [ ] **New form fields:** Verify the field is wired to the API schema (Zod), not just the React state. Forms that set state but do not pass the new field in the API payload silently drop it.
- [ ] **Delete buttons:** Verify the `ConfirmDialog` is wired with `variant="danger"` and that the SWR cache is invalidated after deletion. A delete that shows success toast but keeps the item in the list is a confirmed SWR bug.
- [ ] **Empty states:** Every list/table must have an empty state. A table that renders zero rows with no explanation looks broken to the user.
- [ ] **Error states:** Every SWR fetch should handle the `error` return from `useSWR`. Currently most components only check `isLoading || !data`. Add `if (error) return <ErrorState />` to all polished components.
- [ ] **Mobile layout:** Atlas is not tested on mobile (per AUDIT.md). During v1.1 polish, at minimum verify that no new `grid-cols-N` or fixed-width layouts break on screens narrower than 768px. Use `md:grid-cols-N` instead of `grid-cols-N` everywhere.
- [ ] **Dark mode parity:** Every new Tailwind class must have a `dark:` variant. Toggle dark mode before declaring any module done.
- [ ] **Tab navigation memory:** Detail pages use URL search params or local state for tab selection. Verify that navigating away and back does not always reset to tab 0 if that would be disruptive to workflow.
- [ ] **Number formatting:** All monetary values must use `fmt()` from `@/lib/utils`. All percentages must use `pct()`. Any raw `Number.toFixed()` or `new Intl.NumberFormat()` in new code is a consistency bug.
- [ ] **Route registry:** Any new page added during polish must be registered in `src/lib/routes.ts`. Missing from `APP_ROUTES` means missing from the sidebar, the command bar, and the AI routing prompt.
- [ ] **Prisma include completeness:** If a new section on a detail page needs data from a related model, verify the parent API route's `include` clause contains that relation. A missing `include` returns `undefined` on the related field and causes crashes.

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SWR cache key mismatch (stale UI after mutations) | LOW | Find the exact SWR fetch key, update `revalidateKeys` or `mutate()` call to match, re-deploy |
| Missing `"use client"` directive | LOW | Add directive to top of file, re-build and deploy |
| Toast crash from object error | LOW | Wrap error access in `typeof check`, re-deploy; no data loss |
| Shared component change breaks other modules | MEDIUM | Revert the shared component change, create a new variant prop instead, re-test all affected pages |
| Pagination broken after list page modification | MEDIUM | Identify the SWR key change that broke accumulation, restore the base key structure, retest paginated scrolling |
| Dark mode regression | LOW | Add missing `dark:` variants to the new elements, re-deploy, verify with toggle |
| Accidental schema change breaks production | HIGH | Requires manual Prisma migration on the production database; coordinate with Vercel deployment; document migration steps; if `--force-reset` hit production, restore from the last Postgres backup |
| LP portal broken by GP-side change | MEDIUM | Identify which API response shape changed, restore backward compatibility in the response, re-deploy; notify LPs only if they reported an issue |
| Missing loading guard causes production crash | LOW-MEDIUM | Add the guard, re-deploy; if the crash was observed by real users (LPs or GP), verify they can now access the page and check Vercel error logs for any secondary failures |

---

## Pitfall-to-Phase Mapping

How each roadmap phase for v1.1 should prioritize these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SWR cache key mismatch | Every module polish phase | After every mutation added: perform the action, verify UI updates without hard refresh |
| Missing `"use client"` | Every module polish phase | After every new component file: verify interactive elements respond to clicks |
| Toast crash from object errors | Every module polish phase | Submit a form with intentionally invalid data, confirm page does not white-screen |
| Shared component changes break other modules | First phase that modifies `src/components/ui/` | Visual spot-check of all 6 core pages after any shared component edit |
| Pagination breaking | Deals, Assets, Transactions polish phases | Test "Load more" before and after every list page change |
| Dark mode regression | Every module polish phase | Toggle dark mode before marking any module complete |
| Tailwind CSS class conflicts | Every module polish phase | Use `cn()` for all conditional classes; inspect in DevTools if a style seems to have no effect |
| Schema changes in production | Any gap-closure phase requiring Prisma changes | Confirm `DATABASE_URL` points to dev before any `db push`; verify Vercel deployment does not error after schema change |
| Loading guards missing | Every module adding new SWR calls | Test on cold cache (hard refresh); verify no console errors about accessing properties of undefined |
| LP portal breakage from GP changes | Capital Activity, Assets, Entities polish phases | LP portal smoke test after every phase: log in as LP user, visit all 5 LP pages |

---

## Sources

- Direct codebase audit of Atlas v1.0 (2026-03-08): `src/components/ui/`, `src/components/features/`, `src/app/(gp)/`, `src/app/(lp)/`
- `.planning/AUDIT.md` — honest scorecard with known bugs and gaps
- `.claude/rules/coding-patterns.md` — project-specific bug patterns and anti-patterns
- `.planning/PROJECT.md` — architectural decisions and production deployment constraints
- `.planning/UI-GUIDE.md` — component inventory and testing workflows
- Known bug catalogue: BUG-01 (DD tab 0%/NOT_STARTED), BUG-02 (pipeline pass rate 300%), BUG-03 (IC Memo stuck "Generating...")
- SWR 2 documentation on cache key semantics and `mutate` scoping (HIGH confidence)
- Next.js 16 App Router documentation on Server vs Client Components and Promise params (HIGH confidence)
- Tailwind CSS 4 documentation on `tailwind-merge` and class conflict resolution (MEDIUM confidence — verified against project usage of `cn()` utility)

---
*Pitfalls research for: v1.1 Module Deep Pass — Atlas family office operating system*
*Researched: 2026-03-08*
