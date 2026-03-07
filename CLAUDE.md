# Atlas — Fund Administration Platform

## What This Is

Atlas is a family office operating system replacing spreadsheets, portals, and emails. It covers deal pipeline, asset management, LP relations, accounting, capital activity, and entity management. Built for ~9 fund entities, ~10 LPs, scaling toward $1B AUM.

**Tech stack:** Next.js 16 · TypeScript · React 19 · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Zod 4 · SWR 2 · Recharts 3

---

## What's Built vs Not Built

- **Auth:** Clerk 7 works in production with real data. Mock UserProvider for local dev (8 pre-seeded users).
- **Deal Desk:** ~90% complete. Pipeline, asset management, entity management, directory, tasks, documents all work. Later deal stages (closing, deal-to-asset) need end-to-end verification.
- **Financial Computations:** Code exists for IRR, waterfall, capital accounts in `src/lib/computations/`. API endpoints wired. **Correctness not verified.**
- **Integrations:** AI (OpenAI/Anthropic) works. Slack IC voting code exists (untested). QBO/Xero is UI-only (no real OAuth/API).
- **LP Portal:** Works with data. Unclear if metrics are computed or seeded.
- **Not built:** Email/SMS notifications, PDF/Excel export, DocuSign, role enforcement, pagination, error boundaries.

See `.planning/ROADMAP.md` for the full phase breakdown and `.planning/STATE.md` for current position.

---

## Known Issues (Need Re-verification)

These were documented March 5 but may or may not still exist:
- DD tab shows 0%/NOT_STARTED for deals past DD stage
- Pipeline pass rate shows 300% (calculation error)
- IC Memo "Generating..." spinner gets stuck on some deals

Note: `/capital`, `/waterfall`, `/funds` are intentional redirects to `/transactions` and `/entities`.

---

## How to Work With Me

### Before every task

1. **Check project state first.** Read `.planning/STATE.md` for current position and `.planning/ROADMAP.md` for what phase we're in.
2. **For non-trivial tasks, confirm your understanding first.** For clear, specific requests — just do it.
3. **If ambiguous, ask as many clarifying questions as needed.** But if the request is specific and clear, just do it.
4. **Always enter plan mode before writing code,** unless I say "just do it" or the change is a single obvious fix (typo, one-liner, simple rename).
5. **Consult reference docs** when the task involves a new page, new API route, new domain feature, or schema changes. For small edits to existing code, reading the existing file is enough.

### Reference docs (all in `.planning/`)

| File | What's in it |
|------|-------------|
| `.planning/PROJECT.md` | Project context, requirements, decisions, what's built vs not |
| `.planning/REQUIREMENTS.md` | All requirements with REQ-IDs, organized by domain |
| `.planning/ROADMAP.md` | 7-phase roadmap with success criteria and progress |
| `.planning/STATE.md` | Current phase, accumulated context, session continuity |
| `.planning/ARCHITECTURE.md` | Entity architecture, asset ownership, holding structures, contracts, roles |
| `.planning/DATA-MODEL.md` | All 57 Prisma models + all 73 API routes |
| `.planning/UI-GUIDE.md` | UI components, patterns, and step-by-step testing workflows |
| `.planning/AUDIT.md` | Honest scorecard — what's strong, weak, missing |
| `.claude/rules/coding-patterns.md` | Auto-loaded — bug-preventing patterns |
| `.claude/rules/project-structure.md` | Auto-loaded — file layout and checklists |

### While working

- **Use parallel agents whenever possible** — research in parallel, edit independent files concurrently, run build + preview verification simultaneously.
- **When I say "don't change any code" or "test this," investigate and report only.** No edits.
- **When I ask "what should we do next" or "what would you suggest,"** consult `.planning/ROADMAP.md` and propose the next logical step.
- **When I ask you to "score" or "evaluate" something,** be honest and specific. Give numbers, say what's strong, what's weak, what's missing.

### After every change

1. **Explain what changed in plain English.** No jargon. Tell me what's different and why.
2. **Give me specific testing steps.** Not "test the feature" — tell me exactly what to click, what page to go to, what I should see.
3. **Tell me what might break.** Be honest about edge cases or things that could go wrong.
4. **Run `npm run build`** — zero errors before telling me you're done.
5. **Update `.planning/STATE.md`** if you completed a plan or phase requirement.

### Testing

- **When testing, use localhost in a browser when possible.** Don't just check build output — actually open the page and interact with it.
- **Test using real workflows as a user would.** Click through the actual UI flow end-to-end, not just verify individual components in isolation.
- **Use `.planning/UI-GUIDE.md` workflows** for step-by-step testing checklists.

### Version workflow

- **Do NOT commit or push after every change.** Batch your work.
- **Only commit when I say** "commit", "ship it", "push it", or explicitly ask for a commit.
- **When I approve a version**, commit with a clear message describing all changes in that batch.

### GSD workflow

When I use GSD commands:
- `/gsd:progress` — shows current project status from STATE.md and ROADMAP.md
- `/gsd:plan-phase N` — creates detailed plan for phase N
- `/gsd:execute-phase N` — executes the plan with atomic commits
- `/gsd:verify-work` — validates against phase success criteria

### Continuous improvement

- **When something breaks or you make a mistake**, suggest a one-line addition to `.claude/rules/coding-patterns.md` so future sessions don't repeat it.
- **When you find outdated docs**, flag it and suggest the specific update. Don't silently work around stale info. Never update docs without asking first.

---

## Things I Don't Know

I'm not a developer. I don't read code. When you explain things to me:
- Use plain English, not technical jargon
- If you must use a technical term, explain what it means
- Focus on what the user sees and experiences, not implementation details
- Show me screenshots or tell me where to click, not which function was refactored

---

## Dev Commands

```bash
npm run dev            # Dev server on port 3000
npm run build          # Production build — catches ALL type errors
npx prisma studio      # Visual database browser
npx prisma db seed     # Re-seed demo data
```

After ANY schema.prisma change:
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset
npx prisma generate && npx prisma db seed
# Then restart dev server
```
